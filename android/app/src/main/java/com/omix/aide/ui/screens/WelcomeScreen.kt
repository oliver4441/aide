package com.omix.aide.ui.screens

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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.omix.aide.R

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
 */
@Composable
fun WelcomeScreen(
    onGetStarted: () -> Unit,
    onSkip: () -> Unit
) {
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
            Spacer(Modifier.height(24.dp))

            BrandMark()

            Spacer(Modifier.height(20.dp))

            Text(
                text = "Aide",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Black,
                color = MaterialTheme.colorScheme.onSurface
            )
            Spacer(Modifier.height(6.dp))
            Text(
                text = "Sell, keep stock and see the day's takings — on one phone, " +
                    "with no internet needed.",
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )

            Spacer(Modifier.height(28.dp))

            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(18.dp)
            ) {
                WelcomePoint(
                    icon = Icons.Default.ShoppingCart,
                    title = "Ring up a sale in seconds",
                    detail = "Tap a product, take cash, mobile money or card, and share the receipt."
                )
                WelcomePoint(
                    icon = Icons.Default.Inventory,
                    title = "Know what's running out",
                    detail = "A low-stock alert names the products and how many units are left."
                )
                WelcomePoint(
                    icon = Icons.Default.Assessment,
                    title = "Close the day with numbers",
                    detail = "Takings, profit and the payment split, at the closing time you pick."
                )
                WelcomePoint(
                    icon = Icons.Default.Lock,
                    title = "No account, no signal",
                    detail = "Everything stays on this phone. Export a copy from Settings whenever you like."
                )
            }

            Spacer(Modifier.height(24.dp))
        }

        Spacer(Modifier.height(12.dp))

        Button(
            onClick = onGetStarted,
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            shape = RoundedCornerShape(16.dp)
        ) {
            Text("Get started", fontWeight = FontWeight.Bold)
        }

        TextButton(
            onClick = onSkip,
            modifier = Modifier.fillMaxWidth()
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
        )
    }
}

/** The Aide mark: the app icon on its accent circle. */
@Composable
private fun BrandMark() {
    Box(
        modifier = Modifier
            .size(96.dp)
            .clip(CircleShape)
            .background(MaterialTheme.colorScheme.primaryContainer),
        contentAlignment = Alignment.Center
    ) {
        Image(
            painter = painterResource(id = R.drawable.app_circle),
            contentDescription = null,
            modifier = Modifier.size(96.dp)
        )
        Image(
            painter = painterResource(id = R.drawable.app_icon),
            contentDescription = "Aide",
            modifier = Modifier.size(64.dp)
        )
    }
}

/** One icon + title + line of explanation. */
@Composable
private fun WelcomePoint(
    icon: ImageVector,
    title: String,
    detail: String
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
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

        Spacer(Modifier.width(14.dp))

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
