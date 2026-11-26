package com.omix.aide

import com.omix.aide.data.local.InMemoryKeyValueStorage
import com.omix.aide.data.local.WorkspaceContextStore
import com.omix.aide.domain.ia.DeviceAssignmentMode
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobileDestination
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.RoleNavigationResolver
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class RoleNavigationModelTest {

    private fun contextFor(
        role: EmployeeRole,
        businessId: String = "biz-nairobi-cbd",
        branchName: String = "Nairobi CBD",
        permissions: Set<MobilePermission> = role.defaultPermissions,
        isRevoked: Boolean = false
    ) = OperatingContext(
        membershipId = "mem-${role.name.lowercase()}",
        employeeName = "Test ${role.shortBadge}",
        organizationId = "org-omix",
        organizationName = "Omix Retail Group",
        businessId = businessId,
        businessName = "Omix Mart",
        branchId = businessId,
        branchName = branchName,
        warehouseName = "Main Stockroom",
        terminalName = "Till 01",
        role = role,
        grantedPermissions = permissions,
        isRevoked = isRevoked
    )

    @Test
    fun everyPersonaResolvesDistinctTaskOrientedPrimaryNavigationAndHomeActions() {
        val expectedPrimaryRoutes = mapOf(
            EmployeeRole.OWNER_ADMIN to listOf("home", "sell", "stock", "workspace"),
            EmployeeRole.BRANCH_MANAGER to listOf("home", "tasks", "sell", "workspace"),
            EmployeeRole.CASHIER to listOf("home", "sell", "lookup", "shifts"),
            EmployeeRole.WAREHOUSE_OPERATOR to listOf("home", "receive-goods", "stock-count", "tasks"),
            EmployeeRole.RECEIVING_CLERK to listOf("home", "receive-goods", "lookup", "tasks"),
            EmployeeRole.INVENTORY_CONTROLLER to listOf("home", "stock", "stock-count", "workspace"),
            EmployeeRole.ACCOUNTANT to listOf("home", "reports", "expenses", "workspace")
        )

        EmployeeRole.entries.forEach { role ->
            val resolved = RoleNavigationResolver.resolve(contextFor(role))
            assertFalse("Role $role should not be blocked by default", resolved.isAccessBlocked)
            assertEquals(
                "Primary tabs mismatch for $role",
                expectedPrimaryRoutes[role],
                resolved.primaryDestinations.map { it.route }
            )
            assertTrue(
                "Role $role must expose at least 2 quick actions on Home",
                resolved.quickActions.size >= 2
            )
            // Every surfaced quick action must point to an allowed destination
            resolved.quickActions.forEach { action ->
                assertTrue(
                    "Quick action ${action.name} for $role must target an allowed destination",
                    action.destination in resolved.allowedDestinations
                )
            }
        }
    }

    @Test
    fun unauthorizedDestinationsAreNeverAllowedForRestrictedPersonas() {
        val cashier = contextFor(EmployeeRole.CASHIER)
        assertFalse(RoleNavigationResolver.canAccessDestination(cashier, MobileDestination.REPORTS))
        assertFalse(RoleNavigationResolver.canAccessDestination(cashier, MobileDestination.EXPENSES))
        assertFalse(RoleNavigationResolver.canAccessDestination(cashier, MobileDestination.STOCK))
        assertFalse(RoleNavigationResolver.canAccessDestination(cashier, MobileDestination.RECEIVE_GOODS))
        assertFalse(RoleNavigationResolver.canAccessDestination(cashier, MobileDestination.STOCK_COUNT))
        assertTrue(RoleNavigationResolver.canAccessDestination(cashier, MobileDestination.SELL))
        assertTrue(RoleNavigationResolver.canAccessDestination(cashier, MobileDestination.PRODUCT_LOOKUP))
        assertTrue(RoleNavigationResolver.canAccessDestination(cashier, MobileDestination.SHIFTS))

        val warehouse = contextFor(EmployeeRole.WAREHOUSE_OPERATOR)
        assertFalse(RoleNavigationResolver.canAccessDestination(warehouse, MobileDestination.SELL))
        assertFalse(RoleNavigationResolver.canAccessDestination(warehouse, MobileDestination.REPORTS))
        assertFalse(RoleNavigationResolver.canAccessDestination(warehouse, MobileDestination.EXPENSES))
        assertFalse(RoleNavigationResolver.canAccessDestination(warehouse, MobileDestination.CUSTOMERS))
        assertFalse(RoleNavigationResolver.canAccessDestination(warehouse, MobileDestination.SHIFTS))
        assertTrue(RoleNavigationResolver.canAccessDestination(warehouse, MobileDestination.RECEIVE_GOODS))
        assertTrue(RoleNavigationResolver.canAccessDestination(warehouse, MobileDestination.STOCK_COUNT))

        val receiving = contextFor(EmployeeRole.RECEIVING_CLERK)
        assertFalse(RoleNavigationResolver.canAccessDestination(receiving, MobileDestination.STOCK_COUNT))
        assertFalse(RoleNavigationResolver.canAccessDestination(receiving, MobileDestination.SELL))
        assertTrue(RoleNavigationResolver.canAccessDestination(receiving, MobileDestination.RECEIVE_GOODS))
        assertTrue(RoleNavigationResolver.canAccessDestination(receiving, MobileDestination.PRODUCT_LOOKUP))

        val accountant = contextFor(EmployeeRole.ACCOUNTANT)
        assertFalse(RoleNavigationResolver.canAccessDestination(accountant, MobileDestination.SELL))
        assertFalse(RoleNavigationResolver.canAccessDestination(accountant, MobileDestination.RECEIVE_GOODS))
        assertFalse(RoleNavigationResolver.canAccessDestination(accountant, MobileDestination.STOCK_COUNT))
        assertTrue(RoleNavigationResolver.canAccessDestination(accountant, MobileDestination.REPORTS))
        assertTrue(RoleNavigationResolver.canAccessDestination(accountant, MobileDestination.EXPENSES))
    }

    @Test
    fun serverPermissionNarrowingAndRevocationFailClosedImmediately() {
        val storage = InMemoryKeyValueStorage()
        val store = WorkspaceContextStore(
            storage = storage,
            initialBusinessId = "biz-1",
            initialBusinessName = "Westlands Shop",
            alreadyCompletedLegacySetup = true
        )
        store.updateActiveRoleAndLocation(role = EmployeeRole.BRANCH_MANAGER, branchName = "Westlands")
        val memId = store.activeContext.value.membershipId

        // Narrow manager permissions by removing SALE_CREATE and REPORT_READ on server
        val narrowed = EmployeeRole.BRANCH_MANAGER.defaultPermissions -
            setOf(MobilePermission.SALE_CREATE, MobilePermission.REPORT_READ)
        store.applyServerPermissionChange(
            membershipId = memId,
            grantedPermissions = narrowed
        )

        val afterNarrow = store.activeContext.value
        val navAfterNarrow = RoleNavigationResolver.resolve(afterNarrow)
        assertFalse(navAfterNarrow.primaryDestinations.any { it == MobileDestination.SELL })
        assertFalse(RoleNavigationResolver.canAccessRoute(afterNarrow, "sell"))
        assertFalse(RoleNavigationResolver.canAccessRoute(afterNarrow, "reports"))

        // Full revocation blocks all operational routes
        store.applyServerPermissionChange(
            membershipId = memId,
            isRevoked = true,
            revokedReason = "Shift assignment ended."
        )
        val afterRevoke = store.activeContext.value
        val navAfterRevoke = RoleNavigationResolver.resolve(afterRevoke)
        assertTrue(navAfterRevoke.isAccessBlocked)
        assertEquals("Shift assignment ended.", navAfterRevoke.blockedReason)
        assertTrue(navAfterRevoke.primaryDestinations.isEmpty())
        assertFalse(RoleNavigationResolver.canAccessRoute(afterRevoke, "home"))
        assertFalse(RoleNavigationResolver.canAccessRoute(afterRevoke, "tasks"))
    }

    @Test
    fun legacyUpgradePreservesExistingOwnerWorkflowAndNeverSilentlySwitchesMembership() {
        val switchedIds = mutableListOf<String>()
        val store = WorkspaceContextStore(
            storage = InMemoryKeyValueStorage(),
            initialBusinessId = "legacy-biz-001",
            initialBusinessName = "Mama Njeri Wholesalers",
            alreadyCompletedLegacySetup = true,
            onActiveBusinessChanged = { id, _ -> switchedIds.add(id) }
        )

        assertTrue("Existing installs should not be forced through role onboarding", store.hasCompletedRoleOnboarding())
        assertEquals("legacy-biz-001", store.activeContext.value.businessId)
        assertEquals(EmployeeRole.OWNER_ADMIN, store.activeContext.value.role)
        assertEquals(
            listOf("home", "sell", "stock", "workspace"),
            RoleNavigationResolver.resolve(store.activeContext.value).primaryDestinations.map { it.route }
        )
        // Legacy "more" route still resolves to Workspace for existing muscle memory
        assertTrue(RoleNavigationResolver.canAccessRoute(store.activeContext.value, "more"))

        // Adding a second membership without activateImmediately does NOT switch context
        val second = store.addMembership(
            employeeName = "Njeri",
            organizationName = "Njeri Group",
            businessName = "Mombasa Depot",
            branchName = "Mombasa Warehouse",
            warehouseName = "Bay B",
            role = EmployeeRole.WAREHOUSE_OPERATOR,
            deviceAssignment = DeviceAssignmentMode.DEDICATED_WAREHOUSE_HANDHELD,
            businessId = "biz-mombasa-002",
            activateImmediately = false
        )
        assertEquals("legacy-biz-001", store.activeContext.value.businessId)
        assertTrue(switchedIds.isEmpty())

        // Explicit switch updates active business and role cleanly
        assertTrue(store.switchActiveMembership(second.membershipId))
        assertEquals("biz-mombasa-002", store.activeContext.value.businessId)
        assertEquals(EmployeeRole.WAREHOUSE_OPERATOR, store.activeContext.value.role)
        assertEquals(listOf("biz-mombasa-002"), switchedIds)
    }

    @Test
    fun authorizeOperationEnforcesTenantBoundaryAndSeparationOfDuties() {
        val manager = contextFor(EmployeeRole.BRANCH_MANAGER, businessId = "biz-a")

        // Cross-tenant write rejected
        val crossTenant = RoleNavigationResolver.authorizeOperation(
            context = manager,
            requiredPermission = MobilePermission.PRODUCT_UPDATE,
            targetBusinessId = "biz-b"
        )
        assertFalse(crossTenant.allowed)
        assertNotNull(crossTenant.reason)

        // Self-approval rejected when separation of duties applies
        val selfApproval = RoleNavigationResolver.authorizeOperation(
            context = manager,
            requiredPermission = MobilePermission.APPROVAL_DECIDE,
            approvalRequestedByMembershipId = manager.membershipId,
            requireSeparationOfDuties = true
        )
        assertFalse(selfApproval.allowed)

        // Approving a different employee's request succeeds
        val peerApproval = RoleNavigationResolver.authorizeOperation(
            context = manager,
            requiredPermission = MobilePermission.APPROVAL_DECIDE,
            approvalRequestedByMembershipId = "mem-cashier-01",
            requireSeparationOfDuties = true
        )
        assertTrue(peerApproval.allowed)
    }
}
