package com.notifyplus.notify

import org.json.JSONArray
import org.json.JSONObject

/** Telegram client package variants we watch by default when a rule doesn't pin specific packages. */
val DEFAULT_TELEGRAM_PACKAGES = setOf(
  "org.telegram.messenger",
  "org.telegram.messenger.web",
  "org.telegram.messenger.beta",
  "org.telegram.plus",
  "org.thunderdog.challegram",
)

enum class RuleMode { KEYWORDS, ALL }

/**
 * One watch rule. JSON contract shared verbatim with the JS layer (src/types.ts).
 * Matching/normalization is applied to keywords and the notification text; original text is
 * preserved for display.
 */
data class Rule(
  val id: String,
  val enabled: Boolean,
  val name: String,
  /** Source packages to match. Empty => all Telegram variants (DEFAULT_TELEGRAM_PACKAGES). */
  val sourcePackages: Set<String>,
  /** Notification title (chat/channel name) must contain ANY of these (normalized). Empty => any. */
  val sourceTitleContains: List<String>,
  val mode: RuleMode,
  /** Normalized at match time. mode=KEYWORDS requires at least one to be present. */
  val keywords: List<String>,
  /** If any is present in the text, the message is skipped even if a keyword matched. */
  val excludeKeywords: List<String>,
  /** Notification channel to post matches to (controls sound/vibration). */
  val channelId: String,
  /** Cancel the original (silent) Telegram notification when this rule matches. */
  val suppressOriginal: Boolean,
  /** Include the notification title (channel name) in keyword search. Default: true */
  val searchTitle: Boolean,
  /** Keywords must appear as whole words surrounded by spaces. Default: false */
  val exactWord: Boolean,
  /** Keyword matching is case-sensitive. Default: false */
  val caseSensitive: Boolean,
  /** Turkish characters are kept distinct from their Latin equivalents. Default: false */
  val turkishSensitive: Boolean,
  /** ALL keywords must be present (AND logic). Default: false = ANY (OR logic) */
  val requireAllKeywords: Boolean,
) {
  fun effectivePackages(): Set<String> =
    if (sourcePackages.isEmpty()) DEFAULT_TELEGRAM_PACKAGES else sourcePackages

  companion object {
    fun fromJson(o: JSONObject): Rule = Rule(
      id = o.optString("id"),
      enabled = o.optBoolean("enabled", true),
      name = o.optString("name", "Rule"),
      sourcePackages = o.optJSONArray("sourcePackages").toStringSet(),
      sourceTitleContains = o.optJSONArray("sourceTitleContains").toStringList(),
      mode = if (o.optString("mode", "keywords") == "all") RuleMode.ALL else RuleMode.KEYWORDS,
      keywords = o.optJSONArray("keywords").toStringList(),
      excludeKeywords = o.optJSONArray("excludeKeywords").toStringList(),
      channelId = o.optString("channelId", DEFAULT_CHANNEL_ID),
      suppressOriginal = o.optBoolean("suppressOriginal", false),
      searchTitle = o.optBoolean("searchTitle", true),
      exactWord = o.optBoolean("exactWord", false),
      caseSensitive = o.optBoolean("caseSensitive", false),
      turkishSensitive = o.optBoolean("turkishSensitive", false),
      requireAllKeywords = o.optBoolean("requireAllKeywords", false),
    )

    fun parseList(json: String?): List<Rule> {
      if (json.isNullOrBlank()) return emptyList()
      return try {
        val arr = JSONArray(json)
        (0 until arr.length()).mapNotNull { i ->
          arr.optJSONObject(i)?.let { fromJson(it) }
        }
      } catch (e: Exception) {
        emptyList()
      }
    }
  }
}

private fun JSONArray?.toStringList(): List<String> {
  if (this == null) return emptyList()
  return (0 until length()).mapNotNull { optString(it, null) }.filter { it.isNotBlank() }
}

private fun JSONArray?.toStringSet(): Set<String> = toStringList().toSet()
