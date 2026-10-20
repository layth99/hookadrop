package com.hookahdrop.app.data

import android.content.Context
import android.content.SharedPreferences
import android.util.Log
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

/**
 * Singleton favorites backed by SharedPreferences + Gson.
 * Automatically syncs with backend when user is logged in.
 */
object FavoritesManager {

    private const val PREFS_NAME = "hookahdrop_favorites"
    private const val KEY_IDS    = "favorite_ids"
    private const val TAG        = "FavoritesManager"

    private val ids = mutableSetOf<String>()
    private val listeners = mutableListOf<() -> Unit>()
    private var prefs: SharedPreferences? = null
    private val gson = Gson()
    
    // Session access - set by app initialization
    private var getUserId: (() -> String?)? = null

    fun init(context: Context, userIdProvider: (() -> String?)? = null) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        getUserId = userIdProvider
        load()
        Log.d(TAG, "FavoritesManager initialized. Loaded ${ids.size} favorites: ${ids.joinToString()}")
        Log.d(TAG, "UserIdProvider set: ${userIdProvider != null}")
    }

    fun isFavorite(productId: String) = ids.contains(productId)

    /** Directly add an ID (used when syncing from backend wishlist). */
    fun addId(productId: String) {
        if (!ids.contains(productId)) {
            ids.add(productId)
            save()
            notifyListeners()
        }
    }

    /**
     * Toggle favorite state and sync with backend if user is logged in.
     * Returns true if now favorite, false if removed.
     */
    fun toggle(productId: String, syncToBackend: Boolean = true): Boolean {
        Log.d(TAG, "toggle() called for productId: $productId")
        
        val nowFav = if (ids.contains(productId)) {
            ids.remove(productId)
            Log.d(TAG, "Removed from favorites. Total favorites: ${ids.size}")
            false
        } else {
            ids.add(productId)
            Log.d(TAG, "Added to favorites. Total favorites: ${ids.size}")
            true
        }
        save()
        notifyListeners()
        
        // Sync to backend if enabled and user is logged in
        if (syncToBackend) {
            syncToggleToBackend(productId, nowFav)
        }
        
        Log.d(TAG, "Current favorite IDs: ${ids.joinToString()}")
        return nowFav
    }

    /**
     * Sync a single toggle action to the backend.
     */
    private fun syncToggleToBackend(productId: String, isNowFavorite: Boolean) {
        val userId = getUserId?.invoke()
        Log.d(TAG, "syncToggleToBackend() - userId: $userId, isNowFavorite: $isNowFavorite")
        
        if (userId.isNullOrEmpty()) {
            Log.w(TAG, "Cannot sync to backend: user not logged in (userId is null/empty)")
            return
        }
        
        Log.d(TAG, "Starting backend sync for product $productId...")
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val success = if (isNowFavorite) {
                    Log.d(TAG, "Calling addToWishlist...")
                    RemoteDataProvider.addToWishlist(userId, productId)
                } else {
                    Log.d(TAG, "Calling removeFromWishlist...")
                    RemoteDataProvider.removeFromWishlist(userId, productId)
                }
                
                if (success) {
                    Log.d(TAG, "✅ Backend sync successful for product $productId")
                } else {
                    Log.e(TAG, "❌ Failed to sync favorite toggle for product $productId")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error syncing favorite to backend: ${e.message}", e)
            }
        }
    }

    fun getFavoriteIds(): Set<String> = ids.toSet()

    /**
     * Replaces the entire local favorites set with the authoritative backend list.
     * Used on login/page-load sync to prevent additive ID bloat.
     */
    fun replaceAll(newIds: Collection<String>) {
        ids.clear()
        ids.addAll(newIds)
        save()
        notifyListeners()
    }

    /**
     * Clears all favorites. Called on sign-out to prevent one user's data
     * from bleeding into the next user's session.
     */
    fun clear() {
        ids.clear()
        save()
        notifyListeners()
    }

    fun addListener(l: () -> Unit)    { listeners.add(l) }
    fun removeListener(l: () -> Unit) { listeners.remove(l) }

    private fun save() {
        val json = gson.toJson(ids)
        prefs?.edit()?.putString(KEY_IDS, json)?.apply()
    }

    private fun load() {
        val json = prefs?.getString(KEY_IDS, null) ?: return
        val type = object : TypeToken<MutableSet<String>>() {}.type
        val loaded: MutableSet<String>? = gson.fromJson(json, type)
        if (loaded != null) { ids.clear(); ids.addAll(loaded) }
    }

    private fun notifyListeners() {
        ArrayList(listeners).forEach { it() }
    }
}
