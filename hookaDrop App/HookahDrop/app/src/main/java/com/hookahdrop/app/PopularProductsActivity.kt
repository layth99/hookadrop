package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.recyclerview.widget.GridLayoutManager
import com.hookahdrop.app.adapter.ProductAdapter
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.RemoteDataProvider
import com.hookahdrop.app.databinding.ActivityPopularProductsBinding
import com.hookahdrop.app.ui.BottomNavManager
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class PopularProductsActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))

    private lateinit var b: ActivityPopularProductsBinding
    private lateinit var productAdapter: ProductAdapter
    private lateinit var navManager: BottomNavManager
    private lateinit var session: SessionManager

    private val cartListener: () -> Unit = { runOnUiThread { updateCartBadge() } }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityPopularProductsBinding.inflate(layoutInflater)
        setContentView(b.root)

        session = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { session.getUserId() }

        setupTopBar()
        setupProductGrid()
        setupBottomNav()
        CartManager.addListener(cartListener)
        updateCartBadge()
        loadPopularProducts()
    }

    override fun onResume() {
        super.onResume()
        updateCartBadge()
        if (::productAdapter.isInitialized) productAdapter.notifyDataSetChanged()
    }

    override fun onDestroy() {
        CartManager.removeListener(cartListener)
        super.onDestroy()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    private fun setupTopBar() {
        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }
        b.btnCartTop.setOnClickListener {
            startActivity(Intent(this, CartActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }
    }

    private fun setupProductGrid() {
        productAdapter = ProductAdapter(
            products          = emptyList(),
            onProductClick    = { product -> openProductDetail(product.id) },
            onFavoriteChanged = { updateCartBadge() },
            onCartChanged     = { updateCartBadge() }
        )
        b.rvProducts.layoutManager = GridLayoutManager(this, 2)
        b.rvProducts.adapter = productAdapter
        b.rvProducts.itemAnimator = null
    }

    private fun loadPopularProducts() {
        b.progressBar.visibility = View.VISIBLE
        b.rvProducts.visibility  = View.GONE
        b.emptyState.visibility  = View.GONE

        lifecycleScope.launch {
            val products = withContext(Dispatchers.IO) {
                RemoteDataProvider.getPopularProducts()
            }
            b.progressBar.visibility = View.GONE
            if (products.isNotEmpty()) {
                productAdapter.updateProducts(products.take(15))
                b.rvProducts.visibility = View.VISIBLE
            } else {
                b.emptyState.visibility = View.VISIBLE
            }
        }
    }

    private fun openProductDetail(productId: String) {
        startActivity(Intent(this, ProductDetailActivity::class.java).apply {
            putExtra(ProductDetailActivity.EXTRA_PRODUCT_ID, productId)
        })
        overridePendingTransition(0, 0)
    }

    private fun updateCartBadge() {
        val count = CartManager.getTotalCount()
        b.tvCartBadge.visibility = if (count > 0) View.VISIBLE else View.GONE
        if (count > 0) b.tvCartBadge.text = if (count > 99) "99+" else count.toString()
        if (::navManager.isInitialized) navManager.setCartCount(count)
    }

    private fun setupBottomNav() {
        val navView = b.root.findViewById<View>(R.id.bottomNav) ?: return
        navManager = BottomNavManager(navView, BottomNavManager.NavTab.HOME)
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
}
