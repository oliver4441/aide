package com.omix.aide.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.core.content.ContextCompat
import com.omix.aide.theme.Palette

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryGreen,
    secondary = SecondaryTeal,
    background = SurfaceDark,
    surface = SurfaceCardDark,
    surfaceVariant = SurfaceCardDark,
    onPrimary = SurfaceDark,
    onSecondary = SurfaceDark,
    onBackground = TextOnSurfaceDark,
    onSurface = TextOnSurfaceDark,
    // Previously undefined, so every muted label fell back to Material's
    // default purple-grey or, worse, to onSurface.copy(alpha = 0.6f).
    onSurfaceVariant = TextMutedDark,
    outline = TextMutedDark.copy(alpha = 0.35f),
    error = DangerRed
)

private val LightColorScheme = lightColorScheme(
    primary = PrimaryGreenDark,
    secondary = SecondaryTeal,
    background = SurfaceLight,
    surface = SurfaceCardLight,
    surfaceVariant = SurfaceLight,
    onPrimary = SurfaceLight,
    onSecondary = SurfaceLight,
    onBackground = TextOnSurfaceLight,
    onSurface = TextOnSurfaceLight,
    onSurfaceVariant = TextMutedLight,
    outline = TextMutedLight.copy(alpha = 0.35f),
    error = DangerRed
)

@Composable
fun AideTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    accent: String = "plum",
    content: @Composable () -> Unit
) {
    // The accent the user picked on the theme picker drives primary/onPrimary;
    // everything else falls back to the default slate palette.
    val context = LocalContext.current
    val accentColor = remember(accent, darkTheme) {
        runCatching { Color(ContextCompat.getColor(context, Palette.find(accent).swatch)) }
            .getOrElse { if (darkTheme) PrimaryGreen else PrimaryGreenDark }
    }
    val onAccent = remember(accent, darkTheme) {
        runCatching { Color(ContextCompat.getColor(context, Palette.find(accent).textOnSwatch)) }
            .getOrElse { Color.White }
    }

    val base = if (darkTheme) DarkColorScheme else LightColorScheme
    val colorScheme = base.copy(primary = accentColor, onPrimary = onAccent)

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
