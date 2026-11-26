package com.omix.aide.data.local

import android.content.Context
import com.omix.aide.domain.ia.DeviceAssignmentMode
import com.omix.aide.domain.ia.EmployeeRole
import com.omix.aide.domain.ia.MobilePermission
import com.omix.aide.domain.ia.OperatingContext
import com.omix.aide.domain.ia.WorkspaceMembership
import com.omix.aide.domain.ia.WorkspaceSyncMode
import java.util.UUID
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.json.JSONArray
import org.json.JSONObject

/**
 * Minimal key-value persistence abstraction so [WorkspaceContextStore] and
 * [OperationsStore] run identically against Android SharedPreferences in
 * production and an in-memory map in fast JVM unit tests.
 */
interface KeyValueStorage {
    fun getString(key: String, defaultValue: String? = null): String?
    fun putString(key: String, value: String?)
    fun getBoolean(key: String, defaultValue: Boolean = false): Boolean
    fun putBoolean(key: String, value: Boolean)
}

class InMemoryKeyValueStorage : KeyValueStorage {
    private val strings = mutableMapOf<String, String?>()
    private val booleans = mutableMapOf<String, Boolean>()

    override fun getString(key: String, defaultValue: String?): String? =
        if (key in strings) strings[key] else defaultValue

    override fun putString(key: String, value: String?) {
        if (value == null) strings.remove(key) else strings[key] = value
    }

    override fun getBoolean(key: String, defaultValue: Boolean): Boolean =
        booleans[key] ?: defaultValue

    override fun putBoolean(key: String, value: Boolean) {
        booleans[key] = value
    }
}

class SharedPreferencesKeyValueStorage(context: Context, prefsName: String) : KeyValueStorage {
    private val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)

    override fun getString(key: String, defaultValue: String?): String? =
        prefs.getString(key, defaultValue)

    override fun putString(key: String, value: String?) {
        prefs.edit().apply {
            if (value == null) remove(key) else putString(key, value)
        }.apply()
    }

    override fun getBoolean(key: String, defaultValue: Boolean): Boolean =
        prefs.getBoolean(key, defaultValue)

    override fun putBoolean(key: String, value: Boolean) {
        prefs.edit().putBoolean(key, value).apply()
    }
}

/**
 * Manages the employee's memberships, active operating location context, role,
 * permissions, and role-onboarding state.
 *
 * Guarantees:
 * - Existing Aide installs upgrade seamlessly: their existing `businessId` and
 *   `businessName` map to an initial [EmployeeRole.OWNER_ADMIN] membership with
 *   no orphaned records and no forced re-onboarding.
 * - Active business/branch context is never switched silently.
 * - Server-driven permission narrowing or revocation updates [activeContext]
 *   immediately so navigation and in-screen controls react without restart.
 */
