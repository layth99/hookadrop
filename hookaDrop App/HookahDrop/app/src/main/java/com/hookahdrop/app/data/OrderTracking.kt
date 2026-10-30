package com.hookahdrop.app.data

import java.text.SimpleDateFormat
import java.util.Locale

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
    val deliveryWindow: DeliveryWindow? get() = estimatedDelivery
    val deliveryAddress: DeliveryAddress get() = address
    val itemCount: Int get() = itemsCount
    val totalAmount: Double get() = total

    val timelineSteps: List<TimelineStep> get() {
        val currentStepNum = getCurrentStep()
        
        // Special case: Cancelled orders show single cancelled step
        if (currentStatus == OrderStatus.CANCELLED) {
            val cancelledEntry = history.find { it.status == OrderStatus.CANCELLED }
            return listOf(
                TimelineStep(
                    stepNumber = 0,
                    title = "Order Cancelled",
                    description = "Your payment will be refunded to the original payment method.",
                    state = TimelineStepState.CANCELLED,
                    timestamp = cancelledEntry?.formatTimestamp(),
                    iconType = TimelineIcon.X
                )
            )
        }
        
        // Find history entries for timestamps
        val confirmedEntry = history.find { it.status == OrderStatus.CONFIRMED }
        val processingEntry = history.find { it.status == OrderStatus.PROCESSING }
        val outForDeliveryEntry = history.find { it.status == OrderStatus.OUT_FOR_DELIVERY }
        val deliveredEntry = history.find { it.status == OrderStatus.DELIVERED }
        
        return listOf(
            TimelineStep(
                stepNumber = 1,
                title = "Confirmed",
                description = "We received your order and payment.",
                state = when {
                    currentStepNum > 1 -> TimelineStepState.COMPLETED
                    currentStepNum == 1 -> TimelineStepState.ACTIVE
                    else -> TimelineStepState.PENDING
                },
                timestamp = if (currentStepNum >= 1) confirmedEntry?.formatTimestamp() else null,
                iconType = TimelineIcon.CHECK
            ),
            TimelineStep(
                stepNumber = 2,
                title = "Processing",
                description = "Your items are being processed.",
                state = when {
                    currentStepNum > 2 -> TimelineStepState.COMPLETED
                    currentStepNum == 2 -> TimelineStepState.ACTIVE
                    else -> TimelineStepState.PENDING
                },
                timestamp = if (currentStepNum >= 2) processingEntry?.formatTimestamp() else null,
                iconType = TimelineIcon.BOX
            ),
            TimelineStep(
                stepNumber = 3,
                title = "Out for delivery",
                description = "Your courier is on the way to you.",
                state = when {
                    currentStepNum > 3 -> TimelineStepState.COMPLETED
                    currentStepNum == 3 -> TimelineStepState.ACTIVE
                    else -> TimelineStepState.PENDING
                },
                timestamp = if (currentStepNum >= 3) outForDeliveryEntry?.formatTimestamp() else null,
                iconType = TimelineIcon.TRUCK
            ),
            TimelineStep(
                stepNumber = 4,
                title = "Delivered",
                description = "Your order will be handed to you at the door.",
                state = when {
                    currentStepNum >= 4 -> TimelineStepState.COMPLETED
                    currentStepNum == 4 -> TimelineStepState.ACTIVE
                    else -> TimelineStepState.PENDING
                },
                timestamp = if (currentStepNum >= 4) deliveredEntry?.formatTimestamp() else null,
                iconType = TimelineIcon.FLAG
            )
        )
    }

    /** Get the current step in the timeline (1-4) based on status */
    fun getCurrentStep(): Int {
        return when (currentStatus) {
            OrderStatus.CONFIRMED -> 1
            OrderStatus.PROCESSING -> 2
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
    val label: String get() = "Today"
    val startTime: String get() = start
    val endTime: String get() = end

    /** Format as "Today, 6:30 – 7:00 PM" or date */
    fun formatForDisplay(): String {
        return try {
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            dateFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")
            
            val startDate = dateFormat.parse(start)
            val endDate = dateFormat.parse(end)
            
            if (startDate == null || endDate == null) return ""
            
            val timeFormat = SimpleDateFormat("h:mm a", Locale.getDefault())
            val startTimeStr = timeFormat.format(startDate)
            val endTimeStr = timeFormat.format(endDate)
            
            // Check if today
            val today = java.util.Calendar.getInstance()
            val deliveryDay = java.util.Calendar.getInstance()
            deliveryDay.time = startDate
            
            val dayLabel = if (today.get(java.util.Calendar.DAY_OF_YEAR) == deliveryDay.get(java.util.Calendar.DAY_OF_YEAR) &&
                              today.get(java.util.Calendar.YEAR) == deliveryDay.get(java.util.Calendar.YEAR)) {
                "Today"
            } else {
                val dateFormat2 = SimpleDateFormat("MMM d", Locale.getDefault())
                dateFormat2.format(startDate)
            }
            
            "$dayLabel, $startTimeStr – $endTimeStr"
        } catch (e: Exception) {
            ""
        }
    }
}

data class StatusHistoryEntry(
    val status: OrderStatus,
    val at: String,        // ISO 8601 timestamp
    val note: String? = null
) {
    /** Get timestamp for this specific status */
    fun getFormattedTime(): String {
        return at
    }
    
    /** Format timestamp as "Oct 26 · 11:02 AM" */
    fun formatTimestamp(): String {
        return try {
            val dateFormat = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            dateFormat.timeZone = java.util.TimeZone.getTimeZone("UTC")
            val date = dateFormat.parse(at) ?: return at
            
            val outputFormat = SimpleDateFormat("MMM d · h:mm a", Locale.getDefault())
            outputFormat.format(date)
        } catch (e: Exception) {
            at // Fallback to original timestamp
        }
    }
}

data class Courier(
    val name: String?,
    val phone: String?,
    val vehicle: String? = null
) {
    fun hasPhone(): Boolean = !phone.isNullOrBlank()
}

data class DeliveryAddress(
    val label: String,   // "Home", "Work", etc.
    val line: String     // Full address line
) {
    val street: String get() = line
    val apartment: String get() = ""
    val city: String get() = label
    val postalCode: String get() = ""
}

/**
 * Timeline step state for UI
 */
enum class TimelineStepState {
    COMPLETED,   // Gold filled circle, done
    ACTIVE,      // Gold circle with glow + "Now" pill
    PENDING,     // Gray outline circle
    SKIPPED,     // Not used in current flow
    CANCELLED    // Cancelled state
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
) {
    val icon: TimelineIcon get() = iconType
}

enum class TimelineIcon {
    CHECK,    // Confirmed
    BOX,      // Processing
    TRUCK,    // Out for delivery
    FLAG,     // Delivered
    X         // Cancelled / X
}
