package com.omix.aide.domain.ia

/**
 * Granular permissions governing what an employee can see and execute on Android.
 *
 * Mirrors the backend `MOBILE_PERMISSIONS` contract (`src/lib/mobileNavigation.mjs`)
 * and `Permission` enum (`src/lib/rbac.ts`). The backend remains authoritative;
 * client-side permission checks prevent exposing unauthorized navigation or
 * controls and fail closed if permissions are narrowed or revoked.
 */
enum class MobilePermission {
    SALE_CREATE,
    SALE_READ,
    SALE_REFUND,
    SHIFT_OPEN,
    SHIFT_CLOSE,
    SHIFT_MANAGE,
    PRODUCT_READ,
    PRODUCT_CREATE,
    PRODUCT_UPDATE,
    PRODUCT_DELETE,
    GOODS_RECEIVE,
    PURCHASE_ORDER_READ,
    STOCK_COUNT_PERFORM,
    STOCK_ADJUST_CREATE,
    STOCK_ADJUST_READ,
    CUSTOMER_READ,
    CUSTOMER_CREATE,
    CUSTOMER_UPDATE,
    CUSTOMER_DELETE,
    EXPENSE_READ,
    EXPENSE_CREATE,
    ACCOUNT_READ,
    JOURNAL_READ,
    REPORT_READ,
    REPORT_EXPORT,
    TASK_VIEW,
    TASK_COMPLETE,
    APPROVAL_REQUEST,
    APPROVAL_DECIDE,
    SETTINGS_READ,
    SETTINGS_UPDATE,
    CONTEXT_SWITCH;

    companion object {
        fun fromKey(key: String?): MobilePermission? {
            if (key.isNullOrBlank()) return null
            val normalized = key.trim().uppercase()
            return entries.firstOrNull { it.name == normalized }
        }
    }
}

/**
 * The seven first-class mobile employee personas defined in AIDE-ANDROID-06.
 */
