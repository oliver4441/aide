package com.omix.aide.ui.releases

import com.omix.aide.updates.isNewerVersion

/** Compatibility helper for the original build-number comparison tests. */
fun isNewerRelease(publishedCode: Int, installedCode: Int): Boolean =
    isNewerVersion(publishedCode.toLong(), installedCode.toLong())
