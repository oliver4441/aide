package com.omix.aide.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Block
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Store
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.omix.aide.domain.ia.DeviceAssignmentMode
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.WorkspaceMembership
import com.omix.aide.ui.theme.DangerRed
import com.omix.aide.ui.theme.WarningAmber

/**
 * Always-visible operating location and role header bar.
 *
 * Shows the active Organization · Branch · Warehouse/Till context and active
 * employee role so staff never act in the wrong location by mistake.
 */
@Composable
fun OperatingContextBar(
    context: OperatingContext,
    onOpenSwitcher: () -> Unit,
    modifier: Modifier = Modifier,
    trailingContent: (@Composable () -> Unit)? = null
) {
    Surface(
        modifier = modifier
            .fillMaxWidth()
            .testTag("operating_context_bar"),
        color = MaterialTheme.colorScheme.surface,
        tonalElevation = 1.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Row(
                modifier = Modifier
                    .weight(1f)
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.55f))
                    .clickable(onClick = onOpenSwitcher)
                    .padding(horizontal = 10.dp, vertical = 8.dp)
                    .testTag("context_switcher_button"),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Store,
                    contentDescription = null,
                    tint = if (context.isRevoked) DangerRed else MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(18.dp)
                )
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = context.branchName.ifBlank { context.businessName },
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    val detailLine = buildString {
                        append(context.organizationName)
                        context.stationBadge?.let {
                            append(" · ")
                            append(it)
                        }
                    }
                    Text(
                        text = detailLine,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                AideBadge(
                    text = if (context.isRevoked) "Revoked" else context.role.shortBadge,
                    containerColor = if (context.isRevoked) {
                        DangerRed.copy(alpha = 0.18f)
                    } else {
                        MaterialTheme.colorScheme.primaryContainer
                    },
                    contentColor = if (context.isRevoked) {
                        DangerRed
                    } else {
                        MaterialTheme.colorScheme.onPrimaryContainer
                    }
                )
                Icon(
                    imageVector = Icons.Default.SwapHoriz,
                    contentDescription = "Switch business or role context",
                    tint = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(18.dp)
                )
            }

            if (trailingContent != null) {
                trailingContent()
            }
        }
    }
}

/**
 * Compact location confirmation strip displayed inside operational workflows
 * (POS checkout, Goods Receiving, Stock Count, Shifts) so mutations always
 * declare their target operating location.
 */