enum class EmployeeRole(
    val title: String,
    val shortBadge: String,
    val dailyFocus: String,
    val defaultPermissions: Set<MobilePermission>
) {
    OWNER_ADMIN(
        title = "Owner / Admin",
        shortBadge = "Owner",
        dailyFocus = "Full business oversight, approvals, POS, stock, finance and workspace setup.",
        defaultPermissions = MobilePermission.entries.toSet()
    ),
    BRANCH_MANAGER(
        title = "Branch Manager",
        shortBadge = "Manager",
        dailyFocus = "Supervise branch operations, approve staff requests, oversee shifts, stock and sales.",
        defaultPermissions = setOf(
            MobilePermission.SALE_CREATE,
            MobilePermission.SALE_READ,
            MobilePermission.SALE_REFUND,
            MobilePermission.SHIFT_OPEN,
            MobilePermission.SHIFT_CLOSE,
            MobilePermission.SHIFT_MANAGE,
            MobilePermission.PRODUCT_READ,
            MobilePermission.PRODUCT_CREATE,
            MobilePermission.PRODUCT_UPDATE,
            MobilePermission.GOODS_RECEIVE,
            MobilePermission.PURCHASE_ORDER_READ,
            MobilePermission.STOCK_COUNT_PERFORM,
            MobilePermission.STOCK_ADJUST_CREATE,
            MobilePermission.STOCK_ADJUST_READ,
            MobilePermission.CUSTOMER_READ,
            MobilePermission.CUSTOMER_CREATE,
            MobilePermission.CUSTOMER_UPDATE,
            MobilePermission.EXPENSE_READ,
            MobilePermission.EXPENSE_CREATE,
            MobilePermission.ACCOUNT_READ,
            MobilePermission.JOURNAL_READ,
            MobilePermission.REPORT_READ,
            MobilePermission.REPORT_EXPORT,
            MobilePermission.TASK_VIEW,
            MobilePermission.TASK_COMPLETE,
            MobilePermission.APPROVAL_REQUEST,
            MobilePermission.APPROVAL_DECIDE,
            MobilePermission.SETTINGS_READ,
            MobilePermission.CONTEXT_SWITCH
        )
    ),
    CASHIER(
        title = "Cashier",
        shortBadge = "Cashier",
        dailyFocus = "Ring up sales quickly, check product prices/availability, manage till shift and request overrides.",
        defaultPermissions = setOf(
            MobilePermission.SALE_CREATE,
            MobilePermission.SALE_READ,
            MobilePermission.SHIFT_OPEN,
            MobilePermission.SHIFT_CLOSE,
            MobilePermission.PRODUCT_READ,
            MobilePermission.CUSTOMER_READ,
            MobilePermission.CUSTOMER_CREATE,
            MobilePermission.TASK_VIEW,
            MobilePermission.TASK_COMPLETE,
            MobilePermission.APPROVAL_REQUEST,
            MobilePermission.SETTINGS_READ,
            MobilePermission.CONTEXT_SWITCH
        )
    ),
    WAREHOUSE_OPERATOR(
        title = "Warehouse Operator",
        shortBadge = "Warehouse",
        dailyFocus = "Receive inbound stock, run physical counts, look up SKUs and complete warehouse tasks.",
        defaultPermissions = setOf(
            MobilePermission.PRODUCT_READ,
            MobilePermission.GOODS_RECEIVE,
            MobilePermission.PURCHASE_ORDER_READ,
            MobilePermission.STOCK_COUNT_PERFORM,
            MobilePermission.STOCK_ADJUST_READ,
            MobilePermission.TASK_VIEW,
            MobilePermission.TASK_COMPLETE,
            MobilePermission.APPROVAL_REQUEST,
            MobilePermission.SETTINGS_READ,
            MobilePermission.CONTEXT_SWITCH
        )
    ),
    RECEIVING_CLERK(
        title = "Receiving Clerk",
        shortBadge = "Receiving",
        dailyFocus = "Verify supplier deliveries, record Goods Received Notes (GRNs) and flag discrepancies.",
        defaultPermissions = setOf(
            MobilePermission.PRODUCT_READ,
            MobilePermission.GOODS_RECEIVE,
            MobilePermission.PURCHASE_ORDER_READ,
            MobilePermission.TASK_VIEW,
            MobilePermission.TASK_COMPLETE,
            MobilePermission.APPROVAL_REQUEST,
            MobilePermission.SETTINGS_READ,
            MobilePermission.CONTEXT_SWITCH
        )
    ),
    INVENTORY_CONTROLLER(
        title = "Inventory Controller",
        shortBadge = "Inventory",
        dailyFocus = "Maintain catalogue accuracy, execute cycle counts, reconcile variances and monitor reorder alerts.",
        defaultPermissions = setOf(
            MobilePermission.PRODUCT_READ,
            MobilePermission.PRODUCT_CREATE,
            MobilePermission.PRODUCT_UPDATE,
            MobilePermission.GOODS_RECEIVE,
            MobilePermission.PURCHASE_ORDER_READ,
            MobilePermission.STOCK_COUNT_PERFORM,
            MobilePermission.STOCK_ADJUST_CREATE,
            MobilePermission.STOCK_ADJUST_READ,
            MobilePermission.TASK_VIEW,
            MobilePermission.TASK_COMPLETE,
            MobilePermission.APPROVAL_REQUEST,
            MobilePermission.SETTINGS_READ,
            MobilePermission.CONTEXT_SWITCH
        )
    ),
    ACCOUNTANT(
        title = "Accountant",
        shortBadge = "Accountant",
        dailyFocus = "Review revenue, profit, VAT, expenses, customer receivables, shift variances and financial exports.",
        defaultPermissions = setOf(
            MobilePermission.SALE_READ,
            MobilePermission.SHIFT_MANAGE,
            MobilePermission.PRODUCT_READ,
            MobilePermission.PURCHASE_ORDER_READ,
            MobilePermission.STOCK_ADJUST_READ,
            MobilePermission.CUSTOMER_READ,
            MobilePermission.EXPENSE_READ,
            MobilePermission.EXPENSE_CREATE,
            MobilePermission.ACCOUNT_READ,
            MobilePermission.JOURNAL_READ,
            MobilePermission.REPORT_READ,
            MobilePermission.REPORT_EXPORT,
            MobilePermission.TASK_VIEW,
            MobilePermission.TASK_COMPLETE,
            MobilePermission.APPROVAL_REQUEST,
            MobilePermission.SETTINGS_READ,
            MobilePermission.CONTEXT_SWITCH
        )
    );

    companion object {
        fun fromKey(key: String?): EmployeeRole =
            entries.firstOrNull { it.name.equals(key?.trim(), ignoreCase = true) } ?: OWNER_ADMIN
    }
}

