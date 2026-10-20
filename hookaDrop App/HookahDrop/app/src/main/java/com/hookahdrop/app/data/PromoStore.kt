package com.hookahdrop.app.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Holds the currently applied promo code in memory + SharedPreferences.
 * Cleared when the cart is cleared or the code is removed.
 */
object PromoStore {

    private const val PREFS      = "hookahdrop_promo"
    private const val KEY_CODE   = "applied_code"
    private const val KEY_AMOUNT = "discount_amount"
    private const val KEY_TITLE  = "promo_title"
    private const val KEY_TYPE   = "discount_type"
    private const val KEY_VALUE  = "discount_value"

    private var prefs: SharedPreferences? = null

    fun init(ctx: Context) {
        prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }

    // ── Applied promo ─────────────────────────────────────────────────────────
    var appliedCode:     String  get() = prefs?.getString(KEY_CODE,   "") ?: "";   set(v) { prefs?.edit()?.putString(KEY_CODE, v)?.apply() }
    var discountAmount:  Double  get() = prefs?.getFloat(KEY_AMOUNT, 0f)?.toDouble() ?: 0.0; set(v) { prefs?.edit()?.putFloat(KEY_AMOUNT, v.toFloat())?.apply() }
    var promoTitle:      String  get() = prefs?.getString(KEY_TITLE,  "") ?: "";   set(v) { prefs?.edit()?.putString(KEY_TITLE, v)?.apply() }
    var discountType:    String  get() = prefs?.getString(KEY_TYPE,   "percentage") ?: "percentage"; set(v) { prefs?.edit()?.putString(KEY_TYPE, v)?.apply() }
    var discountValue:   Double  get() = prefs?.getFloat(KEY_VALUE, 0f)?.toDouble() ?: 0.0; set(v) { prefs?.edit()?.putFloat(KEY_VALUE, v.toFloat())?.apply() }

    val hasPromo: Boolean get() = appliedCode.isNotEmpty()

    fun apply(code: String, amount: Double, title: String, type: String, value: Double) {
        appliedCode    = code
        discountAmount = amount
        promoTitle     = title
        discountType   = type
        discountValue  = value
    }

    fun clear() {
        prefs?.edit()?.remove(KEY_CODE)?.remove(KEY_AMOUNT)
            ?.remove(KEY_TITLE)?.remove(KEY_TYPE)?.remove(KEY_VALUE)?.apply()
    }
}