@Composable
fun OperatingLocationNotice(
    context: OperatingContext,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(MaterialTheme.colorScheme.primary.copy(alpha = 0.10f))
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = "Operating context: ${context.operatingLocationLabel}",
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                color = MaterialTheme.colorScheme.onSurface
            )
            Text(
                text = "${context.role.title} · ${context.syncMode.badgeLabel}",
                style = MaterialTheme.typography.labelSmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

/**
 * Non-destructive blocked / permission-denied screen rendered when an employee
 * opens an unauthorized route/deep-link or when their membership is revoked.
 */
@Composable
fun AccessRestrictedScreen(
    context: OperatingContext,
    reason: String,
    onReturnHome: (() -> Unit)?,
    onOpenContextSwitcher: () -> Unit,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(24.dp)
            .testTag("access_restricted_screen"),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Box(
            modifier = Modifier
                .size(64.dp)
                .clip(RoundedCornerShape(20.dp))
                .background(DangerRed.copy(alpha = 0.14f)),
            contentAlignment = Alignment.Center
        ) {
            Icon(
                imageVector = if (context.isRevoked) Icons.Default.Block else Icons.Default.Lock,
                contentDescription = null,
                tint = DangerRed,
                modifier = Modifier.size(32.dp)
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = if (context.isRevoked) "Workspace Access Revoked" else "Action Not Permitted for Role",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = reason,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(12.dp))
        AideCard {
            Column(modifier = Modifier.padding(14.dp)) {
                Text(
                    text = "Active Context",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    text = "${context.operatingLocationLabel} · ${context.role.title}",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.SemiBold
                )
            }
        }
        Spacer(modifier = Modifier.height(20.dp))
        if (onReturnHome != null && !context.isRevoked) {
            Button(
                onClick = onReturnHome,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .testTag("restricted_return_home_button"),
                shape = RoundedCornerShape(12.dp)
            ) {
                Text("Return to ${context.role.shortBadge} Home")
            }
            Spacer(modifier = Modifier.height(10.dp))
        }
        OutlinedButton(
            onClick = onOpenContextSwitcher,
            modifier = Modifier
                .fillMaxWidth()
                .height(48.dp)
                .testTag("restricted_switch_context_button"),
            shape = RoundedCornerShape(12.dp)
        ) {
            Icon(Icons.Default.SwapHoriz, contentDescription = null)
            Spacer(modifier = Modifier.width(8.dp))
            Text("Switch Business or Role")
        }
    }
}

/**
 * Explicit multi-membership and role context switcher sheet.
 *
 * Guards against accidental POS cart leakage across branches: if the employee
 * has items in the POS cart and selects another membership/role, a confirmation
 * dialog explains that the in-progress cart will be cleared first.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ContextSwitcherSheet(
    activeContext: OperatingContext,
    memberships: List<WorkspaceMembership>,
    hasActiveCartItems: Boolean,
    onSelectMembership: (String) -> Unit,
    onChangeActiveRole: (EmployeeRole, String, String?, String?) -> Unit,
    onAddMembership: (
        employeeName: String,
        orgName: String,
        businessName: String,
        branchName: String,
        warehouseName: String?,
        terminalName: String?,
        role: EmployeeRole,
        deviceMode: DeviceAssignmentMode
    ) -> Unit,
    onDismiss: () -> Unit
) {
    var pendingMembershipSwitch by remember { mutableStateOf<WorkspaceMembership?>(null) }
    var pendingRoleSwitch by remember { mutableStateOf<EmployeeRole?>(null) }
    var showAddForm by remember { mutableStateOf(false) }

    var newEmployeeName by remember { mutableStateOf(activeContext.employeeName) }
    var newOrgName by remember { mutableStateOf("") }
    var newBusinessName by remember { mutableStateOf("") }
    var newBranchName by remember { mutableStateOf("") }
    var newWarehouseName by remember { mutableStateOf("") }
    var newTerminalName by remember { mutableStateOf("") }
    var newRole by remember { mutableStateOf(EmployeeRole.CASHIER) }
    var newDeviceMode by remember { mutableStateOf(activeContext.deviceAssignment) }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 12.dp)
                .testTag("context_switcher_sheet"),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text(
                text = "Operating Context & Memberships",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold
            )
            Text(
                text = activeContext.syncMode.statusDescription,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Text(
                text = "ASSIGNED WORKSPACES (${memberships.size})",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            memberships.forEach { membership ->
                val isSelected = membership.membershipId == activeContext.membershipId
                AideCard(
                    containerColor = if (isSelected) {
                        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f)
                    } else {
                        MaterialTheme.colorScheme.surface
                    },
                    borderColor = if (isSelected) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.outline
                    },
                    onClick = {
                        if (isSelected) {
                            onDismiss()
                        } else if (hasActiveCartItems) {
                            pendingMembershipSwitch = membership
                        } else {
                            onSelectMembership(membership.membershipId)
                            onDismiss()
                        }
                    }
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp)
                            .testTag("membership_item_${membership.membershipId}"),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = membership.branchName.ifBlank { membership.businessName },
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = buildString {
                                    append(membership.organizationName)
                                    append(" · ")
                                    append(membership.role.title)
                                    membership.terminalName?.let { append(" · $it") }
                                    membership.warehouseName?.let { append(" · $it") }
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            if (membership.isRevoked) {
                                Text(
                                    text = membership.revokedReason ?: "Membership revoked",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = DangerRed
                                )
                            }
                        }
                        if (isSelected) {
                            Icon(
                                imageVector = Icons.Default.CheckCircle,
                                contentDescription = "Active workspace",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }
                }
            }

            if (activeContext.hasPermission(MobilePermission.CONTEXT_SWITCH) || !activeContext.isRevoked) {
                HorizontalDivider()
                Text(
                    text = "ROLE VIEW IN ${activeContext.branchName.uppercase()}",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    EmployeeRole.entries.forEach { roleOption ->
                        FilterChip(
                            selected = activeContext.role == roleOption,
                            onClick = {
                                if (activeContext.role == roleOption) return@FilterChip
                                val losesPos = !roleOption.defaultPermissions.contains(MobilePermission.SALE_CREATE)
                                if (hasActiveCartItems && losesPos) {
                                    pendingRoleSwitch = roleOption
                                } else {
                                    onChangeActiveRole(
                                        roleOption,
                                        activeContext.branchName,
                                        activeContext.warehouseName,
                                        activeContext.terminalName
                                    )
                                    onDismiss()
                                }
                            },
                            label = { Text(roleOption.shortBadge) },
                            modifier = Modifier
                                .height(48.dp)
                                .testTag("switch_role_chip_${roleOption.name}")
                        )
                    }
                }
            }

            HorizontalDivider()

            if (!showAddForm) {
                OutlinedButton(
                    onClick = { showAddForm = true },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp)
                        .testTag("add_membership_toggle_button"),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Icon(Icons.Default.Add, contentDescription = null)
                    Spacer(modifier = Modifier.width(8.dp))
                    Text("Add Workspace / Branch Membership")
                }
            } else {
                AideCard {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "New Membership Context",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        OutlinedTextField(
                            value = newOrgName,
                            onValueChange = { newOrgName = it },
                            label = { Text("Organization / Legal Entity") },
                            placeholder = { Text("e.g. Omix Supermarkets Ltd") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        OutlinedTextField(
                            value = newBusinessName,
                            onValueChange = {
                                newBusinessName = it
                                if (newBranchName.isBlank()) newBranchName = it
                            },
                            label = { Text("Business / Store Name") },
                            placeholder = { Text("e.g. Mombasa Road Store") },
                            singleLine = true,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("new_membership_business_input")
                        )
                        OutlinedTextField(
                            value = newBranchName,
                            onValueChange = { newBranchName = it },
                            label = { Text("Branch Name") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedTextField(
                                value = newWarehouseName,
                                onValueChange = { newWarehouseName = it },
                                label = { Text("Warehouse (Opt)") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                            OutlinedTextField(
                                value = newTerminalName,
                                onValueChange = { newTerminalName = it },
                                label = { Text("Terminal / Till (Opt)") },
                                singleLine = true,
                                modifier = Modifier.weight(1f)
                            )
                        }
                        Text(
                            text = "Assigned Role",
                            style = MaterialTheme.typography.labelMedium
                        )
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            EmployeeRole.entries.forEach { r ->
                                FilterChip(
                                    selected = newRole == r,
                                    onClick = { newRole = r },
                                    label = { Text(r.title) },
                                    modifier = Modifier.height(48.dp)
                                )
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = { showAddForm = false },
                                modifier = Modifier.weight(1f).height(48.dp)
                            ) {
                                Text("Cancel")
                            }
                            Button(
                                enabled = newBusinessName.isNotBlank(),
                                onClick = {
                                    onAddMembership(
                                        newEmployeeName,
                                        newOrgName.ifBlank { newBusinessName },
                                        newBusinessName,
                                        newBranchName.ifBlank { newBusinessName },
                                        newWarehouseName.takeIf { it.isNotBlank() },
                                        newTerminalName.takeIf { it.isNotBlank() },
                                        newRole,
                                        newDeviceMode
                                    )
                                    showAddForm = false
                                    onDismiss()
                                },
                                modifier = Modifier
                                    .weight(1f)
                                    .height(48.dp)
                                    .testTag("save_new_membership_button")
                            ) {
                                Text("Add & Switch")
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(16.dp))
        }
    }

    if (pendingMembershipSwitch != null) {
        val target = pendingMembershipSwitch!!
        AlertDialog(
            onDismissRequest = { pendingMembershipSwitch = null },
            title = { Text("Switch Operating Location?") },
            text = {
                Text(
                    "You have items in your current POS cart for ${activeContext.branchName}. " +
                        "Switching to ${target.branchName} will clear the cart so items are never " +
                        "recorded in the wrong branch."
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        val id = target.membershipId
                        pendingMembershipSwitch = null
                        onSelectMembership(id)
                        onDismiss()
                    }
                ) {
                    Text("Clear Cart & Switch", color = WarningAmber, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingMembershipSwitch = null }) {
                    Text("Stay Here")
                }
            }
        )
    }

    if (pendingRoleSwitch != null) {
        val targetRole = pendingRoleSwitch!!
        AlertDialog(
            onDismissRequest = { pendingRoleSwitch = null },
            title = { Text("Switch Role to ${targetRole.title}?") },
            text = {
                Text(
                    "${targetRole.title} does not perform POS checkout. Your in-progress cart " +
                        "will be cleared before switching roles."
                )
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        pendingRoleSwitch = null
                        onChangeActiveRole(
                            targetRole,
                            activeContext.branchName,
                            activeContext.warehouseName,
                            activeContext.terminalName
                        )
                        onDismiss()
                    }
                ) {
                    Text("Clear Cart & Switch", color = WarningAmber, fontWeight = FontWeight.Bold)
                }
            },
            dismissButton = {
                TextButton(onClick = { pendingRoleSwitch = null }) {
                    Text("Cancel")
                }
            }
        )
    }
}
