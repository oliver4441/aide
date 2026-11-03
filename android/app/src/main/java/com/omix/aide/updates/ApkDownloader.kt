package com.omix.aide.updates

import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.security.MessageDigest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext

class ChecksumMismatch : IOException("The APK checksum did not match")
class IncompleteDownload : IOException("The APK download was incomplete")

object ApkChecksum {
    fun sha256(file: File): String = file.inputStream().use { stream ->
        val digest = MessageDigest.getInstance("SHA-256")
        val buffer = ByteArray(64 * 1024)
        while (true) {
            val read = stream.read(buffer)
            if (read < 0) break
            digest.update(buffer, 0, read)
        }
        digest.digest().toHex()
    }

    fun matches(file: File, asset: ApkAsset): Boolean =
        file.isFile && file.length() == asset.sizeBytes &&
            MessageDigest.isEqual(sha256(file).toByteArray(), asset.sha256.lowercase().toByteArray())
}

internal fun ByteArray.toHex(): String = joinToString("") { "%02x".format(it) }

/**
 * A .part file is never installable. Every retry restarts safely from byte zero;
 * only a complete, fsynced, checksum-verified file is atomically renamed to .apk.
 */
class ApkDownloader(private val transport: UpdateTransport) {
    suspend fun download(
        asset: ApkAsset,
        directory: File,
        onProgress: suspend (Long, Long) -> Unit = { _, _ -> }
    ): File = withContext(Dispatchers.IO) {
        check(directory.isDirectory || directory.mkdirs()) { "Cannot create update directory" }
        val destination = File(directory, asset.fileName)
        val partial = File(directory, "${asset.fileName}.part")
        try {
            if (ApkChecksum.matches(destination, asset)) {
                onProgress(asset.sizeBytes, asset.sizeBytes)
                return@withContext destination
            }
            destination.delete()
            partial.delete()
            transport.open(asset.url).use { response ->
                if (response.status != 200) throw UpdateNetworkException("Download returned HTTP ${response.status}")
                if (response.length >= 0 && response.length != asset.sizeBytes) throw IncompleteDownload()
                val digest = MessageDigest.getInstance("SHA-256")
                var received = 0L
                response.body.use { input ->
                    FileOutputStream(partial, false).use { output ->
                        val buffer = ByteArray(64 * 1024)
                        onProgress(0, asset.sizeBytes)
                        while (true) {
                            currentCoroutineContext().ensureActive()
                            val read = input.read(buffer)
                            if (read < 0) break
                            received += read
                            if (received > asset.sizeBytes) throw IncompleteDownload()
                            output.write(buffer, 0, read)
                            digest.update(buffer, 0, read)
                            onProgress(received, asset.sizeBytes)
                        }
                        output.fd.sync()
                    }
                }
                currentCoroutineContext().ensureActive()
                if (received != asset.sizeBytes) throw IncompleteDownload()
                if (!MessageDigest.isEqual(digest.digest().toHex().toByteArray(), asset.sha256.lowercase().toByteArray())) {
                    throw ChecksumMismatch()
                }
            }
            if (!partial.renameTo(destination)) throw IOException("Cannot save verified APK")
            destination
        } finally {
            // Also executes for cancellation, disk-full, timeout and stream errors.
            partial.delete()
        }
    }
}
