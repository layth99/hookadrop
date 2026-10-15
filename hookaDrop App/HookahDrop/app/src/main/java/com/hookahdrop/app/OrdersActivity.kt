package com.hookahdrop.app

import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.hookahdrop.app.adapter.OrdersAdapter
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.data.RemoteDataProvider
import com.hookahdrop.app.databinding.ActivityOrdersBinding
import com.hookahdrop.app.network.ApiOrder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class OrdersActivity : BaseProfileActivity() {

    private lateinit var b: ActivityOrdersBinding
    private lateinit var adapter: OrdersAdapter

    private var allOrders      = listOf<ApiOrder>()
    private var activeFilter   = "all"

    private val FILTERS = listOf(
        "all"        to "All",
        "pending"    to "Pending",
        "confirmed"  to "Confirmed",
        "processing" to "Processing",
        "shipped"    to "Shipped",
        "delivered"  to "Delivered"
    )

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(LocaleManager.wrap(base))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityOrdersBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.btnBack.setOnClickListener { navigateBack() }
        b.btnStartShopping.setOnClickListener {
            startActivity(Intent(this, HomeActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            })
            overridePendingTransition(R.anim.nav_exit, R.anim.nav_enter)
        }

        setupAdapter()
        buildFilterTabs()
        setupBottomNav(b.root, 4)
        fadeIn(b.root)
        loadOrders()
    }

    // ── Adapter ───────────────────────────────────────────────────────────────

    private fun setupAdapter() {
        adapter = OrdersAdapter(emptyList()) { order -> openOrderDetail(order) }
        b.rvOrders.layoutManager = LinearLayoutManager(this)
        b.rvOrders.adapter       = adapter
        b.rvOrders.itemAnimator  = null
    }

    // ── Filter tabs ───────────────────────────────────────────────────────────

    private fun buildFilterTabs() {
        val density = resources.displayMetrics.density
        FILTERS.forEach { (key, label) ->
            val tab = TextView(this).apply {
                text    = label
                textSize = 12f
                setTextColor(if (key == activeFilter)
                    ContextCompat.getColor(this@OrdersActivity, R.color.black)
                else
                    ContextCompat.getColor(this@OrdersActivity, R.color.text_secondary))
                setPadding(
                    (14 * density).toInt(), (6 * density).toInt(),
                    (14 * density).toInt(), (6 * density).toInt()
                )
                background = if (key == activeFilter)
                    makeActiveTabBg() else makeInactiveTabBg()

                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { marginEnd = (8 * density).toInt() }
                layoutParams = lp

                setOnClickListener { selectFilter(key) }
                tag = key
            }
            b.filterRow.addView(tab)
        }
    }

    private fun selectFilter(key: String) {
        activeFilter = key
        // Update tab visuals
        for (i in 0 until b.filterRow.childCount) {
            val tab = b.filterRow.getChildAt(i) as? TextView ?: continue
            val isActive = tab.tag == key
            tab.background  = if (isActive) makeActiveTabBg() else makeInactiveTabBg()
            tab.setTextColor(if (isActive)
                ContextCompat.getColor(this, R.color.black)
            else
                ContextCompat.getColor(this, R.color.text_secondary))
        }
        applyFilter()
    }

    private fun applyFilter() {
        val filtered = if (activeFilter == "all") allOrders
                       else allOrders.filter { it.status.lowercase() == activeFilter }
        adapter.updateOrders(filtered)
        if (filtered.isEmpty() && allOrders.isNotEmpty()) {
            b.rvOrders.visibility  = View.GONE
            b.emptyState.visibility = View.VISIBLE
        } else if (filtered.isNotEmpty()) {
            b.rvOrders.visibility  = View.VISIBLE
            b.emptyState.visibility = View.GONE
        }
    }

    private fun makeActiveTabBg(): android.graphics.drawable.GradientDrawable {
        val density = resources.displayMetrics.density
        return android.graphics.drawable.GradientDrawable().apply {
            shape        = android.graphics.drawable.GradientDrawable.RECTANGLE
            cornerRadius = 20f * density
            setColor(ContextCompat.getColor(this@OrdersActivity, R.color.accent_cyan))
        }
    }

    private fun makeInactiveTabBg(): android.graphics.drawable.GradientDrawable {
        val density = resources.displayMetrics.density
        return android.graphics.drawable.GradientDrawable().apply {
            shape        = android.graphics.drawable.GradientDrawable.RECTANGLE
            cornerRadius = 20f * density
            setColor(ContextCompat.getColor(this@OrdersActivity, R.color.card_bg))
            setStroke((1 * density).toInt(),
                ContextCompat.getColor(this@OrdersActivity, R.color.card_border))
        }
    }

    // ── Load orders ───────────────────────────────────────────────────────────

    private fun loadOrders() {
        val userId = session.getUserId() ?: ""
        val token  = session.getJwtToken() ?: ""

        if (userId.isEmpty() || token.isEmpty()) {
            showEmptyState(); return
        }

        b.progressBar.visibility = View.VISIBLE

        CoroutineScope(Dispatchers.Main).launch {
            val orders = withContext(Dispatchers.IO) {
                RemoteDataProvider.getMyOrders(userId, token)
            }
            b.progressBar.visibility = View.GONE

            if (orders.isEmpty()) {
                showEmptyState()
                return@launch
            }

            allOrders = orders.filter { it.status.lowercase() != "cancelled" }
            b.rvOrders.visibility   = View.VISIBLE
            b.emptyState.visibility = View.GONE
            applyFilter()
        }
    }

    // ── Open detail ───────────────────────────────────────────────────────────

    private fun openOrderDetail(order: ApiOrder) {
        val intent = Intent(this, OrderDetailActivity::class.java).apply {
            putExtra("orderId",       order.id)
            putExtra("orderCode",     order.orderId)
            putExtra("status",        order.status)
            putExtra("date",          order.createdAt)
            putExtra("paymentMethod", order.paymentMethod)
            putExtra("isPaid",        order.isPaid)
            putExtra("fullname",      order.fullname)
            putExtra("phone",         order.phone)
            putExtra("email",         order.email)
            putExtra("address",       order.address)
            putExtra("totalPrice",    order.totalPrice)
            putExtra("shippingPrice", order.shippingPrice)
            putExtra("tax",           order.tax)
            putStringArrayListExtra("itemNames",  ArrayList(order.items.map { it.name }))
            putIntegerArrayListExtra("itemQtys",  ArrayList(order.items.map { it.qty }))
            putExtra("itemPrices",    order.items.map { it.price }.toDoubleArray())
        }
        startActivity(intent)
        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
    }

    // ── Empty state ───────────────────────────────────────────────────────────

    private fun showEmptyState() {
        b.progressBar.visibility = View.GONE
        b.rvOrders.visibility    = View.GONE
        b.emptyState.visibility  = View.VISIBLE
    }
}
