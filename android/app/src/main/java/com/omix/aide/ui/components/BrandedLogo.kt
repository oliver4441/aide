package com.omix.aide.ui.components

import android.content.Context
import android.graphics.Color
import android.graphics.Paint
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.ImageView
import com.omix.aide.R

/**
 * The Aide brand mark. Light-blue (#4DA8FF) geometric logo (three parallel
 * diagonal strokes crossed by two perpendicular bars). Placed on a slate
 * circle so it reads well on both light and dark backgrounds.
 */
class BrandedLogo @JvmOverloads constructor(
    context: Context,
    attrs: android.util.AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    private val mark by lazy {
        ImageView(context).apply {
            setImageDrawable(resources.getDrawable(R.drawable.app_icon, null))
            scaleType = ImageView.ScaleType.CENTER_INSIDE
        }
    }

    private val circle by lazy {
        ImageView(context).apply {
            setImageDrawable(resources.getDrawable(R.drawable.app_circle, null))
            scaleType = ImageView.ScaleType.CENTER_INSIDE
        }
    }

    init {
        orientation = VERTICAL
        addView(circle)
        addView(mark)
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        super.onMeasure(widthMeasureSpec, heightMeasureSpec)
        // Size to the larger of the parent or a fixed 128dp so the logo is a
        // strong brand element on the splash and theme picker.
        val width = measuredWidth
        val height = measuredHeight
        val target = 128
        setMeasuredDimension(
            width.coerceAtLeast(target),
            height.coerceAtLeast(target)
        )
    }
}
