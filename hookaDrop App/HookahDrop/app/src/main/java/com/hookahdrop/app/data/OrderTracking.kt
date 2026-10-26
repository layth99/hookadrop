package com.hookahdrop.app.data

/**
 * Order Tracking data models
 * API Spec: /api/orders/:orderId/tracking
 */

data class OrderTracking(
    val orderId: String,
    val orderNumber: String,
    val currentStatus: OrderStatus,
    val estimatedDelivery: DeliveryWindow?,
    val history: List<StatusHistoryEntry>,
    val courier: Courier?,
    val address: DeliveryAddress,
    val itemsCount: Int,
    val total: Double,
    val currency: String
) {
    /** Get the current step in the timeline (1-4) based on status */
    fun getCurrentStep(): Int {
        return when (currentStatus) {
            OrderStatus.CONFIRMED -> 1
            OrderStatus.PREPARED -> 2
            OrderStatus.OUT_FOR_DELIVERY -> 3
            OrderStatus.DELIVERED -> 4
            OrderStatus.CANCELLED -> 0  // Special case
            else -> 0  // PENDING or other legacy statuses
        }
    }
    
    /** Check if an order status is completed (for timeline display) */
    fun isStepCompleted(step: Int): Boolean {
        return getCurrentStep() > step
    }
    
    /** Check if an order status is the current active step */
    fun isStepActive(step: Int): Boolean {
        return getCurrentStep() == step
    }
}

data class DeliveryWindow(
    val start: String,  // ISO 8601 timestamp
    val end: String     // ISO 8601 timestamp
) {
    /** Format as "Today, 6:30 – 7:00 PM" or date */
    fun formatForDisplay(): String {
        // Will be implemented in UI layer with locale-aware formatting
        return ""
    }
}

data class StatusHistoryEntry(
    val status: OrderStatus,
    val at: String,        // ISO 8601 timestamp
    val note: String? = null
) {
    /** Get timestamp for this specific status */
    fun getFormattedTime(): String {
        // Will be formatted in UI layer
        return at
    }
}

data class Courier(
    val name: String?,
    val phone: String?
) {
    fun hasPhone(): Boolean = !phone.isNullOrBlank()
}

data class DeliveryAddress(
    val label: String,   // "Home", "Work", etc.
    val line: String     // Full address line
)

/**
 * Timeline step state for UI
 */
enum class TimelineStepState {
    COMPLETED,   // Gold filled circle, done
    ACTIVE,      // Gold circle with glow + "Now" pill
    PENDING,     // Gray outline circle
    SKIPPED      // Not used in current flow
}

/**
 * Timeline step definition
 */
data class TimelineStep(
    val stepNumber: Int,        // 1-4
    val title: String,          // "Confirmed", "Prepared", etc.
    val description: String,    // "Your order has been confirmed"
    val state: TimelineStepState,
    val timestamp: String?,     // Formatted time or null
    val iconType: TimelineIcon
)

enum class TimelineIcon {
    CHECK,    // Confirmed
    BOX,      // Prepared
    TRUCK,    // Out for delivery
    FLAG      // Delivered
}
