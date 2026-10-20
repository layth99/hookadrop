package com.hookahdrop.app

import android.content.Intent
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Bundle
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.hookahdrop.app.adapter.FilterType
import com.hookahdrop.app.adapter.NotificationAdapter
import com.hookahdrop.app.data.AppNotification
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivityNotificationsBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

class NotificationsActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(LocaleManager.wrap(base))

    private lateinit var b: ActivityNotificationsBinding
    private lateinit var session: SessionManager
    private lateinit var adapter: NotificationAdapter

    private var allNotifications = listOf<AppNotification>()
    private var activeFilter     = FilterType.ALL

    // ── Lifecycle ─────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityNotificationsBinding.inflate(layoutInflater)
        setContentView(b.root)

        session = SessionManager(this)

        setupRecyclerView()
        setupSwipeRefresh()
        setupChips()
        setupClickListeners()
        loadNotifications()
    }

    override fun onResume() {
        super.onResume()
        // Only reload if we already have data (avoid double-load on first open)
        if (allNotifications.isNotEmpty()) loadNotifications()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    // ── Setup ─────────────────────────────────────────────────────────────

    private fun setupRecyclerView() {
        adapter = NotificationAdapter(
            items       = emptyList(),
            onItemClick = { notif -> handleNotificationClick(notif) }
        )
        b.rvNotifications.layoutManager = LinearLayoutManager(this)
        b.rvNotifications.adapter       = adapter
        b.rvNotifications.itemAnimator  = null
    }

    private fun setupSwipeRefresh() {
        b.swipeRefresh.setColorSchemeColors(
            ContextCompat.getColor(this, R.color.accent_cyan)
        )
        b.swipeRefresh.setProgressBackgroundColorSchemeColor(
            ContextCompat.getColor(this, R.color.card_bg)
        )
        b.swipeRefresh.setOnRefreshListener { loadNotifications() }
    }

    private fun setupChips() {
        b.chipAll.setOnClickListener      { selectChip(b.chipAll,      FilterType.ALL)      }
        b.chipOrders.setOnClickListener   { selectChip(b.chipOrders,   FilterType.ORDER)    }
        b.chipPayments.setOnClickListener { selectChip(b.chipPayments, FilterType.PAYMENT)  }
        b.chipSecurity.setOnClickListener { selectChip(b.chipSecurity, FilterType.SECURITY) }
        b.chipSystem.setOnClickListener   { selectChip(b.chipSystem,   FilterType.SYSTEM)   }
    }

    private fun setupClickListeners() {
        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }
        b.tvMarkAll.setOnClickListener { markAllRead() }
    }

    // ── Filter chips ──────────────────────────────────────────────────────

    private fun selectChip(selected: TextView, filter: FilterType) {
        if (activeFilter == filter) return
        activeFilter = filter

        val allChips = listOf(b.chipAll, b.chipOrders, b.chipPayments, b.chipSecurity, b.chipSystem)
        allChips.forEach { chip ->
            val isActive = chip === selected
            chip.background = if (isActive) makeActiveChipBg() else makeInactiveChipBg()
            chip.setTextColor(
                if (isActive) ContextCompat.getColor(this, R.color.bg_screen)
                else          ContextCompat.getColor(this, R.color.text_secondary)
            )
            chip.setTypeface(null, if (isActive) Typeface.BOLD else Typeface.NORMAL)
        }

        filterNotifications()
    }

    private fun filterNotifications() {
        val filtered = when (activeFilter) {
            FilterType.ALL      -> allNotifications
            FilterType.ORDER    -> allNotifications.filter { it.type == "order" }
            FilterType.PAYMENT  -> allNotifications.filter { it.type == "payment" }
            FilterType.SECURITY -> allNotifications.filter { it.type in listOf("security", "account") }
            FilterType.SYSTEM   -> allNotifications.filter {
                it.type !in listOf("order", "payment", "security", "account", "promo", "product")
            }
        }
        adapter.updateList(filtered)
        showEmptyOrList(filtered.isEmpty())
    }

    private fun makeActiveChipBg(): GradientDrawable {
        val dp = resources.displayMetrics.density
        return GradientDrawable().apply {
            shape        = GradientDrawable.RECTANGLE
            cornerRadius = 20f * dp
            setColor(ContextCompat.getColor(this@NotificationsActivity, R.color.accent_cyan))
        }
    }

    private fun makeInactiveChipBg(): GradientDrawable {
        val dp = resources.displayMetrics.density
        return GradientDrawable().apply {
            shape        = GradientDrawable.RECTANGLE
            cornerRadius = 20f * dp
            setColor(ContextCompat.getColor(this@NotificationsActivity, R.color.card_bg))
            setStroke(dp.toInt(), ContextCompat.getColor(this@NotificationsActivity, R.color.card_border))
        }
    }

    // ── Load ─────────────────────────────────────────────────────────────

    private fun loadNotifications() {
        val token = session.getJwtToken() ?: run {
            showEmptyOrList(true)
            return
        }

        if (!b.swipeRefresh.isRefreshing) showLoading(true)

        CoroutineScope(Dispatchers.Main).launch {
            val response = withContext(Dispatchers.IO) {
                ApiClient.get("/api/notifications?limit=50", token)
            }

            b.swipeRefresh.isRefreshing = false
            showLoading(false)

            if (response.isSuccess) {
                val json        = response.json()
                val data        = json.optJSONArray("data") ?: run { showEmptyOrList(true); return@launch }
                val unreadCount = json.optInt("unreadCount", 0)

                allNotifications = (0 until data.length()).map { i ->
                    AppNotification.fromJson(data.getJSONObject(i))
                }

                updateUnreadBadge(unreadCount)
                filterNotifications()
            } else {
                showEmptyOrList(true)
            }
        }
    }

    // ── Actions ───────────────────────────────────────────────────────────

    private fun handleNotificationClick(notif: AppNotification) {
        val token = session.getJwtToken()

        // Optimistic local update — mark as read immediately
        if (!notif.isRead) {
            allNotifications = allNotifications.map {
                if (it.id == notif.id) it.copy(isRead = true) else it
            }
            val unreadNow = allNotifications.count { !it.isRead }
            updateUnreadBadge(unreadNow)
            filterNotifications()

            // Persist to backend in background
            if (token != null) {
                CoroutineScope(Dispatchers.IO).launch {
                    try {
                        ApiClient.put("/api/notifications/${notif.id}/read", JSONObject(), token)
                    } catch (_: Exception) { /* non-critical */ }
                }
            }
        }

        // Navigate
        when (notif.entityType) {
            "order" -> {
                if (!notif.entityId.isNullOrEmpty()) {
                    startActivity(Intent(this, OrderDetailActivity::class.java).apply {
                        putExtra("orderId", notif.entityId)
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
            }
            "product" -> {
                if (!notif.entityId.isNullOrEmpty()) {
                    startActivity(Intent(this, ProductDetailActivity::class.java).apply {
                        putExtra(ProductDetailActivity.EXTRA_PRODUCT_ID, notif.entityId)
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
            }
            else -> { /* already updated visually above */ }
        }
    }

    private fun markAllRead() {
        val token = session.getJwtToken() ?: return

        CoroutineScope(Dispatchers.Main).launch {
            val response = withContext(Dispatchers.IO) {
                ApiClient.put("/api/notifications/read-all", JSONObject(), token)
            }
            if (response.isSuccess) {
                allNotifications = allNotifications.map { it.copy(isRead = true) }
                updateUnreadBadge(0)
                filterNotifications()
            }
        }
    }

    // ── UI state helpers ──────────────────────────────────────────────────

    private fun updateUnreadBadge(count: Int) {
        if (count > 0) {
            b.tvUnreadBadge.text       = count.toString()
            b.tvUnreadBadge.visibility = View.VISIBLE
            b.tvMarkAll.visibility     = View.VISIBLE
        } else {
            b.tvUnreadBadge.visibility = View.GONE
            b.tvMarkAll.visibility     = View.GONE
        }
    }

    private fun showLoading(loading: Boolean) {
        b.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
        if (loading) {
            b.emptyState.visibility   = View.GONE
            b.swipeRefresh.visibility = View.GONE
        }
    }

    private fun showEmptyOrList(isEmpty: Boolean) {
        b.progressBar.visibility = View.GONE
        if (isEmpty) {
            b.emptyState.visibility   = View.VISIBLE
            b.swipeRefresh.visibility = View.GONE
        } else {
            b.emptyState.visibility   = View.GONE
            b.swipeRefresh.visibility = View.VISIBLE
        }
    }
}