/**
 * How this Android device is assigned within the organization.
 */
enum class DeviceAssignmentMode(
    val title: String,
    val description: String
) {
    OWNER_PERSONAL(
        title = "Personal / Owner Device",
        description = "Used by one owner or employee across their assigned business memberships."
    ),
    SHARED_BRANCH_DEVICE(
        title = "Shared Branch Phone",
        description = "Shared among branch staff; always verify the active role and branch header before acting."
    ),
    DEDICATED_POS_TERMINAL(
        title = "Dedicated POS Terminal",
        description = "Bound to a specific checkout lane/till for cashier shifts and customer receipts."
    ),
    DEDICATED_WAREHOUSE_HANDHELD(
        title = "Warehouse / Stockroom Handheld",
        description = "Assigned to a warehouse or receiving bay for inbound deliveries and cycle counts."
    );

    companion object {
        fun fromKey(key: String?): DeviceAssignmentMode =
            entries.firstOrNull { it.name.equals(key?.trim(), ignoreCase = true) } ?: OWNER_PERSONAL
    }
}

/**
 * Honest representation of data persistence and authority on the device.
 */
enum class WorkspaceSyncMode(
    val badgeLabel: String,
    val statusDescription: String
) {
    LOCAL_DEVICE_ONLY(
        badgeLabel = "On-device workspace",
        statusDescription = "Records are stored locally on this device per business workspace. " +
            "Nothing is uploaded automatically; export a copy from Settings before uninstalling."
    ),
    SERVER_MANAGED_CONTEXT(
        badgeLabel = "Server-governed role",
        statusDescription = "Role and location permissions follow your organization's policy; " +
            "offline actions remain stored locally until synchronized."
    );

    companion object {
        fun fromKey(key: String?): WorkspaceSyncMode =
            entries.firstOrNull { it.name.equals(key?.trim(), ignoreCase = true) } ?: LOCAL_DEVICE_ONLY
    }
}

/**
 * Logical grouping for secondary destinations so workflows are never buried in an
 * unorganized catch-all screen.
 */
enum class WorkspaceSectionGroup(val title: String, val subtitle: String) {
    DAILY_OPERATIONS(
        title = "Store & Warehouse Operations",
        subtitle = "Checkout, product lookup, inbound receiving, stock counts, tasks and approvals"
    ),
    CUSTOMERS_AND_FINANCE(
        title = "Customers & Finance",
        subtitle = "Customer directory, overheads, financial reports and pricing margin tools"
    ),
    WORKSPACE_AND_DEVICE(
        title = "Workspace & Device",
        subtitle = "Role & location context, setup guide, appearance, alerts and data export"
    )
}

/**
 * Every task destination in the Android information architecture.
 */
