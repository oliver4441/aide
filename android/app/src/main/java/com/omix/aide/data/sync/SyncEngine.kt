package com.omix.aide.data.sync

import android.content.Context
import androidx.room.withTransaction
import com.omix.aide.data.local.AideDatabase
import com.omix.aide.data.local.CloudSession
import com.omix.aide.data.local.CloudSessionStore
import com.omix.aide.data.local.LocalBusinessStore
import com.omix.aide.data.remote.AideApi
import com.omix.aide.data.remote.AideApiException
import com.omix.aide.data.remote.RemoteMutation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

data class ConnectResult(
    val businessChanged: Boolean,
    val outcome: SyncOutcome
)

data class SyncOutcome(
    val ok: Boolean,
    val pushed: Int = 0,
    val pulled: Int = 0,
    val conflicts: Int = 0,
    val failed: Int = 0,
    val message: String? = null
) {
    val summary: String
        get() = when {
            !ok -> message ?: "Sync failed"
            pushed == 0 && pulled == 0 -> "Everything is up to date"
            else -> "Pushed $pushed, pulled $pulled" +
                (if (conflicts > 0) ", $conflicts conflicts for review" else "") +
                (if (failed > 0) ", $failed queued for retry" else "")
        }
}

/**
 * Aide Cloud two-way sync for the Android client.
 *
 * The local Room store remains the source of truth while the device is offline:
 * every write is queued in `pending_mutations`. When a connection is available
 * [syncNow] drains that outbox, then pulls the server delta and applies it. The
 * server does last-write-wins for descriptive fields and treats sales as
 * append-only, exactly as it does for the PWA — this class does not invent a
 * second conflict model.
 */
