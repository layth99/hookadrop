package com.hookahdrop.app.data

data class TrackingStep(
    val title: String,
    val description: String,
    val timestamp: String,
    val status: Status,
    val icon: String
) {
    enum class Status {
        COMPLETED,   // Step is done
        ACTIVE,      // Current step in progress
        PENDING,     // Future step
        CANCELLED    // Order cancelled
    }
}
