package com.hookahdrop.app.data

import com.hookahdrop.app.network.ApiClient
import com.hookahdrop.app.network.toApiOrder
import com.hookahdrop.app.network.toCategoryList
import com.hookahdrop.app.network.toProductList
import com.hookahdrop.app.network.ApiOrder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URLEncoder
import java.util.UUID

/**
 * Fetches products, categories and orders from the backend API.
 *
 * Falls back to [DataProvider] static data if:
 *  - network is unavailable
 *  - the server returns an error
 *  - the response is empty
 *
 * This ensures the app always has something to show.
 */
object RemoteDataProvider {

    // ── In-memory cache ───────────────────────────────────────────────────────
    private var cachedProducts:   List<Product>  = emptyList()
    private var cachedCategories: List<Category> = emptyList()
    private var lastFetchMs = 0L
    private const val CACHE_TTL_MS = 30 * 1000L   // 30 seconds

    // ── Products (synced via ProductSyncManager - Source of Truth: DB) ───────

    suspend fun getProducts(forceRefresh: Boolean = false): List<Product> =
        withContext(Dispatchers.IO) {
            ProductSyncManager.getAllProducts(forceRefresh)
        }

    suspend fun getProductsByCategory(categoryName: String): List<Product> =
        withContext(Dispatchers.IO) {
            ProductSyncManager.getByCategory(categoryName)
        }

    suspend fun getPopularProducts(): List<Product> =
        withContext(Dispatchers.IO) {
            val r = ApiClient.get("/api/products/popular")
            if (r.isSuccess) r.jsonArray("data").toProductList() 
            else DataProvider.products.take(6)
        }

    suspend fun getProductById(id: String): Product? =
        withContext(Dispatchers.IO) {
            ProductSyncManager.getById(id)
        }

    suspend fun searchProducts(query: String): List<Product> =
        withContext(Dispatchers.IO) {
            val enc = URLEncoder.encode(query, "UTF-8")
            val r   = ApiClient.get("/api/products/search?name=$enc")
            if (r.isSuccess) r.jsonArray("data").toProductList() else emptyList()
        }

    // ── Categories ────────────────────────────────────────────────────────────

    suspend fun getCategories(forceRefresh: Boolean = false): List<Category> =
        withContext(Dispatchers.IO) {
            val now = System.currentTimeMillis()
            if (!forceRefresh && cachedCategories.isNotEmpty() &&
                now - lastFetchMs < CACHE_TTL_MS) {
                return@withContext cachedCategories
            }
            val r = ApiClient.get("/api/categories")
            if (r.isSuccess) {
                val list = r.jsonArray("data").toCategoryList()
                if (list.isNotEmpty()) {
                    cachedCategories = list
                    return@withContext list
                }
            }
            DataProvider.categories
        }

    // ── Orders (for authenticated user) ───────────────────────────────────────

    suspend fun getMyOrders(userId: String, token: String): List<ApiOrder> =
        withContext(Dispatchers.IO) {
            // Use the dedicated /my-orders endpoint — no admin role required
            val r = ApiClient.get("/api/orders/my-orders", token)
            if (!r.isSuccess) return@withContext emptyList()

            val arr  = r.jsonArray("data")
            val list = mutableListOf<ApiOrder>()
            for (i in 0 until arr.length()) {
                try { list.add(arr.getJSONObject(i).toApiOrder()) } catch (_: Exception) {}
            }
            list
        }

    // ── Wishlist (favorites synced to backend) ────────────────────────────────

