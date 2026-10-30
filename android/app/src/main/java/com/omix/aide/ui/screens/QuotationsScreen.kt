package com.omix.aide.ui.screens

import android.content.Intent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.ui.components.*
import com.omix.aide.ui.money
import com.omix.aide.ui.viewmodel.QuotationViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuotationsScreen(
    quotationViewModel: QuotationViewModel,
    onBack: () -> Unit
) {
    val uiState by quotationViewModel.uiState.collectAsState()
    val context = LocalContext.current
    val businessStore = remember { LocalBusinessStore(context) }

    var clientName by remember { mutableStateOf("") }
    var quoteAmount by remember { mutableStateOf("") }
    var showCreateModal by remember { mutableStateOf(false) }

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
                        text = "Quotations & Estimates",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        },
        floatingActionButton = {
            ExtendedFloatingActionButton(
                onClick = { showCreateModal = true },
                icon = { Icon(Icons.Default.Add, contentDescription = null) },
                text = { Text("New Quote") },
                containerColor = MaterialTheme.colorScheme.primary
            )
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

                if (uiState.quotations.isEmpty()) {
                    AideEmptyState(
                        message = "No proforma quotations generated yet.",
                        actionLabel = "Create Quotation",
                        onAction = { showCreateModal = true }
                    )
                } else {
                    LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(uiState.quotations, key = { it.id }) { quote ->
                            AideCard {
                                Column(modifier = Modifier.padding(16.dp)) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column {
                                            Text(
                                                text = "QUOTE #${quote.id.takeLast(6).uppercase()}",
                                                style = MaterialTheme.typography.titleMedium,
                                                fontWeight = FontWeight.Bold
                                            )
                                            Text(
                                                text = "Client: ${quote.customerName}",
                                                style = MaterialTheme.typography.bodyMedium,
                                                color = MaterialTheme.colorScheme.onSurfaceVariant
                                            )
                                        }

                                        Column(horizontalAlignment = Alignment.End) {
                                            Text(
                                                text = money(quote.totalAmount),
                                                style = MaterialTheme.typography.titleLarge,
                                                fontWeight = FontWeight.ExtraBold,
                                                color = MaterialTheme.colorScheme.primary
                                            )
                                            AideBadge(
                                                text = quote.status,
                                                containerColor = MaterialTheme.colorScheme.primaryContainer,
                                                contentColor = MaterialTheme.colorScheme.onPrimaryContainer
                                            )
                                        }
                                    }

                                    Spacer(modifier = Modifier.height(12.dp))

                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        OutlinedButton(
                                            onClick = {
                                                val text = "PROFORMA QUOTATION\nStore: ${businessStore.getBusinessName()}\nClient: ${quote.customerName}\nQuote #: ${quote.id.takeLast(6).uppercase()}\nTotal Estimate: KSh ${"%.2f".format(quote.totalAmount)}"
                                                val shareIntent = Intent().apply {
                                                    action = Intent.ACTION_SEND
                                                    putExtra(Intent.EXTRA_TEXT, text)
                                                    type = "text/plain"
                                                }
                                                runCatching { context.startActivity(Intent.createChooser(shareIntent, "Share Quote")) }
                                            },
                                            shape = RoundedCornerShape(10.dp),
                                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 4.dp),
                                            modifier = Modifier.height(36.dp)
                                        ) {
                                            Icon(Icons.Default.Share, contentDescription = null, modifier = Modifier.size(14.dp))
                                            Spacer(modifier = Modifier.width(4.dp))
                                            Text("Share Quote", style = MaterialTheme.typography.labelMedium)
                                        }

                                        IconButton(onClick = { quotationViewModel.deleteQuotation(quote.id) }) {
                                            Icon(Icons.Default.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.6f))
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

    if (showCreateModal) {
        ModalBottomSheet(onDismissRequest = { showCreateModal = false }) {
            Column(modifier = Modifier.padding(24.dp).fillMaxWidth()) {
                Text("New Proforma Quote", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(modifier = Modifier.height(16.dp))
                OutlinedTextField(
                    value = clientName,
                    onValueChange = { clientName = it },
                    label = { Text("Client / Business Name") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(12.dp))
                OutlinedTextField(
                    value = quoteAmount,
                    onValueChange = { quoteAmount = it },
                    label = { Text("Quotation Estimate Amount (KSh)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(12.dp)
                )
                Spacer(modifier = Modifier.height(20.dp))
                AideButton(
                    text = "Generate Quote",
                    onClick = {
                        val amount = quoteAmount.toDoubleOrNull() ?: 0.0
                        if (clientName.isNotBlank() && amount > 0) {
                            quotationViewModel.createQuotation(clientName, amount)
                            showCreateModal = false
                            clientName = ""
                            quoteAmount = ""
                        }
                    }
                )
            }
        }
    }
}