class WorkspaceContextStore(
    private val storage: KeyValueStorage,
    initialBusinessId: String,
    initialBusinessName: String,
    alreadyCompletedLegacySetup: Boolean = false,
    private val onActiveBusinessChanged: (businessId: String, businessName: String) -> Unit = { _, _ -> }
) {

    private val _memberships = MutableStateFlow<List<WorkspaceMembership>>(emptyList())
    val memberships: StateFlow<List<WorkspaceMembership>> = _memberships.asStateFlow()

    private val _activeContext = MutableStateFlow(
        defaultMembership(initialBusinessId, initialBusinessName).toOperatingContext()
    )
    val activeContext: StateFlow<OperatingContext> = _activeContext.asStateFlow()

    init {
        val loaded = loadMemberships()
        if (loaded.isEmpty()) {
            val seeded = defaultMembership(initialBusinessId, initialBusinessName)
            _memberships.value = listOf(seeded)
            _activeContext.value = seeded.toOperatingContext()
            saveMemberships(listOf(seeded))
            storage.putString(KEY_ACTIVE_MEMBERSHIP_ID, seeded.membershipId)
            if (alreadyCompletedLegacySetup) {
                storage.putBoolean(KEY_ROLE_ONBOARDING_DONE, true)
            }
        } else {
            _memberships.value = loaded
            val savedActiveId = storage.getString(KEY_ACTIVE_MEMBERSHIP_ID)
            val selected = loaded.firstOrNull { it.membershipId == savedActiveId }
                ?: loaded.firstOrNull { !it.isRevoked }
                ?: loaded.first()
            _activeContext.value = selected.toOperatingContext()
            storage.putString(KEY_ACTIVE_MEMBERSHIP_ID, selected.membershipId)
        }
    }

    fun hasCompletedRoleOnboarding(): Boolean =
        storage.getBoolean(KEY_ROLE_ONBOARDING_DONE, false)

    fun markRoleOnboardingComplete() {
        storage.putBoolean(KEY_ROLE_ONBOARDING_DONE, true)
    }

    /**
     * Completes or updates first-run onboarding for the active workspace.
     */
    fun configurePrimaryWorkspace(
        employeeName: String,
        organizationName: String,
        businessName: String,
        branchName: String,
        warehouseName: String?,
        terminalName: String?,
        role: EmployeeRole,
        deviceAssignment: DeviceAssignmentMode,
        deviceLabel: String = deviceAssignment.title
    ): OperatingContext {
        val currentId = _activeContext.value.membershipId
        val existing = _memberships.value.firstOrNull { it.membershipId == currentId }
        val resolvedBusinessName = businessName.trim().ifBlank { "My Business" }
        val resolvedBranchName = branchName.trim().ifBlank { resolvedBusinessName }
        val resolvedOrgName = organizationName.trim().ifBlank { "$resolvedBusinessName Group" }

        val updated = (existing ?: defaultMembership(UUID.randomUUID().toString(), resolvedBusinessName)).copy(
            employeeName = employeeName.trim().ifBlank { role.title },
            organizationName = resolvedOrgName,
            businessName = resolvedBusinessName,
            branchName = resolvedBranchName,
            warehouseId = warehouseName?.trim()?.takeIf { it.isNotEmpty() }?.let {
                existing?.warehouseId ?: "wh-${UUID.randomUUID().toString().take(8)}"
            },
            warehouseName = warehouseName?.trim()?.takeIf { it.isNotEmpty() },
            terminalId = terminalName?.trim()?.takeIf { it.isNotEmpty() }?.let {
                existing?.terminalId ?: "term-${UUID.randomUUID().toString().take(8)}"
            },
            terminalName = terminalName?.trim()?.takeIf { it.isNotEmpty() },
            role = role,
            grantedPermissions = role.defaultPermissions,
            deviceAssignment = deviceAssignment,
            deviceLabel = deviceLabel.trim().ifBlank { deviceAssignment.title },
            isRevoked = false,
            revokedReason = null
        )

        upsertAndActivate(updated)
        markRoleOnboardingComplete()
        return _activeContext.value
    }

    /**
     * Adds a secondary membership (for multi-branch / multi-business / multi-role
     * employees) without silently switching active context unless [activateImmediately]
     * is explicitly requested by the user.
     */
    fun addMembership(
        employeeName: String,
        organizationName: String,
        businessName: String,
        branchName: String = businessName,
        warehouseName: String? = null,
        terminalName: String? = null,
        role: EmployeeRole,
        deviceAssignment: DeviceAssignmentMode = _activeContext.value.deviceAssignment,
        syncMode: WorkspaceSyncMode = WorkspaceSyncMode.LOCAL_DEVICE_ONLY,
        businessId: String = UUID.randomUUID().toString(),
        activateImmediately: Boolean = false
    ): WorkspaceMembership {
        val cleanBiz = businessName.trim().ifBlank { "Branch Workspace" }
        val cleanBranch = branchName.trim().ifBlank { cleanBiz }
        val cleanOrg = organizationName.trim().ifBlank { "$cleanBiz Organization" }
        val created = WorkspaceMembership(
            membershipId = "mem-${UUID.randomUUID()}",
            employeeName = employeeName.trim().ifBlank { role.title },
            organizationId = "org-${cleanOrg.lowercase().replace(Regex("[^a-z0-9]+"), "-").trim('-')}",
            organizationName = cleanOrg,
            businessId = businessId,
            businessName = cleanBiz,
            branchId = businessId,
            branchName = cleanBranch,
            warehouseId = warehouseName?.trim()?.takeIf { it.isNotEmpty() }
                ?.let { "wh-${UUID.randomUUID().toString().take(8)}" },
            warehouseName = warehouseName?.trim()?.takeIf { it.isNotEmpty() },
            terminalId = terminalName?.trim()?.takeIf { it.isNotEmpty() }
                ?.let { "term-${UUID.randomUUID().toString().take(8)}" },
            terminalName = terminalName?.trim()?.takeIf { it.isNotEmpty() },
            role = role,
            grantedPermissions = role.defaultPermissions,
            deviceAssignment = deviceAssignment,
            deviceLabel = deviceAssignment.title,
            syncMode = syncMode
        )

        if (activateImmediately) {
            upsertAndActivate(created)
        } else {
            val updatedList = _memberships.value + created
            _memberships.value = updatedList
            saveMemberships(updatedList)
        }
        return created
    }

    /**
     * Explicitly switches the active membership context. Returns false if the
     * target membership does not exist.
     */
    fun switchActiveMembership(membershipId: String): Boolean {
        val target = _memberships.value.firstOrNull { it.membershipId == membershipId }
            ?: return false
        storage.putString(KEY_ACTIVE_MEMBERSHIP_ID, target.membershipId)
        val nextContext = target.toOperatingContext()
        _activeContext.value = nextContext
        onActiveBusinessChanged(nextContext.businessId, nextContext.businessName)
        return true
    }

    /**
     * Switches the employee's active role within the current membership (e.g.,
     * owner/admin testing role views or reassigned role) and updates permissions.
     */
    fun updateActiveRoleAndLocation(
        role: EmployeeRole,
        branchName: String = _activeContext.value.branchName,
        warehouseName: String? = _activeContext.value.warehouseName,
        terminalName: String? = _activeContext.value.terminalName,
        deviceAssignment: DeviceAssignmentMode = _activeContext.value.deviceAssignment
    ): OperatingContext {
        val currentId = _activeContext.value.membershipId
        val current = _memberships.value.firstOrNull { it.membershipId == currentId }
            ?: return _activeContext.value
        val updated = current.copy(
            role = role,
            grantedPermissions = role.defaultPermissions,
            branchName = branchName.trim().ifBlank { current.businessName },
            warehouseName = warehouseName?.trim()?.takeIf { it.isNotEmpty() },
            terminalName = terminalName?.trim()?.takeIf { it.isNotEmpty() },
            deviceAssignment = deviceAssignment,
            isRevoked = false,
            revokedReason = null
        )
        upsertAndActivate(updated)
        return _activeContext.value
    }

    /**
     * Applies an authoritative server-driven permission/role/revocation update
     * to the target membership. If it is currently active, [activeContext] emits
     * immediately so unauthorized routes and controls fail closed without restart.
     */
    fun applyServerPermissionChange(
        membershipId: String,
        role: EmployeeRole? = null,
        grantedPermissions: Set<MobilePermission>? = null,
        isRevoked: Boolean = false,
        revokedReason: String? = null,
        syncMode: WorkspaceSyncMode = WorkspaceSyncMode.SERVER_MANAGED_CONTEXT
    ) {
        val updatedList = _memberships.value.map { item ->
            if (item.membershipId != membershipId) item
            else {
                val nextRole = role ?: item.role
                val nextPerms = when {
                    isRevoked -> emptySet()
                    grantedPermissions != null -> grantedPermissions
                    role != null -> nextRole.defaultPermissions
                    else -> item.grantedPermissions
                }
                item.copy(
                    role = nextRole,
                    grantedPermissions = nextPerms,
                    isRevoked = isRevoked,
                    revokedReason = if (isRevoked) {
                        revokedReason ?: "Membership access was revoked by an administrator."
                    } else null,
                    syncMode = syncMode
                )
            }
        }
        _memberships.value = updatedList
        saveMemberships(updatedList)

        if (_activeContext.value.membershipId == membershipId) {
            updatedList.firstOrNull { it.membershipId == membershipId }?.let { refreshed ->
                _activeContext.value = refreshed.toOperatingContext()
            }
        }
    }

    /** Keeps business name synchronized when edited in Settings. */
    fun syncActiveBusinessDisplayName(newBusinessName: String) {
        val trimmed = newBusinessName.trim()
        if (trimmed.isEmpty()) return
        val currentId = _activeContext.value.membershipId
        val current = _memberships.value.firstOrNull { it.membershipId == currentId } ?: return
        val updated = current.copy(
            businessName = trimmed,
            branchName = if (current.branchName == current.businessName) trimmed else current.branchName
        )
        upsertAndActivate(updated)
    }

    private fun upsertAndActivate(membership: WorkspaceMembership) {
        val existingList = _memberships.value
        val replaced = if (existingList.any { it.membershipId == membership.membershipId }) {
            existingList.map { if (it.membershipId == membership.membershipId) membership else it }
        } else {
            existingList + membership
        }
        _memberships.value = replaced
        saveMemberships(replaced)
        storage.putString(KEY_ACTIVE_MEMBERSHIP_ID, membership.membershipId)
        val nextContext = membership.toOperatingContext()
        _activeContext.value = nextContext
        onActiveBusinessChanged(nextContext.businessId, nextContext.businessName)
    }

    private fun defaultMembership(businessId: String, businessName: String): WorkspaceMembership {
        val cleanName = businessName.trim().ifBlank { "My Business" }
        return WorkspaceMembership(
            membershipId = "mem-default-$businessId",
            employeeName = "Business Owner",
            organizationId = "org-$businessId",
            organizationName = cleanName,
            businessId = businessId,
            businessName = cleanName,
            branchId = businessId,
            branchName = "$cleanName · Main Branch",
            warehouseId = "wh-main-$businessId",
            warehouseName = "Main Stockroom",
            terminalId = "till-01-$businessId",
            terminalName = "Till 01",
            role = EmployeeRole.OWNER_ADMIN,
            grantedPermissions = EmployeeRole.OWNER_ADMIN.defaultPermissions,
            deviceAssignment = DeviceAssignmentMode.OWNER_PERSONAL,
            deviceLabel = "Owner Device",
            syncMode = WorkspaceSyncMode.LOCAL_DEVICE_ONLY
        )
    }

    private fun loadMemberships(): List<WorkspaceMembership> {
        val raw = storage.getString(KEY_MEMBERSHIPS_JSON) ?: return emptyList()
        return runCatching {
            val array = JSONArray(raw)
            buildList {
                for (i in 0 until array.length()) {
                    val obj = array.optJSONObject(i) ?: continue
                    val role = EmployeeRole.fromKey(obj.optString("role"))
                    val permsArray = obj.optJSONArray("grantedPermissions")
                    val isRevoked = obj.optBoolean("isRevoked", false)
                    val perms = if (isRevoked) {
                        emptySet()
                    } else if (permsArray != null) {
                        buildSet {
                            for (p in 0 until permsArray.length()) {
                                MobilePermission.fromKey(permsArray.optString(p))?.let(::add)
                            }
                        }
                    } else {
                        role.defaultPermissions
                    }
                    val businessId = obj.optString("businessId").ifBlank { continue }
                    val businessName = obj.optString("businessName", "My Business")
                    add(
                        WorkspaceMembership(
                            membershipId = obj.optString("membershipId", "mem-$businessId"),
                            employeeName = obj.optString("employeeName", role.title),
                            organizationId = obj.optString("organizationId", "org-$businessId"),
                            organizationName = obj.optString("organizationName", businessName),
                            businessId = businessId,
                            businessName = businessName,
                            branchId = obj.optString("branchId", businessId),
                            branchName = obj.optString("branchName", businessName),
                            warehouseId = obj.optString("warehouseId").takeIf { it.isNotBlank() },
                            warehouseName = obj.optString("warehouseName").takeIf { it.isNotBlank() },
                            terminalId = obj.optString("terminalId").takeIf { it.isNotBlank() },
                            terminalName = obj.optString("terminalName").takeIf { it.isNotBlank() },
                            role = role,
                            grantedPermissions = perms,
                            deviceAssignment = DeviceAssignmentMode.fromKey(obj.optString("deviceAssignment")),
                            deviceLabel = obj.optString("deviceLabel", "This Android Device"),
                            syncMode = WorkspaceSyncMode.fromKey(obj.optString("syncMode")),
                            isRevoked = isRevoked,
                            revokedReason = obj.optString("revokedReason").takeIf { it.isNotBlank() }
                        )
                    )
                }
            }
        }.getOrDefault(emptyList())
    }

    private fun saveMemberships(list: List<WorkspaceMembership>) {
        val array = JSONArray()
        list.forEach { item ->
            val perms = JSONArray().apply {
                item.grantedPermissions.forEach { put(it.name) }
            }
            array.put(
                JSONObject().apply {
                    put("membershipId", item.membershipId)
                    put("employeeName", item.employeeName)
                    put("organizationId", item.organizationId)
                    put("organizationName", item.organizationName)
                    put("businessId", item.businessId)
                    put("businessName", item.businessName)
                    put("branchId", item.branchId)
                    put("branchName", item.branchName)
                    item.warehouseId?.let { put("warehouseId", it) }
                    item.warehouseName?.let { put("warehouseName", it) }
                    item.terminalId?.let { put("terminalId", it) }
                    item.terminalName?.let { put("terminalName", it) }
                    put("role", item.role.name)
                    put("grantedPermissions", perms)
                    put("deviceAssignment", item.deviceAssignment.name)
                    put("deviceLabel", item.deviceLabel)
                    put("syncMode", item.syncMode.name)
                    put("isRevoked", item.isRevoked)
                    item.revokedReason?.let { put("revokedReason", it) }
                }
            )
        }
        storage.putString(KEY_MEMBERSHIPS_JSON, array.toString())
    }

    companion object {
        private const val PREFS_NAME = "aide_workspace_ia"
        private const val KEY_MEMBERSHIPS_JSON = "memberships_json"
        private const val KEY_ACTIVE_MEMBERSHIP_ID = "active_membership_id"
        private const val KEY_ROLE_ONBOARDING_DONE = "role_onboarding_done"

        fun create(
            context: Context,
            businessStore: LocalBusinessStore = LocalBusinessStore(context)
        ): WorkspaceContextStore {
            val settings = SettingsStore.read(context)
            val initialName = settings.businessName.ifBlank { businessStore.getBusinessName() }
            return WorkspaceContextStore(
                storage = SharedPreferencesKeyValueStorage(context.applicationContext, PREFS_NAME),
                initialBusinessId = businessStore.getBusinessId(),
                initialBusinessName = initialName,
                alreadyCompletedLegacySetup = businessStore.hasCompletedSetup(),
                onActiveBusinessChanged = { id, name ->
                    businessStore.setActiveBusiness(id, name)
                }
            )
        }

        /** One-shot read for background workers to respect the active role's permissions. */
        fun readActiveContext(context: Context): OperatingContext =
            create(context).activeContext.value
    }
}
