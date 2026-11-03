package com.omix.aide.updates

import java.io.ByteArrayInputStream
import java.io.File
import java.io.IOException
import java.io.InputStream
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.test.runTest
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class ApkDownloaderTest {
    @get:Rule val temporary = TemporaryFolder()
    private val asset get() = testManifest().assets.single()

    @Test fun verifiesChecksumBeforePublishingAnInstallableApkAndReportsProgress() = runTest {
        val directory = temporary.newFolder()
        val progress = mutableListOf<Long>()
        val apk = ApkDownloader { response() }.download(asset, directory) { received, total ->
            assertEquals(asset.sizeBytes, total)
            progress += received
            assertFalse(File(directory, asset.fileName).exists())
        }
        assertArrayEquals(testBytes, apk.readBytes())
        assertTrue(ApkChecksum.matches(apk, asset))
        assertEquals(0L, progress.first())
        assertEquals(asset.sizeBytes, progress.last())
        assertFalse(File(directory, "${asset.fileName}.part").exists())
    }
    @Test fun corruptedBytesAreDeletedAndNeverOfferedToInstaller() = runTest {
        val wrong = testBytes.copyOf().apply { this[0] = 0 }
        failsCleanly(ChecksumMismatch::class.java, UpdateTransport { response(wrong) })
    }
    @Test fun truncatedStreamWithUnknownContentLengthIsRejected() = runTest {
        failsCleanly(IncompleteDownload::class.java, UpdateTransport { response(testBytes.copyOf(4), length = -1) })
    }
    @Test fun oversizedResponseIsRejectedEvenWithoutContentLength() = runTest {
        failsCleanly(IncompleteDownload::class.java, UpdateTransport { response(testBytes + testBytes, length = -1) })
    }
    @Test fun mismatchedContentLengthIsRejectedBeforeWriting() = runTest {
        failsCleanly(IncompleteDownload::class.java, UpdateTransport { response(length = 5) })
    }
    @Test fun httpFailuresAreNotSavedAsAnApk() = runTest {
        failsCleanly(UpdateNetworkException::class.java, UpdateTransport { response(status = 503) })
    }
    @Test fun networkFailureMidStreamRemovesPartialDownload() = runTest {
        val stream = object : InputStream() {
            var read = false
            override fun read(): Int = throw IOException("connection reset")
            override fun read(buffer: ByteArray, offset: Int, length: Int): Int {
                if (read) throw IOException("connection reset")
                read = true
                buffer[offset] = 1
                return 1
            }
        }
        failsCleanly(IOException::class.java, UpdateTransport { response(length = -1, stream = stream) })
    }
    @Test fun cancelledDownloadCleansUpAndDoesNotReturnSuccess() = runTest {
        val directory = temporary.newFolder()
        try {
            ApkDownloader { response() }.download(asset, directory) { bytes, _ -> if (bytes > 0) throw CancellationException("interrupted") }
            fail("Expected cancellation")
        } catch (_: CancellationException) { }
        assertTrue(directory.listFiles()!!.isEmpty())
    }
    @Test fun leftoverPartialFileFromAProcessKillIsRestartedNotAppended() = runTest {
        val directory = temporary.newFolder()
        File(directory, "${asset.fileName}.part").writeText("stale bytes from another attempt")
        val apk = ApkDownloader { response() }.download(asset, directory)
        assertArrayEquals(testBytes, apk.readBytes())
    }
    @Test fun checksumVerifiedCachedApkNeedsNoNetwork() = runTest {
        val directory = temporary.newFolder()
        File(directory, asset.fileName).writeBytes(testBytes)
        val apk = ApkDownloader { throw AssertionError("Unexpected network request") }.download(asset, directory)
        assertTrue(ApkChecksum.matches(apk, asset))
    }
    @Test fun tamperedCachedApkIsDownloadedAgain() = runTest {
        val directory = temporary.newFolder()
        File(directory, asset.fileName).writeBytes(ByteArray(testBytes.size))
        val apk = ApkDownloader { response() }.download(asset, directory)
        assertArrayEquals(testBytes, apk.readBytes())
    }
    @Test fun retryAfterFailureCanCompleteNormally() = runTest {
        val directory = temporary.newFolder()
        try { ApkDownloader { response(status = 500) }.download(asset, directory) } catch (_: IOException) { }
        assertTrue(ApkChecksum.matches(ApkDownloader { response() }.download(asset, directory), asset))
    }
    @Test fun redirectsMustUseHttpsAndKnownGitHubHosts() {
        assertTrue(trustedDownloadHost("https://release-assets.githubusercontent.com/file?signature=ok"))
        assertFalse(trustedDownloadHost("http://github.com/file"))
        assertFalse(trustedDownloadHost("https://github.com.evil.example/file"))
        assertFalse(trustedDownloadHost("https://github.com@evil.example/file"))
        assertFalse(trustedDownloadHost("https://github.com:8080/file"))
    }

    private suspend fun failsCleanly(type: Class<out Throwable>, transport: UpdateTransport) {
        val directory = temporary.newFolder()
        try {
            ApkDownloader(transport).download(asset, directory)
            fail("Expected ${type.simpleName}")
        } catch (error: Throwable) {
            if (!type.isInstance(error)) throw error
        }
        assertTrue("Failure left an APK or partial file", directory.listFiles()!!.isEmpty())
    }
}
