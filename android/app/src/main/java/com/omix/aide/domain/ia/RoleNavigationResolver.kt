package com.omix.aide.domain.ia

/**
 * One grouped section on the Workspace screen.
 */
data class ResolvedWorkspaceSection(
    val group: WorkspaceSectionGroup,
    val destinations: List<MobileDestination>
)

/**
 * Result of resolving the navigation and action surface for an [OperatingContext].
 */
data class ResolvedRoleNavigation(
    val role: EmployeeRole,
    val isAccessBlocked: Boolean,
    val blockedReason: String?,
    val primaryDestinations: List<MobileDestination>,
    val quickActions: List<QuickAction>,
    val workspaceSections: List<ResolvedWorkspaceSection>,
    val allowedDestinations: Set<MobileDestination>
)

/**
 * Result of checking whether an operation is permitted in the active context.
 */
data class OperationAuthResult(
    val allowed: Boolean,
    val reason: String? = null
)

/**
 * Pure, deterministic resolver for Android's role- and permission-driven IA.
 *
 * Mirrors the server contract (`src/lib/mobileNavigation.mjs`) so client UI
 * visibility and server authorization stay aligned.
 */
object RoleNavigationResolver {

    private val preferredPrimaryTabs: Map<EmployeeRole, List<MobileDestination>> = mapOf(
        EmployeeRole.OWNER_ADMIN to listOf(
            MobileDestination.HOME,
            MobileDestination.SELL,
            MobileDestination.STOCK,
            MobileDestination.WORKSPACE
        ),
        EmployeeRole.BRANCH_MANAGER to listOf(
            MobileDestination.HOME,
            MobileDestination.TASKS,
            MobileDestination.SELL,
            MobileDestination.WORKSPACE
        ),
        EmployeeRole.CASHIER to listOf(
            MobileDestination.HOME,
            MobileDestination.SELL,
            MobileDestination.PRODUCT_LOOKUP,
            MobileDestination.SHIFTS
        ),
        EmployeeRole.WAREHOUSE_OPERATOR to listOf(
            MobileDestination.HOME,
            MobileDestination.RECEIVE_GOODS,
            MobileDestination.STOCK_COUNT,
            MobileDestination.TASKS
        ),
        EmployeeRole.RECEIVING_CLERK to listOf(
            MobileDestination.HOME,
            MobileDestination.RECEIVE_GOODS,
            MobileDestination.PRODUCT_LOOKUP,
            MobileDestination.TASKS
        ),
        EmployeeRole.INVENTORY_CONTROLLER to listOf(
            MobileDestination.HOME,
            MobileDestination.STOCK,
            MobileDestination.STOCK_COUNT,
            MobileDestination.WORKSPACE
        ),
        EmployeeRole.ACCOUNTANT to listOf(
            MobileDestination.HOME,
            MobileDestination.REPORTS,
            MobileDestination.EXPENSES,
            MobileDestination.WORKSPACE
        )
    )

    private val preferredQuickActions: Map<EmployeeRole, List<QuickAction>> = mapOf(
        EmployeeRole.OWNER_ADMIN to listOf(
            QuickAction.START_SALE,
            QuickAction.REVIEW_APPROVALS,
            QuickAction.SCAN_SEARCH_PRODUCT,
            QuickAction.RECEIVE_GOODS,
            QuickAction.COUNT_STOCK,
            QuickAction.OPEN_CLOSE_SHIFT
        ),
        EmployeeRole.BRANCH_MANAGER to listOf(
            QuickAction.REVIEW_APPROVALS,
            QuickAction.START_SALE,
            QuickAction.COUNT_STOCK,
            QuickAction.RECEIVE_GOODS,
            QuickAction.OPEN_CLOSE_SHIFT,
            QuickAction.VIEW_ASSIGNED_TASKS
        ),
        EmployeeRole.CASHIER to listOf(
            QuickAction.START_SALE,
            QuickAction.SCAN_SEARCH_PRODUCT,
            QuickAction.OPEN_CLOSE_SHIFT,
            QuickAction.REQUEST_APPROVAL,
            QuickAction.VIEW_ASSIGNED_TASKS,
            QuickAction.CUSTOMER_BALANCES
        ),
        EmployeeRole.WAREHOUSE_OPERATOR to listOf(
            QuickAction.SCAN_SEARCH_PRODUCT,
            QuickAction.RECEIVE_GOODS,
            QuickAction.COUNT_STOCK,
            QuickAction.VIEW_ASSIGNED_TASKS,
            QuickAction.REQUEST_APPROVAL
        ),
        EmployeeRole.RECEIVING_CLERK to listOf(
            QuickAction.RECEIVE_GOODS,
            QuickAction.SCAN_SEARCH_PRODUCT,
            QuickAction.VIEW_ASSIGNED_TASKS,
            QuickAction.REQUEST_APPROVAL
        ),
        EmployeeRole.INVENTORY_CONTROLLER to listOf(
            QuickAction.COUNT_STOCK,
            QuickAction.SCAN_SEARCH_PRODUCT,
            QuickAction.RECEIVE_GOODS,
            QuickAction.MANAGE_CATALOGUE,
            QuickAction.VIEW_ASSIGNED_TASKS,
            QuickAction.REQUEST_APPROVAL
        ),
        EmployeeRole.ACCOUNTANT to listOf(
            QuickAction.VIEW_REPORTS,
            QuickAction.RECORD_EXPENSE,
            QuickAction.CUSTOMER_BALANCES,
            QuickAction.VIEW_ASSIGNED_TASKS,
            QuickAction.REQUEST_APPROVAL
        )
    )

