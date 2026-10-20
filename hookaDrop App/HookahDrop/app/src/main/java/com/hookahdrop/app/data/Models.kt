package com.hookahdrop.app.data

// ── Product ───────────────────────────────────────────────────────────────────
data class Product(
    val id: String,
    val name: String,
    val description: String,
    val price: Double,
    val originalPrice: Double = 0.0,
    val imageRes: Int,           // drawable resource id (fallback / local products)
    val imageUrl: String = "",   // Cloudinary/remote URL (backend products); empty = use imageRes
    val categoryId: String,
    val rating: Float = 4.5f,
    val reviewCount: Int = 0,
    val isNew: Boolean = false,
    val discount: Int = 0,       // percentage, 0 = no discount
    val stock: Int = 999,        // from backend; 999 = assumed available for local products
    val brand: String = ""       // product brand/mark from backend
) {
    /** True when this product came from the backend (has a remote URL or a relative /images/ path). */
    val isRemote: Boolean get() = imageUrl.startsWith("http") || imageUrl.startsWith("/")
}

// ── Category ──────────────────────────────────────────────────────────────────
data class Category(
    val id: String,
    val name: String,
    val description: String,
    val iconRes: Int,
    val productCount: Int,
    val accentColor: Int = 0     // optional tint, 0 = default
)

// ── Cart Item ─────────────────────────────────────────────────────────────────
data class CartItem(
    val product: Product,
    var quantity: Int = 1
)

// ── Benefit ───────────────────────────────────────────────────────────────────
data class Benefit(
    val iconRes: Int,
    val title: String,
    val subtitle: String
)

// ── Hero Banner ───────────────────────────────────────────────────────────────
data class HeroBanner(
    val id: String,
    val title: String,
    val subtitle: String,
    val imageRes: Int,
    val imageUrl: String = "",   // backend URL (overrides imageRes when non-empty)
    val categoryId: String
)