enum class MobileDestination(
    val route: String,
    val navLabel: String,
    val title: String,
    val subtitle: String,
    val sectionGroup: WorkspaceSectionGroup?,
    val requiredAnyPermissions: Set<MobilePermission>
) {
    HOME(
        route = "home",
        navLabel = "Home",
        title = "Home",
        subtitle = "Role priorities, quick actions, alerts and recent activity",
        sectionGroup = null,
        requiredAnyPermissions = emptySet()
    ),
    SELL(
        route = "sell",
        navLabel = "Sell",
        title = "Point of Sale",
        subtitle = "Ring up items, record cash/mobile/card tender and issue receipts",
        sectionGroup = WorkspaceSectionGroup.DAILY_OPERATIONS,
        requiredAnyPermissions = setOf(MobilePermission.SALE_CREATE)
    ),
    STOCK(
        route = "stock",
        navLabel = "Stock",
        title = "Product Catalogue",
        subtitle = "Add or update products, pricing, SKUs and low-stock thresholds",
        sectionGroup = WorkspaceSectionGroup.DAILY_OPERATIONS,
        requiredAnyPermissions = setOf(MobilePermission.PRODUCT_CREATE, MobilePermission.PRODUCT_UPDATE)
    ),
    PRODUCT_LOOKUP(
        route = "lookup",
        navLabel = "Lookup",
        title = "Scan / Search Product",
        subtitle = "Check SKU, selling price and available units in this branch",
        sectionGroup = WorkspaceSectionGroup.DAILY_OPERATIONS,
        requiredAnyPermissions = setOf(MobilePermission.PRODUCT_READ)
    ),
    RECEIVE_GOODS(
        route = "receive-goods",
        navLabel = "Receive",
        title = "Receive Goods",
        subtitle = "Record supplier deliveries (GRN) and add inbound units to stock",
        sectionGroup = WorkspaceSectionGroup.DAILY_OPERATIONS,
        requiredAnyPermissions = setOf(MobilePermission.GOODS_RECEIVE)
    ),
    STOCK_COUNT(
        route = "stock-count",
        navLabel = "Count",
        title = "Count Stock",
        subtitle = "Capture physical counts, check variances and reconcile stock",
        sectionGroup = WorkspaceSectionGroup.DAILY_OPERATIONS,
        requiredAnyPermissions = setOf(
            MobilePermission.STOCK_COUNT_PERFORM,
            MobilePermission.STOCK_ADJUST_CREATE
        )
    ),
    TASKS(
        route = "tasks",
        navLabel = "Tasks",
        title = "Assigned Tasks",
        subtitle = "Daily operational checklist and live exception queue",
        sectionGroup = WorkspaceSectionGroup.DAILY_OPERATIONS,
        requiredAnyPermissions = setOf(MobilePermission.TASK_VIEW)
    ),
    SHIFTS(
        route = "shifts",
        navLabel = "Shift",
        title = "Cashier Shifts",
        subtitle = "Open till float, monitor shift takings and close cash count",
        sectionGroup = WorkspaceSectionGroup.DAILY_OPERATIONS,
        requiredAnyPermissions = setOf(
            MobilePermission.SHIFT_OPEN,
            MobilePermission.SHIFT_CLOSE,
            MobilePermission.SHIFT_MANAGE
        )
    ),
    APPROVALS(
        route = "approvals",
        navLabel = "Approvals",
        title = "Approvals",
        subtitle = "Request manager overrides or decide pending team requests",
        sectionGroup = WorkspaceSectionGroup.DAILY_OPERATIONS,
        requiredAnyPermissions = setOf(
            MobilePermission.APPROVAL_REQUEST,
            MobilePermission.APPROVAL_DECIDE
        )
    ),
    CUSTOMERS(
        route = "customers",
        navLabel = "Customers",
        title = "Customers",
        subtitle = "Customer directory and outstanding credit balances",
        sectionGroup = WorkspaceSectionGroup.CUSTOMERS_AND_FINANCE,
        requiredAnyPermissions = setOf(MobilePermission.CUSTOMER_READ)
    ),
    EXPENSES(
        route = "expenses",
        navLabel = "Expenses",
        title = "Expenses",
        subtitle = "Record and review shop overheads and operating costs",
        sectionGroup = WorkspaceSectionGroup.CUSTOMERS_AND_FINANCE,
        requiredAnyPermissions = setOf(
            MobilePermission.EXPENSE_READ,
            MobilePermission.EXPENSE_CREATE
        )
    ),
    REPORTS(
        route = "reports",
        navLabel = "Reports",
        title = "Financial Reports",
        subtitle = "Revenue, gross/net profit, VAT collected and payment breakdown",
        sectionGroup = WorkspaceSectionGroup.CUSTOMERS_AND_FINANCE,
        requiredAnyPermissions = setOf(MobilePermission.REPORT_READ)
    ),
    CALCULATOR(
        route = "calculator",
        navLabel = "Margin",
        title = "Margin Calculator",
        subtitle = "Check unit markup, revenue and profit margin before pricing",
        sectionGroup = WorkspaceSectionGroup.CUSTOMERS_AND_FINANCE,
        requiredAnyPermissions = setOf(
            MobilePermission.PRODUCT_UPDATE,
            MobilePermission.REPORT_READ
        )
    ),
    SETTINGS(
        route = "settings",
        navLabel = "Settings",
        title = "Settings & Export",
        subtitle = "Appearance, notifications, business profile and JSON snapshot export",
        sectionGroup = WorkspaceSectionGroup.WORKSPACE_AND_DEVICE,
        requiredAnyPermissions = setOf(
            MobilePermission.SETTINGS_READ,
            MobilePermission.SETTINGS_UPDATE
        )
    ),
    WORKSPACE(
        route = "workspace",
        navLabel = "Workspace",
        title = "Workspace",
        subtitle = "Grouped modules, operating location and role switcher",
        sectionGroup = null,
        requiredAnyPermissions = setOf(
            MobilePermission.SETTINGS_READ,
            MobilePermission.TASK_VIEW
        )
    );

    companion object {
        fun fromRoute(route: String?): MobileDestination? {
            if (route.isNullOrBlank()) return null
            val clean = route.trim().lowercase()
            if (clean == "more") return WORKSPACE
            return entries.firstOrNull { it.route == clean }
        }
    }
}

