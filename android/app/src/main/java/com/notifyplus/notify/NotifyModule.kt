package com.notifyplus.notify

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.concurrent.TimeUnit

/**
 * JS <-> native bridge for notify-plus. Implemented as a legacy bridge module, which runs under the
 * New Architecture via the interop layer (no codegen required). Collection results are returned as
 * JSON strings to keep one simple serialization contract with [NotifyListenerService] events.
 *
 * Events: a single device event named "NotifyEvent" carrying a JSON string. Subscribe in JS via
 * NativeEventEmitter (see src/native/NotifyModule.ts).
 */
class NotifyModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  private val rulesStore by lazy { RulesStore(reactContext) }
  private val pendingStore by lazy { PendingStore(reactContext) }

  init {
    NotifyEventBus.setListener { json -> sendEvent(json) }
  }

  override fun getName(): String = "NotifyModule"

  override fun invalidate() {
    NotifyEventBus.setListener(null)
    super.invalidate()
  }

  private fun sendEvent(json: String) {
    if (!reactContext.hasActiveReactInstance()) return
    try {
      reactContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit(EVENT_NAME, json)
    } catch (e: Exception) {
      // ignore: JS side may not be listening yet
    }
  }

  private fun startActivitySafely(intent: Intent) {
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    (reactContext.currentActivity ?: reactContext).startActivity(intent)
  }

  // ---- Required for NativeEventEmitter (no-ops) ----

  @ReactMethod
  fun addListener(eventName: String) { /* no-op */ }

  @ReactMethod
  fun removeListeners(count: Double) { /* no-op */ }

  // ---- Notification access ----

  @ReactMethod
  fun isNotificationAccessGranted(promise: Promise) {
    try {
      val flat = Settings.Secure.getString(
        reactContext.contentResolver,
        "enabled_notification_listeners",
      ) ?: ""
      val granted = flat.split(":").any {
        ComponentName.unflattenFromString(it)?.packageName == reactContext.packageName
      }
      promise.resolve(granted)
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun openNotificationAccessSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        val cn = ComponentName(reactContext, NotifyListenerService::class.java)
        intent.putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, cn.flattenToString())
      }
      startActivitySafely(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_SETTINGS", e)
    }
  }

  @ReactMethod
  fun isServiceConnected(promise: Promise) {
    promise.resolve(NotifyListenerService.isConnected)
  }

  // ---- Post-notifications / channel status ----

  @ReactMethod
  fun areNotificationsEnabled(promise: Promise) {
    promise.resolve(Notifications.areNotificationsEnabled(reactContext))
  }

  @ReactMethod
  fun openAppNotificationSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
      startActivitySafely(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_SETTINGS", e)
    }
  }

  @ReactMethod
  fun openChannelSettings(channelId: String, promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
        .putExtra(Settings.EXTRA_APP_PACKAGE, reactContext.packageName)
        .putExtra(Settings.EXTRA_CHANNEL_ID, channelId)
      startActivitySafely(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_SETTINGS", e)
    }
  }

  // ---- Battery optimization ----

  @ReactMethod
  fun isIgnoringBatteryOptimizations(promise: Promise) {
    try {
      val pm = reactContext.getSystemService(Context.POWER_SERVICE) as PowerManager
      promise.resolve(pm.isIgnoringBatteryOptimizations(reactContext.packageName))
    } catch (e: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun openBatteryOptimizationSettings(promise: Promise) {
    try {
      // The list screen needs no special permission (unlike the direct ACTION_REQUEST_... dialog,
      // which is a Play-restricted sensitive permission we deliberately avoid).
      startActivitySafely(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_SETTINGS", e)
    }
  }

  @ReactMethod
  fun openAppDetailsSettings(promise: Promise) {
    try {
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
        .setData(Uri.fromParts("package", reactContext.packageName, null))
      startActivitySafely(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_SETTINGS", e)
    }
  }

  @ReactMethod
  fun getManufacturer(promise: Promise) {
    promise.resolve(Build.MANUFACTURER ?: "")
  }

  // ---- Launcher icon color variant (activity-alias switching) ----

  /**
   * Switch the home-screen launcher icon to a predefined color variant by enabling exactly one
   * activity-alias and disabling the others. Uses DONT_KILL_APP so the running app survives; the
   * launcher refreshes the icon shortly after (timing is launcher-dependent).
   */
  @ReactMethod
  fun setLauncherIconVariant(name: String, promise: Promise) {
    try {
      val pm = reactContext.packageManager
      val pkg = reactContext.packageName
      val target = ICON_VARIANTS.firstOrNull { it.equals(name, ignoreCase = true) }
      if (target == null) {
        promise.reject("E_ICON", "Unknown launcher icon variant: $name")
        return
      }
      // Enable the target first so there is never a moment with zero launcher entries.
      pm.setComponentEnabledSetting(
        ComponentName(pkg, "$pkg.Icon$target"),
        PackageManager.COMPONENT_ENABLED_STATE_ENABLED,
        PackageManager.DONT_KILL_APP,
      )
      for (v in ICON_VARIANTS) {
        if (v == target) continue
        pm.setComponentEnabledSetting(
          ComponentName(pkg, "$pkg.Icon$v"),
          PackageManager.COMPONENT_ENABLED_STATE_DISABLED,
          PackageManager.DONT_KILL_APP,
        )
      }
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_ICON", e)
    }
  }

  // ---- Telegram detection ----

  @ReactMethod
  fun getInstalledTelegramPackages(promise: Promise) {
    val pm = reactContext.packageManager
    val arr = JSONArray()
    for (pkg in DEFAULT_TELEGRAM_PACKAGES) {
      try {
        val info = pm.getApplicationInfo(pkg, 0)
        val label = pm.getApplicationLabel(info).toString()
        arr.put(JSONObject().apply {
          put("package", pkg)
          put("label", label)
        })
      } catch (e: Exception) {
        // not installed
      }
    }
    promise.resolve(arr.toString())
  }

  // ---- Rules / prefs ----

  @ReactMethod
  fun setRules(json: String, promise: Promise) {
    rulesStore.setRulesJson(json)
    promise.resolve(true)
  }

  @ReactMethod
  fun getRules(promise: Promise) {
    promise.resolve(rulesStore.getRulesJson())
  }

  @ReactMethod
  fun setDiagnosticMode(on: Boolean, promise: Promise) {
    rulesStore.setDiagnosticMode(on)
    promise.resolve(true)
  }

  @ReactMethod
  fun isDiagnosticMode(promise: Promise) {
    promise.resolve(rulesStore.isDiagnosticMode())
  }

  @ReactMethod
  fun getPref(key: String, promise: Promise) {
    promise.resolve(rulesStore.getString(key, null))
  }

  @ReactMethod
  fun setPref(key: String, value: String?, promise: Promise) {
    rulesStore.putString(key, value)
    promise.resolve(true)
  }

  // ---- Channels ----

  @ReactMethod
  fun ensureDefaultChannel(promise: Promise) {
    Notifications.ensureDefaultChannel(reactContext)
    promise.resolve(true)
  }

  @ReactMethod
  fun createChannel(configJson: String, promise: Promise) {
    try {
      Notifications.createChannel(reactContext, JSONObject(configJson))
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_CHANNEL", e)
    }
  }

  @ReactMethod
  fun deleteChannel(id: String, promise: Promise) {
    Notifications.deleteChannel(reactContext, id)
    promise.resolve(true)
  }

  /** Resolves "ok" | "blocked" | "missing". */
  @ReactMethod
  fun getChannelStatus(id: String, promise: Promise) {
    val blocked = Notifications.isChannelBlocked(reactContext, id)
    promise.resolve(
      when (blocked) {
        null -> "missing"
        true -> "blocked"
        false -> "ok"
      }
    )
  }

  // ---- Scheduled cleanup ----

  /**
   * Save cleanup settings and schedule (or cancel) a periodic WorkManager task.
   * The worker writes a cutoff timestamp to SharedPreferences; JS reads and executes the DELETE
   * via op-sqlite on next app open so FTS5 triggers fire correctly.
   */
  @ReactMethod
  fun scheduleCleanup(interval: String, hour: Int, minute: Int, promise: Promise) {
    try {
      rulesStore.putString("cleanup_interval", interval)
      rulesStore.putString("cleanup_hour", hour.toString())
      rulesStore.putString("cleanup_minute", minute.toString())

      val wm = WorkManager.getInstance(reactContext)
      if (interval == "never") {
        wm.cancelUniqueWork(CLEANUP_WORK_NAME)
        promise.resolve(true)
        return
      }

      val repeatMs: Long = when (interval) {
        "daily"   -> TimeUnit.DAYS.toMillis(1)
        "weekly"  -> TimeUnit.DAYS.toMillis(7)
        "monthly" -> TimeUnit.DAYS.toMillis(30)
        "yearly"  -> TimeUnit.DAYS.toMillis(365)
        else      -> { promise.reject("E_CLEANUP", "Unknown interval: $interval"); return }
      }
      val flexMs = minOf(30 * 60_000L, repeatMs / 4)

      val cal = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
        if (timeInMillis <= System.currentTimeMillis()) {
          add(Calendar.DAY_OF_YEAR, 1)
        }
      }
      val initialDelayMs = (cal.timeInMillis - System.currentTimeMillis()).coerceAtLeast(0L)

      val request = PeriodicWorkRequestBuilder<CleanupWorker>(
        repeatMs, TimeUnit.MILLISECONDS,
        flexMs, TimeUnit.MILLISECONDS,
      )
        .setInitialDelay(initialDelayMs, TimeUnit.MILLISECONDS)
        .build()

      wm.enqueueUniquePeriodicWork(
        CLEANUP_WORK_NAME,
        ExistingPeriodicWorkPolicy.CANCEL_AND_REENQUEUE,
        request,
      )
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("E_CLEANUP", e)
    }
  }

  /** Reads the pending cleanup cutoff written by [CleanupWorker], clears it, returns it as Double ms (or -1). */
  @ReactMethod
  fun getAndClearCleanupCutoff(promise: Promise) {
    try {
      val cutoffStr = rulesStore.getString("cleanup_pending_cutoff", null)
      if (cutoffStr != null) rulesStore.remove("cleanup_pending_cutoff")
      promise.resolve(cutoffStr?.toLongOrNull()?.toDouble() ?: -1.0)
    } catch (e: Exception) {
      promise.resolve(-1.0)
    }
  }

  // ---- Pending events queue ----

  @ReactMethod
  fun drainPendingEvents(promise: Promise) {
    promise.resolve(pendingStore.drainAll())
  }

  @ReactMethod
  fun pendingCount(promise: Promise) {
    promise.resolve(pendingStore.count())
  }

  companion object {
    const val EVENT_NAME = "NotifyEvent"

    /** Must match the <activity-alias> names (".Icon<Variant>") in AndroidManifest.xml. */
    private val ICON_VARIANTS =
      listOf("Orange", "Blue", "Green", "Red", "Purple", "Sky", "Yellow", "Dark")

    private const val CLEANUP_WORK_NAME = "notify_cleanup"
  }
}
