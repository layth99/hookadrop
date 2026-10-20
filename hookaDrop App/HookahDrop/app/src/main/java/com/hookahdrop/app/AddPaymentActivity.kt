package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.view.inputmethod.InputMethodManager
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivityAddPaymentBinding
import com.hookahdrop.app.network.ApiClient
import com.stripe.android.ApiResultCallback
import com.stripe.android.PaymentConfiguration
import com.stripe.android.SetupIntentResult
import com.stripe.android.Stripe
import com.stripe.android.model.CardParams
import com.stripe.android.model.ConfirmSetupIntentParams
import com.stripe.android.model.PaymentMethodCreateParams
import com.stripe.android.model.StripeIntent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

/**
 * Add Payment Method — REAL Stripe SetupIntent flow.
 *
 * Security model:
 *  1. Card data enters ONLY via Stripe SDK on-device.
 *  2. Android app calls our backend → GET /api/stripe/setup-intent
 *     Backend creates SetupIntent and returns client_secret.
 *  3. Android confirms SetupIntent with stripe.confirmSetupIntent().
 *     Stripe performs real card verification + 3DS if needed.
 *  4. On success, Android sends only the pm_xxx token to our backend
 *     → POST /api/stripe/save-payment-method
 *     Backend stores: brand, last4, expMonth, expYear — no PAN, no CVV.
 *
 * Raw card numbers NEVER reach our servers.
 */
class AddPaymentActivity : AppCompatActivity() {

    private lateinit var b: ActivityAddPaymentBinding
    private lateinit var session: SessionManager
    private var stripe: Stripe? = null
    private var isProcessing = false

    // ── Config — change BASE_URL to your server address ──────────────────────
    // Emulator → http://10.0.2.2:8000
    // Real device on local network → http://192.168.x.x:8000
    // Production → https://your-api.com
    companion object {
        val BASE_URL: String get() = ApiClient.BASE_URL
    }

    private enum class CardBrand { UNKNOWN, VISA, MASTERCARD, AMEX, DISCOVER }
    private var detectedBrand = CardBrand.UNKNOWN

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityAddPaymentBinding.inflate(layoutInflater)
        setContentView(b.root)

        session = SessionManager(this)
        initStripe()