/**
 * High-frequency quick actions surfaced on role home screens.
 */
enum class QuickAction(
    val label: String,
    val subtitle: String,
    val destination: MobileDestination,
    val requiredPermission: MobilePermission
) {
    START_SALE(
        label = "Start Sale",
        subtitle = "Open POS checkout",
        destination = MobileDestination.SELL,
        requiredPermission = MobilePermission.SALE_CREATE
    ),
    SCAN_SEARCH_PRODUCT(
        label = "Scan / Search",
        subtitle = "Price & stock lookup",
        destination = MobileDestination.PRODUCT_LOOKUP,
        requiredPermission = MobilePermission.PRODUCT_READ
    ),
    RECEIVE_GOODS(
        label = "Receive Goods",
        subtitle = "Record delivery GRN",
        destination = MobileDestination.RECEIVE_GOODS,
        requiredPermission = MobilePermission.GOODS_RECEIVE
    ),
    COUNT_STOCK(
        label = "Count Stock",
        subtitle = "Cycle count & variance",
        destination = MobileDestination.STOCK_COUNT,
        requiredPermission = MobilePermission.STOCK_COUNT_PERFORM
    ),
    VIEW_ASSIGNED_TASKS(
        label = "View Tasks",
        subtitle = "Daily checklist",
        destination = MobileDestination.TASKS,
        requiredPermission = MobilePermission.TASK_VIEW
    ),
    REVIEW_APPROVALS(
        label = "Approvals",
        subtitle = "Decide pending requests",
        destination = MobileDestination.APPROVALS,
        requiredPermission = MobilePermission.APPROVAL_DECIDE
    ),
    REQUEST_APPROVAL(
        label = "Request Approval",
        subtitle = "Ask manager override",
        destination = MobileDestination.APPROVALS,
        requiredPermission = MobilePermission.APPROVAL_REQUEST
    ),
    OPEN_CLOSE_SHIFT(
        label = "Open / Close Shift",
        subtitle = "Till float & cash count",
        destination = MobileDestination.SHIFTS,
        requiredPermission = MobilePermission.SHIFT_CLOSE
    ),
    VIEW_REPORTS(
        label = "Financial Reports",
        subtitle = "Revenue, profit & VAT",
        destination = MobileDestination.REPORTS,
        requiredPermission = MobilePermission.REPORT_READ
    ),
    RECORD_EXPENSE(
        label = "Expenses",
        subtitle = "Log or review overheads",
        destination = MobileDestination.EXPENSES,
        requiredPermission = MobilePermission.EXPENSE_CREATE
    ),
    CUSTOMER_BALANCES(
        label = "Customers",
        subtitle = "Directory & receivables",
        destination = MobileDestination.CUSTOMERS,
        requiredPermission = MobilePermission.CUSTOMER_READ
    ),
    MANAGE_CATALOGUE(
        label = "Catalogue",
        subtitle = "Products & thresholds",
        destination = MobileDestination.STOCK,
        requiredPermission = MobilePermission.PRODUCT_UPDATE
    )
}

/**
 * One membership binding an employee to an organization, business/branch,
 * optional warehouse/terminal, role, and effective permissions.
 */