class SyncEngine(
    private val database: AideDatabase,
    private val sessionStore: CloudSessionStore,
    private val businessStore: LocalBusinessStore,
    private val apiProvider: (String) -> AideApi = { AideApi(it) }
) {

    private val syncDao get() = database.syncDao()

    /**
     * Sign in and link this device to the account's business.
     *
     * A shop that has been using the APK offline already has products and sales
     * under a locally generated business id. Those rows are repointed at the
     * account's business and queued for upload, so signing in never strands or
     * duplicates the history the owner already has.
     */
    suspend fun connect(baseUrl: String, email: String, password: String): ConnectResult =
        withContext(Dispatchers.IO) {
            val api = apiProvider(baseUrl)
            val login = api.login(email.trim(), password)
            val target = login.businessId
                ?: throw AideApiException(
                    400,
                    "This Aide Cloud account has no business yet. Create one on the web first."
                )

            val previous = businessStore.currentBusinessId()
            val changed = previous != null && previous != target
            if (previous != target) {
                adoptBusiness(previous, target)
            }

            sessionStore.save(
                CloudSession(
                    baseUrl = api.baseUrl,
                    token = login.token,
                    email = login.email,
                    name = login.name,
                    userId = login.userId,
                    businessId = target,
                    lastSyncAt = null,
                    autoSync = sessionStore.read()?.autoSync ?: true,
                    deviceId = sessionStore.deviceId()
                )
            )

            enqueueBackfill(target)
            ConnectResult(businessChanged = changed, outcome = syncNow())
        }

    /**
     * Push everything already on the device once, so adopting a business does
     * not require the owner to re-enter their catalogue.
     */
    private suspend fun enqueueBackfill(businessId: String) {
        val products = database.productDao().getAllOnce(businessId)
        val categories = database.categoryDao().getAllOnce(businessId)
        val sales = database.saleDao().getAllSalesWithItemsOnce(businessId)

        database.withTransaction {
            products.forEach { product ->
                enqueue(SyncPayloads.productUpsert(product))
            }
            categories.forEach { category ->
                enqueue(SyncPayloads.categoryUpsert(category))
            }
            sales.forEach { sale ->
                enqueue(SyncPayloads.saleCreate(sale.sale, sale.items))
            }
        }
    }

    private suspend fun adoptBusiness(previous: String?, target: String) {
        if (previous != null && previous != target) {
            database.withTransaction {
                database.productDao().reassignBusiness(previous, target)
                database.categoryDao().reassignBusiness(previous, target)
                database.saleDao().reassignBusiness(previous, target)
                database.expenseDao().reassignBusiness(previous, target)
                database.customerDao().reassignBusiness(previous, target)
            }
        }
        businessStore.setBusinessId(target)
    }

    /** Push queued changes, then pull and apply the server delta. */
    suspend fun syncNow(): SyncOutcome = withContext(Dispatchers.IO) {
        val session = sessionStore.read()
            ?: return@withContext SyncOutcome(ok = false, message = "Not signed in to Aide Cloud")

        val api = apiProvider(session.baseUrl)
        var pushed = 0
        var failed = 0
        var conflicts = 0

        try {
            // Drain the outbox in small batches. A batch is retried on the next
            // sync; a failed mutation is counted, not dropped, and stays queued
            // with the server's reason attached.
            var guard = 0
            while (guard++ < 100) {
                val batch = syncDao.pending(50)
                if (batch.isEmpty()) break

                val response = api.push(
                    token = session.token,
                    businessId = session.businessId,
                    deviceId = session.deviceId,
                    mutations = batch.map {
                        RemoteMutation(
                            table = it.tableName,
                            action = it.action,
                            recordId = it.recordId,
                            data = runCatching { JSONObject(it.payload) }.getOrElse { JSONObject() }
                        )
                    }
                )
                conflicts += response.conflicts

                val failures = response.failed.associateBy { it.table to it.recordId }
                var succeeded = 0
                batch.forEach { mutation ->
                    val failure = failures[mutation.tableName to mutation.recordId]
                    if (failure != null) {
                        failed += 1
                        syncDao.markFailed(mutation.id, failure.error)
                    } else {
                        syncDao.deleteById(mutation.id)
                        pushed += 1
                        succeeded += 1
                    }
                }
                // Nothing moved: stop rather than spin on the same rejected batch.
                if (succeeded == 0) break
            }
        } catch (err: AideApiException) {
            return@withContext SyncOutcome(
                ok = false,
                pushed = pushed,
                failed = failed,
                conflicts = conflicts,
                message = if (err.isAuthFailure) {
                    "Sign-in expired. Open Cloud sync and sign in again."
                } else {
                    err.message
                }
            )
        } catch (err: Exception) {
            return@withContext SyncOutcome(
                ok = false,
                pushed = pushed,
                failed = failed,
                conflicts = conflicts,
                message = "No connection to Aide Cloud: ${err.message ?: "network error"}"
            )
        }

        val pulled = try {
            pull(session, api)
        } catch (err: AideApiException) {
            return@withContext SyncOutcome(
                ok = false,
                pushed = pushed,
                failed = failed,
                conflicts = conflicts,
                message = if (err.isAuthFailure) {
                    "Sign-in expired. Open Cloud sync and sign in again."
                } else {
                    err.message
                }
            )
        } catch (err: Exception) {
            return@withContext SyncOutcome(
                ok = false,
                pushed = pushed,
                failed = failed,
                conflicts = conflicts,
                message = "Pulled nothing: ${err.message ?: "network error"}"
            )
        }

        SyncOutcome(
            ok = true,
            pushed = pushed,
            pulled = pulled,
            conflicts = conflicts,
            failed = failed
        )
    }

    private suspend fun pull(session: CloudSession, api: AideApi): Int {
        // The cursor is the time the request started, not the time it finished,
        // so a change committed while the pull was in flight is returned next time.
        val requestStarted = nowIso()
        val raw = api.pull(session.token, session.businessId, session.lastSyncAt)
        val delta = SyncPayloads.parsePull(raw, session.businessId)

        // Do not overwrite a local change that has not reached the server yet
        // (for example because it needs approval); it goes up on a later sync.
        val pending = syncDao.allPending().map { it.tableName to it.recordId }.toSet()
        val products = delta.products.filter { (SyncPayloads.TABLE_PRODUCTS to it.id) !in pending }
        val categories = delta.categories.filter { (SyncPayloads.TABLE_CATEGORIES to it.id) !in pending }
        val sales = delta.sales.filter { (SyncPayloads.TABLE_SALES to it.sale.id) !in pending }

        database.withTransaction {
            delta.removedProductIds.forEach { database.productDao().deleteById(it) }
            categories.forEach { database.categoryDao().insertOrUpdate(it) }
            products.forEach { database.productDao().insertOrUpdate(it) }
            sales.forEach { database.saleDao().insertSaleWithItems(it.sale, it.items) }
        }

        sessionStore.setLastSyncAt(requestStarted)
        return products.size + categories.size + sales.size
    }

    suspend fun disconnect() {
        withContext(Dispatchers.IO) { sessionStore.clear() }
    }

    private suspend fun enqueue(mutation: com.omix.aide.data.local.entities.PendingMutationEntity) {
        syncDao.deleteForRecord(mutation.tableName, mutation.recordId)
        syncDao.insert(mutation)
    }

    private fun nowIso(): String =
        SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date())
}

/** Builds a SyncEngine with the app's singletons. */
object CloudSyncFactory {
    fun create(context: Context): SyncEngine {
        val app = context.applicationContext
        return SyncEngine(
            database = AideDatabase.getDatabase(app),
            sessionStore = CloudSessionStore(app),
            businessStore = LocalBusinessStore(app)
        )
    }
}
