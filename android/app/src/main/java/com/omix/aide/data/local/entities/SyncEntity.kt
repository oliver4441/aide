package com.omix.aide.data.local.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * One local change waiting to be pushed to Aide Cloud.
 *
 * Written inside the same coroutine as the local write, so a sale recorded in a
 * dead spot is queued before the customer has left the counter. The outbox is
 * plain JSON rather than a foreign key to the live row: a product may be edited
 * (or deleted) several times before the phone next sees a signal, and the queue
 * only needs the latest state of each record.
 *
 * `id` is per mutation; `(tableName, recordId)` is unique by convention because
 * enqueueing replaces any older pending mutation for the same record.
 */
@Entity(
    tableName = "pending_mutations",
    indices = [Index("createdAt"), Index(value = ["tableName", "recordId"])]
)
data class PendingMutationEntity(
    @PrimaryKey val id: String,
    val tableName: String,
    val action: String,
    val recordId: String,
    val payload: String,
    val createdAt: Long,
    val attempts: Int = 0,
    val lastError: String? = null
)
