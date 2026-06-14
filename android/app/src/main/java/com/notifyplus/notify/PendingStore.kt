package com.notifyplus.notify

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * Native-owned queue of matched messages. The listener service writes here in real time (it works
 * while the app UI is closed). When the React Native app next runs, it DRAINS this queue into the
 * op-sqlite + FTS5 archive (the searchable Notification Center). Uses Android's built-in SQLite —
 * no FTS needed here, so no extra native SQLite dependency.
 */
class PendingStore(context: Context) :
  SQLiteOpenHelper(context.applicationContext, DB_NAME, null, DB_VERSION) {

  override fun onCreate(db: SQLiteDatabase) {
    createTables(db)
  }

  override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
    // Additive: never drop the dedup ("seen") table on upgrade, or already-handled messages would
    // re-trigger after an app update.
    createTables(db)
  }

  private fun createTables(db: SQLiteDatabase) {
    db.execSQL(
      """
      CREATE TABLE IF NOT EXISTS pending_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rule_id TEXT,
        rule_name TEXT,
        source_package TEXT,
        source_title TEXT,
        body TEXT,
        matched_keyword TEXT,
        posted_at INTEGER NOT NULL,
        sbn_key TEXT
      )
      """.trimIndent()
    )
    // Durable dedup: which individual messages we have already handled. Survives the service
    // process being killed (app closed) and app updates, so a still-present (unread) Telegram
    // notification updated with old+new messages does NOT re-trigger the old ones.
    db.execSQL(
      """
      CREATE TABLE IF NOT EXISTS seen (
        id TEXT PRIMARY KEY,
        ts INTEGER NOT NULL
      )
      """.trimIndent()
    )
  }

  /**
   * Record [id] as handled. Returns true only if it was NOT seen before (i.e. process it now).
   * Keeps the table bounded to the most recent [MAX_SEEN] entries.
   */
  @Synchronized
  fun addIfNew(id: String, ts: Long): Boolean {
    val db = writableDatabase
    db.execSQL("INSERT OR IGNORE INTO seen(id, ts) VALUES(?, ?)", arrayOf<Any>(id, ts))
    val inserted = db.rawQuery("SELECT changes()", null).use { c ->
      if (c.moveToFirst()) c.getInt(0) > 0 else false
    }
    if (inserted) {
      db.execSQL(
        "DELETE FROM seen WHERE id NOT IN (SELECT id FROM seen ORDER BY ts DESC LIMIT $MAX_SEEN)"
      )
    }
    return inserted
  }

  @Synchronized
  fun insert(
    ruleId: String,
    ruleName: String,
    sourcePackage: String,
    sourceTitle: String,
    body: String,
    matchedKeyword: String,
    postedAt: Long,
    sbnKey: String,
  ) {
    val db = writableDatabase
    val values = ContentValues().apply {
      put("rule_id", ruleId)
      put("rule_name", ruleName)
      put("source_package", sourcePackage)
      put("source_title", sourceTitle)
      put("body", body)
      put("matched_keyword", matchedKeyword)
      put("posted_at", postedAt)
      put("sbn_key", sbnKey)
    }
    db.insert("pending_events", null, values)
    // Keep the queue bounded in case the app is not opened for a long time.
    db.execSQL(
      "DELETE FROM pending_events WHERE id NOT IN " +
        "(SELECT id FROM pending_events ORDER BY id DESC LIMIT $MAX_ROWS)"
    )
  }

  @Synchronized
  fun count(): Int {
    readableDatabase.rawQuery("SELECT COUNT(*) FROM pending_events", null).use { c ->
      return if (c.moveToFirst()) c.getInt(0) else 0
    }
  }

  /** Returns all queued events as a JSON array string and removes them from the queue. */
  @Synchronized
  fun drainAll(): String {
    val db = writableDatabase
    val out = JSONArray()
    db.beginTransaction()
    try {
      db.rawQuery(
        "SELECT id, rule_id, rule_name, source_package, source_title, body, " +
          "matched_keyword, posted_at, sbn_key FROM pending_events ORDER BY id ASC",
        null,
      ).use { c ->
        while (c.moveToNext()) {
          out.put(
            JSONObject().apply {
              put("id", c.getLong(0))
              put("ruleId", c.getString(1) ?: "")
              put("ruleName", c.getString(2) ?: "")
              put("sourcePackage", c.getString(3) ?: "")
              put("sourceTitle", c.getString(4) ?: "")
              put("body", c.getString(5) ?: "")
              put("matchedKeyword", c.getString(6) ?: "")
              put("postedAt", c.getLong(7))
              put("sbnKey", c.getString(8) ?: "")
            }
          )
        }
      }
      db.execSQL("DELETE FROM pending_events")
      db.setTransactionSuccessful()
    } finally {
      db.endTransaction()
    }
    return out.toString()
  }

  companion object {
    private const val DB_NAME = "notify_pending.db"
    private const val DB_VERSION = 2
    private const val MAX_ROWS = 5000
    private const val MAX_SEEN = 5000
  }
}
