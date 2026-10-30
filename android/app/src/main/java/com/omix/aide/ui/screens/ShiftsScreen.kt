package com.omix.aide.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.ui.components.*
import com.omix.aide.ui.money
import com.omix.aide.ui.theme.DangerRed
import com.omix.aide.ui.theme.WarningAmber
import com.omix.aide.ui.viewmodel.ShiftViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ShiftsScreen(
    shiftViewModel: ShiftViewModel,
    onBack: () -> Unit
) {
    val uiState by shiftViewModel.uiState.collectAsState()
    val active = uiState.activeShift

    var cashierName by remember { mutableStateOf("") }
    var startingFloat by remember { mutableStateOf("") }
    var actualCashCounted by remember { mutableStateOf("") }

    var showOpenModal by remember { mutableStateOf(false) }
    var showCloseModal by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Back"
                        )
                    }
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        text = "Cashier Shifts & Till Audit",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
        ) {
            AideLocalOnlyBanner()

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                if (uiState.isLoading) {
                    LoadingState()
                    return@Column
                }

                // Active Till Status Card
                AideCard(
                    containerColor = if (active != null) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.35f)
                    else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)
                ) {
                    Column(modifier = Modifier.padding(18.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Box(
                                    modifier = Modifier
                                        .size(44.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (active != null) MaterialTheme.colorScheme.primary
                                            else MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.2f)
                                        ),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.PointOfSale,
                                        contentDescription = null,
                                        tint = if (active != null) MaterialTheme.colorScheme.onPrimary else MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                Spacer(modifier = Modifier.width(12.dp))
                                Column {
                                    Text(
                                        text = if (active != null) "Till OPEN (${active.cashierName})" else "Till CLOSED",
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = if (active != null) "Opened at ${active.openedAt.take(16)}" else "No cashier shift active",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                            }

                            AideBadge(
                                text = if (active != null) "Active Shift" else "Closed",
                                containerColor = if (active != null) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceVariant,
                                contentColor = if (active != null) MaterialTheme.colorScheme.onPrimaryContainer else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }

                        Spacer(modifier = Modifier.height(16.dp))

                        if (active != null) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column {
                                    Text("Opening Float", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text(money(active.startingFloat), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                }
                                Column(horizontalAlignment = Alignment.End) {
                                    Text("Status", style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                    Text("Auditing Active", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
                                }
                            }

                            Spacer(modifier = Modifier.height(16.dp))

                            AideButton(
                                text = "Close Till & Reconcile Shift",
                                onClick = { showCloseModal = true },
                                icon = Icons.Default.Lock
                            )
                        } else {
                            AideButton(
                                text = "Open Cashier Shift",
                                onClick = { showOpenModal = true },
                                icon = Icons.Default.LockOpen
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = "Shift Log History",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(10.dp))

                if (uiState.shifts.isEmpty()) {
                    AideEmptyState(message = "No cashier shifts logged yet.")
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(uiState.shifts, key = { it.id }) { shift ->
                            val isClosed = shift.status == "CLOSED"
                            val diff = shift.actualCash - shift.expectedCash

                            AideCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                text = shift.cashierName,
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = "Opened: ${shift.openedAt.take(16)}",
                                                style = MaterialTheme.typography.labelSmall,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }

                                        AideBadge(
                                            text = shift.status,
                                            containerColor = if (isClosed) MaterialTheme.colorScheme.surfaceVariant else MaterialTheme.colorScheme.primaryContainer,
                                            contentColor = if (isClosed) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.onPrimaryContainer
                                        )
                                    }

                                    if (isClosed) {
                                        Spacer(modifier = Modifier.height(8.dp))
                                        Row(
                                            modifier = Modifier.fillMaxWidth(),
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Text("Counted: ${money(shift.actualCash)}", style = MaterialTheme.typography.bodySmall)
                                            Text(
                                                text = if (diff == 0.0) "Balanced" else if (diff > 0) "+${money(diff)} Over" else "${money(diff)} Short",
                                                style = MaterialTheme.typography.bodySmall,
                                                fontWeight = FontWeight.Bold,
                                                color = if (diff == 0.0) MaterialTheme.colorScheme.primary else if (diff > 0) WarningAmber else DangerRed
                                            )
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    if (showOpenModal) {
        ModalBottomSheet(onDismissRequest = { showOpenModal = false }) {
            Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                Text("Open Cashier Shift", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = cashierName,
                    onValueChange = { cashierName = it },
                    label = { Text("Cashier Name") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = startingFloat,
                    onValueChange = { startingFloat = it },
                    label = { Text("Starting Till Cash Float (KSh)") },
                    placeholder = { Text("e.g. 2000") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(20.dp))
                AideButton(
                    text = "Open Shift",
                    onClick = {
                        val floatAmt = startingFloat.toDoubleOrNull() ?: 0.0
                        if (cashierName.isNotBlank()) {
                            shiftViewModel.openShift(cashierName, floatAmt)
                            showOpenModal = false
                            cashierName = ""
                            startingFloat = ""
                        }
                    }
                )
            }
        }
    }

    if (showCloseModal) {
        ModalBottomSheet(onDismissRequest = { showCloseModal = false }) {
            Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                Text("Close Shift & Reconcile Till", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = actualCashCounted,
                    onValueChange = { actualCashCounted = it },
                    label = { Text("Actual Cash Counted in Till (KSh)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(20.dp))
                AideButton(
                    text = "Close Shift & Lock Till",
                    onClick = {
                        val countAmt = actualCashCounted.toDoubleOrNull() ?: 0.0
                        shiftViewModel.closeShift(countAmt)
                        showCloseModal = false
                        actualCashCounted = ""
                    }
                )
            }
        }
    }
}
