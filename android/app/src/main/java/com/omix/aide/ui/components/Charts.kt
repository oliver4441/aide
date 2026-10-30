package com.omix.aide.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.omix.aide.ui.money

data class ChartDataPoint(
    val label: String,
    val value: Float,
    val secondaryValue: Float = 0f,
    val formattedValue: String? = null
)

/**
 * Animated Expressive Bar Chart using Jetpack Compose Canvas.
 */
@Composable
fun AideBarChart(
    data: List<ChartDataPoint>,
    modifier: Modifier = Modifier,
    barColor: Color = MaterialTheme.colorScheme.primary,
    accentColor: Color = MaterialTheme.colorScheme.secondary,
    height: Dp = 180.dp,
    showGridLines: Boolean = true
) {
    if (data.isEmpty()) {
        Box(
            modifier = modifier
                .fillMaxWidth()
                .height(height)
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f),
                    RoundedCornerShape(12.dp)
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No chart data available",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }

    val animationProgress = remember { Animatable(0f) }
    var selectedIndex by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(data) {
        animationProgress.snapTo(0f)
        animationProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 800)
        )
    }

    val maxValue = remember(data) {
        (data.maxOfOrNull { it.value } ?: 1f).coerceAtLeast(10f)
    }

    Column(modifier = modifier.fillMaxWidth()) {
        if (selectedIndex != null && selectedIndex!! in data.indices) {
            val item = data[selectedIndex!!]
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = item.label,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = item.formattedValue ?: money(item.value.toDouble()),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.primary
                )
            }
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(height)
                .pointerInput(data) {
                    detectTapGestures { offset ->
                        val barWidthWidthSpace = size.width / data.size
                        val index = (offset.x / barWidthWidthSpace).toInt()
                        if (index in data.indices) {
                            selectedIndex = if (selectedIndex == index) null else index
                        }
                    }
                }
        ) {
            val width = size.width
            val heightPx = size.height
            val bottomPadding = 40f
            val topPadding = 20f
            val chartHeight = heightPx - bottomPadding - topPadding
            val barWidth = (width / data.size) * 0.55f
            val spaceWidth = (width / data.size) * 0.45f

            // Grid lines
            if (showGridLines) {
                val gridCount = 3
                for (i in 0..gridCount) {
                    val y = topPadding + chartHeight * (1f - i.toFloat() / gridCount)
                    drawLine(
                        color = Color.Gray.copy(alpha = 0.15f),
                        start = Offset(0f, y),
                        end = Offset(width, y),
                        strokeWidth = 1.dp.toPx()
                    )
                }
            }

            data.forEachIndexed { index, point ->
                val barHeight = (point.value / maxValue) * chartHeight * animationProgress.value
                val left = index * (barWidth + spaceWidth) + (spaceWidth / 2f)
                val top = topPadding + (chartHeight - barHeight)

                val isSelected = selectedIndex == index
                val currentBarColor = if (isSelected) accentColor else barColor
                val alpha = if (selectedIndex == null || isSelected) 1f else 0.4f

                // Draw Bar with Gradient
                drawRoundRect(
                    brush = Brush.verticalGradient(
                        colors = listOf(
                            currentBarColor.copy(alpha = alpha),
                            currentBarColor.copy(alpha = alpha * 0.6f)
                        )
                    ),
                    topLeft = Offset(left, top),
                    size = Size(barWidth, barHeight.coerceAtLeast(4f)),
                    cornerRadius = CornerRadius(6.dp.toPx(), 6.dp.toPx())
                )

                if (isSelected) {
                    drawRoundRect(
                        color = currentBarColor,
                        topLeft = Offset(left, top),
                        size = Size(barWidth, barHeight.coerceAtLeast(4f)),
                        cornerRadius = CornerRadius(6.dp.toPx(), 6.dp.toPx()),
                        style = Stroke(width = 2.dp.toPx())
                    )
                }
            }
        }

        // X-Axis Labels
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp),
            horizontalArrangement = Arrangement.SpaceAround
        ) {
            data.forEachIndexed { index, point ->
                Text(
                    text = point.label,
                    style = MaterialTheme.typography.labelSmall,
                    fontSize = 10.sp,
                    color = if (selectedIndex == index) MaterialTheme.colorScheme.primary
                    else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.8f),
                    fontWeight = if (selectedIndex == index) FontWeight.Bold else FontWeight.Normal
                )
            }
        }
    }
}

/**
 * Animated Smooth Line / Area Chart using Jetpack Compose Canvas.
 */
