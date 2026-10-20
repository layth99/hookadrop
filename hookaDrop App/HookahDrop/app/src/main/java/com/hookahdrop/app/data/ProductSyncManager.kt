package com.hookahdrop.app.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.hookahdrop.app.network.ApiClient
import com.hookahdrop.app.network.toProduct
import com.hookahdrop.app.network.toProductList
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.ConcurrentHashMap

/**
 * ProductSyncManager — Single source of truth for all products.
 *
 * Strategy:
 *  1. Always fetch ALL products from the backend (no page limit).
 *  2. Static DataProvider products are used ONLY as offline fallback.
 *  3. Deduplication by product ID — no duplicates ever.
 *  4. Category mapping is dynamic: any category string from the DB is
 *     matched against the known category IDs (case-insensitive).
 *  5. Cache version tracking: forces re-sync when cache format changes
 *     or database duplicates have been cleaned.
 *
 * Usage:
 *   ProductSyncManager.init(context)  // Call once in Application.onCreate()
 *   val products = ProductSyncManager.getAllProducts(forceRefresh = true)
 *   val hookahProducts = ProductSyncManager.getByCategory("hookahs")
 */
object ProductSyncManager {

    private const val TAG = "ProductSyncManager"
    
    // Cache version — increment this when database duplicates are cleaned
    // or when cache format changes to force all users to re-sync
    private const val CACHE_VERSION = 2  // Incremented after duplicate cleanup
    private const val PREFS_NAME = "product_sync"
    private const val KEY_CACHE_VERSION = "cache_version"

    // ── In-memory store ───────────────────────────────────────────────────────
    // Keyed by product ID to guarantee no duplicates
    private val productMap: ConcurrentHashMap<String, Product> = ConcurrentHashMap()

    // Timestamp of last successful DB fetch
    private var lastSyncMs = 0L
    private const val SYNC_INTERVAL_MS = 30_000L  // 30 seconds

    // Whether a sync is currently in progress (prevents parallel syncs)
    private var isSyncing = false
    
    // SharedPreferences for cache version tracking
    private var prefs: SharedPreferences? = null

    // Synchronization lock for thread safety
    private val lock = Any()

    // ── Initialization ────────────────────────────────────────────────────────
    
    /**
     * Initialize the sync manager with application context.
     * Call this once in your Application class onCreate().
     */
    fun init(context: Context) {
        prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        checkCacheVersion()
    }
    
