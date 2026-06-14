package com.notifyplus.notify

import android.app.Notification
import android.content.ComponentName
import android.os.Bundle
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import org.json.JSONObject

/**
 * The heart of notify-plus. The OS binds this service when the user grants Notification access; it
 * runs independently of the React Native runtime, so filtering and re-alerting keep working while
 * the app UI is closed.
 *
 * IMPORTANT — Telegram uses MessagingStyle: each posted/updated notification for a chat carries the
 * recent message list (EXTRA_MESSAGES), not just the new line, and Telegram UPDATES the same
 * notification key in place as more messages arrive. So we must:
 *   1. extract INDIVIDUAL messages (each with its timestamp), not the whole blob,
 *   2. dedup per message (key + timestamp) so a message is handled exactly once across the in-place
 *      updates,
 *   3. match / alert / archive one message at a time.
 *
 * On a match we post our own loud notification (custom channel, mirrors to Wear OS), record the
 * single message in [PendingStore], optionally cancel the silent original, and emit a live event.
 */
class NotifyListenerService : NotificationListenerService() {

  private lateinit var rulesStore: RulesStore
  private lateinit var pendingStore: PendingStore

  private data class Msg(val text: String, val time: Long)

  override fun onCreate() {
    super.onCreate()
    rulesStore = RulesStore(this)
    pendingStore = PendingStore(this)
    Notifications.ensureDefaultChannel(this)
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    isConnected = true
    NotifyEventBus.emit(serviceStateJson(true))
  }