@Composable
fun AideLineChart(
    data: List<ChartDataPoint>,
    modifier: Modifier = Modifier,
    lineColor: Color = MaterialTheme.colorScheme.primary,
    height: Dp = 180.dp
) {
    if (data.size < 2) {
        AideBarChart(data = data, modifier = modifier, barColor = lineColor, height = height)
        return
    }

    val animationProgress = remember { Animatable(0f) }
    var selectedIndex by remember { mutableStateOf<Int?>(null) }

    LaunchedEffect(data) {
        animationProgress.snapTo(0f)
        animationProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 900)
        )
    }

    val maxValue = remember(data) {
        (data.maxOfOrNull { it.value } ?: 1f).coerceAtLeast(10f)
    }

    Column(modifier = modifier.fillMaxWidth()) {
        if (selectedIndex != null && selectedIndex!! in data.indices) {
            val item = data[selectedIndex!!]
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(bottom = 8.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = item.label,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = item.formattedValue ?: money(item.value.toDouble()),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = lineColor
                )
            }
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(height)
                .pointerInput(data) {
                    detectTapGestures { offset ->
                        val step = size.width / (data.size - 1)
                        val index = (offset.x / step).toInt().coerceIn(0, data.size - 1)
                        selectedIndex = if (selectedIndex == index) null else index
                    }
                }
        ) {
            val width = size.width
            val heightPx = size.height
            val topPadding = 20f
            val bottomPadding = 20f
            val chartHeight = heightPx - topPadding - bottomPadding
            val stepX = width / (data.size - 1)

            val points = data.mapIndexed { index, point ->
                val x = index * stepX
                val y = topPadding + chartHeight * (1f - (point.value / maxValue) * animationProgress.value)
                Offset(x, y)
            }

            // Grid lines
            for (i in 0..3) {
                val y = topPadding + chartHeight * (i / 3f)
                drawLine(
                    color = Color.Gray.copy(alpha = 0.12f),
                    start = Offset(0f, y),
                    end = Offset(width, y),
                    strokeWidth = 1.dp.toPx()
                )
            }

            // Path for Line & Area
            val path = Path().apply {
                if (points.isNotEmpty()) {
                    moveTo(points.first().x, points.first().y)
                    for (i in 0 until points.size - 1) {
                        val p1 = points[i]
                        val p2 = points[i + 1]
                        val cx = (p1.x + p2.x) / 2f
                        cubicTo(cx, p1.y, cx, p2.y, p2.x, p2.y)
                    }
                }
            }

            val fillPath = Path().apply {
                addPath(path)
                lineTo(width, heightPx - bottomPadding)
                lineTo(0f, heightPx - bottomPadding)
                close()
            }

            // Draw Area Gradient
            drawPath(
                path = fillPath,
                brush = Brush.verticalGradient(
                    colors = listOf(
                        lineColor.copy(alpha = 0.35f),
                        lineColor.copy(alpha = 0.02f)
                    )
                )
            )

            // Draw Line
            drawPath(
                path = path,
                color = lineColor,
                style = Stroke(width = 3.dp.toPx(), cap = StrokeCap.Round)
            )

            // Draw Points
            points.forEachIndexed { index, pt ->
                val isSelected = selectedIndex == index
                val pointRadius = if (isSelected) 6.dp.toPx() else 4.dp.toPx()

                drawCircle(
                    color = if (isSelected) Color.White else lineColor,
                    radius = pointRadius,
                    center = pt
                )
                drawCircle(
                    color = lineColor,
                    radius = pointRadius,
                    center = pt,
                    style = Stroke(width = 2.dp.toPx())
                )
            }
        }

        // X-Axis Labels
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(top = 4.dp),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            data.forEachIndexed { index, point ->
                Text(
                    text = point.label,
                    style = MaterialTheme.typography.labelSmall,
                    fontSize = 10.sp,
                    color = if (selectedIndex == index) lineColor
                    else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.75f),
                    fontWeight = if (selectedIndex == index) FontWeight.Bold else FontWeight.Normal
                )
            }
        }
    }
}

/**
 * Animated Donut Chart for Breakdown visualization.
 */
@Composable
fun AideDonutChart(
    items: List<Pair<String, Double>>,
    colors: List<Color>,
    modifier: Modifier = Modifier,
    sizeDp: Dp = 140.dp
) {
    val defaultPrimary = MaterialTheme.colorScheme.primary

    if (items.isEmpty() || items.all { it.second <= 0 }) {
        Box(
            modifier = modifier
                .size(sizeDp)
                .background(
                    MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.2f),
                    CircleShape
                ),
            contentAlignment = Alignment.Center
        ) {
            Text(
                text = "No Data",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        return
    }

    val total = items.sumOf { it.second }
    val animationProgress = remember { Animatable(0f) }

    LaunchedEffect(items) {
        animationProgress.snapTo(0f)
        animationProgress.animateTo(
            targetValue = 1f,
            animationSpec = tween(durationMillis = 800)
        )
    }

    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Box(
            modifier = Modifier.size(sizeDp),
            contentAlignment = Alignment.Center
        ) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                var startAngle = -90f
                val strokeWidth = 24.dp.toPx()

                items.forEachIndexed { index, item ->
                    val sweepAngle = ((item.second / total) * 360f * animationProgress.value).toFloat()
                    val sliceColor = colors.getOrElse(index) { defaultPrimary }

                    drawArc(
                        color = sliceColor,
                        startAngle = startAngle,
                        sweepAngle = sweepAngle,
                        useCenter = false,
                        style = Stroke(width = strokeWidth, cap = StrokeCap.Round),
                        size = Size(size.width - strokeWidth, size.height - strokeWidth),
                        topLeft = Offset(strokeWidth / 2f, strokeWidth / 2f)
                    )
                    startAngle += sweepAngle
                }
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = "Total",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Text(
                    text = money(total),
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onSurface
                )
            }
        }

        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            items.forEachIndexed { index, item ->
                val sliceColor = colors.getOrElse(index) { defaultPrimary }
                val pct = if (total > 0) (item.second / total * 100).toInt() else 0

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(10.dp)
                            .clip(CircleShape)
                            .background(sliceColor)
                    )
                    Text(
                        text = item.first,
                        style = MaterialTheme.typography.bodyMedium,
                        modifier = Modifier.weight(1f),
                        maxLines = 1
                    )
                    Text(
                        text = "$pct%",
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }
        }
    }
}
