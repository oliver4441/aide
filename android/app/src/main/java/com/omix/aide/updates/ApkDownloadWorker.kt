package com.omix.aide.updates

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.omix.aide.BuildConfig
import java.io.File
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.TimeoutCancellationException
import kotlinx.coroutines.withTimeout

class ApkDownloadWorker(context: Context, parameters: WorkerParameters) : CoroutineWorker(context, parameters) {
    override suspend fun doWork(): Result {
        val storage = AndroidUpdateStorage(applicationContext)
        return try {
            val manifest = ReleaseManifest.parse(storage.downloadManifest ?: return failure("interrupted"), BuildConfig.UPDATE_CERT_SHA256)
            if (manifest.versionCode != inputData.getLong("version", 0)) return failure("interrupted")
            val asset = manifest.assets.find { it.sha256 == inputData.getString("sha256") } ?: return failure("metadata")
            // Regular WorkManager work has a ten-minute execution budget. End
            // gracefully before that, and let the user explicitly retry.
            withTimeout(9 * 60 * 1000L) {
                var lastProgress = 0L
                val apk = ApkDownloader(GitHubTransport()).download(asset, File(applicationContext.cacheDir, "updates")) { bytes, total ->
                    val now = android.os.SystemClock.elapsedRealtime()
                    if (bytes == 0L || bytes == total || now - lastProgress >= 200) {
                        setProgress(workDataOf("bytes" to bytes, "total" to total))
                        lastProgress = now
                    }
                }
                setProgress(workDataOf("verifying" to true, "bytes" to asset.sizeBytes, "total" to asset.sizeBytes))
                ApkInstaller.verify(applicationContext, manifest, asset, apk)
            }
            Result.success()
        } catch (timeout: TimeoutCancellationException) {
            failure("interrupted")
        } catch (cancelled: CancellationException) {
            throw cancelled // WorkManager can reschedule interrupted work; never report success.
        } catch (error: ChecksumMismatch) {
            failure("checksum")
        } catch (error: IncompatibleApk) {
            failure("signature")
        } catch (error: InvalidManifest) {
            failure("metadata")
        } catch (error: Exception) {
            failure("network")
        }
    }

    private fun failure(reason: String) = Result.failure(workDataOf("error" to reason))
}
