package com.omix.aide.ui.components

import android.animation.ValueAnimator
import android.os.Build

/**
 * Whether the system currently allows animations.
 *
 * Compose keeps animating when the user switches animations off in the
 * accessibility settings unless the app asks first. Every entrance animation in
 * Aide checks this and starts in its finished state instead, so the app is
 * usable the way the phone is configured.
 */
fun animationsEnabled(): Boolean =
    Build.VERSION.SDK_INT < Build.VERSION_CODES.O || ValueAnimator.areAnimatorsEnabled()
