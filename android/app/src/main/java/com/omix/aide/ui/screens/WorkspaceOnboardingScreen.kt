package com.omix.aide.ui.screens

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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.PhoneAndroid
import androidx.compose.material.icons.filled.Security
import androidx.compose.material3.Button
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.omix.aide.domain.ia.DeviceAssignmentMode
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.RoleNavigationResolver
import com.omix.aide.ui.components.AideBadge
import com.omix.aide.ui.components.AideCard

/**
 * First-run workspace onboarding (AIDE-ANDROID-06).
 *
 * Explains setup, business/location selection, employee role & permissions,
 * device assignment, and offline/local-storage limitations accurately before
 * opening the app.
 */
@Composable
fun WorkspaceOnboardingScreen(
    initialContext: OperatingContext,
    onComplete: (
        employeeName: String,
        organizationName: String,
        businessName: String,
        branchName: String,
        warehouseName: String?,
        terminalName: String?,
        role: EmployeeRole,
        deviceAssignment: DeviceAssignmentMode
    ) -> Unit,
    onSkipWithDefaults: () -> Unit
) {
    var step by rememberSaveable { mutableStateOf(0) }
    var employeeName by rememberSaveable { mutableStateOf(initialContext.employeeName) }
    var organizationName by rememberSaveable { mutableStateOf(initialContext.organizationName) }
    var businessName by rememberSaveable { mutableStateOf(initialContext.businessName) }
    var branchName by rememberSaveable { mutableStateOf(initialContext.branchName) }
    var warehouseName by rememberSaveable { mutableStateOf(initialContext.warehouseName ?: "Main Stockroom") }
    var terminalName by rememberSaveable { mutableStateOf(initialContext.terminalName ?: "Till 01") }
    var selectedRoleName by rememberSaveable { mutableStateOf(initialContext.role.name) }
    var selectedDeviceModeName by rememberSaveable { mutableStateOf(initialContext.deviceAssignment.name) }

    val selectedRole = EmployeeRole.fromKey(selectedRoleName)
    val selectedDeviceMode = DeviceAssignmentMode.fromKey(selectedDeviceModeName)

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 16.dp)
            .testTag("workspace_onboarding_screen")
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "Step ${step + 1} of 3",
                style = MaterialTheme.typography.labelLarge,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Bold
            )
            TextButton(
                onClick = onSkipWithDefaults,
                modifier = Modifier.testTag("onboarding_skip_button")
            ) {
                Text("Use Owner Defaults")
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth().padding(vertical = 6.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            repeat(3) { index ->
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .height(5.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(
                            if (index <= step) MaterialTheme.colorScheme.primary
                            else MaterialTheme.colorScheme.surfaceVariant
                        )
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Column(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            when (step) {
                0 -> {
                    Text(
                        text = "Business & Operating Location",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Identify the company, branch, stockroom, or checkout lane this device operates in so actions are always attributed to the right location.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    AideCard {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            OutlinedTextField(
                                value = employeeName,
                                onValueChange = { employeeName = it },
                                label = { Text("Your Name / Operator Label") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = organizationName,
                                onValueChange = { organizationName = it },
                                label = { Text("Organization / Legal Entity") },
                                placeholder = { Text("e.g. Omix Retail Ltd") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            OutlinedTextField(
                                value = businessName,
                                onValueChange = {
                                    businessName = it
                                    if (branchName.isBlank()) branchName = it
                                },
                                label = { Text("Business / Store Name") },
                                singleLine = true,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .testTag("onboarding_business_name")
                            )
                            OutlinedTextField(
                                value = branchName,
                                onValueChange = { branchName = it },
                                label = { Text("Active Branch") },
                                placeholder = { Text("e.g. Westlands Branch") },
                                singleLine = true,
                                modifier = Modifier.fillMaxWidth()
                            )
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                OutlinedTextField(
                                    value = warehouseName,
                                    onValueChange = { warehouseName = it },
                                    label = { Text("Warehouse / Stockroom") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f)
                                )
                                OutlinedTextField(
                                    value = terminalName,
                                    onValueChange = { terminalName = it },
                                    label = { Text("POS Terminal / Till") },
                                    singleLine = true,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        }
                    }
                }

                1 -> {
                    Text(
                        text = "Role & Task Permissions",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Aide tailors your home screen and navigation around your daily responsibilities. In multi-user organizations, the backend server remains authoritative over assigned roles and permissions.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    EmployeeRole.entries.forEach { role ->
                        val isChosen = role == selectedRole
                        AideCard(
                            containerColor = if (isChosen) {
                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
                            } else {
                                MaterialTheme.colorScheme.surface
                            },
                            borderColor = if (isChosen) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.outline
                            },
                            onClick = { selectedRoleName = role.name }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp)
                                    .testTag("onboarding_role_${role.name}"),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = role.title,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.Bold
                                    )
                                    Text(
                                        text = role.dailyFocus,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                if (isChosen) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = "Selected",
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    }

                    val previewNav = RoleNavigationResolver.resolve(
                        initialContext.copy(
                            role = selectedRole,
                            grantedPermissions = selectedRole.defaultPermissions,
                            isRevoked = false
                        )
                    )
                    AideCard {
                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.Security,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(18.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "${selectedRole.title} Navigation Preview",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Text(
                                text = "Primary tabs: " +
                                    previewNav.primaryDestinations.joinToString(" · ") { it.navLabel },
                                style = MaterialTheme.typography.bodySmall
                            )
                            Text(
                                text = "Quick actions: " +
                                    previewNav.quickActions.joinToString(", ") { it.label },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }

                else -> {
                    Text(
                        text = "Device Assignment & Offline Storage",
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Choose how this phone or tablet is used and review how offline data is stored.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    DeviceAssignmentMode.entries.forEach { mode ->
                        val isSelected = mode == selectedDeviceMode
                        AideCard(
                            containerColor = if (isSelected) {
                                MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f)
                            } else {
                                MaterialTheme.colorScheme.surface
                            },
                            borderColor = if (isSelected) {
                                MaterialTheme.colorScheme.primary
                            } else {
                                MaterialTheme.colorScheme.outline
                            },
                            onClick = { selectedDeviceModeName = mode.name }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(14.dp)
                                    .testTag("onboarding_device_${mode.name}"),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = mode.title,
                                        style = MaterialTheme.typography.titleMedium,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        text = mode.description,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurfaceVariant
                                    )
                                }
                                if (isSelected) {
                                    Icon(
                                        imageVector = Icons.Default.CheckCircle,
                                        contentDescription = "Selected",
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            }
                        }
                    }

                    AideCard {
                        Column(
                            modifier = Modifier.padding(16.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.PhoneAndroid,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(20.dp)
                                )
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    text = "Accurate Offline & Storage Limitations",
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            HorizontalDivider()
                            Text(
                                text = "• Works offline: POS sales, goods receipts, stock counts, shifts, and alerts run locally in Room on this device.",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Text(
                                text = "• Isolated per business: If you add multiple memberships, each business workspace keeps separate products, sales, shifts, and tasks without silent switching.",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Text(
                                text = "• Local-only backup rule: Nothing is uploaded automatically to the cloud by this APK. Uninstalling deletes local records, so Owners/Accountants should export a JSON snapshot from Settings.",
                                style = MaterialTheme.typography.bodySmall
                            )
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    imageVector = Icons.Default.Info,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(16.dp)
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                AideBadge(
                                    text = "${selectedRole.title} · ${branchName.ifBlank { businessName }}"
                                )
                            }
                        }
                    }
                }
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (step > 0) {
                OutlinedButton(
                    onClick = { step -= 1 },
                    modifier = Modifier
                        .weight(1f)
                        .height(50.dp),
                    shape = RoundedCornerShape(14.dp)
                ) {
                    Text("Back")
                }
            }
            Button(
                onClick = {
                    if (step < 2) {
                        step += 1
                    } else {
                        onComplete(
                            employeeName,
                            organizationName,
                            businessName,
                            branchName,
                            warehouseName.takeIf { it.isNotBlank() },
                            terminalName.takeIf { it.isNotBlank() },
                            selectedRole,
                            selectedDeviceMode
                        )
                    }
                },
                modifier = Modifier
                    .weight(if (step > 0) 1.5f else 1f)
                    .height(50.dp)
                    .testTag("onboarding_next_button"),
                shape = RoundedCornerShape(14.dp)
            ) {
                Text(
                    text = if (step < 2) "Continue" else "Save Workspace & Choose Theme",
                    fontWeight = FontWeight.Bold
                )
            }
        }
    }
}