    /**
     * Returns the user's backend wishlist IDs, or null if the request failed
     * (network error, server error, etc.). Returns an empty list only when the
     * backend confirms the wishlist is genuinely empty.
     * Callers must treat null as "do not replace local state" to avoid wiping
     * local favorites on a transient network failure.
     */
    suspend fun getWishlist(userId: String): List<String>? =
        withContext(Dispatchers.IO) {
            android.util.Log.d("RemoteDataProvider", "═══ getWishlist() START ═══")
            android.util.Log.d("RemoteDataProvider", "Fetching wishlist for userId: $userId")
            
            val r = ApiClient.get("/api/wishlist/$userId")
            
            if (!r.isSuccess) {
                android.util.Log.e("RemoteDataProvider", "getWishlist() FAILED: HTTP ${r.code}")
                android.util.Log.e("RemoteDataProvider", "Response body: ${r.raw}")
                android.util.Log.d("RemoteDataProvider", "═══ getWishlist() END (ERROR) ═══")
                return@withContext null
            }
            
            val data = r.json().optJSONObject("data")
            if (data == null) {
                android.util.Log.e("RemoteDataProvider", "getWishlist() - No 'data' object in response")
                android.util.Log.e("RemoteDataProvider", "Full response: ${r.raw}")
                android.util.Log.d("RemoteDataProvider", "═══ getWishlist() END (NO DATA) ═══")
                return@withContext null
            }
            
            val arr = data.optJSONArray("productId")
            if (arr == null) {
                android.util.Log.w("RemoteDataProvider", "getWishlist() - No 'productId' array in data object")
                android.util.Log.w("RemoteDataProvider", "Data object keys: ${data.keys().asSequence().toList()}")
                android.util.Log.d("RemoteDataProvider", "═══ getWishlist() END (EMPTY) ═══")
                return@withContext emptyList()
            }
            
            // Parse the array - handle BOTH populated objects and plain IDs
            val ids = (0 until arr.length()).mapNotNull { i ->
                val element = arr.opt(i)
                when {
                    // Case 1: Element is a JSONObject (populated product)
                    element is org.json.JSONObject -> {
                        val id = element.optString("_id", element.optString("id", ""))
                        if (id.isNotEmpty()) {
                            android.util.Log.d("RemoteDataProvider", "Extracted ID from populated object: $id")
                            id
                        } else {
                            android.util.Log.w("RemoteDataProvider", "Populated object has no _id or id field")
                            null
                        }
                    }
                    // Case 2: Element is a plain string ID
                    element is String -> {
                        if (element.isNotEmpty()) {
                            android.util.Log.d("RemoteDataProvider", "Got plain string ID: $element")
                            element
                        } else null
                    }
                    // Case 3: Unknown type
                    else -> {
                        android.util.Log.w("RemoteDataProvider", "Unknown element type at index $i: ${element?.javaClass?.simpleName}")
                        null
                    }
                }
            }
            
            android.util.Log.d("RemoteDataProvider", "getWishlist() found ${ids.size} product IDs")
            if (ids.isNotEmpty()) {
                val sampleIds = ids.take(5).joinToString(", ")
                android.util.Log.d("RemoteDataProvider", "Sample product IDs (first 5): [$sampleIds]")
            }
            android.util.Log.d("RemoteDataProvider", "═══ getWishlist() END (SUCCESS) ═══")
            return@withContext ids
        }

    suspend fun addToWishlist(userId: String, productId: String): Boolean =
        withContext(Dispatchers.IO) {
            android.util.Log.d("RemoteDataProvider", "═══ addToWishlist() START ═══")
            android.util.Log.d("RemoteDataProvider", "userId: $userId")
            android.util.Log.d("RemoteDataProvider", "productId: $productId")
            
            val body = org.json.JSONObject().put("productId", productId)
            val r = ApiClient.post("/api/wishlist/$userId", body)
            
            if (!r.isSuccess) {
                android.util.Log.e("RemoteDataProvider", "addToWishlist FAILED: HTTP ${r.code}")
                android.util.Log.e("RemoteDataProvider", "Response: ${r.raw}")
            } else {
                android.util.Log.d("RemoteDataProvider", "addToWishlist SUCCESS")
            }
            
            android.util.Log.d("RemoteDataProvider", "═══ addToWishlist() END ═══")
            r.isSuccess
        }

