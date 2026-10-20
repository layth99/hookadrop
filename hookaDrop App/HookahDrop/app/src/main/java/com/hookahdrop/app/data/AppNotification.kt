package com.hookahdrop.app.data

import org.json.JSONObject

/**
 * In-app notification model matching the backend Notification schema.
 */
data class AppNotification(
    val id: String,
    val type: String,          // order | security | product | promo | account
    val title: String,
    val message: String,
    val isRead: Boolean,
    val createdAt: String,
    val entityId: String?,
    val entityType: String?    // order | product | promo | user | null
) {
    companion object {
        fun fromJson(json: JSONObject): AppNotification = AppNotification(
            id         = json.optString("_id", ""),
            type       = json.optString("type", "account"),
            title      = json.optString("title", ""),
            message    = json.optString("message", ""),
            isRead     = json.optBoolean("isRead", false),
            createdAt  = json.optString("createdAt", ""),
            entityId   = json.optString("entityId").takeIf { it.isNotEmpty() },
            entityType = json.optString("entityType").takeIf { it.isNotEmpty() }
        )
    }
}