        setupHeader()
        setupPaymentMethodSelector()
        setupCardNumber()
        setupExpiry()
        setupCvv()
        setupSubmitButton()
    }

    // ── Stripe init ───────────────────────────────────────────────────────────

    private fun initStripe() {
        val key = getString(R.string.stripe_publishable_key).trim()
        if (key.startsWith("pk_")) {
            PaymentConfiguration.init(applicationContext, key)
            stripe = Stripe(applicationContext, key)
        }
    }

    // ── Header ────────────────────────────────────────────────────────────────

    private fun setupHeader() {
        b.btnBack.setOnClickListener {
            if (!isProcessing) {
                finish()
                overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
            }
        }
    }

    // ── Payment method selector ───────────────────────────────────────────────

    private var selectedMethod = "card"

    private fun setupPaymentMethodSelector() {
        setMethodSelected("card")
        b.cardMethodCard.setOnClickListener {
            setMethodSelected("card")
            b.cardForm.visibility     = View.VISIBLE
            b.paypalNotice.visibility = View.GONE
        }
        b.paypalMethodCard.setOnClickListener {
            setMethodSelected("paypal")
            b.cardForm.visibility     = View.GONE
            b.paypalNotice.visibility = View.VISIBLE
        }
    }

    private fun setMethodSelected(method: String) {
        selectedMethod = method
        val cyan    = ContextCompat.getColor(this, R.color.accent_cyan)
        val density = resources.displayMetrics.density
        val unselBg = ContextCompat.getDrawable(this, R.drawable.bg_payment_method_selector)

        fun selectedBg() = android.graphics.drawable.GradientDrawable().apply {
            shape        = android.graphics.drawable.GradientDrawable.RECTANGLE
            cornerRadius = 12f * density
            setStroke((2f * density).toInt(), cyan)
            setColor(0x1A00BFFF)
        }

        b.cardMethodCard.background    = if (method == "card")   selectedBg() else unselBg
        b.paypalMethodCard.background  = if (method == "paypal") selectedBg() else unselBg
    }

    // ── Card number ───────────────────────────────────────────────────────────

    private fun setupCardNumber() {
        b.etCardNumber.addTextChangedListener(object : TextWatcher {
            private var isFormatting = false
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, bef: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) {
                if (isFormatting) return
                isFormatting = true
                val raw = s.toString().replace(" ", "")
                val fmt = StringBuilder()
                for (i in raw.indices) {
                    if (i > 0 && i % 4 == 0 && i < 16) fmt.append(' ')
                    fmt.append(raw[i])
                }
                b.etCardNumber.setText(fmt.toString())
                b.etCardNumber.setSelection(fmt.length)
                isFormatting = false
                detectedBrand = detectBrand(raw)
                updateBrandIcon(detectedBrand)
                if (raw.length >= 4) hideError(b.tvCardNumberError)
            }
        })
        b.etCardNumber.setOnFocusChangeListener { v, f ->
            setInputFocus(v, f); if (!f) validateCardNumber()
        }
    }

    private fun detectBrand(raw: String) = when {
        raw.startsWith("4")                                                -> CardBrand.VISA
        raw.length >= 2 && raw.substring(0, 2).toIntOrNull()
            ?.let { it in 51..55 } == true                                 -> CardBrand.MASTERCARD
        raw.startsWith("34") || raw.startsWith("37")                       -> CardBrand.AMEX
        raw.startsWith("6")                                                -> CardBrand.DISCOVER
        else                                                               -> CardBrand.UNKNOWN
    }

    private fun updateBrandIcon(brand: CardBrand) {
        if (brand == CardBrand.UNKNOWN) { b.imgCardBrand.visibility = View.GONE; return }
        b.imgCardBrand.visibility = View.VISIBLE
        b.imgCardBrand.setImageResource(R.drawable.ic_credit_card)
        b.imgCardBrand.setColorFilter(when (brand) {
            CardBrand.VISA       -> ContextCompat.getColor(this, R.color.accent_cyan)
            CardBrand.MASTERCARD -> 0xFFFF6600.toInt()
            CardBrand.AMEX       -> 0xFF2E77BC.toInt()
            CardBrand.DISCOVER   -> 0xFFFF6000.toInt()
            else                 -> 0xFFFFFFFF.toInt()
        })
    }

    private fun luhn(number: String): Boolean {
        if (number.any { !it.isDigit() }) return false
        var sum = 0; var alt = false
        for (i in number.length - 1 downTo 0) {
            var n = number[i].digitToInt()
            if (alt) { n *= 2; if (n > 9) n -= 9 }
            sum += n; alt = !alt
        }
        return sum % 10 == 0
    }

    private fun validateCardNumber(): Boolean {
        val raw = b.etCardNumber.text.toString().replace(" ", "")
        return when {
            raw.isEmpty()   -> { showError(b.tvCardNumberError, "Card number is required"); false }
            raw.length < 13 -> { showError(b.tvCardNumberError, "Card number is too short"); false }
            !luhn(raw)      -> { showError(b.tvCardNumberError, "Card number format looks invalid"); false }
            else            -> { hideError(b.tvCardNumberError); true }
        }
    }

    // ── Expiry ────────────────────────────────────────────────────────────────

    private fun setupExpiry() {
        b.etExpiry.addTextChangedListener(object : TextWatcher {
            private var isFormatting = false
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, bef: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) {
                if (isFormatting) return
                isFormatting = true
                val raw = s.toString().replace("/", "")
                val fmt = if (raw.length >= 2) raw.substring(0, 2) + "/" + raw.substring(2) else raw
                b.etExpiry.setText(fmt); b.etExpiry.setSelection(fmt.length)
                isFormatting = false
                if (raw.length >= 2) hideError(b.tvExpiryError)
            }
        })
        b.etExpiry.setOnFocusChangeListener { v, f ->
            setInputFocus(v, f); if (!f) validateExpiry()
        }
    }

    private fun validateExpiry(): Boolean {
        val parts = b.etExpiry.text.toString().split("/")
        if (parts.size != 2 || parts[0].length != 2 || parts[1].length != 2) {
            showError(b.tvExpiryError, "Enter expiry as MM/YY"); return false
        }
        val month = parts[0].toIntOrNull() ?: 0
        val year  = (parts[1].toIntOrNull() ?: 0) + 2000
        if (month < 1 || month > 12) { showError(b.tvExpiryError, "Invalid month"); return false }
        val cal = java.util.Calendar.getInstance()
        val cy  = cal.get(java.util.Calendar.YEAR)
        val cm  = cal.get(java.util.Calendar.MONTH) + 1
        if (year < cy || (year == cy && month < cm)) {
            showError(b.tvExpiryError, "This card has expired"); return false
        }
        hideError(b.tvExpiryError); return true
    }

    // ── CVV ───────────────────────────────────────────────────────────────────

    private fun setupCvv() {
        b.etCvv.setOnFocusChangeListener { v, f ->
            setInputFocus(v, f); if (!f) validateCvv()
        }
    }

    private fun validateCvv(): Boolean {
        val cvv = b.etCvv.text.toString()
        val len = if (detectedBrand == CardBrand.AMEX) 4 else 3
        return when {
            cvv.isEmpty()    -> { showError(b.tvCvvError, "CVV is required"); false }
            cvv.length < len -> { showError(b.tvCvvError, "CVV must be $len digits"); false }
            else             -> { hideError(b.tvCvvError); true }
        }
    }

    // ── Submit ────────────────────────────────────────────────────────────────

    private fun setupSubmitButton() {
        b.btnSubmit.setOnClickListener {
            if (isProcessing) return@setOnClickListener
            if (selectedMethod != "card") {
                Toast.makeText(this, "Please select Card to proceed.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            hideKeyboard()
            val ok = validateCardNumber() and validateName() and validateExpiry() and validateCvv()
            if (!ok) return@setOnClickListener
            startSetupIntentFlow()
        }
    }

    private fun validateName(): Boolean {
        val name = b.etCardName.text.toString().trim()
        return when {
            name.isEmpty()  -> { showError(b.tvCardNameError, "Cardholder name is required"); false }
            name.length < 2 -> { showError(b.tvCardNameError, "Enter full name"); false }
            else            -> { hideError(b.tvCardNameError); true }
        }
    }

    // ── Real Stripe SetupIntent flow ──────────────────────────────────────────

    /**
     * Step 1 — Ask our backend to create a SetupIntent.
     *           Backend returns client_secret.
     * Step 2 — Confirm SetupIntent with Stripe SDK.
     *           Stripe verifies the card + triggers 3DS if needed.
     * Step 3 — On success, notify backend to save safe metadata.
     */
    private fun startSetupIntentFlow() {
        val stripeInstance = stripe ?: run {
            Toast.makeText(this,
                "Stripe not configured. Add your publishable key to stripe_config.xml.",
                Toast.LENGTH_LONG).show()
            return
        }

        isProcessing = true
        setProcessing(true, "Connecting to server…")

        val jwtToken = session.getJwtToken() ?: run {
            setProcessing(false)
            Toast.makeText(this, "Please sign in to add a payment method.", Toast.LENGTH_LONG).show()
            return
        }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                // ── Step 1: get SetupIntent client_secret from our backend ────
                val clientSecret = fetchSetupIntentClientSecret(jwtToken)

                withContext(Dispatchers.Main) {
                    setProcessing(true, "Verifying card with Stripe…")
                }

                // ── Step 2: build card params (Stripe SDK — no raw data to server) ─
                val rawNumber = b.etCardNumber.text.toString().replace(" ", "")
                val expiryParts = b.etExpiry.text.toString().split("/")
                val expMonth = expiryParts[0].toInt()
                val expYear  = expiryParts[1].toInt() + 2000
                val name     = b.etCardName.text.toString().trim()
                val cvv      = b.etCvv.text.toString()
                val save     = b.switchSaveCard.isChecked

                val cardParams = CardParams(
                    number   = rawNumber,
                    expMonth = expMonth,
                    expYear  = expYear,
                    cvc      = cvv,
                    name     = name
                )
                val pmParams = PaymentMethodCreateParams.createCard(cardParams)

                // ── Step 3: confirm SetupIntent — Stripe handles 3DS ─────────
                val confirmParams = ConfirmSetupIntentParams.create(
                    paymentMethodCreateParams = pmParams,
                    clientSecret              = clientSecret
                )

                // Must run on main thread
                withContext(Dispatchers.Main) {
                    stripeInstance.confirmSetupIntent(this@AddPaymentActivity, confirmParams)
                    // Result handled in onActivityResult via stripe.onSetupResult()
                }

            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    setProcessing(false)
                    handleError(e)
                }
            }
        }
    }

    /**
     * Handles the result from Stripe's 3DS / SetupIntent confirmation.
     * Stripe redirects back to this activity after authentication.
     */
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)

        stripe?.onSetupResult(requestCode, data, object :
            ApiResultCallback<SetupIntentResult> {

            override fun onSuccess(result: SetupIntentResult) {
                val si = result.intent
                when (si.status) {
                    StripeIntent.Status.Succeeded -> {
                        val pmId = si.paymentMethodId ?: ""
                        if (pmId.isNotEmpty()) {
                            notifyBackendAndFinish(pmId)
                        } else {
                            setProcessing(false)
                            showStatus("Card verified but could not be saved. Try again.", error = true)
                        }
                    }
                    StripeIntent.Status.Canceled -> {
                        setProcessing(false)
                        showStatus("Card verification was cancelled.", error = true)
                    }
                    else -> {
                        setProcessing(false)
                        showStatus("Card verification failed. Please try again.", error = true)
                    }
                }
            }

            override fun onError(e: Exception) {
                setProcessing(false)
                handleError(e)
            }
        }) ?: super.onActivityResult(requestCode, resultCode, data)
    }

    /**
     * Step 4 — Tell our backend to store safe card metadata.
     * Backend receives only: paymentMethodId (pm_xxx), cardholderName, setAsDefault.
     * Backend calls Stripe to retrieve brand/last4 — never trusts client.
     */
    private fun notifyBackendAndFinish(paymentMethodId: String) {
        val jwtToken = session.getJwtToken() ?: return
        val name     = b.etCardName.text.toString().trim()
        val setDef   = b.switchSaveCard.isChecked

        setProcessing(true, "Saving payment method…")

        CoroutineScope(Dispatchers.IO).launch {
            try {
                val body = JSONObject().apply {
                    put("paymentMethodId", paymentMethodId)
                    put("cardholderName",  name)
                    put("setAsDefault",    setDef)
                }
                postJson("$BASE_URL/api/stripe/save-payment-method", body.toString(), jwtToken)

                withContext(Dispatchers.Main) {
                    setProcessing(false)
                    Toast.makeText(this@AddPaymentActivity,
                        "Card added successfully!", Toast.LENGTH_SHORT).show()
                    startActivity(Intent(this@AddPaymentActivity, PaymentMethodsActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_exit, R.anim.nav_enter)
                    finish()
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    setProcessing(false)
                    // Card WAS verified by Stripe — show partial success
                    Toast.makeText(this@AddPaymentActivity,
                        "Card verified but could not be saved to server. Check your connection.",
                        Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    // ── HTTP helpers ──────────────────────────────────────────────────────────

    private fun fetchSetupIntentClientSecret(jwtToken: String): String {
        val url  = URL("$BASE_URL/api/stripe/setup-intent")
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type",  "application/json")
            setRequestProperty("Authorization", "Bearer $jwtToken")
            connectTimeout = 15_000
            readTimeout    = 15_000
            doOutput       = true
            OutputStreamWriter(outputStream).use { it.write("{}") }
        }
        val code     = conn.responseCode
        val response = if (code in 200..299) conn.inputStream.bufferedReader().readText()
                       else conn.errorStream?.bufferedReader()?.readText() ?: ""
        conn.disconnect()
        if (code != 200) throw Exception("Server error $code: $response")
        return JSONObject(response).getString("clientSecret")
    }

    private fun postJson(urlStr: String, body: String, jwtToken: String) {
        val url  = URL(urlStr)
        val conn = (url.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            setRequestProperty("Content-Type",  "application/json")
            setRequestProperty("Authorization", "Bearer $jwtToken")
            connectTimeout = 15_000
            readTimeout    = 15_000
            doOutput       = true
            OutputStreamWriter(outputStream).use { it.write(body) }
        }
        val code = conn.responseCode
        val resp = if (code in 200..299) conn.inputStream.bufferedReader().readText()
                   else conn.errorStream?.bufferedReader()?.readText() ?: ""
        conn.disconnect()
        if (code !in 200..299) throw Exception("Server error $code: $resp")
    }

    // ── Error handling ────────────────────────────────────────────────────────

    private fun handleError(e: Exception) {
        val msg = when {
            e.message?.contains("card_declined",     ignoreCase = true) == true -> "Your card was declined."
            e.message?.contains("expired_card",      ignoreCase = true) == true -> "Your card has expired."
            e.message?.contains("incorrect_cvc",     ignoreCase = true) == true -> "Incorrect CVV."
            e.message?.contains("incorrect_number",  ignoreCase = true) == true -> "Card number is incorrect."
            e.message?.contains("insufficient_funds",ignoreCase = true) == true -> "Insufficient funds."
            e.message?.contains("network",           ignoreCase = true) == true -> "Network error. Check your connection."
            e.message?.contains("Server error 401",  ignoreCase = true) == true -> "Session expired. Please sign in again."
            else -> "Unable to verify your card. Please try again."
        }
        showStatus(msg, error = true)
    }

    // ── UI helpers ────────────────────────────────────────────────────────────

    private fun showStatus(msg: String, error: Boolean) {
        b.tvStatus.visibility = View.VISIBLE
        b.tvStatus.text = msg
        b.tvStatus.setTextColor(
            if (error) ContextCompat.getColor(this, R.color.input_border_error)
            else       ContextCompat.getColor(this, R.color.accent_cyan)
        )
        b.btnSubmit.isEnabled = true
    }

    private fun setProcessing(show: Boolean, msg: String = "Verifying card…") {
        isProcessing = show
        runOnUiThread {
            b.processingOverlay.visibility = if (show) View.VISIBLE else View.GONE
            b.tvProcessingMsg.text = msg
            b.btnSubmit.isEnabled  = !show
        }
    }

    private fun setInputFocus(view: View, focused: Boolean) {
        view.parent?.let { p ->
            if (p is android.view.ViewGroup) {
                p.background = ContextCompat.getDrawable(this,
                    if (focused) R.drawable.bg_card_input_focused else R.drawable.bg_card_input)
            }
        }
    }

    private fun showError(tv: android.widget.TextView, msg: String) { tv.text = msg; tv.visibility = View.VISIBLE }
    private fun hideError(tv: android.widget.TextView) { tv.visibility = View.GONE }

    private fun hideKeyboard() {
        (getSystemService(INPUT_METHOD_SERVICE) as InputMethodManager)
            .hideSoftInputFromWindow(b.btnSubmit.windowToken, 0)
    }

    override fun onBackPressed() {
        if (!isProcessing) {
            super.onBackPressed()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }
    }
}
