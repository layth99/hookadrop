package com.hookahdrop.app.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/**
 * Singleton cart backed by SharedPreferences + Gson.
 * Observers are notified via a simple listener list.
 */
object CartManager {

    private const val PREFS_NAME = "hookahdrop_cart"
    private const val KEY_ITEMS  = "cart_items"

    private val items = mutableListOf<CartItem>()
    private val listeners = mutableListOf<() -> Unit>()
    private var prefs: SharedPreferences? = null
    private val gson = Gson()

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        load()
    }

    // ── Public API ────────────────────────────────────────────────────────────
    fun getItems(): List<CartItem> = items.toList()

    fun getTotalCount(): Int = items.sumOf { it.quantity }

    fun getTotalPrice(): Double = items.sumOf { it.product.price * it.quantity }

    fun addProduct(product: Product) {
        val existing = items.find { it.product.id == product.id }
        if (existing != null) existing.quantity++
        else items.add(CartItem(product))
        save(); notifyListeners()
    }

    fun removeProduct(productId: String) {
        items.removeAll { it.product.id == productId }
        save(); notifyListeners()
    }

    fun updateQuantity(productId: String, quantity: Int) {
        if (quantity <= 0) { removeProduct(productId); return }
        items.find { it.product.id == productId }?.quantity = quantity
        save(); notifyListeners()
    }

    /** Updates the price of a cart item in-memory and saves — used to sync DB prices. */
    fun updatePrice(productId: String, newPrice: Double) {
        val idx = items.indexOfFirst { it.product.id == productId }
        if (idx == -1) return
        val item = items[idx]
        // CartItem.product is val, so replace the whole CartItem
        items[idx] = CartItem(product = item.product.copy(price = newPrice), quantity = item.quantity)
        save()
        // Do NOT call notifyListeners() here — CartActivity refreshes manually after all updates
    }

    fun isInCart(productId: String) = items.any { it.product.id == productId }

    /**
     * Clears all cart items. Called on sign-out to prevent one user's data
     * from bleeding into the next user's session.
     */
    fun clear() {
        items.clear()
        save()
        notifyListeners()
    }

    fun addListener(l: () -> Unit)    { listeners.add(l) }
    fun removeListener(l: () -> Unit) { listeners.remove(l) }

    fun loadFromBackend(token: String): Boolean {
        return true
    }

    fun syncToBackend(token: String) {
    }

    // ── Persistence ───────────────────────────────────────────────────────────
    private fun save() {
        val json = gson.toJson(items)
        prefs?.edit()?.putString(KEY_ITEMS, json)?.apply()
    }

    private fun load() {
        val json = prefs?.getString(KEY_ITEMS, null) ?: return
        val type = object : TypeToken<MutableList<CartItem>>() {}.type
        val loaded: MutableList<CartItem>? = gson.fromJson(json, type)
        if (loaded != null) { items.clear(); items.addAll(loaded) }
    }

    private fun notifyListeners() {
        ArrayList(listeners).forEach { it() }
    }
}
