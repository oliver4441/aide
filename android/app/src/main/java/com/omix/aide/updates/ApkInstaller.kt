package com.omix.aide.updates

import android.content.ClipData
import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.os.Build
import android.net.Uri
import android.provider.Settings
import androidx.core.content.FileProvider
import androidx.core.content.pm.PackageInfoCompat
import java.io.File
import java.security.MessageDigest

class IncompatibleApk(message: String) : SecurityException(message)

@Suppress("DEPRECATION")
object ApkInstaller {
    fun installed(context: Context): InstalledVersion {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        return InstalledVersion(info.versionName ?: "Unknown", PackageInfoCompat.getLongVersionCode(info))
    }

    fun canInstall(context: Context): Boolean = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.packageManager.canRequestPackageInstalls()
    } else {
        // API 24/25 have a global Unknown sources switch rather than a per-app grant.
        runCatching { Settings.Secure.getInt(context.contentResolver, Settings.Secure.INSTALL_NON_MARKET_APPS, 0) == 1 }.getOrDefault(false)
    }

    fun permissionIntent(context: Context): Intent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:${context.packageName}"))
    } else Intent(Settings.ACTION_SECURITY_SETTINGS)

    /** PackageInstaller remains the final authority; these checks prevent a bad handoff. */
    fun verify(context: Context, manifest: ReleaseManifest, asset: ApkAsset, apk: File) {
        if (!ApkChecksum.matches(apk, asset)) throw ChecksumMismatch()
        val flags = if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else PackageManager.GET_SIGNATURES
        val archive = context.packageManager.getPackageArchiveInfo(apk.absolutePath, flags)
            ?: throw IncompatibleApk("Android could not read the downloaded APK")
        val installed = context.packageManager.getPackageInfo(context.packageName, flags)
        val certificate = setOf(manifest.certificateSha256)
        if (archive.packageName != UPDATE_PACKAGE || archive.packageName != context.packageName) {
            throw IncompatibleApk("This APK belongs to a different app")
        }
        if (PackageInfoCompat.getLongVersionCode(archive) != manifest.versionCode || archive.versionName != manifest.versionName) {
            throw IncompatibleApk("The APK version does not match the release")
        }
        if (!isNewerVersion(manifest.versionCode, PackageInfoCompat.getLongVersionCode(installed))) {
            throw IncompatibleApk("This version is already installed or is older")
        }
        if (signers(archive) != certificate || signers(installed) != certificate) {
            throw IncompatibleApk("The signing certificate does not match your installed app. Your existing app and data have not been changed.")
        }
        if (Build.VERSION.SDK_INT >= 24 && (archive.applicationInfo?.minSdkVersion ?: Int.MAX_VALUE) > Build.VERSION.SDK_INT) {
            throw IncompatibleApk("This update needs a newer version of Android")
        }
    }

    private fun signers(info: PackageInfo): Set<String> {
        val signatures = if (Build.VERSION.SDK_INT >= 28) info.signingInfo?.apkContentsSigners else info.signatures
        return signatures.orEmpty().map { MessageDigest.getInstance("SHA-256").digest(it.toByteArray()).toHex() }.toSet()
    }

    fun intent(context: Context, apk: File): Intent {
        val uri = FileProvider.getUriForFile(context, "${context.packageName}.updates", apk)
        return Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            clipData = ClipData.newRawUri("Aide update", uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            putExtra(Intent.EXTRA_RETURN_RESULT, true)
            // No device-owner API, shell install, root command or silent-install flag.
        }
    }
}
