package com.notifyplus.notify

import android.content.Context
import android.content.SharedPreferences

/**
 * Single source of truth for rules and a handful of small prefs, persisted to SharedPreferences so
 * the OS-managed [NotifyListenerService] can read them even when the React Native runtime is not
 * alive. The JS layer reads/writes through NotifyModule; the service reads here directly.
 */
class RulesStore(context: Context) {

  private val prefs: SharedPreferences =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  fun getRulesJson(): String = prefs.getString(KEY_RULES, "[]") ?: "[]"

  fun setRulesJson(json: String) {
    prefs.edit().putString(KEY_RULES, json).apply()
  }

  fun getRules(): List<Rule> = Rule.parseList(getRulesJson())

  fun isDiagnosticMode(): Boolean = prefs.getBoolean(KEY_DIAGNOSTIC, false)

  fun setDiagnosticMode(on: Boolean) {
    prefs.edit().putBoolean(KEY_DIAGNOSTIC, on).apply()
  }

  fun getString(key: String, default: String?): String? = prefs.getString(PREF_PREFIX + key, default)

  fun putString(key: String, value: String?) {
    prefs.edit().putString(PREF_PREFIX + key, value).apply()
  }

  fun getBool(key: String, default: Boolean): Boolean = prefs.getBoolean(PREF_PREFIX + key, default)

  fun putBool(key: String, value: Boolean) {
    prefs.edit().putBoolean(PREF_PREFIX + key, value).apply()
  }

  companion object {
    private const val PREFS_NAME = "notify_rules"
    private const val KEY_RULES = "rules"
    private const val KEY_DIAGNOSTIC = "diagnostic_mode"
    private const val PREF_PREFIX = "pref_"
  }
}
