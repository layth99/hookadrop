package com.hookahdrop.app.data

// ── Address ───────────────────────────────────────────────────────────────────
data class Address(
    val id: String,
    var label: String,          // Home / Work / Other
    var fullName: String,
    var phone: String,
    var street: String,
    var city: String,
    var postalCode: String,
    var country: String,
    var isDefault: Boolean = false,
    var latitude: Double  = 0.0,
    var longitude: Double = 0.0
)

// ── Order status ──────────────────────────────────────────────────────────────
enum class OrderStatus {
    PENDING,           // Before payment confirmed
    CONFIRMED,         // Payment validated (Stripe webhook / COD)
    PREPARED,          // Items prepared for shipping
    PROCESSING,        // Legacy status (kept for compatibility)
    OUT_FOR_DELIVERY,  // Package is out for delivery
    SHIPPED,           // Legacy status (kept for compatibility)
    DELIVERED,         // Package delivered
    CANCELLED          // Order cancelled
}

/** Maps backend status string to OrderStatus enum */
fun String.toOrderStatus(): OrderStatus {
    return when (this.lowercase()) {
        "pending"          -> OrderStatus.PENDING
        "confirmed"        -> OrderStatus.CONFIRMED
        "prepared"         -> OrderStatus.PREPARED
        "processing"       -> OrderStatus.PROCESSING
        "out_for_delivery" -> OrderStatus.OUT_FOR_DELIVERY
        "shipped"          -> OrderStatus.SHIPPED
        "delivered"        -> OrderStatus.DELIVERED
        "cancelled"        -> OrderStatus.CANCELLED
        else               -> OrderStatus.PENDING
    }
}

/** Maps OrderStatus enum to backend status string */
fun OrderStatus.toBackendString(): String {
    return when (this) {
        OrderStatus.PENDING          -> "pending"
        OrderStatus.CONFIRMED        -> "confirmed"
        OrderStatus.PREPARED         -> "prepared"
        OrderStatus.PROCESSING       -> "processing"
        OrderStatus.OUT_FOR_DELIVERY -> "out_for_delivery"
        OrderStatus.SHIPPED          -> "shipped"
        OrderStatus.DELIVERED        -> "delivered"
        OrderStatus.CANCELLED        -> "cancelled"
    }
}

// ── Order ─────────────────────────────────────────────────────────────────────
data class Order(
    val id: String,
    val date: String,
    val items: List<OrderItem>,
    val subtotal: Double,
    val deliveryFee: Double,
    val total: Double,
    val status: OrderStatus,
    val address: String,
    val paymentMethod: String
)

// ── Order item ────────────────────────────────────────────────────────────────
data class OrderItem(
    val productName: String,
    val quantity: Int,
    val price: Double,
    val imageRes: Int
)

// ── Payment method ────────────────────────────────────────────────────────────
data class PaymentMethod(
    val id: String,
    val type: String,           // VISA / Mastercard / PayPal
    val last4: String,
    val expiry: String,
    val isDefault: Boolean = false
)

// ── FAQ item ──────────────────────────────────────────────────────────────────
data class FaqItem(
    val question: String,
    val answer: String,
    var isExpanded: Boolean = false
)
