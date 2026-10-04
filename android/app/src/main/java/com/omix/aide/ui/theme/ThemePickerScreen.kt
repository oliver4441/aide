package com.omix.aide.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.Button
import androidx.compose.material3.Checkbox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.omix.aide.theme.Palette

/**
 * The theme-selection screen. The user taps a swatch to pick an accent theme.
 * The selection is persisted so the splash and the rest of the UI use the
 * chosen accent, and first-time users land here instead of straight into the
 * app.
 */
@Composable
fun ThemePickerScreen(
    accent: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    var selected by rememberSaveable { mutableStateOf(accent) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp)
    ) {
        Text("Theme", style = MaterialTheme.typography.headlineMedium)
        Spacer(Modifier.height(4.dp))
        Text(
            "Pick the accent theme that feels like home.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(Modifier.height(16.dp))

        LazyColumn(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items(Palette.all, key = { it.id }) { option ->
                val swatch = remember(option.id) {
                    Color(ContextCompat.getColor(context, option.swatch))
                }
                val onSwatch = remember(option.id) {
                    Color(ContextCompat.getColor(context, option.textOnSwatch))
                }

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clickable { selected = option.id }
                        .padding(vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .background(swatch, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = option.label.take(1),
                            color = onSwatch,
                            style = MaterialTheme.typography.titleMedium
                        )
                    }

                    Spacer(Modifier.width(16.dp))

                    Text(
                        text = option.label,
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f)
                    )

                    Checkbox(
                        checked = option.id == selected,
                        onCheckedChange = { if (it) selected = option.id }
                    )
                }
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.End
        ) {
            TextButton(onClick = onDismiss) { Text("Skip") }
            Spacer(Modifier.width(8.dp))
            Button(
                onClick = {
                    // Persist so the splash and the rest of the app use it.
                    Palette.write(context, selected)
                    onDismiss()
                }
            ) {
                Text("Start using Aide")
            }
        }
    }
}