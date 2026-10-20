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
    PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
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
