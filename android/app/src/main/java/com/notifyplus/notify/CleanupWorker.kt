package com.notifyplus.notify

import android.content.Context
import androidx.work.Worker
import androidx.work.WorkerParameters

/**
 * WorkManager worker that fires at the scheduled cleanup time and writes a cutoff timestamp to
 * SharedPreferences. The JS layer reads this on the next app open and performs the actual DELETE
 * via op-sqlite (which has FTS5 support). We cannot DELETE directly from here because the system
 * SQLite used in workers does not include FTS5, and the op-sqlite DB has FTS5 sync triggers.
 */
class CleanupWorker(context: Context, params: WorkerParameters) : Worker(context, params) {

    override fun doWork(): Result {
        val store = RulesStore(applicationContext)
        val interval = store.getString("cleanup_interval", "never") ?: "never"
        if (interval == "never") return Result.success()

        val retentionMs: Long = when (interval) {
            "daily"   -> 86_400_000L
            "weekly"  -> 7L * 86_400_000L
            "monthly" -> 30L * 86_400_000L
            "yearly"  -> 365L * 86_400_000L
            else      -> return Result.success()
        }

        val cutoffMs = System.currentTimeMillis() - retentionMs
        store.putString("cleanup_pending_cutoff", cutoffMs.toString())
        return Result.success()
    }
}
