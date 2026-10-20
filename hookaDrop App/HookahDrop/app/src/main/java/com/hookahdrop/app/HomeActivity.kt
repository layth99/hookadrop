package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.widget.ImageView
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.GridLayoutManager
import androidx.viewpager2.widget.ViewPager2
import com.hookahdrop.app.adapter.CategoryGridAdapter
import com.hookahdrop.app.adapter.HeroBannerAdapter
import com.hookahdrop.app.adapter.ProductAdapter
import com.hookahdrop.app.data.*
import com.hookahdrop.app.databinding.ActivityHomeBinding
import com.hookahdrop.app.network.ApiClient
import com.hookahdrop.app.ui.BottomNavManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class HomeActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))



    private lateinit var b: ActivityHomeBinding
    private lateinit var session: SessionManager
    private lateinit var productAdapter: ProductAdapter
    private lateinit var categoryAdapter: CategoryGridAdapter
    private lateinit var navManager: BottomNavManager

    private val autoScrollHandler = Handler(Looper.getMainLooper())
    private val autoScrollRunnable = object : Runnable {
        override fun run() {
            if (isFinishing) return
            val count = b.heroBannerPager.adapter?.itemCount ?: return
            if (count == 0) return
            val next = (b.heroBannerPager.currentItem + 1) % count
            b.heroBannerPager.setCurrentItem(next, true)
            autoScrollHandler.postDelayed(this, 6000)
        }
    }

    private val cartListener: () -> Unit = { runOnUiThread { updateCartBadge() } }
    private val favListener: () -> Unit = { runOnUiThread { productAdapter.notifyDataSetChanged() } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityHomeBinding.inflate(layoutInflater)
        setContentView(b.root)

        session = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { session.getUserId() }

        setupHeader()
        setupBenefits()
        setupCategoryGrid()
        setupProductGrid()
        setupHeroBanner()
        setupPromo()
        setupBottomNav()

        CartManager.addListener(cartListener)
        FavoritesManager.addListener(favListener)
        updateCartBadge()

        // Load real data from backend
        loadDataFromBackend()
    }

    override fun onResume() {
        super.onResume()
        updateCartBadge()
        refreshNotificationBadge()
        // Re-apply HOME as the active tab every time the activity comes to foreground.
        // This fixes the case where the nav bar shows Profile selected after navigating
        // back from ProfileActivity via FLAG_ACTIVITY_CLEAR_TOP / SINGLE_TOP (onCreate
        // is skipped, so setupBottomNav() is not called again).
        if (::navManager.isInitialized) {
            navManager.setActive(BottomNavManager.NavTab.HOME)
        }
    }

    override fun onDestroy() {
        autoScrollHandler.removeCallbacks(autoScrollRunnable)
        CartManager.removeListener(cartListener)
        FavoritesManager.removeListener(favListener)
        super.onDestroy()
    }

    // ── Header ────────────────────────────────────────────────────────────────

    private fun setupHeader() {
        b.tvUserName.text = session.getUserName()
        b.btnNotification.setOnClickListener {
            startActivity(Intent(this, NotificationsActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }
    }

    // ── Notification badge ────────────────────────────────────────────────────

    private fun refreshNotificationBadge() {
        val token = session.getJwtToken() ?: return
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    ApiClient.get("/api/notifications/unread-count", token)
                }
                if (response.isSuccess) {
                    val count = response.json().optInt("count", 0)
                    b.notificationDot.visibility =
                        if (count > 0) View.VISIBLE else View.GONE
                }
            } catch (e: Exception) {
                // Non-critical — badge stays as-is
            }
        }
    }

    // ── Hero Banner ───────────────────────────────────────────────────────────

    private fun setupHeroBanner() {
        b.heroBannerPager.adapter = HeroBannerAdapter(DataProvider.heroBanners) { banner ->
            openCategory(banner.categoryId)
        }
        b.heroBannerPager.offscreenPageLimit = 1
        buildIndicators(DataProvider.heroBanners.size)
        b.heroBannerPager.registerOnPageChangeCallback(
            object : ViewPager2.OnPageChangeCallback() {
                override fun onPageSelected(position: Int) = updateIndicators(position)
            }
        )
        autoScrollHandler.postDelayed(autoScrollRunnable, 6000)
    }

    private fun buildIndicators(count: Int) {
        b.bannerIndicators.removeAllViews()
        repeat(count) { i ->
            val dot = View(this).apply {
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    if (i == 0) 20 else 8, 8
                ).also { lp -> lp.setMargins(4, 0, 4, 0) }
                background = ContextCompat.getDrawable(this@HomeActivity,
                    if (i == 0) R.drawable.bg_indicator_active
                    else R.drawable.bg_indicator_inactive)
            }
            b.bannerIndicators.addView(dot)
        }
    }

    private fun updateIndicators(active: Int) {
        for (i in 0 until b.bannerIndicators.childCount) {
            val dot = b.bannerIndicators.getChildAt(i)
            val lp  = dot.layoutParams as android.widget.LinearLayout.LayoutParams
            lp.width = if (i == active) 20 else 8
            dot.layoutParams = lp
            dot.background = ContextCompat.getDrawable(this,
                if (i == active) R.drawable.bg_indicator_active
                else R.drawable.bg_indicator_inactive)
        }
    }

    // ── Benefits ──────────────────────────────────────────────────────────────

    private fun setupBenefits() {
        b.benefitsRow.removeAllViews()
        DataProvider.benefits.forEach { benefit ->
            val v = LayoutInflater.from(this).inflate(R.layout.item_benefit, b.benefitsRow, false)
            v.findViewById<ImageView>(R.id.imgBenefitIcon).setImageResource(benefit.iconRes)
            v.findViewById<TextView>(R.id.tvBenefitTitle).text    = benefit.title
            v.findViewById<TextView>(R.id.tvBenefitSubtitle).text = benefit.subtitle
            b.benefitsRow.addView(v)
        }
    }

    // ── Category Grid ─────────────────────────────────────────────────────────

    private fun setupCategoryGrid() {
        categoryAdapter = CategoryGridAdapter(DataProvider.categories) { cat ->
            openCategoryProducts(cat)
        }
        b.rvCategories.layoutManager = GridLayoutManager(this, 2)
        b.rvCategories.adapter = categoryAdapter
        b.rvCategories.isNestedScrollingEnabled = false
        b.btnViewAllCategories.setOnClickListener { goToCategories() }
    }

    // ── Product Grid ──────────────────────────────────────────────────────────

    private fun setupProductGrid() {
        productAdapter = ProductAdapter(
            products          = DataProvider.products.take(6),
            onProductClick    = { product -> openProductDetail(product.id) },
            onFavoriteChanged = {
                updateCartBadge()
                productAdapter.notifyDataSetChanged()
            },
            onCartChanged     = { updateCartBadge() }
        )
        b.rvProducts.layoutManager = GridLayoutManager(this, 2)
        b.rvProducts.adapter = productAdapter
        b.rvProducts.isNestedScrollingEnabled = false
        b.btnViewAllProducts.setOnClickListener {
            startActivity(Intent(this, PopularProductsActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }
    }

    // ── Load from backend ─────────────────────────────────────────────────────

    private fun loadDataFromBackend() {
        CoroutineScope(Dispatchers.Main).launch {
            // Load categories
            val categories = withContext(Dispatchers.IO) {
                RemoteDataProvider.getCategories()
            }
            if (categories.isNotEmpty()) {
                categoryAdapter = CategoryGridAdapter(categories) { cat ->
                    openCategoryProducts(cat)
                }
                b.rvCategories.adapter = categoryAdapter
            }

            // Load products (popular products for home)
            val products = withContext(Dispatchers.IO) {
                RemoteDataProvider.getPopularProducts()
            }
            if (products.isNotEmpty()) {
                productAdapter.updateProducts(products.take(6))
            }
        }
    }

    // ── Promo ─────────────────────────────────────────────────────────────────

    private fun setupPromo() {
        b.btnPromoShop.setOnClickListener { goToCategories() }
    }

    // ── Cart badge ────────────────────────────────────────────────────────────

    private fun updateCartBadge() {
        val count = CartManager.getTotalCount()
        if (::navManager.isInitialized) navManager.setCartCount(count)
    }

    // ── Bottom nav ────────────────────────────────────────────────────────────

    private fun setupBottomNav() {
        val navView = b.root.findViewById<View>(R.id.bottomNav) ?: return
        navManager = BottomNavManager(navView, BottomNavManager.NavTab.HOME)
        navManager.setCartCount(CartManager.getTotalCount())
        navManager.onTabClick = { tab ->
            when (tab) {
                BottomNavManager.NavTab.HOME -> { /* already here */ }
                BottomNavManager.NavTab.CATEGORIES -> {
                    startActivity(Intent(this, CategoriesActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
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
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun goToCategories() {
        startActivity(Intent(this, CategoriesActivity::class.java))
        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
    }

    private fun openProductDetail(productId: String) {
        startActivity(Intent(this, ProductDetailActivity::class.java).apply {
            putExtra(ProductDetailActivity.EXTRA_PRODUCT_ID, productId)
        })
        overridePendingTransition(0, 0)
    }

    private fun openCategory(categoryId: String) {
        goToCategories()
    }

    private fun openCategoryProducts(cat: Category) {
        startActivity(Intent(this, CategoryProductsActivity::class.java).apply {
            putExtra(CategoryProductsActivity.EXTRA_CATEGORY_ID,   cat.id)
            putExtra(CategoryProductsActivity.EXTRA_CATEGORY_NAME, cat.name)
        })
        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
    }
}