  override fun onListenerDisconnected() {
    super.onListenerDisconnected()
    isConnected = false
    NotifyEventBus.emit(serviceStateJson(false))
    // Best-effort rebind. Not guaranteed — some OEMs require a reboot to restore the binding.
    try {
      requestRebind(ComponentName(this, NotifyListenerService::class.java))
    } catch (e: Exception) {
      // ignore
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val n = sbn ?: return
    try {
      handle(n)
    } catch (e: Exception) {
      // A parsing error must never crash the listener.
    }
  }

  private fun handle(sbn: StatusBarNotification) {
    val pkg = sbn.packageName ?: return
    if (pkg == packageName) return // never process our own (re-issued) notifications

    val diagnostic = rulesStore.isDiagnosticMode()
    val rules = rulesStore.getRules().filter { it.enabled }

    val watched = HashSet<String>()
    rules.forEach { watched.addAll(it.effectivePackages()) }
    if (diagnostic) watched.addAll(DEFAULT_TELEGRAM_PACKAGES)
    if (pkg !in watched) return

    val notification = sbn.notification ?: return
    // Group summaries are text-poor aggregates; skip them.
    if (notification.flags and Notification.FLAG_GROUP_SUMMARY != 0) return

    val extras = notification.extras ?: Bundle()
    val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
    val messages = extractMessages(extras)
    if (messages.isEmpty()) return

    val key = sbn.key ?: "$pkg:${sbn.id}"
    val normalizedTitle = TextNormalizer.normalize(title)

    // Stable, restart-safe dedup id: keyed by chat (package + title) + message timestamp/content,
    // NOT the notification id (which can change between sessions). Persisted in PendingStore so a
    // still-present (unread) Telegram notification can't re-trigger already-handled messages after
    // the app is closed and reopened.
    val base = "$pkg|$normalizedTitle"
    for (msg in messages) {
      val dedupId = if (msg.time > 0L) "$base|t${msg.time}" else "$base|h${msg.text.hashCode()}"
      val ts = if (msg.time > 0L) msg.time else System.currentTimeMillis()
      if (!pendingStore.addIfNew(dedupId, ts)) continue
      processMessage(pkg, key, title, normalizedTitle, msg, rules, diagnostic)
    }
  }

  private fun processMessage(
    pkg: String,
    key: String,
    title: String,
    normalizedTitle: String,
    msg: Msg,
    rules: List<Rule>,
    diagnostic: Boolean,
  ) {
    val body = msg.text
    val haystack = TextNormalizer.normalize("$title $body")

    var matched: MatchResult? = null
    for (rule in rules) {
      if (!TextMatcher.sourceMatches(rule, pkg, normalizedTitle)) continue
      val r = TextMatcher.evaluate(rule, haystack)
      if (r != null) {
        matched = r
        break
      }
    }

    val postedAt = if (msg.time > 0L) msg.time else System.currentTimeMillis()
    val generic = body.isBlank()

    if (matched != null) {
      val rule = matched.rule
      Notifications.postMatch(this, rule.channelId, title.ifBlank { rule.name }, body)
      pendingStore.insert(
        ruleId = rule.id,
        ruleName = rule.name,
        sourcePackage = pkg,
        sourceTitle = title,
        body = body,
        matchedKeyword = matched.matchedKeyword,
        postedAt = postedAt,
        sbnKey = key,
      )
      if (rule.suppressOriginal) {
        try {
          cancelNotification(key)
        } catch (e: Exception) {
          // ignore
        }
      }
      NotifyEventBus.emit(
        capturedJson(true, rule, matched.matchedKeyword, pkg, title, body, generic, postedAt)
      )
    } else if (diagnostic && pkg in DEFAULT_TELEGRAM_PACKAGES) {
      // Diagnostic only: surface captured-but-unmatched messages so onboarding can confirm we are
      // receiving readable text (vs. a redacted "You have a new message").
      NotifyEventBus.emit(capturedJson(false, null, "", pkg, title, body, generic, postedAt))
    }
  }

  /**
   * Extract INDIVIDUAL messages. MessagingStyle (Telegram) gives one entry per message with a
   * timestamp; we read those. Otherwise we fall back to a single logical message from the richest
   * text field.
   */
  @Suppress("DEPRECATION")
  private fun extractMessages(extras: Bundle): List<Msg> {
    val parcels = extras.getParcelableArray(Notification.EXTRA_MESSAGES)
    if (parcels != null && parcels.isNotEmpty()) {
      val out = ArrayList<Msg>(parcels.size)
      for (p in parcels) {
        val b = p as? Bundle ?: continue
        val text = b.getCharSequence("text")?.toString()?.trim()
        if (text.isNullOrEmpty()) continue
        out.add(Msg(text, b.getLong("time", 0L)))
      }
      if (out.isNotEmpty()) return out
    }

    val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
    val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
    val lines = extras.getCharSequenceArray(Notification.EXTRA_TEXT_LINES)
      ?.mapNotNull { it?.toString()?.trim() }
      ?.filter { it.isNotEmpty() }
      ?.joinToString("\n") ?: ""

    val body = when {
      bigText.isNotEmpty() -> bigText
      text.isNotEmpty() -> text
      lines.isNotEmpty() -> lines
      else -> ""
    }
    return if (body.isEmpty()) emptyList() else listOf(Msg(body, 0L))
  }

  private fun serviceStateJson(connected: Boolean): String =
    JSONObject().apply {
      put("type", "service")
      put("connected", connected)
    }.toString()

  private fun capturedJson(
    matched: Boolean,
    rule: Rule?,
    keyword: String,
    pkg: String,
    title: String,
    body: String,
    generic: Boolean,
    postedAt: Long,
  ): String = JSONObject().apply {
    put("type", if (matched) "matched" else "captured")
    put("matched", matched)
    put("ruleId", rule?.id ?: JSONObject.NULL)
    put("ruleName", rule?.name ?: JSONObject.NULL)
    put("matchedKeyword", keyword)
    put("sourcePackage", pkg)
    put("sourceTitle", title)
    put("body", body)
    put("generic", generic)
    put("postedAt", postedAt)
  }.toString()

  companion object {
    @Volatile
    var isConnected: Boolean = false
      private set
  }
}
