package com.hookahdrop.app.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/**
 * Singleton favorites backed by SharedPreferences + Gson.
 */
object FavoritesManager {

    private const val PREFS_NAME = "hookahdrop_favorites"
    private const val KEY_IDS    = "favorite_ids"

    private val ids = mutableSetOf<String>()
    private val listeners = mutableListOf<() -> Unit>()
    private var prefs: SharedPreferences? = null
    private val gson = Gson()

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        load()
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

    fun toggle(productId: String): Boolean {
        val nowFav = if (ids.contains(productId)) {
            ids.remove(productId); false
        } else {
            ids.add(productId); true
        }
        save(); notifyListeners()
        return nowFav
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
