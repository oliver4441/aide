package com.omix.aide.ui.screens

import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.core.content.ContextCompat
import com.omix.aide.R
import com.omix.aide.data.local.AideDatabase
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.theme.Palette
import com.omix.aide.ui.components.BrandedLogo
import com.omix.aide.ui.releases.newReleaseBanner
import com.omix.aide.work.AideWorkScheduler

/**
 * The branded splash screen.
 *
 * It shows the Aide logo on the user's chosen theme colour while the local
 * database and background workers come up, and it also surfaces the
 * new-release notification banner when a newer published release exists.
 *
 * Once the database is ready it hands control to the main app — or to the
 * themed theme selector for a first-time Android user.
 *
 * The caller must have installed `R.layout.splash` as the content view first;
 * [onReady] is where the Compose UI takes over.
 */
fun ComponentActivity.showSplash(
    onReady: () -> Unit,
    accent: String
) {
    // Warm the Room singleton so the first query after the splash is cheap.
    AideDatabase.getDatabase(this)
    val store = LocalBusinessStore(this)

    // Publish the business identifier to LocalBusinessStore.
    store.getBusinessId()

    // Start the local background workers (low-stock + daily summary).
    AideWorkScheduler.scheduleAll(this)

    // Paint the splash + any nested "cards" with the persisted theme colours.
    paintCards(
        root = findViewById(android.R.id.content) as? ViewGroup
            ?: error("splash content view is missing"),
        accent = accent
    )

    // Show the new-release notification banner (hides itself once dismissed).
    // It inflates its own layout, so detach it before re-parenting.
    val banner = newReleaseBanner {
        store.markUpToDate()
    }
    (banner.parent as? ViewGroup)?.removeView(banner)

    // Insert the banner right after the splash content.
    findViewById<ViewGroup>(R.id.splash_cards)?.addView(
        banner,
        ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.WRAP_CONTENT
        )
    )

    // Show the logo + loading state.
    findViewById<BrandedLogo>(R.id.splash_logo)?.visibility = View.VISIBLE
    findViewById<ProgressBar>(R.id.splash_progress)?.visibility = View.VISIBLE

    // When the database is ready, hand control to the main app.
    val progress = findViewById<ProgressBar>(R.id.splash_progress)
    val main = Handler(Looper.getMainLooper())
    Thread {
        main.post {
            progress?.visibility = View.GONE
            onReady()
        }
    }.start()
}

/**
 * Paints the splash screen + any nested "cards" with the chosen theme's
 * primary colour and its accessible text colour.
 */
private fun ComponentActivity.paintCards(root: ViewGroup, accent: String) {
    val palette = Palette.find(accent)
    val primary = ContextCompat.getColor(this, palette.swatch)
    val onPrimary = ContextCompat.getColor(this, palette.textOnSwatch)

    // Slate text + slate line on the primary background.
    findViewById<View>(R.id.splash_line)?.setBackgroundColor(primary)

    findViewsByRecurse(root) { view ->
        when (view) {
            is TextView -> {
                view.setBackgroundColor(primary)
                view.setTextColor(onPrimary)
            }

            is android.widget.Button -> {
                view.setBackgroundColor(primary)
                view.setTextColor(onPrimary)
            }
        }
    }
}

/** Recursively applies a transform to every descendant view. */
private fun findViewsByRecurse(
    root: ViewGroup,
    action: (View) -> Unit
) {
    for (i in 0 until root.childCount) {
        val child = root.getChildAt(i)
        action(child)
        if (child is ViewGroup) findViewsByRecurse(child, action)
    }
}