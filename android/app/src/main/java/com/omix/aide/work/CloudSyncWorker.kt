package com.omix.aide.work

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.omix.aide.data.local.CloudSessionStore
import com.omix.aide.data.sync.CloudSyncFactory

/**
 * Silent background sync.
 *
 * Runs only while a cloud session exists and a network is available, and never
 * blocks the till: the UI writes to Room first, the worker drains the outbox
 * afterwards. A failed run is retried by WorkManager, so a shop that closes the
 * app mid-sync loses nothing.
 */
class CloudSyncWorker(
    context: Context,
    params: WorkerParameters
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        val app = applicationContext
        val session = CloudSessionStore(app).read()
            ?: return Result.success() // signed out since the work was enqueued

        if (!session.isLinked) return Result.success()

        return try {
            val outcome = CloudSyncFactory.create(app).syncNow()
            if (outcome.ok) Result.success() else Result.retry()
        } catch (err: Exception) {
            Result.retry()
        }
    }

    companion object {
        const val UNIQUE_NAME = "aide_cloud_sync"
    }
}
