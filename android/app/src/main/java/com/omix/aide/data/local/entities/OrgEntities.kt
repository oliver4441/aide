package com.omix.aide.data.local.entities

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * An organization (parent of one or more businesses/locations).
 *
 * Mirrors the Prisma Organization model. Scopes multi-business reporting.
 */
@Entity(
    tableName = "organizations",
    indices = [Index("name")]
)
data class OrganizationEntity(
    @PrimaryKey val id: String,
    val name: String,
    val slug: String,
    val currency: String = "KSh",
    val createdAt: String,
    val updatedAt: String
)

/**
 * A physical location/branch under an organization.
 *
 * Mirrors the Prisma Location model. Scopes inventory and POS to a specific branch.
 */
@Entity(
    tableName = "locations",
    indices = [Index("organizationId"), Index("name")]
)
data class LocationEntity(
    @PrimaryKey val id: String,
    val organizationId: String,
    val name: String,
    val address: String? = null,
    val phone: String? = null,
    val isActive: Boolean = true,
    val createdAt: String,
    val updatedAt: String
)