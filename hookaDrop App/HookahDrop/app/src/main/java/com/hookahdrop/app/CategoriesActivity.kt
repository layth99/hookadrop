package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.LinearLayoutManager
import com.hookahdrop.app.adapter.CategoryAdapter
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.data.DataProvider
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.RemoteDataProvider
import com.hookahdrop.app.databinding.ActivityCategoriesBinding
import com.hookahdrop.app.ui.BottomNavManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class CategoriesActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))



    private lateinit var b: ActivityCategoriesBinding
    private lateinit var adapter: CategoryAdapter
    private lateinit var session: SessionManager

    private val cartListener: () -> Unit = { updateCartBadge() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityCategoriesBinding.inflate(layoutInflater)
        setContentView(b.root)

        session = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { session.getUserId() }

        setupTopBar()
        setupSearch()
        setupRecyclerView()
        setupPromoBanner()
        setupBottomNav()
        CartManager.addListener(cartListener)
        updateCartBadge()
    }

    // ── Promo banner ──────────────────────────────────────────────────────────
    private fun setupPromoBanner() {
        // Navigate to PromoCodesActivity on click
        b.root.findViewById<View>(R.id.promoBanner)?.setOnClickListener {
            startActivity(android.content.Intent(this, PromoCodesActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }
        // Load first active promo from backend to update banner dynamically
        CoroutineScope(Dispatchers.Main).launch {
            val response = withContext(Dispatchers.IO) {
                com.hookahdrop.app.network.ApiClient.get("/api/promotions/active")
            }
            if (response.isSuccess) {
                val arr   = response.jsonArray("data")
                val promo = arr.optJSONObject(0)
                if (promo != null) {
                    val code  = promo.optString("code", "")
                    val value = promo.optDouble("discountValue", 0.0).toInt()
                    val type  = promo.optString("discountType", "percentage")
                    val label = if (type == "percentage") "$value% OFF" else "$$value OFF"
                    // Update content description for accessibility
                    b.root.findViewById<View>(R.id.promoBanner)
                        ?.contentDescription = "Promo: $label — Code $code"
                }
            }
        }
    }

    // ── Top bar ───────────────────────────────────────────────────────────────
    private fun setupTopBar() {
        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }
    }

    // ── Search ────────────────────────────────────────────────────────────────
    private fun setupSearch() {
        b.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val query = s?.toString() ?: ""
                b.btnClearSearch.visibility = if (query.isNotEmpty()) View.VISIBLE else View.GONE
                adapter.filter(query)
                b.emptyState.visibility =
                    if (adapter.itemCount == 0) View.VISIBLE else View.GONE
                b.rvCategories.visibility =
                    if (adapter.itemCount == 0) View.GONE else View.VISIBLE
            }
        })

        b.btnClearSearch.setOnClickListener {
            b.etSearch.text?.clear()
            b.etSearch.clearFocus()
        }
    }

    // ── RecyclerView ──────────────────────────────────────────────────────────
    private fun setupRecyclerView() {
        adapter = CategoryAdapter { cat ->
            val intent = Intent(this, CategoryProductsActivity::class.java).apply {
                putExtra(CategoryProductsActivity.EXTRA_CATEGORY_ID,   cat.id)
                putExtra(CategoryProductsActivity.EXTRA_CATEGORY_NAME, cat.name)
            }
            startActivity(intent)
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }
        // Start with static fallback immediately so screen isn't blank
        adapter.setAll(DataProvider.categories)
        b.rvCategories.layoutManager = LinearLayoutManager(this)
        b.rvCategories.adapter = adapter

        // Then load real counts from backend
        loadCategoriesFromBackend()
    }

    private fun loadCategoriesFromBackend() {
        CoroutineScope(Dispatchers.Main).launch {
            val remote = withContext(Dispatchers.IO) {
                RemoteDataProvider.getCategories(forceRefresh = true)
            }
            if (remote.isNotEmpty()) {
                // Merge backend counts into DataProvider categories (preserve icons/descriptions)
                val merged = DataProvider.categories.map { static ->
                    // Find matching backend category by name (case-insensitive)
                    val backendCat = remote.firstOrNull {
                        it.name.equals(static.name, ignoreCase = true) ||
                        it.id.equals(static.id, ignoreCase = true)
                    }
                    if (backendCat != null) {
                        static.copy(productCount = backendCat.productCount)
                    } else {
                        static
                    }
                }
                adapter.setAll(merged)
            }
        }
    }

    // ── Cart badge ────────────────────────────────────────────────────────────
    private fun updateCartBadge() {
        val count = CartManager.getTotalCount()
        if (count > 0) {
            b.tvCartBadge.visibility = View.VISIBLE
            b.tvCartBadge.text = if (count > 99) "99+" else count.toString()
        } else {
            b.tvCartBadge.visibility = View.GONE
        }
    }

    // ── Bottom nav ────────────────────────────────────────────────────────────
    private var navManager: BottomNavManager? = null

    private fun setupBottomNav() {
        val navView = b.root.findViewById<View>(R.id.bottomNav) ?: return
        val manager = BottomNavManager(navView, BottomNavManager.NavTab.CATEGORIES)
        navManager = manager
        manager.setCartCount(CartManager.getTotalCount())
        manager.onTabClick = { tab ->
            when (tab) {
                BottomNavManager.NavTab.HOME -> {
                    startActivity(Intent(this, HomeActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                BottomNavManager.NavTab.CATEGORIES -> { /* already here */ }
                BottomNavManager.NavTab.CART -> {
                    startActivity(Intent(this, CartActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
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
        b.btnCartTop.setOnClickListener {
            startActivity(Intent(this, CartActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }
    }

    override fun onResume() {
        super.onResume()
        updateCartBadge()
        navManager?.setActive(BottomNavManager.NavTab.CATEGORIES)
        // Refresh product counts every time user comes back to this screen
        loadCategoriesFromBackend()
    }

    override fun onDestroy() {
        super.onDestroy()
        CartManager.removeListener(cartListener)
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }
}
