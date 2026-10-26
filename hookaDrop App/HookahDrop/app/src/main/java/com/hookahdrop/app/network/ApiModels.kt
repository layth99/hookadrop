package com.hookahdrop.app.network

import com.hookahdrop.app.R
import com.hookahdrop.app.data.Category
import com.hookahdrop.app.data.Product
import org.json.JSONArray
import org.json.JSONObject

/**
 * Maps backend JSON responses to Android data models.
 *
 * Backend Product schema:
 *   _id, name, description, price, image (Cloudinary URL), image1/2/3,
 *   discount, mark (brand), category (string), stock, createdAt, updatedAt
 *
 * Backend Category schema:
 *   _id, name, description, createdAt, updatedAt
 *
 * Android Product model uses imageRes:Int (drawable) OR imageUrl:String.
 * We bridge this by storing the Cloudinary URL in imageUrl and using a
 * placeholder drawable for imageRes so existing adapters don't crash.
 */

// ── Product ────────────────────────────────────────────────────────────────────

fun JSONObject.toProduct(): Product {
    val id          = optString("_id", optString("id", ""))
    val name        = optString("name", "")
    val description = optString("description", "")
    val price       = optDouble("price", 0.0)
    val originalPrice = optDouble("originalPrice", 0.0)
    val discount    = optInt("discount", 0)
    val category    = optString("categoryId", optString("category", ""))   // stored as string in backend
    val stock       = optInt("stock", 0)
    val mark        = optString("mark", "")
    // Build absolute URL: relative paths like "/images/..." are prefixed with BASE_URL
    val rawImage    = optString("image", "")
    val imageUrl    = when {
        rawImage.startsWith("http") -> rawImage                          // absolute URL (Cloudinary, etc.)
        rawImage.startsWith("/")    -> "${ApiClient.BASE_URL}$rawImage"  // relative path from backend
        else                        -> ""                                // unknown → fallback to drawable
    }

    // rating/reviewCount/isNew are not in the backend schema → use sensible defaults
    val rating      = optDouble("rating", 4.5).toFloat()
    val reviewCount = optInt("reviewCount", 0)
    val isNew       = optBoolean("isNew", false)

    return Product(
        id           = id,
        name         = name,
        description  = description,
        price        = price,
        originalPrice= originalPrice,
        imageRes     = R.drawable.ic_hookah_neon,  // fallback drawable (Glide loads imageUrl)
        imageUrl     = imageUrl,
        categoryId   = category,
        rating       = rating,
        reviewCount  = reviewCount,
        isNew        = isNew,
        discount     = discount,
        stock        = stock,
        brand        = mark
    )
}

fun JSONArray.toProductList(): List<Product> {
    val list = mutableListOf<Product>()
    for (i in 0 until length()) {
        try { list.add(getJSONObject(i).toProduct()) } catch (_: Exception) {}
    }
    return list
}

// ── Category ───────────────────────────────────────────────────────────────────

fun JSONObject.toCategory(): Category {
    val id          = optString("id", optString("_id", ""))
    val name        = optString("name", "")
    val description = optString("description", "")
    // Backend categories have no iconRes — use a generic placeholder
    val iconRes     = categoryIcon(name)
    return Category(
        id           = id,
        name         = name,
        description  = description,
        iconRes      = iconRes,
        productCount = optInt("productCount", 0)
    )
}

fun JSONArray.toCategoryList(): List<Category> {
    val list = mutableListOf<Category>()
    for (i in 0 until length()) {
        try { list.add(getJSONObject(i).toCategory()) } catch (_: Exception) {}
    }
    return list
}

/** Map backend category name → local drawable icon (best-effort). */
private fun categoryIcon(name: String): Int {
    val lower = name.lowercase()
    return when {
        lower.contains("hookah") || lower.contains("chicha") || lower.contains("shisha")
                            -> R.drawable.cat_hookah
        lower.contains("tobacco") || lower.contains("tabac") || lower.contains("flavor")
                            -> R.drawable.cat_tabacs
        lower.contains("coal") || lower.contains("charbon")
                            -> R.drawable.cat_charbons
        lower.contains("foyer") || lower.contains("bowl") || lower.contains("bowl")
                            -> R.drawable.cat_foyers
        lower.contains("pack") || lower.contains("starter") || lower.contains("bundle")
                            -> R.drawable.cat_fullpacks
        lower.contains("clean") || lower.contains("access")
                            -> R.drawable.cat_cleaning
        else                -> R.drawable.ic_categories
    }
}

// ── Order item helper ─────────────────────────────────────────────────────────

data class ApiOrderItem(
    val productId: String,
    val qty:       Int,
    val name:      String = "",
    val price:     Double = 0.0,
    val imageUrl:  String = ""
)

fun JSONObject.toOrderItem(): ApiOrderItem {
    val qty  = optInt("qty", 1)
    val prod = optJSONObject("product")
    return if (prod != null) {
        ApiOrderItem(
            productId = prod.optString("_id"),
            qty       = qty,
            name      = prod.optString("name"),
            price     = prod.optDouble("price", 0.0),
            imageUrl  = prod.optString("image")
        )
    } else {
        ApiOrderItem(
            productId = optString("product", ""),
            qty       = qty
        )
    }
}

data class ApiOrder(
    val id:            String,
    val orderId:       String,
    val status:        String,
    val totalPrice:    Double,
    val items:         List<ApiOrderItem>,
    val paymentMethod: String,
    val isPaid:        Boolean,
    val fullname:      String,
    val phone:         String,
    val email:         String,
    val address:       String,
    val shippingPrice: Double,
    val tax:           Double,
    val createdAt:     String
)