    suspend fun removeFromWishlist(userId: String, productId: String): Boolean =
        withContext(Dispatchers.IO) {
            android.util.Log.d("RemoteDataProvider", "═══ removeFromWishlist() START ═══")
            android.util.Log.d("RemoteDataProvider", "userId: '$userId'")
            android.util.Log.d("RemoteDataProvider", "productId: '$productId'")
            android.util.Log.d("RemoteDataProvider", "DELETE URL: /api/wishlist/$userId/product/$productId")
            
            // Try the efficient single-product DELETE endpoint first
            val r = ApiClient.delete("/api/wishlist/$userId/product/$productId")
            
            android.util.Log.d("RemoteDataProvider", "DELETE response code: ${r.code}")
            android.util.Log.d("RemoteDataProvider", "DELETE response: ${r.raw}")
            
            if (r.isSuccess) {
                android.util.Log.d("RemoteDataProvider", "✅ DELETE endpoint SUCCESS - product removed from backend")
                android.util.Log.d("RemoteDataProvider", "═══ removeFromWishlist() END (SUCCESS) ═══")
                return@withContext true
            }

            android.util.Log.w("RemoteDataProvider",
                "❌ DELETE endpoint FAILED with HTTP ${r.code} - falling back to GET-PUT")
            android.util.Log.w("RemoteDataProvider", "DELETE response: ${r.raw}")

            // Fallback: GET current list, remove item, PUT updated list
            android.util.Log.d("RemoteDataProvider", "Fallback: GET current wishlist...")
            val getR = ApiClient.get("/api/wishlist/$userId")
            if (!getR.isSuccess) {
                android.util.Log.e("RemoteDataProvider",
                    "❌ Fallback GET failed: HTTP ${getR.code}")
                android.util.Log.e("RemoteDataProvider", "Response: ${getR.raw}")
                android.util.Log.d("RemoteDataProvider", "═══ removeFromWishlist() END (FAILED) ═══")
                return@withContext false
            }
            
            val data = getR.json().optJSONObject("data")
            if (data == null) {
                android.util.Log.e("RemoteDataProvider", "❌ Fallback GET has no 'data' object")
                android.util.Log.d("RemoteDataProvider", "═══ removeFromWishlist() END (FAILED) ═══")
                return@withContext false
            }
            
            val arr = data.optJSONArray("productId")
            if (arr == null) {
                android.util.Log.e("RemoteDataProvider", "❌ Fallback GET has no 'productId' array")
                android.util.Log.d("RemoteDataProvider", "═══ removeFromWishlist() END (FAILED) ═══")
                return@withContext false
            }

            // Parse populated objects correctly (same logic as getWishlist)
            val currentIds = (0 until arr.length()).mapNotNull { i ->
                val element = arr.opt(i)
                when {
                    element is org.json.JSONObject -> element.optString("_id", element.optString("id", ""))
                    element is String -> element
                    else -> null
                }
            }.filter { it.isNotEmpty() }
            
            android.util.Log.d("RemoteDataProvider", "Current wishlist has ${currentIds.size} items")
            
            // Remove the specified product
            val newIds = currentIds.filter { it != productId }
            android.util.Log.d("RemoteDataProvider", "After removal: ${newIds.size} items (removed: ${currentIds.size - newIds.size})")

            val newArr = org.json.JSONArray().also { a -> newIds.forEach { a.put(it) } }
            val body   = org.json.JSONObject().put("productId", newArr)
            
            android.util.Log.d("RemoteDataProvider", "Fallback: PUT updated wishlist...")
            android.util.Log.d("RemoteDataProvider", "PUT URL: /api/wishlist/$userId")
            android.util.Log.d("RemoteDataProvider", "PUT body: ${body.toString()}")
            val putR   = ApiClient.put("/api/wishlist/$userId", body)
            
            android.util.Log.d("RemoteDataProvider", "PUT response code: ${putR.code}")
            android.util.Log.d("RemoteDataProvider", "PUT response: ${putR.raw}")
            
            if (!putR.isSuccess) {
                android.util.Log.e("RemoteDataProvider",
                    "❌ Fallback PUT failed: HTTP ${putR.code}")
                android.util.Log.e("RemoteDataProvider", "Response: ${putR.raw}")
                android.util.Log.d("RemoteDataProvider", "═══ removeFromWishlist() END (FAILED) ═══")
                return@withContext false
            }
            
            android.util.Log.d("RemoteDataProvider", "✅ Fallback PUT SUCCESS")
            android.util.Log.d("RemoteDataProvider", "═══ removeFromWishlist() END (SUCCESS) ═══")
            putR.isSuccess
        }

    // ── Addresses ─────────────────────────────────────────────────────────────

    suspend fun getAddresses(_token: String): List<Address>? =
        withContext(Dispatchers.IO) {
            ProfileDataManager.getAddresses()
        }

    suspend fun createAddress(_token: String, address: Address): Address? =
        withContext(Dispatchers.IO) {
            if (address.id.isEmpty()) address.copy(id = UUID.randomUUID().toString()) else address
        }

    suspend fun updateAddress(_token: String, address: Address): Address? =
        withContext(Dispatchers.IO) {
            address
        }

    suspend fun deleteAddress(_token: String, _addressId: String): Boolean =
        withContext(Dispatchers.IO) {
            true
        }

    suspend fun setDefaultAddress(_token: String, _addressId: String): Any? =
        withContext(Dispatchers.IO) {
            true
        }

    // ── Sync helpers ──────────────────────────────────────────────────────────

    /** Sync lookup from cache — no suspend needed. */
    fun getCategoryByIdSync(id: String): Category? =
        cachedCategories.find { it.id == id } ?: DataProvider.getCategoryById(id)

    fun getProductByIdSync(id: String): Product? =
        ProductSyncManager.getAllCachedProductsSync().find { it.id == id } ?: DataProvider.getProductById(id)

    /** Returns ALL products currently in the in-memory cache (no network call). */
    fun getAllCachedProducts(): List<Product> = ProductSyncManager.getAllCachedProductsSync()

    fun clearCache() {
        cachedProducts   = emptyList()
        cachedCategories = emptyList()
        lastFetchMs      = 0L
    }
}
