package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.LinearLayoutManager
import com.hookahdrop.app.adapter.CartItemAdapter
import com.hookahdrop.app.data.CartItem
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.DataProvider
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.ProfileDataManager
import com.hookahdrop.app.data.PromoStore
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.data.RemoteDataProvider
import com.hookahdrop.app.ui.BottomNavManager
import com.hookahdrop.app.databinding.ActivityCartBinding
import com.hookahdrop.app.network.ApiClient
import com.hookahdrop.app.network.toProduct
import com.stripe.android.PaymentConfiguration
import com.stripe.android.paymentsheet.PaymentSheet
import com.stripe.android.paymentsheet.PaymentSheetResult
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class CartActivity : AppCompatActivity() {

    private lateinit var b: ActivityCartBinding
    private lateinit var session: SessionManager
    private lateinit var adapter: CartItemAdapter
    private lateinit var navManager: BottomNavManager
    private lateinit var paymentSheet: PaymentSheet

    // Prevent duplicate checkout taps
    private var isCheckingOut = false
    // Order ID created on backend — needed for cancellation on failure
    private var pendingOrderId: String? = null
    private var pendingOrderCode: String? = null
    private var pendingOrderTotal: Double = 0.0

    // Pagination state
    private var currentPage = 1
    private var totalPages = 1
    private val itemsPerPage = 4
    private var allCartItems = listOf<CartItem>()

    // Cart listener — runs on any thread, must dispatch to main
    private val cartListener: () -> Unit = {
        runOnUiThread { refreshAll() }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityCartBinding.inflate(layoutInflater)
        setContentView(b.root)

        session = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { session.getUserId() }

        // Init Stripe PaymentConfiguration (publishable key — safe in APK)
        val pubKey = getString(R.string.stripe_publishable_key).trim()
        if (pubKey.startsWith("pk_")) {
            PaymentConfiguration.init(applicationContext, pubKey)
        }
        // PaymentSheet handles the entire card collection UI
        paymentSheet = PaymentSheet(this, ::onPaymentSheetResult)

        setupRecyclerView()
        setupBottomNav()
        setupCheckoutButton()
        setupSummaryToggle()
        setupContinueShopping()
        setupRetry()
        setupPagination()

        CartManager.addListener(cartListener)

        // Short skeleton delay simulates a real data-load feel (150 ms)
        Handler(Looper.getMainLooper()).postDelayed({ showCartContent() }, 150)
    }

    override fun onResume() {
        super.onResume()
        if (::navManager.isInitialized) navManager.setActive(BottomNavManager.NavTab.CART)
        updateCartBadge()
    }

    override fun onDestroy() {
        CartManager.removeListener(cartListener)
        super.onDestroy()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    // ── RecyclerView ──────────────────────────────────────────────────────────

    private fun setupRecyclerView() {
        adapter = CartItemAdapter(
            onIncrease = { item -> handleIncrease(item) },
            onDecrease = { item -> handleDecrease(item) },
            onRemove   = { item, _ -> handleRemove(item) }
        )
        b.rvCartItems.layoutManager = LinearLayoutManager(this)
        b.rvCartItems.adapter = adapter
        b.rvCartItems.itemAnimator = null   // we handle animation ourselves
    }

    // ── Cart data ─────────────────────────────────────────────────────────────

    /**
     * Transitions: skeleton → (items | empty) state.
     * Called once after the initial 150 ms skeleton delay.
     */
    private fun showCartContent() {
        b.skeletonContainer.visibility = View.GONE
        
        // Load cart from backend if logged in
        if (session.isLoggedIn()) {
            lifecycleScope.launch {
                val token = session.getJwtToken()
                if (token != null) {
                    val loaded = withContext(Dispatchers.IO) {
                        CartManager.loadFromBackend(token)
                    }
                    if (!loaded) {
                        // Failed to load from backend, use local cart
                    }
                }
                displayCart()
            }
        } else {
            displayCart()
        }
    }
    
    private fun displayCart() {
        val items = CartManager.getItems()
        if (items.isEmpty()) showEmptyState() else showItems(items)
        // Refresh prices from backend so cart display matches Stripe charges
        refreshPricesFromBackend()
    }

    /**
     * Full refresh — called every time CartManager fires its listener
     * (after add / remove / qty change from any screen).
     */
    private fun refreshAll() {
        val items = CartManager.getItems()
        if (b.skeletonContainer.visibility == View.VISIBLE) return  // still in skeleton phase

        if (items.isEmpty()) {
            showEmptyState()
        } else {
            showItems(items)
        }
        updateCartBadge()
    }

    /**
     * Refresh product prices from backend so cart display matches Stripe charges.
     * Runs once on cart open — updates CartManager items with real DB prices.
     */
    private fun refreshPricesFromBackend() {
        val items = CartManager.getItems()
        if (items.isEmpty()) return
        lifecycleScope.launch {
            var anyUpdated = false
            for (item in items) {
                try {
                    val serverProduct = withContext(Dispatchers.IO) {
                        RemoteDataProvider.getProductById(item.product.id)
                            ?: resolveProductFromBackend(item.product.name)
                    }
                    if (serverProduct != null && serverProduct.price != item.product.price) {
                        // Update the product price in CartManager
                        val updated = item.product.copy(price = serverProduct.price)
                        CartManager.updatePrice(item.product.id, serverProduct.price)
                        anyUpdated = true
                    }
                } catch (_: Exception) {}
            }
            if (anyUpdated) refreshAll()
        }
    }

    private fun showItems(items: List<CartItem>) {
        b.emptyState.visibility       = View.GONE
        b.errorState.visibility       = View.GONE
        b.rvCartItems.visibility      = View.VISIBLE
        b.summaryCard.visibility      = View.VISIBLE
        b.btnCheckout.isEnabled       = true

        // Store all items and calculate pagination
        allCartItems = items
        totalPages = kotlin.math.ceil(items.size.toDouble() / itemsPerPage).toInt().coerceAtLeast(1)
        
        // Ensure current page is valid
        if (currentPage > totalPages) {
            currentPage = totalPages
        }
        
        // Show paginated items
        val startIndex = (currentPage - 1) * itemsPerPage
        val endIndex = (startIndex + itemsPerPage).coerceAtMost(items.size)
        val pageItems = items.subList(startIndex, endIndex)
        
        adapter.submitList(pageItems)
        rebuildSummary(allCartItems)  // Summary shows ALL items, not just current page
        updateTitleCount(items.sumOf { it.quantity })
        updatePaginationUI()
    }

    private fun showEmptyState() {
        b.rvCartItems.visibility      = View.GONE
        b.summaryCard.visibility      = View.GONE
        b.btnCheckout.isEnabled       = false
        b.emptyState.visibility       = View.VISIBLE
        b.errorState.visibility       = View.GONE
        b.paginationComponent.paginationContainer.visibility = View.GONE
        updateTitleCount(0)
    }

    // ── Summary section ───────────────────────────────────────────────────────

    /**
     * Rebuilds the per-item summary rows and the total line.
     * Uses item_summary_row.xml for perfectly aligned two-column rows:
     *   LEFT  → "N × Product Name"  (truncates if too long)
     *   RIGHT → "14.99 $"           (fixed min-width, never wraps)
     */
    private fun rebuildSummary(items: List<CartItem>) {
        b.summaryItemsContainer.removeAllViews()
        val inflater = LayoutInflater.from(this)
        var total = 0.0

        items.forEach { item ->
            val row = inflater.inflate(R.layout.item_summary_row, b.summaryItemsContainer, false)
            val lineTotal = item.product.price * item.quantity
            row.findViewById<TextView>(R.id.tvSummaryLabel).text  = "${item.quantity} × ${item.product.name}"
            row.findViewById<TextView>(R.id.tvSummaryPrice).text  = formatPrice(lineTotal)
            b.summaryItemsContainer.addView(row)
            total += lineTotal
        }

        // Show promo discount if a code is applied
        PromoStore.init(this)
        if (PromoStore.hasPromo) {
            val discount = PromoStore.discountAmount
            val discountRow = LayoutInflater.from(this).inflate(R.layout.item_summary_row, b.summaryItemsContainer, false)
            discountRow.findViewById<TextView>(R.id.tvSummaryLabel).apply {
                text      = "🎟 ${PromoStore.appliedCode}"
                setTextColor(ContextCompat.getColor(this@CartActivity, R.color.success))
            }
            discountRow.findViewById<TextView>(R.id.tvSummaryPrice).apply {
                text      = "- ${formatPrice(discount)}"
                setTextColor(ContextCompat.getColor(this@CartActivity, R.color.success))
            }
            b.summaryItemsContainer.addView(discountRow)
            total -= discount
            if (total < 0) total = 0.0
        }

        b.tvTotal.text = formatPrice(total)
    }

    // ── Quantity handlers ─────────────────────────────────────────────────────

    private fun handleIncrease(item: CartItem) {
        CartManager.updateQuantity(item.product.id, item.quantity + 1)
        syncCartToBackend()
        // CartManager calls notifyListeners() → cartListener → refreshAll()
    }

    /**
     * Decrease: if qty == 1, confirm removal with a dialog instead of silently deleting.
     */
    private fun handleDecrease(item: CartItem) {
        if (item.quantity <= 1) {
            confirmRemove(item)
        } else {
            CartManager.updateQuantity(item.product.id, item.quantity - 1)
            syncCartToBackend()
        }
    }

    /**
     * Called by the adapter's remove-button animation callback.
     * The item is already visually gone; just update CartManager.
     */
    private fun handleRemove(item: CartItem) {
        CartManager.removeProduct(item.product.id)
        syncCartToBackend()
        // cartListener fires → refreshAll() rebuilds summary + empty state
    }

    private fun confirmRemove(item: CartItem) {
        AlertDialog.Builder(this)
            .setTitle("Remove item?")
            .setMessage("Remove \"${item.product.name}\" from your cart?")
            .setPositiveButton("Remove") { _, _ ->
                CartManager.removeProduct(item.product.id)
                syncCartToBackend()
            }
            .setNegativeButton("Cancel", null)
            .show()
    }
    
    /**
     * Syncs cart to backend MongoDB when user is logged in.
     * Called after any cart modification (add/remove/update quantity).
     */
    private fun syncCartToBackend() {
        if (!session.isLoggedIn()) return
        val token = session.getJwtToken() ?: return
        lifecycleScope.launch {
            withContext(Dispatchers.IO) {
                CartManager.syncToBackend(token)
            }
        }
    }

    // ── Summary toggle ────────────────────────────────────────────────────────

    /**
     * Small chevron button on the summary card header.
     * Tapping it collapses/expands the item rows with a smooth height animation
     * and rotates the chevron icon 180° to indicate state.
     */
    private fun setupSummaryToggle() {
        var summaryExpanded = true   // starts expanded

        b.btnToggleSummary.setOnClickListener {
            summaryExpanded = !summaryExpanded

            // Rotate chevron: 0° = expanded (pointing down), 180° = collapsed (pointing up)
            b.btnToggleSummary.animate()
                .rotation(if (summaryExpanded) 0f else 180f)
                .setDuration(250)
                .start()

            if (summaryExpanded) {
                expandSummaryBody()
            } else {
                collapseSummaryBody()
            }
        }
    }

    private fun expandSummaryBody() {
        val body = b.summaryBody
        body.visibility = View.VISIBLE
        body.measure(
            View.MeasureSpec.makeMeasureSpec(b.summaryCard.width, View.MeasureSpec.AT_MOST),
            View.MeasureSpec.makeMeasureSpec(0, View.MeasureSpec.UNSPECIFIED)
        )
        val targetH = body.measuredHeight
        body.layoutParams.height = 0
        body.requestLayout()

        android.animation.ValueAnimator.ofInt(0, targetH).apply {
            duration = 260
            interpolator = android.view.animation.DecelerateInterpolator()
            addUpdateListener { anim ->
                body.layoutParams.height = anim.animatedValue as Int
                body.requestLayout()
            }
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: android.animation.Animator) {
                    body.layoutParams.height = android.view.ViewGroup.LayoutParams.WRAP_CONTENT
                    body.requestLayout()
                }
            })
            start()
        }
    }

    private fun collapseSummaryBody() {
        val body = b.summaryBody
        val startH = body.height

        android.animation.ValueAnimator.ofInt(startH, 0).apply {
            duration = 220
            interpolator = android.view.animation.AccelerateInterpolator()
            addUpdateListener { anim ->
                body.layoutParams.height = anim.animatedValue as Int
                body.requestLayout()
            }
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: android.animation.Animator) {
                    body.visibility = View.GONE
                    body.layoutParams.height = android.view.ViewGroup.LayoutParams.WRAP_CONTENT
                }
            })
            start()
        }
    }

    // ── Checkout ──────────────────────────────────────────────────────────────

    private fun setupCheckoutButton() {
        b.btnCheckout.setOnClickListener {
            if (isCheckingOut) return@setOnClickListener
            initiateCheckout()
        }
    }

    /**
     * Checkout flow:
     *  1. Auth guard
     *  2. Re-validate products against backend
     *  3. Ask user: Card or Cash on Delivery
     *  4a. Card → POST order (isPaid=false) → POST payment-intent → Stripe confirm
     *  4b. Cash → POST order directly (isPaid=false)
     */
    private fun initiateCheckout() {
        if (!session.isLoggedIn()) {
            Toast.makeText(this, "Please sign in to continue", Toast.LENGTH_SHORT).show()
            startActivity(Intent(this, SignInActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
            return
        }

        // Profile completeness guard
        ProfileDataManager.init(this)
        val missing = mutableListOf<String>()
        if (session.getFirstName().isEmpty()) missing.add("First Name")
        if (session.getLastName().isEmpty()) missing.add("Last Name")
        if (session.getUserName().isEmpty() || session.getUserName() == "Guest") missing.add("Username")
        if (session.getUserEmail().isEmpty()) missing.add("Email Address")
        if (session.getPhone().isEmpty()) missing.add("Phone Number")
        if (ProfileDataManager.getAddresses().isEmpty()) missing.add("Delivery Address")
        if (missing.isNotEmpty()) {
            AlertDialog.Builder(this)
                .setTitle("Complete your profile first")
                .setMessage("Before placing an order, please complete your profile:\n\n• " + missing.joinToString("\n• "))
                .setPositiveButton("Go to Profile") { _, _ ->
                    startActivity(Intent(this, EditProfileActivity::class.java))
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                .setNegativeButton("Cancel", null)
                .show()
            return
        }

        val cartItems = CartManager.getItems()
        if (cartItems.isEmpty()) {
            Toast.makeText(this, "Your cart is empty", Toast.LENGTH_SHORT).show()
            return
        }

        isCheckingOut = true
        b.checkoutOverlay.visibility = View.VISIBLE
        b.btnCheckout.isEnabled = false

        CoroutineScope(Dispatchers.Main).launch {
            // Validate products against backend AND resolve real MongoDB IDs + prices
            val unavailable = mutableListOf<String>()
            var serverTotal = 0.0
            for (item in cartItems) {
                // Try to get the real backend product (by MongoDB ID or by name search)
                var serverProduct = withContext(Dispatchers.IO) {
                    RemoteDataProvider.getProductById(item.product.id)
                }
                // If the ID is a static ID like "p7", the above returns the static product.
                // We need the real DB product — search by name to get real price + ObjectId.
                if (serverProduct == null || !serverProduct.id.matches(Regex("[0-9a-fA-F]{24}"))) {
                    serverProduct = withContext(Dispatchers.IO) {
                        resolveProductFromBackend(item.product.name)
                    }
                }
                if (serverProduct == null) unavailable.add(item.product.name)
                else serverTotal += serverProduct.price * item.quantity
            }

            if (unavailable.isNotEmpty()) {
                b.checkoutOverlay.visibility = View.GONE
                isCheckingOut = false
                b.btnCheckout.isEnabled = true
                AlertDialog.Builder(this@CartActivity)
                    .setTitle("Some items unavailable")
                    .setMessage("The following items are no longer available:\n\n" +
                        unavailable.joinToString("\n• ", prefix = "• "))
                    .setPositiveButton("Remove & Continue") { _, _ ->
                        unavailable.forEach { name ->
                            cartItems.find { it.product.name == name }?.let {
                                CartManager.removeProduct(it.product.id)
                            }
                        }
                        if (CartManager.getItems().isNotEmpty()) initiateCheckout()
                    }
                    .setNegativeButton("Cancel", null)
                    .show()
                return@launch
            }


            b.checkoutOverlay.visibility = View.GONE
            isCheckingOut = false
            b.btnCheckout.isEnabled = true

            // Show payment method selector
            showPaymentMethodDialog(cartItems, serverTotal)
        }
    }

    /** Let user choose: Card (Stripe) or Cash on Delivery */
    private fun showPaymentMethodDialog(cartItems: List<CartItem>, serverTotal: Double) {
        val hasStripe = getString(R.string.stripe_publishable_key).trim().startsWith("pk_")
        val options   = if (hasStripe)
            arrayOf("💳  Pay by Card (Stripe)", "💵  Cash on Delivery")
        else
            arrayOf("💵  Cash on Delivery")

        AlertDialog.Builder(this)
            .setTitle("Choose Payment Method")
            .setItems(options) { _, which ->
                val useCard = hasStripe && which == 0
                isCheckingOut = true
                b.checkoutOverlay.visibility = View.VISIBLE
                b.btnCheckout.isEnabled = false
                CoroutineScope(Dispatchers.Main).launch {
                    postOrderToBackend(cartItems, serverTotal, useCard)
                }
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private suspend fun postOrderToBackend(
        cartItems:   List<CartItem>,
        serverTotal: Double,
        useCard:     Boolean
    ) {
        val token = session.getJwtToken()

        // ── Resolve each cart item to a real MongoDB ObjectId ─────────────────
        // Products from DataProvider have static IDs like "p7".
        // MongoDB requires a 24-char hex ObjectId — we resolve by searching the backend.
        val resolvedItems = mutableListOf<Pair<String, Int>>() // (mongoId, qty)
        val unresolvable  = mutableListOf<String>()

        for (item in cartItems) {
            val mongoId = resolveToMongoId(item.product.id, item.product.name)
            if (mongoId != null) resolvedItems.add(Pair(mongoId, item.quantity))
            else                 unresolvable.add(item.product.name)
        }

        if (unresolvable.isNotEmpty()) {
            b.checkoutOverlay.visibility = View.GONE
            isCheckingOut = false
            b.btnCheckout.isEnabled = true
            AlertDialog.Builder(this)
                .setTitle("Products unavailable")
                .setMessage(
                    "The following products are not available for checkout:\n\n" +
                    unresolvable.joinToString("\n• ", prefix = "• ") +
                    "\n\nPlease remove them from your cart and try again."
                )
                .setPositiveButton("OK", null)
                .show()
            return
        }

        val orderItemsJson = JSONArray()
        resolvedItems.forEach { (mongoId, qty) ->
            orderItemsJson.put(JSONObject().apply {
                put("product", mongoId)
                put("qty",     qty)
            })
        }

        // Apply promo discount to server total
        PromoStore.init(this)
        val discountAmount = if (PromoStore.hasPromo) PromoStore.discountAmount else 0.0
        val finalTotal     = (serverTotal - discountAmount).coerceAtLeast(0.0)

        val body = JSONObject().apply {
            put("orderItems",    orderItemsJson)
            put("totalPrice",    finalTotal)
            put("paymentMethod", if (useCard) "card" else "Cash on Delivery")
            put("fullname",      session.getUserName())
            put("email",         session.getUserEmail())
            put("shippingPrice", 7)
            put("tax",           1)
            if (!session.getUserId().isNullOrEmpty()) put("user", session.getUserId())
            if (PromoStore.hasPromo) {
                put("promoCode",      PromoStore.appliedCode)
                put("discountAmount", discountAmount)
            }
        }

        val response = withContext(Dispatchers.IO) {
            ApiClient.post("/api/orders", body, token)
        }

        if (!response.isSuccess) {
            b.checkoutOverlay.visibility = View.GONE
            isCheckingOut = false
            b.btnCheckout.isEnabled = true
            Toast.makeText(this, "Order failed: ${response.userFriendlyError()}", Toast.LENGTH_LONG).show()
            return
        }

        val orderId   = response.json().optJSONObject("data")?.optString("_id")    ?: ""
        val orderCode = response.json().optJSONObject("data")?.optString("orderId") ?: ""
        pendingOrderId = orderId

        if (!useCard) {
            onOrderSuccess(orderCode, serverTotal)
            return
        }

        // ── Stripe card payment via PaymentSheet ─────────────────────────────
        b.checkoutOverlay.visibility = View.VISIBLE

        val psBody = JSONObject().apply { put("orderId", orderId) }
        val psResp = withContext(Dispatchers.IO) {
            ApiClient.post("/api/stripe/payment-sheet", psBody, token)
        }

        b.checkoutOverlay.visibility = View.GONE
        isCheckingOut = false
        b.btnCheckout.isEnabled = true

        if (!psResp.isSuccess) {
            cancelPendingOrder(orderId, token)
            Toast.makeText(this, "Payment setup failed. Please try again.", Toast.LENGTH_LONG).show()
            return
        }

        val piClientSecret = psResp.json().optString("paymentIntentClientSecret", "")
        val ephemeralKey   = psResp.json().optString("ephemeralKey", "")
        val customerId     = psResp.json().optString("customerId", "")

        if (piClientSecret.isEmpty()) {
            cancelPendingOrder(orderId, token)
            Toast.makeText(this, "Payment setup failed. Please try again.", Toast.LENGTH_LONG).show()
            return
        }

        // Store for use in onPaymentSheetResult
        pendingOrderCode  = orderCode
        pendingOrderTotal = serverTotal

        // Launch Stripe PaymentSheet — handles card entry, 3DS, Apple Pay etc.
        val config = PaymentSheet.Configuration.Builder("HookaDrop")
            .customer(PaymentSheet.CustomerConfiguration(customerId, ephemeralKey))
            .allowsDelayedPaymentMethods(false)
            .build()

        paymentSheet.presentWithPaymentIntent(piClientSecret, config)
    }

    /**
     * Resolves a product ID to its real MongoDB ObjectId.
     * 1. If already a 24-char hex ObjectId → use it directly.
     * 2. Static ID (e.g. "p7") → search backend by exact product name.
     */
    private suspend fun resolveToMongoId(productId: String, productName: String): String? =
        withContext(Dispatchers.IO) {
            if (productId.matches(Regex("[0-9a-fA-F]{24}"))) return@withContext productId
            try {
                val enc = java.net.URLEncoder.encode(productName, "UTF-8")
                val r   = ApiClient.get("/api/products/search?name=$enc")
                if (r.isSuccess) {
                    val arr = r.jsonArray("data")
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        if (obj.optString("name", "").equals(productName, ignoreCase = true)) {
                            val id = obj.optString("_id", "")
                            if (id.matches(Regex("[0-9a-fA-F]{24}"))) return@withContext id
                        }
                    }
                }
            } catch (_: Exception) {}
            null
        }

    /**
     * Fetches the real DB Product (with accurate price) by name search.
     * Used when the cart contains a static DataProvider product with a non-ObjectId ID.
     */
    private suspend fun resolveProductFromBackend(productName: String): com.hookahdrop.app.data.Product? =
        withContext(Dispatchers.IO) {
            try {
                val enc = java.net.URLEncoder.encode(productName, "UTF-8")
                val r   = ApiClient.get("/api/products/search?name=$enc")
                if (r.isSuccess) {
                    val arr = r.jsonArray("data")
                    for (i in 0 until arr.length()) {
                        val obj = arr.optJSONObject(i) ?: continue
                        if (obj.optString("name", "").equals(productName, ignoreCase = true)) {
                            return@withContext obj.toProduct()
                        }
                    }
                }
            } catch (_: Exception) {}
            null
        }

    /**
     * Called by Stripe PaymentSheet when the user completes or cancels payment.
     */
    private fun onPaymentSheetResult(paymentSheetResult: PaymentSheetResult) {
        when (paymentSheetResult) {
            is PaymentSheetResult.Completed -> {
                // PaymentSheet says Completed — verify with backend (Stripe confirms server-side)
                val orderId = pendingOrderId ?: ""
                if (orderId.isNotEmpty()) {
                    b.checkoutOverlay.visibility = View.VISIBLE
                    CoroutineScope(Dispatchers.Main).launch {
                        val token    = session.getJwtToken()
                        val body     = JSONObject().apply { put("orderId", orderId) }
                        val response = withContext(Dispatchers.IO) {
                            ApiClient.post("/api/stripe/confirm-payment", body, token)
                        }
                        b.checkoutOverlay.visibility = View.GONE
                        if (response.isSuccess) {
                            clearCartAndShowSuccess(pendingOrderCode ?: "", pendingOrderTotal)
                        } else {
                            // Stripe verified the payment failed despite Completed callback
                            Toast.makeText(
                                this@CartActivity,
                                "Payment verification failed. Please contact support.",
                                Toast.LENGTH_LONG
                            ).show()
                        }
                    }
                } else {
                    clearCartAndShowSuccess(pendingOrderCode ?: "", pendingOrderTotal)
                }
            }
            is PaymentSheetResult.Canceled -> {
                CoroutineScope(Dispatchers.IO).launch {
                    cancelPendingOrder(pendingOrderId ?: "", session.getJwtToken())
                }
                pendingOrderId    = null
                pendingOrderCode  = null
                pendingOrderTotal = 0.0
                Toast.makeText(this, "Payment cancelled.", Toast.LENGTH_SHORT).show()
            }
            is PaymentSheetResult.Failed -> {
                CoroutineScope(Dispatchers.IO).launch {
                    cancelPendingOrder(pendingOrderId ?: "", session.getJwtToken())
                }
                pendingOrderId    = null
                pendingOrderCode  = null
                pendingOrderTotal = 0.0
                val msg = paymentSheetResult.error.localizedMessage ?: "Payment failed. Please try again."
                Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
            }
        }
    }

    private fun onOrderSuccess(orderCode: String, total: Double) {
        b.checkoutOverlay.visibility = View.GONE
        isCheckingOut = false
        b.btnCheckout.isEnabled = true
        clearCartAndShowSuccess(orderCode, total)
    }

    private fun clearCartAndShowSuccess(orderCode: String, total: Double) {
        CartManager.getItems().map { it.product.id }.forEach { CartManager.removeProduct(it) }
        PromoStore.clear()   // clear applied promo after order
        pendingOrderId = null

        AlertDialog.Builder(this)
            .setTitle("Order placed!")
            .setMessage(
                "Your order has been placed successfully.\n\n" +
                (if (orderCode.isNotEmpty()) "Order: #$orderCode\n\n" else "") +
                "Total: ${formatPrice(total)}\n\n" +
                "You will receive a confirmation shortly."
            )
            .setPositiveButton("View Orders") { _, _ ->
                startActivity(Intent(this, OrdersActivity::class.java))
                overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
            }
            .setNegativeButton("Back to Shop") { _, _ ->
                startActivity(Intent(this, HomeActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                })
                overridePendingTransition(R.anim.nav_exit, R.anim.nav_enter)
            }
            .setCancelable(false)
            .show()
    }

    /**
     * Deletes a pending, unpaid card order when Stripe payment is cancelled or fails.
     * Uses DELETE /api/orders/my-orders/:id — a user-scoped route that only allows
     * deletion of orders that belong to the user AND are still pending + unpaid.
     * The admin-only PUT /api/orders/:id route is intentionally NOT used here.
     */
    private suspend fun cancelPendingOrder(orderId: String, token: String?) {
        if (orderId.isEmpty() || token == null) return
        try {
            ApiClient.delete("/api/orders/my-orders/$orderId", token)
        } catch (_: Exception) {
            // Best-effort — log silently
        }
    }

    // ── Continue Shopping ─────────────────────────────────────────────────────

    private fun setupContinueShopping() {
        b.btnContinueShopping.setOnClickListener {
            startActivity(Intent(this, HomeActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            })
            overridePendingTransition(R.anim.nav_exit, R.anim.nav_enter)
        }
    }

    // ── Error / Retry ─────────────────────────────────────────────────────────

    private fun setupRetry() {
        b.btnRetry.setOnClickListener {
            b.errorState.visibility       = View.GONE
            b.skeletonContainer.visibility = View.VISIBLE
            Handler(Looper.getMainLooper()).postDelayed({ showCartContent() }, 150)
        }
    }

    // ── Pagination ────────────────────────────────────────────────────────────

    private fun setupPagination() {
        b.paginationComponent.btnPrevPage.setOnClickListener {
            if (currentPage > 1) {
                currentPage--
                refreshPagedItems()
            }
        }

        b.paginationComponent.btnNextPage.setOnClickListener {
            if (currentPage < totalPages) {
                currentPage++
                refreshPagedItems()
            }
        }
    }

    private fun refreshPagedItems() {
        // Show items for current page
        val startIndex = (currentPage - 1) * itemsPerPage
        val endIndex = (startIndex + itemsPerPage).coerceAtMost(allCartItems.size)
        val pageItems = allCartItems.subList(startIndex, endIndex)
        
        adapter.submitList(pageItems)
        updatePaginationUI()
        
        // Scroll to top of cart items when changing pages
        b.scrollContent.smoothScrollTo(0, b.rvCartItems.top)
    }

    private fun updatePaginationUI() {
        val pagination = b.paginationComponent
        
        // Show/hide pagination based on total pages
        if (totalPages <= 1) {
            pagination.paginationContainer.visibility = View.GONE
            return
        }
        
        pagination.paginationContainer.visibility = View.VISIBLE
        
        // Update page indicator text
        pagination.tvPageIndicator.text = "Page $currentPage of $totalPages"
        
        // Update Previous arrow button state
        pagination.btnPrevPage.isEnabled = currentPage > 1
        pagination.btnPrevPage.alpha = if (currentPage > 1) 1.0f else 0.3f
        
        // Update Next arrow button state
        pagination.btnNextPage.isEnabled = currentPage < totalPages
        pagination.btnNextPage.alpha = if (currentPage < totalPages) 1.0f else 0.3f
        
        // Build page number buttons
        buildPageNumbers()
    }

    private fun buildPageNumbers() {
        val container = b.paginationComponent.pageNumbersContainer
        container.removeAllViews()
        
        // Determine which page numbers to show
        val maxVisiblePages = 5
        val pageNumbers = mutableListOf<Int>()
        
        when {
            totalPages <= maxVisiblePages -> {
                // Show all pages
                pageNumbers.addAll(1..totalPages)
            }
            currentPage <= 3 -> {
                // Near start: 1 2 3 4 5
                pageNumbers.addAll(1..maxVisiblePages)
            }
            currentPage >= totalPages - 2 -> {
                // Near end: show last 5 pages
                pageNumbers.addAll((totalPages - maxVisiblePages + 1)..totalPages)
            }
            else -> {
                // Middle: show current page ± 2
                pageNumbers.addAll((currentPage - 2)..(currentPage + 2))
            }
        }
        
        // Create button for each page number
        pageNumbers.forEach { pageNum ->
            val isActive = pageNum == currentPage
            val button = TextView(this).apply {
                text = pageNum.toString()
                textSize = 12f
                gravity = android.view.Gravity.CENTER
                setTextColor(
                    ContextCompat.getColor(
                        this@CartActivity,
                        if (isActive) R.color.white else R.color.text_secondary
                    )
                )
                background = ContextCompat.getDrawable(
                    this@CartActivity,
                    if (isActive) R.drawable.bg_page_number_active
                    else R.drawable.bg_page_number_inactive
                )
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    resources.getDimensionPixelSize(R.dimen.page_number_size),
                    resources.getDimensionPixelSize(R.dimen.page_number_size)
                ).apply {
                    setMargins(
                        resources.getDimensionPixelSize(R.dimen.page_number_margin),
                        0,
                        resources.getDimensionPixelSize(R.dimen.page_number_margin),
                        0
                    )
                }
                isClickable = !isActive
                
                if (!isActive) {
                    setOnClickListener {
                        currentPage = pageNum
                        refreshPagedItems()
                    }
                }
            }
            container.addView(button)
        }
    }

    // ── Cart badge ────────────────────────────────────────────────────────────

    /**
     * Updates the badge in the bottom nav and the title counter.
     * Cart tab itself is highlighted (index 2).
     */
    private fun updateCartBadge() {
        val count = CartManager.getTotalCount()
        if (::navManager.isInitialized) {
            navManager.setCartCount(count)
        }
        if (count > 0) {
            b.tvCartCount.visibility = View.VISIBLE
            b.tvCartCount.text = "$count item${if (count == 1) "" else "s"}"
        } else {
            b.tvCartCount.visibility = View.GONE
        }
    }

    private fun updateTitleCount(count: Int) {
        updateCartBadge()
    }

    // ── Bottom nav ────────────────────────────────────────────────────────────

    private fun setupBottomNav() {
        val navView = b.root.findViewById<View>(R.id.bottomNav) ?: return
        navManager = BottomNavManager(navView, BottomNavManager.NavTab.CART)
        navManager.setCartCount(CartManager.getTotalCount())
        navManager.onTabClick = { tab ->
            when (tab) {
                BottomNavManager.NavTab.HOME -> {
                    startActivity(Intent(this, HomeActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                BottomNavManager.NavTab.CATEGORIES -> {
                    startActivity(Intent(this, CategoriesActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                BottomNavManager.NavTab.CART -> {
                    // Already here — gentle scroll to top
                    b.scrollContent.smoothScrollTo(0, 0)
                }
                BottomNavManager.NavTab.FAVORITES -> {
                    startActivity(Intent(this, FavoritesActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                BottomNavManager.NavTab.PROFILE -> {
                    startActivity(Intent(this, ProfileActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
            }
        }
        updateCartBadge()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun formatPrice(price: Double): String {
        val rounded = Math.round(price).toInt()
        return if (price == rounded.toDouble()) "$rounded $" else "${"%.2f".format(price)} $"
    }
}
