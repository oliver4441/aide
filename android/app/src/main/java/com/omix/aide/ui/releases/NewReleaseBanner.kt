package com.omix.aide.ui.releases

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.webkit.URLUtil
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import com.omix.aide.BuildConfig
import com.omix.aide.R
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.ui.components.BrandedLogo
import com.omix.aide.theme.Palette

/**
 * The new-release notification banner.
 *
 * Shows once per installed version when `BuildConfig.LATEST_VERSION_CODE` is
 * greater than the installed `BuildConfig.VERSION_CODE`. The user can open the
 * latest release on GitHub or dismiss the banner for the rest of this install.
 *
 * The banner is intentionally lightweight: it is a plain Android view, so no
 * additional dependency is required. The actual download is left to the user —
 * the link goes to the GitHub release page (or a direct APK URL when
 * `RELEASE_APK_URL` is set).
 */
@SuppressLint("SetTextI18n")
fun Context.newReleaseBanner(
    onOpenRelease: () -> Unit
): LinearLayout {
    val root = LayoutInflater.from(this).inflate(
        R.layout.release_banner, null
    ) as LinearLayout

    val logo = root.findViewById<BrandedLogo>(R.id.release_banner_logo)
    val title = root.findViewById<TextView>(R.id.release_banner_title)
    val message = root.findViewById<TextView>(R.id.release_banner_message)
    val open = root.findViewById<Button>(R.id.release_banner_open)
    val dismiss = root.findViewById<Button>(R.id.release_banner_dismiss)

    // Read the persisted out-of-date state from LocalBusinessStore.
    val store = LocalBusinessStore(this)

    // The banner only shows the first time this version launches.
    if (store.isOutOfDate()) {
        val primary = resources.getColor(
            Palette.find(BuildConfig.BRANDED).swatch, null
        )
        val onPrimary = resources.getColor(
            Palette.find(BuildConfig.BRANDED).textOnSwatch, null
        )

        logo.visibility = View.VISIBLE
        title.setText("Aide ${BuildConfig.VERSION_NAME} is ready")
        message.setText(
            "New release available. " +
                "You're on ${BuildConfig.VERSION_NAME}; the latest is " +
                "Aide ${getLatestLabel()} — what's new? " +
                "Open the release page?"
        )
        open.setBackgroundResource(R.drawable.btn_primary)
        open.setTextColor(resources.getColor(android.R.color.white, null))
        open.setOnClickListener { onOpenRelease() }
        dismiss.setText("Maybe later")
        dismiss.setOnClickListener {
            store.markUpToDate()
            root.visibility = View.GONE
        }

        root.visibility = View.VISIBLE
    }

    return root
}

/** Friendly label for the latest release (e.g. "Aide 1.0.3"), or a code fallback. */
private fun getLatestLabel(): String {
    val latest = BuildConfig.LATEST_VERSION_CODE
    return if (latest > 0) "Aide ${latest}" else "Aide ${BuildConfig.VERSION_CODE}"
}