    private fun checkCacheVersion() {
        val stored = prefs?.getInt(KEY_CACHE_VERSION, 0) ?: 0
        if (stored < CACHE_VERSION) {
            Log.i(TAG, "Cache version outdated ($stored < $CACHE_VERSION) — clearing cache to force re-sync")
            clearCache()
            prefs?.edit()?.putInt(KEY_CACHE_VERSION, CACHE_VERSION)?.apply()
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /**
     * Returns all products, fetching from the DB if needed.
     *
     * @param forceRefresh  true → always fetch from backend, ignoring cache
     */
    suspend fun getAllProducts(forceRefresh: Boolean = false): List<Product> =
        withContext(Dispatchers.IO) {
            val shouldSync = synchronized(lock) {
                if (forceRefresh) {
                    if (!isSyncing) {
                        isSyncing = true
                        true
                    } else false
                } else {
                    if (!isSyncing && (productMap.isEmpty() || System.currentTimeMillis() - lastSyncMs > SYNC_INTERVAL_MS)) {
                        isSyncing = true
                        true
                    } else {
                        false
                    }
                }
            }

            if (shouldSync) {
                syncAndRelease()
            }

            synchronized(lock) {
                if (productMap.isEmpty()) {
                    // Last resort — static fallback
                    DataProvider.products
                } else {
                    productMap.values.toList()
                }
            }
        }

    /**
     * Returns products for a specific category.
     * Fetches from backend first if cache is stale.
     *
     * @param categoryId  The category identifier (e.g. "hookahs", "Hookah", "tobacco")
     */
    suspend fun getByCategory(categoryId: String): List<Product> {
        val all = getAllProducts()
        return all.filter { it.categoryId.equals(categoryId, ignoreCase = true) }
    }

    /**
     * Returns a single product by ID, checking cache first then backend.
     */
    suspend fun getById(id: String): Product? =
        withContext(Dispatchers.IO) {
            // Check cache first
            synchronized(lock) {
                productMap[id]
            }?.let { return@withContext it }

            // Fetch from backend
            val r = ApiClient.get("/api/products/$id")
            if (r.isSuccess) {
                val p = r.json().optJSONObject("data")?.let { obj ->
                    obj.toProduct()
                }
                if (p != null) {
                    synchronized(lock) {
                        productMap[p.id] = p
                    }
                    return@withContext p
                }
            }
            // Static fallback
            DataProvider.getProductById(id)
        }

    /**
     * Forces a full resync from the backend.
     * Call this after adding/editing a product from the Dashboard.
     */
    suspend fun forceSync(): List<Product> = getAllProducts(forceRefresh = true)

    /**
     * Clears the in-memory cache (forces next call to fetch from backend).
     */
    fun clearCache() {
        synchronized(lock) {
            productMap.clear()
            lastSyncMs = 0L
        }
    }

    // ── Diagnostics ───────────────────────────────────────────────────────────

    /** Returns how many products are currently in the local cache. */
    fun cachedCount(): Int = synchronized(lock) { productMap.size }

    /** Returns IDs of all cached products. */
    fun cachedIds(): Set<String> = synchronized(lock) { productMap.keys.toSet() }

    /** Returns all cached products synchronously (or static fallback if empty). */
    fun getAllCachedProductsSync(): List<Product> = synchronized(lock) {
        if (productMap.isEmpty()) DataProvider.products else productMap.values.toList()
    }

    // ── Internal sync ─────────────────────────────────────────────────────────

    private suspend fun syncAndRelease() {
        try {
            val dbProducts = fetchAllFromBackend()

            synchronized(lock) {
                if (dbProducts.isNotEmpty()) {
                    // Database products are the source of truth
                    val freshMap = LinkedHashMap<String, Product>()
                    dbProducts.forEach { freshMap[it.id] = it }
                    
                    productMap.clear()
                    productMap.putAll(freshMap)
                    lastSyncMs = System.currentTimeMillis()

                    Log.d(TAG, "Sync complete: ${productMap.size} products from DB")
                } else {
                    // Backend unreachable OR returned empty — use static fallback
                    Log.w(TAG, "Database empty — using static fallback products")
                    productMap.clear()
                    DataProvider.products.forEach { productMap[it.id] = it }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Sync error: ${e.message}")
            synchronized(lock) {
                if (productMap.isEmpty()) {
                    // Network error and no cached products — use static fallback
                    Log.w(TAG, "Sync failed with empty cache — using static fallback products")
                    DataProvider.products.forEach { productMap[it.id] = it }
                }
            }
        } finally {
            synchronized(lock) {
                isSyncing = false
            }
        }
    }

    /**
     * Fetches all pages from the backend until no more products are returned.
     * Uses limit=100 per page to be efficient.
     */
    private suspend fun fetchAllFromBackend(): List<Product> =
        withContext(Dispatchers.IO) {
            val allProducts = mutableListOf<Product>()
            var page = 1
            val limit = 100

            while (true) {
                val response = ApiClient.get("/api/products?page=$page&limit=$limit")
                if (!response.isSuccess) {
                    Log.w(TAG, "Page $page fetch failed (code ${response.code})")
                    break
                }

                val arr  = response.jsonArray("data")
                val list = arr.toProductList()

                if (list.isEmpty()) break

                allProducts.addAll(list)
                Log.d(TAG, "Fetched page $page: ${list.size} products (total so far: ${allProducts.size})")

                // Check if there are more pages
                val json       = response.json()
                val totalPages = json.optInt("totalPages", 1)
                if (page >= totalPages || list.size < limit) break
                page++
            }

            allProducts
        }
}