fun JSONObject.toApiOrder(): ApiOrder {
    val items = mutableListOf<ApiOrderItem>()
    optJSONArray("orderItems")?.let { arr ->
        for (i in 0 until arr.length()) {
            try { items.add(arr.getJSONObject(i).toOrderItem()) } catch (_: Exception) {}
        }
    }
    return ApiOrder(
        id            = optString("_id"),
        orderId       = optString("orderId"),
        status        = optString("status", "pending"),
        totalPrice    = optDouble("totalPrice", 0.0),
        items         = items,
        paymentMethod = optString("paymentMethod"),
        isPaid        = optBoolean("isPaid", false),
        fullname      = optString("fullname"),
        phone         = optString("phone"),
        email         = optString("email"),
        address       = optString("address"),
        shippingPrice = optDouble("shippingPrice", 0.0),
        tax           = optDouble("tax", 0.0),
        createdAt     = optString("createdAt")
    )
}


// ── Order Tracking ────────────────────────────────────────────────────────────

/**
 * Parse order tracking response from backend API
 * Endpoint: GET /api/orders/:orderId/tracking
 */
fun JSONObject.toOrderTracking(): com.hookahdrop.app.data.OrderTracking {
    // Parse timeline steps from API response
    val timelineArray = optJSONArray("timelineSteps") ?: org.json.JSONArray()
    val timelineSteps = mutableListOf<com.hookahdrop.app.data.TimelineStep>()
    
    for (i in 0 until timelineArray.length()) {
        val entry = timelineArray.getJSONObject(i)
        
        // Map API state to TimelineStepState enum
        val stateStr = entry.optString("state", "pending")
        val state = when (stateStr.lowercase()) {
            "completed" -> com.hookahdrop.app.data.TimelineStepState.COMPLETED
            "active" -> com.hookahdrop.app.data.TimelineStepState.ACTIVE
            "cancelled" -> com.hookahdrop.app.data.TimelineStepState.CANCELLED
            else -> com.hookahdrop.app.data.TimelineStepState.PENDING
        }
        
        // Map icon string to TimelineIcon enum
        val iconStr = entry.optString("icon", "check")
        val icon = when (iconStr.lowercase()) {
            "check" -> com.hookahdrop.app.data.TimelineIcon.CHECK
            "box" -> com.hookahdrop.app.data.TimelineIcon.BOX
            "truck" -> com.hookahdrop.app.data.TimelineIcon.TRUCK
            "flag" -> com.hookahdrop.app.data.TimelineIcon.FLAG
            "x" -> com.hookahdrop.app.data.TimelineIcon.X
            else -> com.hookahdrop.app.data.TimelineIcon.CHECK
        }
        
        timelineSteps.add(
            com.hookahdrop.app.data.TimelineStep(
                title = entry.optString("title", ""),
                timestamp = entry.optString("timestamp"),
                state = state,
                icon = icon
            )
        )
    }
    
    // Parse delivery window
    val windowObj = optJSONObject("deliveryWindow")
    val deliveryWindow = if (windowObj != null) {
        com.hookahdrop.app.data.DeliveryWindow(
            label = windowObj.optString("label", ""),
            startTime = windowObj.optString("startTime", ""),
            endTime = windowObj.optString("endTime", "")
        )
    } else null
    
    // Parse courier info
    val courierObj = optJSONObject("courier")
    val courier = if (courierObj != null) {
        com.hookahdrop.app.data.Courier(
            name = courierObj.optString("name", ""),
            phone = courierObj.optString("phone", "")
        )
    } else null
    
    // Parse delivery address
    val addressObj = optJSONObject("deliveryAddress") ?: org.json.JSONObject()
    val address = com.hookahdrop.app.data.DeliveryAddress(
        street = addressObj.optString("street", ""),
        apartment = addressObj.optString("apartment", ""),
        city = addressObj.optString("city", ""),
        postalCode = addressObj.optString("postalCode", "")
    )
    
    return com.hookahdrop.app.data.OrderTracking(
        orderId = optString("orderId", ""),
        currentStatus = optString("currentStatus", "pending").toOrderStatus(),
        deliveryWindow = deliveryWindow,
        courier = courier,
        deliveryAddress = address,
        timelineSteps = timelineSteps,
        itemCount = optInt("itemCount", 0),
        totalAmount = optDouble("totalAmount", 0.0)
    )
}

// Extension pour OrderStatus
fun String.toOrderStatus(): com.hookahdrop.app.data.OrderStatus {
    return when (this.lowercase()) {
        "pending"          -> com.hookahdrop.app.data.OrderStatus.PENDING
        "confirmed"        -> com.hookahdrop.app.data.OrderStatus.CONFIRMED
        "prepared"         -> com.hookahdrop.app.data.OrderStatus.PREPARED
        "preparing"        -> com.hookahdrop.app.data.OrderStatus.PREPARED
        "processing"       -> com.hookahdrop.app.data.OrderStatus.PROCESSING
        "out_for_delivery" -> com.hookahdrop.app.data.OrderStatus.OUT_FOR_DELIVERY
        "shipped"          -> com.hookahdrop.app.data.OrderStatus.SHIPPED
        "delivered"        -> com.hookahdrop.app.data.OrderStatus.DELIVERED
        "cancelled"        -> com.hookahdrop.app.data.OrderStatus.CANCELLED
        else               -> com.hookahdrop.app.data.OrderStatus.PENDING
    }
}
