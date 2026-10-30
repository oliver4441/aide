package com.omix.aide.ui.screens

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Assessment
import androidx.compose.material.icons.filled.Inventory
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.ShoppingCart
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.omix.aide.R
import com.omix.aide.ui.components.animationsEnabled
import kotlin.math.cos

/**
 * The first thing a new install shows.
 *
 * Until now a first launch dropped straight into the theme picker, with no word
 * about what the app is or what it will not do. This says both in one screen —
 * and the last point is the one that matters most: there is no account, nothing
 * syncs, and the only copy of the shop's data is on this phone.
 *
 * Everything here is a claim the app can keep: sales, low-stock alerts, the
 * closing-time summary and the JSON export all exist (see docs/android-features.md).
 *
 * The screen now has depth: the mark is a disc that turns on its own axis
 * inside a halo that does not, and the sections arrive one after another rather
 * than all at once. Nothing moves when the phone has animations switched off —
 * [animationsEnabled] decides that, and the layout is identical either way.
 */
@Composable
fun WelcomeScreen(
    onGetStarted: () -> Unit,
    onSkip: () -> Unit
) {
    val animate = remember { animationsEnabled() }

    // One value drives the whole entrance: mark, then copy, then the four
    // points, then the buttons.
    val entry = remember { Animatable(if (animate) 0f else 1f) }
    LaunchedEffect(Unit) {
        if (animate) {
            entry.animateTo(
                targetValue = 1f,
                animationSpec = tween(durationMillis = 900, easing = FastOutSlowInEasing)
            )
        }
    }

    // Ambient loop. Read only when animations are on; otherwise the static
    // values below are used and the screen simply sits still.
    val ambient = rememberInfiniteTransition(label = "welcome-ambient")
    val spin by ambient.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 6500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "coin-spin"
    )
    val haloPulse by ambient.animateFloat(
        initialValue = 0.6f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3400, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "halo-pulse"
    )
    val tilt by ambient.animateFloat(
        initialValue = -4f,
        targetValue = 4f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 5200, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "stage-tilt"
    )

    /** How far into its own reveal a block is, given when it starts. */
    fun band(start: Float): Float = ((entry.value - start) / 0.30f).coerceIn(0f, 1f)

    Box(modifier = Modifier.fillMaxSize()) {
        // A wash of the accent behind the mark, so the top of the screen has
        // depth before anything moves.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.16f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 24.dp, vertical = 20.dp)
        ) {
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(Modifier.height(16.dp))

                BrandMark(
                    spin = if (animate) spin else 0f,
                    halo = if (animate) haloPulse else 0.85f,
                    progress = band(0f)
                )

                Spacer(Modifier.height(16.dp))

                Text(
                    text = "Aide",
                    style = MaterialTheme.typography.displaySmall,
                    fontWeight = FontWeight.Black,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.graphicsLayer {
                        val p = band(0.14f)
                        alpha = p
                        translationY = (1f - p) * 16.dp.toPx()
                    }
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = "Sell, keep stock and see the day's takings — on one phone, " +
                        "with no internet needed.",
                    style = MaterialTheme.typography.bodyLarge,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.graphicsLayer {
                        val p = band(0.22f)
                        alpha = p
                        translationY = (1f - p) * 16.dp.toPx()
                    }
                )

                Spacer(Modifier.height(24.dp))

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        // A few degrees of tilt is enough to read as depth; the
                        // cards stay square enough to read at a glance.
                        .graphicsLayer {
                            cameraDistance = 20f * density
                            rotationX = if (animate) tilt else 0f
                        },
                    verticalArrangement = Arrangement.spacedBy(18.dp)
                ) {
                    WelcomePoint(
                        icon = Icons.Default.ShoppingCart,
                        title = "Ring up a sale in seconds",
                        detail = "Tap a product, take cash, mobile money or card, and share the receipt.",
                        reveal = band(0.30f)
                    )
                    WelcomePoint(
                        icon = Icons.Default.Inventory,
                        title = "Know what's running out",
                        detail = "A low-stock alert names the products and how many units are left.",
                        reveal = band(0.40f)
                    )
                    WelcomePoint(
                        icon = Icons.Default.Assessment,
                        title = "Close the day with numbers",
                        detail = "Takings, profit and the payment split, at the closing time you pick.",
                        reveal = band(0.50f)
                    )
                    WelcomePoint(
                        icon = Icons.Default.Lock,
                        title = "No account, no signal",
                        detail = "Everything stays on this phone. Export a copy from Settings whenever you like.",
                        reveal = band(0.60f)
                    )
                }

                Spacer(Modifier.height(24.dp))
            }

            Spacer(Modifier.height(12.dp))

            Button(
                onClick = onGetStarted,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .graphicsLayer {
                        val p = band(0.72f)
                        alpha = p
                        translationY = (1f - p) * 18.dp.toPx()
                    },
                shape = RoundedCornerShape(16.dp)
            ) {
                Text("Get started", fontWeight = FontWeight.Bold)
            }

            TextButton(
                onClick = onSkip,
                modifier = Modifier
                    .fillMaxWidth()
                    .graphicsLayer {
                        val p = band(0.80f)
                        alpha = p
                        translationY = (1f - p) * 18.dp.toPx()
                    }
            ) {
                Text("Skip to the app")
            }

            Text(
                text = "You can change the theme, currency and VAT rate later in Settings.",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 4.dp, bottom = 4.dp)
                    .graphicsLayer { alpha = band(0.86f) }
            )
        }
    }
}

