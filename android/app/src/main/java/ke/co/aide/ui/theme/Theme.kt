package ke.co.aide.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val DarkColorScheme = darkColorScheme(
    primary = PrimaryGreen,
    secondary = SecondaryTeal,
    background = SurfaceDark,
    surface = SurfaceCardDark,
    onPrimary = SurfaceDark,
    onSecondary = SurfaceDark,
    onBackground = TextOnSurfaceDark,
    onSurface = TextOnSurfaceDark,
    error = DangerRed
)

private val LightColorScheme = lightColorScheme(
    primary = PrimaryGreenDark,
    secondary = SecondaryTeal,
    background = SurfaceLight,
    surface = SurfaceCardLight,
    onPrimary = SurfaceLight,
    onSecondary = SurfaceLight,
    onBackground = TextOnSurfaceLight,
    onSurface = TextOnSurfaceLight,
    error = DangerRed
)

@Composable
fun AideTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme

    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