data class WorkspaceMembership(
    val membershipId: String,
    val employeeName: String = "Staff Member",
    val organizationId: String,
    val organizationName: String,
    val businessId: String,
    val businessName: String,
    val branchId: String = businessId,
    val branchName: String = businessName,
    val warehouseId: String? = null,
    val warehouseName: String? = null,
    val terminalId: String? = null,
    val terminalName: String? = null,
    val role: EmployeeRole = EmployeeRole.OWNER_ADMIN,
    val grantedPermissions: Set<MobilePermission> = role.defaultPermissions,
    val deviceAssignment: DeviceAssignmentMode = DeviceAssignmentMode.OWNER_PERSONAL,
    val deviceLabel: String = "This Android Device",
    val syncMode: WorkspaceSyncMode = WorkspaceSyncMode.LOCAL_DEVICE_ONLY,
    val isRevoked: Boolean = false,
    val revokedReason: String? = null
) {
    fun toOperatingContext(): OperatingContext = OperatingContext(
        membershipId = membershipId,
        employeeName = employeeName,
        organizationId = organizationId,
        organizationName = organizationName,
        businessId = businessId,
        businessName = businessName,
        branchId = branchId,
        branchName = branchName,
        warehouseId = warehouseId,
        warehouseName = warehouseName,
        terminalId = terminalId,
        terminalName = terminalName,
        role = role,
        grantedPermissions = if (isRevoked) emptySet() else grantedPermissions,
        deviceAssignment = deviceAssignment,
        deviceLabel = deviceLabel,
        syncMode = syncMode,
        isRevoked = isRevoked,
        revokedReason = revokedReason
    )
}

/**
 * Immutable snapshot of the employee's active operating location, role, and
 * granted permissions. Every navigation decision and data stream scopes to this.
 */
data class OperatingContext(
    val membershipId: String,
    val employeeName: String = "Owner",
    val organizationId: String,
    val organizationName: String,
    val businessId: String,
    val businessName: String,
    val branchId: String = businessId,
    val branchName: String = businessName,
    val warehouseId: String? = null,
    val warehouseName: String? = null,
    val terminalId: String? = null,
    val terminalName: String? = null,
    val role: EmployeeRole = EmployeeRole.OWNER_ADMIN,
    val grantedPermissions: Set<MobilePermission> = role.defaultPermissions,
    val deviceAssignment: DeviceAssignmentMode = DeviceAssignmentMode.OWNER_PERSONAL,
    val deviceLabel: String = "This Android Device",
    val syncMode: WorkspaceSyncMode = WorkspaceSyncMode.LOCAL_DEVICE_ONLY,
    val isRevoked: Boolean = false,
    val revokedReason: String? = null
) {
    fun hasPermission(permission: MobilePermission): Boolean =
        !isRevoked && permission in grantedPermissions

    fun hasAnyPermission(vararg permissions: MobilePermission): Boolean =
        !isRevoked && permissions.any { it in grantedPermissions }

    /** Concise location label for headers and mutation confirmation sheets. */
    val operatingLocationLabel: String
        get() = buildList {
            if (organizationName.isNotBlank() && !organizationName.equals(branchName, ignoreCase = true)) {
                add(organizationName)
            }
            add(branchName.ifBlank { businessName.ifBlank { "Main Branch" } })
            when {
                role in setOf(
                    EmployeeRole.WAREHOUSE_OPERATOR,
                    EmployeeRole.RECEIVING_CLERK,
                    EmployeeRole.INVENTORY_CONTROLLER
                ) && !warehouseName.isNullOrBlank() -> add(warehouseName)

                role in setOf(
                    EmployeeRole.CASHIER,
                    EmployeeRole.BRANCH_MANAGER,
                    EmployeeRole.OWNER_ADMIN
                ) && !terminalName.isNullOrBlank() -> add(terminalName)

                !warehouseName.isNullOrBlank() -> add(warehouseName)
                !terminalName.isNullOrBlank() -> add(terminalName)
            }
        }.joinToString(" · ")

    /** Specific sub-location badge (Till or Warehouse) when assigned. */
    val stationBadge: String?
        get() = when {
            role in setOf(
                EmployeeRole.WAREHOUSE_OPERATOR,
                EmployeeRole.RECEIVING_CLERK,
                EmployeeRole.INVENTORY_CONTROLLER
            ) -> warehouseName?.takeIf { it.isNotBlank() }

            role == EmployeeRole.CASHIER -> terminalName?.takeIf { it.isNotBlank() }
            else -> terminalName?.takeIf { it.isNotBlank() } ?: warehouseName?.takeIf { it.isNotBlank() }
        }
}