/**
 * The Aide mark: the app icon on its accent circle, turned into a disc.
 *
 * The disc rotates on its own Y axis. Two faces sit 180° apart and their alphas
 * swap at the halfway point, because Compose has no backface culling — without
 * that the logo would read mirrored half the time. The halo behind it does not
 * rotate, so the mark still reads at the instant the disc is edge-on.
 */
@Composable
private fun BrandMark(
    spin: Float,
    halo: Float,
    progress: Float
) {
    val scale = 0.72f + 0.28f * overshoot(progress)
    val facing = cos(Math.toRadians(spin.toDouble())).toFloat()
    val front = if (facing >= 0f) 1f else 0f
    val back = 1f - front

    Box(contentAlignment = Alignment.Center) {
        Box(
            modifier = Modifier
                .size(150.dp)
                .graphicsLayer {
                    scaleX = halo
                    scaleY = halo
                    alpha = 0.55f * halo
                }
                .background(
                    brush = Brush.radialGradient(
                        colors = listOf(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.38f),
                            Color.Transparent
                        )
                    ),
                    shape = CircleShape
                )
        )

        Box(
            modifier = Modifier
                .size(96.dp)
                .graphicsLayer {
                    scaleX = scale
                    scaleY = scale
                    cameraDistance = 12f * density
                    rotationY = spin
                }
                .clip(CircleShape)
                .background(MaterialTheme.colorScheme.primaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Image(
                painter = painterResource(id = R.drawable.app_circle),
                contentDescription = null,
                modifier = Modifier
                    .size(96.dp)
                    .graphicsLayer { alpha = front }
            )
            Image(
                painter = painterResource(id = R.drawable.app_icon),
                contentDescription = "Aide",
                modifier = Modifier
                    .size(64.dp)
                    .graphicsLayer { alpha = front }
            )
            // The far face, pre-mirrored so it reads the right way round.
            Image(
                painter = painterResource(id = R.drawable.app_circle),
                contentDescription = null,
                modifier = Modifier
                    .size(96.dp)
                    .graphicsLayer {
                        rotationY = 180f
                        alpha = back
                    }
            )
            Image(
                painter = painterResource(id = R.drawable.app_icon),
                contentDescription = "Aide",
                modifier = Modifier
                    .size(64.dp)
                    .graphicsLayer {
                        rotationY = 180f
                        alpha = back
                    }
            )
        }
    }
}

/** One icon + title + line of explanation. */
@Composable
private fun WelcomePoint(
    icon: ImageVector,
    title: String,
    detail: String,
    reveal: Float
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer {
                alpha = reveal
                translationY = (1f - reveal) * 20.dp.toPx()
            },
        verticalAlignment = Alignment.Top
    ) {
        Box(
            modifier = Modifier
                .size(40.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(MaterialTheme.colorScheme.secondaryContainer),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSecondaryContainer,
                modifier = Modifier.size(20.dp)
            )
        }

        Spacer(modifier = Modifier.width(14.dp))

        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = detail,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Ease-out-back. Goes past the target by a hair before settling, which is what
 * makes the mark feel placed rather than faded in. (0 -> 0, 1 -> 1.)
 */
private fun overshoot(p: Float): Float {
    val c1 = 1.70158f
    val c3 = c1 + 1f
    val x = p - 1f
    return 1f + c3 * x * x * x + c1 * x * x
}
