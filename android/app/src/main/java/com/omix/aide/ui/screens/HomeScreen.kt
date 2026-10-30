package com.omix.aide.ui.screens

import androidx.compose.animation.*
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.delay
import com.omix.aide.ui.money
import com.omix.aide.ui.components.*
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.HomeViewModel

@Composable
fun HomeScreen(
    homeViewModel: HomeViewModel,
    onNavigateToSell: () -> Unit,
    onNavigateToStock: () -> Unit
) {
    val uiState by homeViewModel.uiState.collectAsState()

    Box(modifier = Modifier.fillMaxSize()) {
        // A wash of the accent across the top stops the dark field reading as
        // one flat slab. It sits behind everything and costs a single gradient.
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(340.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.12f),
                            Color.Transparent
                        )
                    )
                )
        )

        Column(modifier = Modifier.fillMaxSize()) {
            AideLocalOnlyBanner()

            if (uiState.isLoading) {
                LoadingState()
                return@Column
            }

            LazyColumn(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Header Hero Banner
                item {
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(rememberReveal(0)),
                        shape = RoundedCornerShape(20.dp),
                        color = MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.4f),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            MaterialTheme.colorScheme.primary.copy(alpha = 0.2f)
                        )
                    ) {
                        Column(modifier = Modifier.padding(18.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column {
                                    Text(
                                        text = "Store Dashboard",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = "Overview & Daily Sales",
                                        style = MaterialTheme.typography.labelMedium,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .size(40.dp)
                                        .clip(CircleShape)
                                        .background(MaterialTheme.colorScheme.primary),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Store,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.onPrimary,
                                        modifier = Modifier.size(22.dp)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(12.dp)
                            ) {
                                AideStatCard(
                                    title = "Sales Today",
                                    value = money(uiState.todaySalesTotal),
                                    subtitle = "${uiState.todaySalesCount} transactions",
                                    icon = Icons.Default.Payments,
                                    modifier = Modifier.weight(1f),
                                    valueColor = MaterialTheme.colorScheme.primary
                                )
                                AideStatCard(
                                    title = "Profit Today",
                                    value = money(uiState.todayProfitTotal),
                                    subtitle = "Net margin",
                                    icon = Icons.Default.TrendingUp,
                                    modifier = Modifier.weight(1f),
                                    valueColor = MaterialTheme.colorScheme.secondary
                                )
                            }
                        }
                    }
                }

                // Quick Actions Grid
                item {
                    val reveal = rememberReveal(1)
                    Text(
                        modifier = reveal,
                        text = "Quick Actions",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurface
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(reveal),
                        horizontalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        AideButton(
                            text = "New Sale",
                            onClick = onNavigateToSell,
                            icon = Icons.Default.ShoppingCart,
                            modifier = Modifier.weight(1f)
                        )
                        AideButton(
                            text = "Stock Inventory",
                            onClick = onNavigateToStock,
                            icon = Icons.Default.Inventory,
                            modifier = Modifier.weight(1f),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        )
                    }
                }

                // Visual Sales Chart
                item {
                    AideCard(modifier = rememberReveal(2)) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Icon(
                                        imageVector = Icons.Default.BarChart,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary,
                                        modifier = Modifier.size(20.dp)
                                    )
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "Weekly Sales Trend",
                                        style = MaterialTheme.typography.titleLarge,
                                        fontWeight = FontWeight.Bold
                                    )
                                }
                                AideBadge(
                                    text = "7 Days",
                                    containerColor = MaterialTheme.colorScheme.primaryContainer,
                                    contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                                )
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            AideBarChart(
                                data = uiState.weeklySalesChart,
                                height = 160.dp
                            )
                        }
                    }
                }

                // Low Stock Warning Section
                if (uiState.lowStockProducts.isNotEmpty()) {
                    item {
                        AideCard(
                            modifier = rememberReveal(3),
                            containerColor = WarningAmber.copy(alpha = 0.1f),
                            borderColor = WarningAmber.copy(alpha = 0.4f),
                            onClick = onNavigateToStock
                        ) {
                            Row(
                                modifier = Modifier
                                    .padding(16.dp)
                                    .fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Row(
                                    modifier = Modifier.weight(1f),
                                    verticalAlignment = Alignment.CenterVertically
                                ) {
                                    Box(
                                        modifier = Modifier
                                            .size(40.dp)
                                            .clip(CircleShape)
                                            .background(WarningAmber.copy(alpha = 0.2f)),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.Warning,
                                            contentDescription = null,
                                            tint = WarningAmber,
                                            modifier = Modifier.size(22.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = "Low Stock Attention",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.Bold,
                                            color = WarningAmber
                                        )
                                        Text(
                                            text = "${uiState.lowStockProducts.size} items are running low in inventory",
                                            style = MaterialTheme.typography.bodyMedium,
                                            color = MaterialTheme.colorScheme.onSurface
                                        )
                                    }
                                }
                                Icon(
                                    imageVector = Icons.Default.ChevronRight,
                                    contentDescription = "View Stock",
                                    tint = WarningAmber
                                )
                            }
                        }
                    }
                }

                // Recent Activity
                item {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .then(rememberReveal(4)),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Recent Transactions",
                            style = MaterialTheme.typography.titleLarge,
                            fontWeight = FontWeight.Bold
                        )
                        AideBadge(
                            text = "${uiState.recentSales.size} sales",
                            containerColor = MaterialTheme.colorScheme.surfaceVariant,
                            contentColor = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                if (uiState.recentSales.isEmpty()) {
                    item {
                        AideEmptyState(
                            message = "No sales recorded today yet.",
                            actionLabel = "New Sale",
                            onAction = onNavigateToSell
                        )
                    }
                } else {
                    itemsIndexed(uiState.recentSales) { position, saleWithItems ->
                        AideCard(modifier = rememberReveal(5 + position)) {
                            Row(
                                modifier = Modifier
                                    .padding(16.dp)
                                    .fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    Box(
                                        modifier = Modifier
                                            .size(42.dp)
                                            .clip(CircleShape)
                                            .background(MaterialTheme.colorScheme.primaryContainer),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            imageVector = Icons.Default.ReceiptLong,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.onPrimaryContainer,
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                    Spacer(modifier = Modifier.width(12.dp))
                                    Column {
                                        Text(
                                            text = "Sale #${saleWithItems.sale.id.takeLast(6)}",
                                            style = MaterialTheme.typography.titleMedium,
                                            fontWeight = FontWeight.SemiBold
                                        )
                                        Text(
                                            text = "${saleWithItems.items.size} items • ${saleWithItems.sale.paymentMethod.uppercase()}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurfaceVariant
                                        )
                                    }
                                }
                                Text(
                                    text = money(saleWithItems.sale.total),
                                    style = MaterialTheme.typography.titleLarge,
                                    fontWeight = FontWeight.ExtraBold,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Fade-and-lift, staggered by [index].
 *
 * Every section used to land on the same frame, fully formed, which made the
 * dashboard read like a picture of a till rather than a till. This returns a
 * modifier so it can sit on whatever the item's root happens to be, and it
 * starts in its finished state when the system has animations switched off.
 */
@Composable
private fun rememberReveal(index: Int): Modifier {
    val animate = remember { animationsEnabled() }
    var shown by remember { mutableStateOf(!animate) }

    LaunchedEffect(Unit) {
        if (!animate) return@LaunchedEffect
        delay(index * 70L)
        shown = true
    }

    val progress by animateFloatAsState(
        targetValue = if (shown) 1f else 0f,
        animationSpec = tween(durationMillis = 420, easing = FastOutSlowInEasing),
        label = "reveal-$index"
    )

    return Modifier.graphicsLayer {
        alpha = progress
        translationY = (1f - progress) * 22.dp.toPx()
    }
}
