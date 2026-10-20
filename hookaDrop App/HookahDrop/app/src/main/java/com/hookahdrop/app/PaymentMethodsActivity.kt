package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import com.hookahdrop.app.data.PaymentMethod
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivityPaymentMethodsBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class PaymentMethodsActivity : BaseProfileActivity() {

    private lateinit var b: ActivityPaymentMethodsBinding
    private lateinit var sessionMgr: SessionManager
    private val baseUrl = AddPaymentActivity.BASE_URL

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityPaymentMethodsBinding.inflate(layoutInflater)
        setContentView(b.root)
        sessionMgr = SessionManager(this)

        b.btnBack.setOnClickListener { navigateBack() }
        b.btnAddPayment.setOnClickListener {
            startActivity(Intent(this, AddPaymentActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }

        setupBottomNav(b.root, 4)
        refreshCards()
        fadeIn(b.root)
    }

    override fun onResume() {
        super.onResume()
        refreshCards()
    }

    // ── Load cards from backend ───────────────────────────────────────────────

    private fun refreshCards() {
        val token = sessionMgr.getJwtToken()
        if (token == null) { showEmptyState(); return }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val url  = URL("$baseUrl/api/stripe/payment-methods")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "GET"
                    setRequestProperty("Authorization", "Bearer $token")
                    connectTimeout = 10_000
                    readTimeout    = 10_000
                }
                val code = conn.responseCode
                val body = if (code in 200..299) conn.inputStream.bufferedReader().readText() else "[]"
                conn.disconnect()

                val arr  = JSONArray(body)
                val list = (0 until arr.length()).map { i ->
                    val obj = arr.getJSONObject(i)
                    PaymentMethod(
                        id        = obj.optString("_id"),
                        type      = obj.optString("brand").replaceFirstChar { it.uppercase() },
                        last4     = obj.optString("last4"),
                        expiry    = "%02d/%02d".format(
                            obj.optInt("expMonth"),
                            obj.optInt("expYear") % 100
                        ),
                        isDefault = obj.optBoolean("isDefault"),
                    )
                }
                withContext(Dispatchers.Main) { showCards(list) }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { showEmptyState() }
            }
        }
    }

    private fun showCards(methods: List<PaymentMethod>) {
        b.cardsContainer.removeAllViews()
        if (methods.isEmpty()) { showEmptyState(); return }
        b.emptyState.visibility = View.GONE
        methods.forEach { pm -> b.cardsContainer.addView(buildPaymentCard(pm)) }
    }

    private fun showEmptyState() {
        b.cardsContainer.removeAllViews()
        b.emptyState.visibility = View.VISIBLE
    }

    // ── Card view ─────────────────────────────────────────────────────────────

    private fun buildPaymentCard(pm: PaymentMethod): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background  = if (pm.isDefault) getDrawable(R.drawable.bg_address_default)
                          else              getDrawable(R.drawable.bg_payment_card)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 0, dp(12)) }
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }

        // Brand + DEFAULT badge row
        val topRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.CENTER_VERTICAL
        }
        topRow.addView(TextView(this).apply {
            text      = pm.type
            textSize  = 15f
            setTextColor(getColor(R.color.white))
            typeface = android.graphics.Typeface.DEFAULT_BOLD
        })
        topRow.addView(View(this).apply { layoutParams = LinearLayout.LayoutParams(0, 1, 1f) })
        if (pm.isDefault) {
            topRow.addView(TextView(this).apply {
                text = "DEFAULT"
                textSize = 9f
                setTextColor(getColor(R.color.white))
                background = getDrawable(R.drawable.bg_button_blue)
                setPadding(dp(8), dp(2), dp(8), dp(2))
            })
        }
        root.addView(topRow)

        // Masked number
        root.addView(TextView(this).apply {
            text         = "\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${pm.last4}"
            textSize     = 17f
            letterSpacing = 0.1f
            setTextColor(getColor(R.color.white))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, dp(10), 0, dp(4)) }
        })

        // Expiry
        root.addView(TextView(this).apply {
            text     = "Expires ${pm.expiry}"
            textSize = 12f
            setTextColor(getColor(R.color.text_secondary))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 0, dp(12)) }
        })

        // Divider
        root.addView(View(this).apply {
            setBackgroundColor(getColor(R.color.card_border))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(1)
            ).apply { setMargins(0, 0, 0, dp(10)) }
        })

        // Actions
        val actionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity     = Gravity.CENTER_VERTICAL
        }
        actionRow.addView(createBtn("Remove", android.R.color.holo_red_light) { confirmRemove(pm) })
        if (!pm.isDefault) {
            actionRow.addView(createBtn("Set Default", R.color.text_secondary) { setDefaultOnBackend(pm.id) })
        }
        root.addView(actionRow)
        return root
    }

    private fun createBtn(text: String, colorRes: Int, onClick: () -> Unit): Button =
        Button(this).apply {
            this.text = text
            textSize  = 13f
            setTextColor(getColor(colorRes))
            background = null
            isAllCaps  = false
            setPadding(0, 0, dp(16), 0)
            setOnClickListener { onClick() }
        }

    // ── Backend actions ───────────────────────────────────────────────────────

    private fun confirmRemove(pm: PaymentMethod) {
        AlertDialog.Builder(this)
            .setTitle("Remove payment method?")
            .setMessage("\u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 \u2022\u2022\u2022\u2022 ${pm.last4} will be removed from your account.")
            .setPositiveButton("Remove") { _, _ -> deleteOnBackend(pm.id) }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun deleteOnBackend(id: String) {
        val token = sessionMgr.getJwtToken() ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val conn = (URL("$baseUrl/api/stripe/payment-methods/$id")
                    .openConnection() as HttpURLConnection).apply {
                    requestMethod = "DELETE"
                    setRequestProperty("Authorization", "Bearer $token")
                    connectTimeout = 10_000; readTimeout = 10_000
                }
                conn.responseCode; conn.disconnect()
                withContext(Dispatchers.Main) { toast("Payment method removed"); refreshCards() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { toast("Failed to remove. Try again.") }
            }
        }
    }

    private fun setDefaultOnBackend(id: String) {
        val token = sessionMgr.getJwtToken() ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val conn = (URL("$baseUrl/api/stripe/payment-methods/$id/default")
                    .openConnection() as HttpURLConnection).apply {
                    requestMethod = "PUT"
                    setRequestProperty("Authorization", "Bearer $token")
                    setRequestProperty("Content-Type",  "application/json")
                    connectTimeout = 10_000; readTimeout = 10_000
                    doOutput = true
                    OutputStreamWriter(outputStream).use { it.write("{}") }
                }
                conn.responseCode; conn.disconnect()
                withContext(Dispatchers.Main) { toast("Default payment updated"); refreshCards() }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) { toast("Failed to update. Try again.") }
            }
        }
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
