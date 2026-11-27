package com.omix.aide.data.local.dao

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import com.omix.aide.data.local.entities.PendingMutationEntity
import kotlinx.coroutines.flow.Flow

/**
 * The cloud-sync outbox.
 *
 * `enqueue` is not atomic with the record write by itself; callers write the
 * record and the outbox row in the same coroutine, and enqueue replaces any
 * older pending mutation for the same record so a rapid edit-edit-sync sequence
 * sends one current payload rather than a queue of stale ones.
 */
@Dao
interface SyncDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(mutation: PendingMutationEntity)

    @Query("DELETE FROM pending_mutations WHERE tableName = :tableName AND recordId = :recordId")
    suspend fun deleteForRecord(tableName: String, recordId: String)

    /** Oldest-first so the server sees changes in the order they happened. */
    @Query("SELECT * FROM pending_mutations ORDER BY createdAt ASC LIMIT :limit")
    suspend fun pending(limit: Int): List<PendingMutationEntity>

    @Query("SELECT * FROM pending_mutations ORDER BY createdAt ASC")
    suspend fun allPending(): List<PendingMutationEntity>

    @Query("SELECT COUNT(*) FROM pending_mutations")
    fun pendingCount(): Flow<Int>

    @Query("DELETE FROM pending_mutations WHERE id = :id")
    suspend fun deleteById(id: String)

    @Query("UPDATE pending_mutations SET attempts = attempts + 1, lastError = :error WHERE id = :id")
    suspend fun markFailed(id: String, error: String?)

    @Query("DELETE FROM pending_mutations")
    suspend fun clear()
}