    fun canAccessDestination(context: OperatingContext, destination: MobileDestination): Boolean {
        if (context.isRevoked || context.grantedPermissions.isEmpty()) return false
        if (destination.requiredAnyPermissions.isEmpty()) return true
        return destination.requiredAnyPermissions.any { it in context.grantedPermissions }
    }

    /**
     * Checks whether a navigation route (including parameterized routes, legacy
     * `"more"` alias, or setup screens) is accessible in [context].
     */
    fun canAccessRoute(context: OperatingContext, route: String?): Boolean {
        if (route.isNullOrBlank()) return false
        val normalized = route.trim().lowercase()

        // First-run setup screens remain reachable when configuring the app.
        if (normalized in setOf("welcome", "onboarding", "theme-picker")) {
            return true
        }

        if (context.isRevoked || context.grantedPermissions.isEmpty()) {
            return false
        }

        if (normalized.startsWith("receipt/")) {
            return context.hasAnyPermission(
                MobilePermission.SALE_CREATE,
                MobilePermission.SALE_READ
            )
        }

        val destination = MobileDestination.fromRoute(normalized) ?: return false
        return canAccessDestination(context, destination)
    }

    fun resolve(context: OperatingContext): ResolvedRoleNavigation {
        if (context.isRevoked || context.grantedPermissions.isEmpty()) {
            return ResolvedRoleNavigation(
                role = context.role,
                isAccessBlocked = true,
                blockedReason = context.revokedReason
                    ?: "Access to ${context.operatingLocationLabel} has been suspended or revoked.",
                primaryDestinations = emptyList(),
                quickActions = emptyList(),
                workspaceSections = emptyList(),
                allowedDestinations = emptySet()
            )
        }

        val allowed = MobileDestination.entries
            .filter { canAccessDestination(context, it) }
            .toSet()

        val preferredTabs = preferredPrimaryTabs[context.role]
            ?: listOf(MobileDestination.HOME, MobileDestination.TASKS, MobileDestination.WORKSPACE)

        val primary = preferredTabs.filter { it in allowed }.toMutableList()
        if (MobileDestination.HOME !in primary && MobileDestination.HOME in allowed) {
            primary.add(0, MobileDestination.HOME)
        }
        // Ensure the Workspace hub is reachable when a role has secondary destinations
        // or when permission narrowing removed one of its primary tabs.
        if (MobileDestination.WORKSPACE in allowed &&
            MobileDestination.WORKSPACE !in primary &&
            primary.size < 4
        ) {
            primary.add(MobileDestination.WORKSPACE)
        }

        val quickActions = (preferredQuickActions[context.role] ?: emptyList())
            .filter { action ->
                context.hasPermission(action.requiredPermission) &&
                    action.destination in allowed
            }

        val sections = WorkspaceSectionGroup.entries.mapNotNull { group ->
            val groupItems = MobileDestination.entries.filter { dest ->
                dest.sectionGroup == group && dest in allowed
            }
            if (groupItems.isEmpty()) null
            else ResolvedWorkspaceSection(group = group, destinations = groupItems)
        }

        return ResolvedRoleNavigation(
            role = context.role,
            isAccessBlocked = false,
            blockedReason = null,
            primaryDestinations = primary.take(4),
            quickActions = quickActions,
            workspaceSections = sections,
            allowedDestinations = allowed
        )
    }

    /**
     * Authorizes an operational mutation against the active context, ensuring:
     * 1. Membership is active (not revoked/suspended).
     * 2. Target business matches active business (no cross-tenant leakage).
     * 3. Required granular permission is granted.
     * 4. Separation of duties holds on approval decisions when applicable.
     */
    fun authorizeOperation(
        context: OperatingContext,
        requiredPermission: MobilePermission,
        targetBusinessId: String = context.businessId,
        approvalRequestedByMembershipId: String? = null,
        requireSeparationOfDuties: Boolean = false
    ): OperationAuthResult {
        if (context.isRevoked) {
            return OperationAuthResult(
                allowed = false,
                reason = context.revokedReason ?: "Access to this workspace is revoked."
            )
        }
        if (targetBusinessId != context.businessId) {
            return OperationAuthResult(
                allowed = false,
                reason = "Cannot perform action outside active business (${context.branchName})."
            )
        }
        if (!context.hasPermission(requiredPermission)) {
            return OperationAuthResult(
                allowed = false,
                reason = "${context.role.title} does not have ${requiredPermission.name} permission."
            )
        }
        if (requiredPermission == MobilePermission.APPROVAL_DECIDE &&
            requireSeparationOfDuties &&
            !approvalRequestedByMembershipId.isNullOrBlank() &&
            approvalRequestedByMembershipId == context.membershipId
        ) {
            return OperationAuthResult(
                allowed = false,
                reason = "Separation of duties: a different manager or owner must approve your request."
            )
        }
        return OperationAuthResult(allowed = true)
    }
}
