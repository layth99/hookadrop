package com.hookahdrop.app

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.data.PromoStore
import com.hookahdrop.app.databinding.ActivityPromoCodesBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class PromoCodesActivity : AppCompatActivity() {

    private lateinit var b: ActivityPromoCodesBinding
    private var isApplying = false

    override fun attachBaseContext(base: Context) =
        super.attachBaseContext(LocaleManager.wrap(base))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityPromoCodesBinding.inflate(layoutInflater)
        setContentView(b.root)
        PromoStore.init(this)
        CartManager.init(this)

        b.btnBack.setOnClickListener { finish(); overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit) }
        b.btnApplyCode.setOnClickListener { if (!isApplying) applyCode() }
        b.btnRemoveCode.setOnClickListener { removeCode() }

        refreshAppliedCard()
        loadActivePromos()
        playEntrance()
    }

    // ── Entrance animation ─────────────────────────────────────────────────
    private fun playEntrance() {
        val views = listOf(b.header, b.btnApplyCode)
        views.forEachIndexed { i, v ->
            v.alpha = 0f; v.translationY = 24f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(v, View.TRANSLATION_Y, 24f, 0f).also { it.duration = 380; it.startDelay = (i * 60).toLong(); it.interpolator = DecelerateInterpolator() },
                    ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).also { it.duration = 380; it.startDelay = (i * 60).toLong() }
                ); start()
            }
        }
    }

    // ── Applied code card ──────────────────────────────────────────────────
    private fun refreshAppliedCard() {
        if (PromoStore.hasPromo) {
            b.appliedCard.visibility    = View.VISIBLE
            b.tvAppliedCode.text        = PromoStore.appliedCode
            b.tvAppliedDiscount.text    = "${PromoStore.promoTitle} — saves ${"%.2f".format(PromoStore.discountAmount)}"
            b.etPromoCode.setText(PromoStore.appliedCode)
        } else {
            b.appliedCard.visibility = View.GONE
        }
    }

    private fun removeCode() {
        PromoStore.clear()
        b.appliedCard.visibility = View.GONE
        b.etPromoCode.text?.clear()
        hideMessage()
        Toast.makeText(this, "Promo code removed.", Toast.LENGTH_SHORT).show()
    }

    // ── Apply code ─────────────────────────────────────────────────────────
    private fun applyCode() {
        val code = b.etPromoCode.text.toString().trim().uppercase()
        if (code.isEmpty()) { showMessage("Please enter a promo code.", error = true); return }

        isApplying = true
        b.btnApplyCode.isEnabled = false
        b.btnApplyCode.text = "…"

        CoroutineScope(Dispatchers.Main).launch {
            val cartItems = buildCartItemsJson()
            val body = JSONObject().apply {
                put("code",      code)
                put("cartItems", cartItems)
            }
            val response = withContext(Dispatchers.IO) {
                ApiClient.post("/api/promotions/validate", body)
            }
            isApplying = false
            b.btnApplyCode.isEnabled = true
            b.btnApplyCode.text = "Apply"

            if (response.isSuccess) {
                val data    = response.json().optJSONObject("data") ?: JSONObject()
                val amount  = data.optDouble("discountAmount", 0.0)
                val title   = data.optString("title", code)
                val type    = data.optString("discountType", "percentage")
                val value   = data.optDouble("discountValue", 0.0)
                PromoStore.apply(code, amount, title, type, value)
                refreshAppliedCard()
                showMessage("🎉 ${response.json().optString("message", "Code applied!")} — You save ${"%.2f".format(amount)}", error = false)
            } else {
                val msg = response.json().optString("message", "Invalid promo code.")
                showMessage(msg, error = true)
                shakeInput()
            }
        }
    }

    private fun buildCartItemsJson(): JSONArray {
        val arr = JSONArray()
        CartManager.getItems().forEach { item ->
            // Only include items with real MongoDB ObjectIds (24-char hex)
            // Skip static DataProvider items (e.g. "p2") to avoid backend cast error
            val id = item.product.id
            if (id.matches(Regex("[0-9a-fA-F]{24}"))) {
                arr.put(JSONObject().apply {
                    put("productId", id)
                    put("price",     item.product.price)
                    put("qty",       item.quantity)
                })
            }
        }
        return arr
    }

    // ── Load active promotions ─────────────────────────────────────────────
    private fun loadActivePromos() {
        b.progressPromos.visibility = View.VISIBLE
        b.promoCardsContainer.removeAllViews()

        CoroutineScope(Dispatchers.Main).launch {
            val response = withContext(Dispatchers.IO) { ApiClient.get("/api/promotions/active") }
            b.progressPromos.visibility = View.GONE

            if (!response.isSuccess) {
                b.emptyPromos.visibility = View.VISIBLE; return@launch
            }

            val arr = response.jsonArray("data")
            if (arr.length() == 0) {
                b.emptyPromos.visibility = View.VISIBLE; return@launch
            }

            b.emptyPromos.visibility = View.GONE
            for (i in 0 until arr.length()) {
                val promo = arr.optJSONObject(i) ?: continue
                addPromoCard(promo)
            }
        }
    }

    // ── Promo card ─────────────────────────────────────────────────────────
    private fun addPromoCard(promo: JSONObject) {
        val view = LayoutInflater.from(this).inflate(R.layout.item_promo_card, b.promoCardsContainer, false)

        val code        = promo.optString("code", "")
        val title       = promo.optString("title", "")
        val desc        = promo.optString("description", "")
        val type        = promo.optString("discountType", "percentage")
        val value       = promo.optDouble("discountValue", 0.0)
        val targetType  = promo.optString("targetType", "all")
        val expiry      = promo.optString("expirationDate", "")
        val categories  = promo.optJSONArray("eligibleCategoryIds")

        // Discount badge
        view.findViewById<TextView>(R.id.tvPromoDiscount).text =
            if (type == "percentage") "${value.toInt()}% OFF" else "$${"%.2f".format(value)} OFF"

        // Code + copy icon
        view.findViewById<TextView>(R.id.tvPromoCode).text = code
        view.findViewById<android.widget.ImageView>(R.id.btnCopyCode).setOnClickListener {
            val cm = getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
            cm.setPrimaryClip(ClipData.newPlainText("promo_code", code))
            Toast.makeText(this, "Code copied!", Toast.LENGTH_SHORT).show()
        }

        view.findViewById<TextView>(R.id.tvPromoTitle).text = title
        view.findViewById<TextView>(R.id.tvPromoDesc).text  = desc

        // Target label
        val targetLabel = when {
            targetType == "all"        -> "All products"
            targetType == "categories" && categories != null && categories.length() > 0 ->
                (0 until categories.length()).map { categories.optString(it) }.joinToString(", ")
            else -> "Selected products"
        }
        view.findViewById<TextView>(R.id.tvPromoTarget).text = "Applies to: $targetLabel"

        // Expiry — show row if available
        val expiryRow  = view.findViewById<android.view.ViewGroup>(R.id.expiryRow)
        val expiryText = view.findViewById<TextView>(R.id.tvPromoExpiry)
        if (expiry.isNotEmpty()) {
            expiryRow.visibility = View.VISIBLE
            // Format: "2027-10-10T03:27:17.580Z" → "Expires: Oct 10, 2027"
            val formatted = try {
                val date = java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.ENGLISH)
                    .parse(expiry.take(10))
                val out = java.text.SimpleDateFormat("MMM dd, yyyy", java.util.Locale.ENGLISH)
                out.format(date!!)
            } catch (_: Exception) { expiry.take(10) }
            expiryText.text = "Expires: $formatted"
        } else {
            expiryRow.visibility = View.GONE
        }

        // Apply button
        view.findViewById<Button>(R.id.btnUseCode).setOnClickListener {
            b.etPromoCode.setText(code)
            applyCode()
        }

        // Animate card in
        view.alpha = 0f; view.translationY = 20f
        view.animate().alpha(1f).translationY(0f).setDuration(300)
            .setStartDelay((b.promoCardsContainer.childCount * 80).toLong())
            .setInterpolator(DecelerateInterpolator()).start()

        b.promoCardsContainer.addView(view)
    }

    // ── UI helpers ─────────────────────────────────────────────────────────
    private fun showMessage(msg: String, error: Boolean) {
        b.tvCodeMessage.visibility = View.VISIBLE
        b.tvCodeMessage.text       = msg
        b.tvCodeMessage.setTextColor(
            ContextCompat.getColor(this, if (error) R.color.input_border_error else R.color.success)
        )
    }

    private fun hideMessage() {
        b.tvCodeMessage.visibility = View.GONE
    }

    private fun shakeInput() {
        ObjectAnimator.ofFloat(b.etPromoCode, View.TRANSLATION_X,
            0f, -14f, 14f, -10f, 10f, -6f, 6f, 0f).apply { duration = 400; start() }
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }
}
