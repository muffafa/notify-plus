package com.notifyplus.notify

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.net.Uri
import android.provider.Settings
import com.notifyplus.MainActivity
import com.notifyplus.R
import org.json.JSONObject
import java.util.concurrent.atomic.AtomicInteger

const val DEFAULT_CHANNEL_ID = "notify_default"

/**
 * Notification channel + posting helpers. minSdk is 26, so notification channels always exist and
 * sound/vibration are controlled at the channel level. Channels are created by the JS layer while
 * the app is open (during rule configuration) and persist in the OS, so [NotifyListenerService]
 * can post to them at any time, even when the React Native runtime is not running.
 */
object Notifications {

  private val idCounterSeed = AtomicInteger(1000)

  fun nextNotificationId(): Int = idCounterSeed.incrementAndGet()

  private fun manager(context: Context): NotificationManager =
    context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

  private fun audioAttributes(): AudioAttributes =
    AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_NOTIFICATION)
      .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
      .build()

  /** Idempotent default channel used as a fallback when a rule references a missing channel. */
  fun ensureDefaultChannel(context: Context) {
    val nm = manager(context)
    if (nm.getNotificationChannel(DEFAULT_CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      DEFAULT_CHANNEL_ID,
      "Deal alerts",
      NotificationManager.IMPORTANCE_HIGH,
    ).apply {
      description = "Matched deal notifications"
      enableVibration(true)
      vibrationPattern = longArrayOf(0, 300, 200, 300)
      setSound(Settings.System.DEFAULT_NOTIFICATION_URI, audioAttributes())
    }
    nm.createNotificationChannel(channel)
  }

  /**
   * Create or replace a channel from a JSON config. Because Android channels are immutable after
   * creation, the JS layer uses versioned ids (e.g. "deals_high_v2") to change sound/vibration.
   */
  fun createChannel(context: Context, config: JSONObject) {
    val nm = manager(context)
    val id = config.optString("id")
    if (id.isBlank()) return

    val importance = when (config.optString("importance", "high")) {
      "min" -> NotificationManager.IMPORTANCE_MIN
      "low" -> NotificationManager.IMPORTANCE_LOW
      "default" -> NotificationManager.IMPORTANCE_DEFAULT
      else -> NotificationManager.IMPORTANCE_HIGH
    }

    val channel = NotificationChannel(id, config.optString("name", "Deals"), importance).apply {
      description = config.optString("description", "")

      val vibrate = config.optBoolean("vibrate", true)
      enableVibration(vibrate)
      config.optJSONArray("vibrationPattern")?.let { arr ->
        if (vibrate && arr.length() > 0) {
          vibrationPattern = LongArray(arr.length()) { arr.optLong(it) }
        }
      }

      // sound: missing/null => default sound; "" => silent; otherwise a raw resource name.
      if (!config.has("sound") || config.isNull("sound")) {
        setSound(Settings.System.DEFAULT_NOTIFICATION_URI, audioAttributes())
      } else {
        val soundName = config.optString("sound", "")
        if (soundName.isBlank()) {
          setSound(null, null)
        } else {
          val uri = Uri.parse("android.resource://${context.packageName}/raw/$soundName")
          setSound(uri, audioAttributes())
        }
      }

      enableLights(config.optBoolean("lights", true))
      try {
        setBypassDnd(config.optBoolean("bypassDnd", false))
      } catch (e: SecurityException) {
        // Bypassing Do Not Disturb requires notification policy access; ignore if not granted.
      }
    }
    nm.createNotificationChannel(channel)
  }

  fun deleteChannel(context: Context, id: String) {
    manager(context).deleteNotificationChannel(id)
  }

  /** null => channel not found; true => user disabled the channel (importance NONE). */
  fun isChannelBlocked(context: Context, id: String): Boolean? {
    val channel = manager(context).getNotificationChannel(id) ?: return null
    return channel.importance == NotificationManager.IMPORTANCE_NONE
  }

  fun areNotificationsEnabled(context: Context): Boolean =
    manager(context).areNotificationsEnabled()

  /** Post our own (loud) notification for a matched message. Returns the notification id. */
  fun postMatch(
    context: Context,
    channelId: String,
    title: String,
    body: String,
  ): Int {
    val nm = manager(context)
    val effectiveChannel =
      if (nm.getNotificationChannel(channelId) != null) channelId else {
        ensureDefaultChannel(context)
        DEFAULT_CHANNEL_ID
      }

    val notifId = nextNotificationId()

    val launch = Intent(context, MainActivity::class.java).apply {
      addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val contentIntent = PendingIntent.getActivity(
      context,
      notifId,
      launch,
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT,
    )

    val builder = Notification.Builder(context, effectiveChannel)
      .setSmallIcon(R.drawable.ic_notification)
      .setContentTitle(title.ifBlank { "Deal match" })
      .setContentText(body)
      .setStyle(Notification.BigTextStyle().bigText(body))
      .setAutoCancel(true)
      .setContentIntent(contentIntent)
      .setWhen(System.currentTimeMillis())

    nm.notify(notifId, builder.build())
    return notifId
  }
}
