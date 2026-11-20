package com.omix.aide.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Sync
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.omix.aide.ui.theme.WarningAmber

@Composable
fun AideButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    colors: ButtonColors = ButtonDefaults.buttonColors(
        containerColor = MaterialTheme.colorScheme.primary
    )
) {
    Button(
        onClick = onClick,
        modifier = modifier.fillMaxWidth().height(48.dp),
        enabled = enabled,
        shape = RoundedCornerShape(12.dp),
        colors = colors
    ) {
        Text(text = text, style = MaterialTheme.typography.titleMedium)
    }
}

@Composable
fun AideCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        // A hairline border reads cleaner than a drop shadow on both surfaces,
        // and it keeps the card edge legible in dark mode where elevation
        // shading is almost invisible.
        border = BorderStroke(1.dp, MaterialTheme.colorScheme.outline),
        elevation = CardDefaults.cardElevation(defaultElevation = 0.dp),
        content = content
    )
}

@Composable
fun AideStatCard(
    title: String,
    value: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    valueColor: Color = MaterialTheme.colorScheme.onSurface
) {
    AideCard(modifier = modifier) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(text = title, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
            Spacer(modifier = Modifier.height(4.dp))
            Text(text = value, style = MaterialTheme.typography.headlineMedium, color = valueColor, fontWeight = FontWeight.Bold)
            if (subtitle != null) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(text = subtitle, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f))
            }
        }
    }
}

@Composable
fun AideProductRow(
    name: String,
    stock: Int,
    price: String,
    sku: String? = null,
    lowStockThreshold: Int = 5,
    imagePath: String? = null,
    onAddClick: (() -> Unit)? = null
) {
    AideCard(modifier = Modifier.padding(vertical = 4.dp)) {
        Row(
            modifier = Modifier.padding(16.dp).fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Thumbnail first so a photo-led catalogue reads as a catalogue
            // rather than a wall of text.
            if (!imagePath.isNullOrBlank()) {
                ProductThumbnail(path = imagePath, size = 56)
                Spacer(modifier = Modifier.width(12.dp))
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(text = name, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.SemiBold)
                if (!sku.isNull_or_blank_check()) {
                    Text(text = "SKU: $sku", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f))
                }
                val isLow = stock <= lowStockThreshold
                Text(
                    text = "Stock: $stock",
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (isLow) WarningAmber else MaterialTheme.colorScheme.onSurfaceVariant,
                    fontWeight = if (isLow) FontWeight.Bold else FontWeight.Normal
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text(text = price, style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                if (onAddClick != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = onAddClick,
                        modifier = Modifier.heightIn(min = 48.dp),
                        shape = RoundedCornerShape(8.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                    ) {
                        Text("+ Add", style = MaterialTheme.typography.labelMedium)
                    }
                }
            }
        }
    }
}

private fun String?.isNull_or_blank_check(): Boolean = this.isNullOrBlank()

@Composable
fun AideSearchBar(
    query: String,
    onQueryChange: (String) -> Unit,
    placeholder: String = "Search products..."
) {
    OutlinedTextField(
        value = query,
        onValueChange = onQueryChange,
        modifier = Modifier.fillMaxWidth(),
        placeholder = { Text(placeholder) },
        leadingIcon = { Icon(Icons.Default.Search, contentDescription = "Search") },
        shape = RoundedCornerShape(12.dp),
        singleLine = true
    )
}

@Composable
fun AideLocalOnlyBanner() {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.15f))
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(
            imageVector = Icons.Default.PhoneAndroid,
            contentDescription = "Local only",
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(18.dp)
        )
        Spacer(modifier = Modifier.width(8.dp))
        Text(
            text = "Data is stored only on this device",
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

@Composable
fun AideEmptyState(
    message: String,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null
) {
    Column(
        modifier = Modifier.fillMaxWidth().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(text = message, style = MaterialTheme.typography.bodyLarge, color = MaterialTheme.colorScheme.onSurfaceVariant)
        if (actionLabel != null && onAction != null) {
            Spacer(modifier = Modifier.height(16.dp))
            AideButton(text = actionLabel, onClick = onAction, modifier = Modifier.width(200.dp))
        }
    }
}

/**
 * Shown while a screen's first read from Room is still in flight.
 *
 * Both HomeUiState and StockUiState start with isLoading = true, but nothing
 * consumed it -- so the app flashed "No sales recorded today yet" and a row of
 * zeroed stats before the real numbers landed. This is what should occupy that
 * window instead.
 */
@Composable
fun LoadingState(modifier: Modifier = Modifier) {
    Column(
        modifier = modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        CircularProgressIndicator(
            color = MaterialTheme.colorScheme.primary,
            strokeWidth = 2.dp,
            modifier = Modifier.size(28.dp)
        )
    }
}
