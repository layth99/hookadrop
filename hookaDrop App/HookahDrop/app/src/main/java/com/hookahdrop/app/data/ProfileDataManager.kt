package com.hookahdrop.app.data

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.hookahdrop.app.R

/**
 * Manages addresses and payment methods locally via SharedPreferences + Gson.
 * Orders are demo-only since there is no backend.
 */
object ProfileDataManager {

    private const val PREFS_NAME   = "hookahdrop_profile"
    private const val KEY_ADDRESSES = "addresses"
    private const val KEY_PAYMENTS  = "payment_methods"

    private var prefs: SharedPreferences? = null
    private val gson = Gson()

    fun init(context: Context) {
        prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    // ── Addresses ─────────────────────────────────────────────────────────────
    fun getAddresses(): MutableList<Address> {
        val json = prefs?.getString(KEY_ADDRESSES, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<Address>>() {}.type
        return gson.fromJson(json, type) ?: mutableListOf()
    }

    fun saveAddresses(list: List<Address>) {
        prefs?.edit()?.putString(KEY_ADDRESSES, gson.toJson(list))?.apply()
    }

    fun addAddress(a: Address) {
        val list = getAddresses()
        if (a.isDefault) list.forEach { it.isDefault = false }
        list.add(a)
        saveAddresses(list)
    }

    fun updateAddress(a: Address) {
        val list = getAddresses()
        if (a.isDefault) list.forEach { it.isDefault = false }
        val idx = list.indexOfFirst { it.id == a.id }
        if (idx >= 0) list[idx] = a
        saveAddresses(list)
    }

    fun deleteAddress(id: String) {
        val list = getAddresses().filter { it.id != id }.toMutableList()
        // If we deleted the default, make first one default
        if (list.isNotEmpty() && list.none { it.isDefault }) list[0].isDefault = true
        saveAddresses(list)
    }

    fun setDefaultAddress(id: String) {
        val list = getAddresses()
        list.forEach { it.isDefault = it.id == id }
        saveAddresses(list)
    }

    // ── Payment methods ───────────────────────────────────────────────────────
    fun getPaymentMethods(): MutableList<PaymentMethod> {
        val json = prefs?.getString(KEY_PAYMENTS, null) ?: return mutableListOf()
        val type = object : TypeToken<MutableList<PaymentMethod>>() {}.type
        return gson.fromJson(json, type) ?: mutableListOf()
    }

    fun savePaymentMethods(list: List<PaymentMethod>) {
        prefs?.edit()?.putString(KEY_PAYMENTS, gson.toJson(list))?.apply()
    }

    fun addPaymentMethod(pm: PaymentMethod) {
        val list = getPaymentMethods()
        if (pm.isDefault) list.forEach {
            // PaymentMethod is a data class — replace with copy
            val idx = list.indexOf(it)
            list[idx] = it.copy(isDefault = false)
        }
        list.add(pm)
        savePaymentMethods(list)
    }

    fun deletePaymentMethod(id: String) {
        val list = getPaymentMethods().filter { it.id != id }.toMutableList()
        if (list.isNotEmpty() && list.none { it.isDefault })
            list[0] = list[0].copy(isDefault = true)
        savePaymentMethods(list)
    }

    fun setDefaultPayment(id: String) {
        val list = getPaymentMethods()
        val updated = list.map { it.copy(isDefault = it.id == id) }.toMutableList()
        savePaymentMethods(updated)
    }

    // ── Demo orders (no backend — show empty state) ───────────────────────────
    fun getOrders(): List<Order> = emptyList()

    // ── FAQ ───────────────────────────────────────────────────────────────────
    fun getFaq(): List<FaqItem> = listOf(
        FaqItem("How can I track my order?",
            "Go to My Orders in your profile. Each order shows its current status and tracking info once shipped."),
        FaqItem("How can I change my delivery address?",
            "Go to Profile → Saved Addresses. You can add, edit or set a default address at any time."),
        FaqItem("How can I change my password?",
            "Go to Profile → Settings → Security → Change Password."),
        FaqItem("What payment methods are supported?",
            "We accept major credit cards (Visa, Mastercard), PayPal and cash on delivery depending on your region."),
        FaqItem("How can I cancel an order?",
            "Orders can be cancelled within 1 hour of placement. Go to My Orders, select the order and tap Cancel."),
        FaqItem("How long does delivery take?",
            "Standard delivery takes 3–5 business days. Express delivery (1–2 days) is available at checkout."),
        FaqItem("Is my payment information secure?",
            "Yes. We never store full card numbers. All transactions are processed through a secure payment provider."),
        FaqItem("How can I return a product?",
            "Contact our support team within 14 days of delivery. Products must be unused and in original packaging.")
    )
}
