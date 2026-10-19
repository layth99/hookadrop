package com.hookahdrop.app.data

import com.hookahdrop.app.network.ApiClient
import com.hookahdrop.app.network.toApiOrder
import com.hookahdrop.app.network.toCategoryList
import com.hookahdrop.app.network.toProductList
import com.hookahdrop.app.network.ApiOrder
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.net.URLEncoder

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
            val r = ApiClient.get("/api/wishlist/$userId")
            if (!r.isSuccess) return@withContext null
            val data = r.json().optJSONObject("data") ?: return@withContext null
            val arr  = data.optJSONArray("productId") ?: return@withContext emptyList()
            (0 until arr.length()).map { arr.optString(it) }
        }

    suspend fun addToWishlist(userId: String, productId: String): Boolean =
        withContext(Dispatchers.IO) {
            val body = org.json.JSONObject().put("productId", productId)
            val r = ApiClient.post("/api/wishlist/$userId", body)
            if (!r.isSuccess) {
                android.util.Log.e("RemoteDataProvider", "addToWishlist failed: code=${r.code} body=${r.raw}")
            }
            r.isSuccess
        }

    suspend fun removeFromWishlist(userId: String, productId: String): Boolean =
        withContext(Dispatchers.IO) {
            // Try the efficient single-product DELETE endpoint first
            val r = ApiClient.delete("/api/wishlist/$userId/product/$productId")
            if (r.isSuccess) return@withContext true

            android.util.Log.w("RemoteDataProvider",
                "removeFromWishlist DELETE endpoint returned ${r.code}, falling back to GET-PUT")

            // Fallback: GET current list, remove item, PUT updated list
            val getR = ApiClient.get("/api/wishlist/$userId")
            if (!getR.isSuccess) {
                android.util.Log.e("RemoteDataProvider",
                    "removeFromWishlist fallback GET failed: code=${getR.code} body=${getR.raw}")
                return@withContext false
            }
            val data = getR.json().optJSONObject("data") ?: return@withContext false
            val arr  = data.optJSONArray("productId") ?: return@withContext false

            val ids = (0 until arr.length()).map { arr.optString(it) }
                .filter { it != productId }

            val newArr = org.json.JSONArray().also { a -> ids.forEach { a.put(it) } }
            val body   = org.json.JSONObject().put("productId", newArr)
            val putR   = ApiClient.put("/api/wishlist/$userId", body)
            if (!putR.isSuccess) {
                android.util.Log.e("RemoteDataProvider",
                    "removeFromWishlist fallback PUT failed: code=${putR.code} body=${putR.raw}")
            }
            putR.isSuccess
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
