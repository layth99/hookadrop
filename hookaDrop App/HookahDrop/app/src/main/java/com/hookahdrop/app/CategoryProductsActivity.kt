package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.GridLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.hookahdrop.app.adapter.ProductAdapter
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.data.DataProvider
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.Product
import com.hookahdrop.app.data.RemoteDataProvider
import com.hookahdrop.app.databinding.ActivityCategoryProductsBinding
import com.hookahdrop.app.databinding.ItemSkeletonProductBinding
import com.hookahdrop.app.ui.BottomNavManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class CategoryProductsActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))




    private lateinit var b: ActivityCategoryProductsBinding
    private lateinit var productAdapter: ProductAdapter
    private lateinit var navManager: BottomNavManager
    private lateinit var session: SessionManager

    private var categoryId   = ""
    private var categoryName = ""

    // Full product list for this category (from DataProvider)
    private var allProducts = listOf<Product>()

    // Active filters
    private var searchQuery  = ""
    private var sortOrder    = SortOrder.DEFAULT
    private var filterNew    = false
    private var filterDiscount = false

    enum class SortOrder {

 DEFAULT, PRICE_LOW, PRICE_HIGH, RATING }

    private val cartListener: () -> Unit = { runOnUiThread { updateCartBadge() } }

    companion object {
        const val EXTRA_CATEGORY_ID   = "category_id"
        const val EXTRA_CATEGORY_NAME = "category_name"
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityCategoryProductsBinding.inflate(layoutInflater)
        setContentView(b.root)

        categoryId   = intent.getStringExtra(EXTRA_CATEGORY_ID)   ?: ""
        categoryName = intent.getStringExtra(EXTRA_CATEGORY_NAME) ?: ""

        session = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { session.getUserId() }

        b.tvCategoryTitle.text = categoryName
        // Start with static fallback, then load from backend
        allProducts = DataProvider.getProductsByCategory(categoryId)

        setupTopBar()
        setupSearch()
        setupFilterButton()
        setupProductGrid()
        setupBottomNav()
        setupEmptyState()

        CartManager.addListener(cartListener)
        updateCartBadge()

        // Show skeleton 200ms then real content
        Handler(Looper.getMainLooper()).postDelayed({ loadFromBackend() }, 200)
    }

    override fun onResume() {
        super.onResume()
        updateCartBadge()
        // Refresh favorites state in adapter
        productAdapter.notifyDataSetChanged()
    }

    override fun onDestroy() {
        CartManager.removeListener(cartListener)
        super.onDestroy()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    // ── Top bar ───────────────────────────────────────────────────────────────

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

    // ── Search ────────────────────────────────────────────────────────────────

    private fun setupSearch() {
        b.etSearch.hint = "Search ${categoryName.lowercase()}…"

        b.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, b: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) {
                searchQuery = s?.toString() ?: ""
                b.btnClearSearch.visibility = if (searchQuery.isNotEmpty()) View.VISIBLE else View.GONE
                applyFilters()
            }
        })

        b.btnClearSearch.setOnClickListener {
            b.etSearch.setText("")
            searchQuery = ""
            b.btnClearSearch.visibility = View.GONE
        }
    }

    // ── Product grid ──────────────────────────────────────────────────────────

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

        // Skeleton: 6 dummy cards in a grid
        b.rvSkeleton.layoutManager = GridLayoutManager(this, 2)
        b.rvSkeleton.adapter = SkeletonAdapter(6)
    }

    // ── Load from backend + show content ──────────────────────────────────────

    private fun loadFromBackend() {
        CoroutineScope(Dispatchers.Main).launch {
            val remote = RemoteDataProvider.getProductsByCategory(categoryId)
            allProducts = remote.ifEmpty {
                DataProvider.getProductsByCategory(categoryId)
            }
            showContent()
        }
    }

    // ── Show real content after skeleton ──────────────────────────────────────

    private fun showContent() {
        b.rvSkeleton.visibility = View.GONE
        applyFilters()
    }

    // ── Apply search + sort + filters ─────────────────────────────────────────

    private fun applyFilters() {
        var result = allProducts

        // Search
        if (searchQuery.isNotBlank()) {
            result = result.filter {
                it.name.contains(searchQuery, ignoreCase = true) ||
                it.description.contains(searchQuery, ignoreCase = true)
            }
        }

        // Badges
        if (filterNew)      result = result.filter { it.isNew }
        if (filterDiscount) result = result.filter { it.discount > 0 }

        // Sort
        result = when (sortOrder) {
            SortOrder.DEFAULT    -> result
            SortOrder.PRICE_LOW  -> result.sortedBy { it.price }
            SortOrder.PRICE_HIGH -> result.sortedByDescending { it.price }
            SortOrder.RATING     -> result.sortedByDescending { it.rating }
        }

        updateUI(result)
    }

    private fun updateUI(filtered: List<Product>) {
        val hasFilters = filterNew || filterDiscount || sortOrder != SortOrder.DEFAULT
        b.filterActiveDot.visibility = if (hasFilters || searchQuery.isNotBlank()) View.VISIBLE else View.GONE

        if (filtered.isEmpty()) {
            b.rvProducts.visibility  = View.GONE
            b.emptyState.visibility  = View.VISIBLE
            b.tvProductCount.visibility = View.GONE
            val hasActiveFilter = searchQuery.isNotBlank() || filterNew || filterDiscount || sortOrder != SortOrder.DEFAULT
            b.btnResetFilters.visibility = if (hasActiveFilter) View.VISIBLE else View.GONE
            b.tvEmptyTitle.text = if (searchQuery.isNotBlank()) "No results for \"$searchQuery\"" else "No products found"
            b.tvEmptySubtitle.text = if (hasActiveFilter) "Try adjusting your search or filters" else "Check back soon for new arrivals"
        } else {
            b.rvProducts.visibility  = View.VISIBLE
            b.emptyState.visibility  = View.GONE
            b.tvProductCount.visibility = View.VISIBLE
            b.tvProductCount.text = "${filtered.size} product${if (filtered.size == 1) "" else "s"}"
            productAdapter.updateProducts(filtered)
        }
    }

    // ── Empty state ───────────────────────────────────────────────────────────

    private fun setupEmptyState() {
        b.btnResetFilters.setOnClickListener {
            searchQuery  = ""
            sortOrder    = SortOrder.DEFAULT
            filterNew    = false
            filterDiscount = false
            b.etSearch.setText("")
            b.filterActiveDot.visibility = View.GONE
            applyFilters()
        }
    }

    // ── Filter bottom sheet ───────────────────────────────────────────────────

    private fun setupFilterButton() {
        b.btnFilter.setOnClickListener { showFilterSheet() }
    }

    private fun showFilterSheet() {
        val dialog = BottomSheetDialog(this, R.style.BottomSheetTheme)
        val view   = LayoutInflater.from(this).inflate(R.layout.sheet_filter, null)
        dialog.setContentView(view)

        // Sort radio group
        val sortOptions = listOf(
            view.findViewById<View>(R.id.sortDefault),
            view.findViewById<View>(R.id.sortPriceLow),
            view.findViewById<View>(R.id.sortPriceHigh),
            view.findViewById<View>(R.id.sortRating)
        )
        val sortTexts = listOf<TextView>(
            view.findViewById(R.id.tvSortDefault),
            view.findViewById(R.id.tvSortPriceLow),
            view.findViewById(R.id.tvSortPriceHigh),
            view.findViewById(R.id.tvSortRating)
        )
        val checkSortViews = listOf<View>(
            view.findViewById(R.id.checkSortDefault),
            view.findViewById(R.id.checkSortPriceLow),
            view.findViewById(R.id.checkSortPriceHigh),
            view.findViewById(R.id.checkSortRating)
        )

        var tempSort       = sortOrder
        var tempNew        = filterNew
        var tempDiscount   = filterDiscount

        fun refreshSortUI() {
            checkSortViews.forEachIndexed { i, check ->
                check.visibility = if (SortOrder.values()[i] == tempSort) View.VISIBLE else View.INVISIBLE
                sortTexts[i].setTextColor(ContextCompat.getColor(this,
                    if (SortOrder.values()[i] == tempSort) R.color.accent_cyan else R.color.white))
            }
        }
        refreshSortUI()

        sortOptions.forEachIndexed { i, row ->
            row.setOnClickListener { tempSort = SortOrder.values()[i]; refreshSortUI() }
        }

        // Toggle filters
        val checkNew      = view.findViewById<View>(R.id.checkFilterNew)
        val checkDiscount = view.findViewById<View>(R.id.checkFilterDiscount)

        fun refreshToggleUI() {
            checkNew.visibility      = if (tempNew)      View.VISIBLE else View.INVISIBLE
            checkDiscount.visibility = if (tempDiscount) View.VISIBLE else View.INVISIBLE
            view.findViewById<TextView>(R.id.tvFilterNew).setTextColor(
                ContextCompat.getColor(this, if (tempNew) R.color.accent_cyan else R.color.white))
            view.findViewById<TextView>(R.id.tvFilterDiscount).setTextColor(
                ContextCompat.getColor(this, if (tempDiscount) R.color.accent_cyan else R.color.white))
        }
        refreshToggleUI()

        view.findViewById<View>(R.id.rowFilterNew).setOnClickListener      { tempNew      = !tempNew;      refreshToggleUI() }
        view.findViewById<View>(R.id.rowFilterDiscount).setOnClickListener { tempDiscount = !tempDiscount; refreshToggleUI() }

        // Buttons
        view.findViewById<View>(R.id.btnApplyFilters).setOnClickListener {
            sortOrder      = tempSort
            filterNew      = tempNew
            filterDiscount = tempDiscount
            applyFilters()
            dialog.dismiss()
        }
        view.findViewById<View>(R.id.btnResetSheet).setOnClickListener {
            tempSort = SortOrder.DEFAULT; tempNew = false; tempDiscount = false
            refreshSortUI(); refreshToggleUI()
        }

        dialog.show()
    }

    // ── Product detail ────────────────────────────────────────────────────────

    private fun openProductDetail(productId: String) {
        val intent = Intent(this, ProductDetailActivity::class.java).apply {
            putExtra(ProductDetailActivity.EXTRA_PRODUCT_ID, productId)
        }
        startActivity(intent)
        overridePendingTransition(0, 0)
    }

    // ── Cart badge ────────────────────────────────────────────────────────────

    private fun updateCartBadge() {
        val count = CartManager.getTotalCount()
        b.tvCartBadge.visibility = if (count > 0) View.VISIBLE else View.GONE
        if (count > 0) b.tvCartBadge.text = if (count > 99) "99+" else count.toString()
        if (::navManager.isInitialized) navManager.setCartCount(count)
    }

    // ── Bottom nav ────────────────────────────────────────────────────────────

    private fun setupBottomNav() {
        val navView = b.root.findViewById<View>(R.id.bottomNav) ?: return
        navManager = BottomNavManager(navView, BottomNavManager.NavTab.CATEGORIES)
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
                    startActivity(Intent(this, CartActivity::class.java))
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                BottomNavManager.NavTab.FAVORITES -> {
                    startActivity(Intent(this, FavoritesActivity::class.java))
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                BottomNavManager.NavTab.PROFILE -> {
                    startActivity(Intent(this, ProfileActivity::class.java))
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
            }
        }
    }

    // ── Skeleton adapter (static placeholder cards) ───────────────────────────

    private inner class SkeletonAdapter(private val count: Int) :
        RecyclerView.Adapter<SkeletonAdapter.SVH>() {



        inner class SVH(val b: ItemSkeletonProductBinding) : RecyclerView.ViewHolder(b.root)

        override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
            SVH(ItemSkeletonProductBinding.inflate(LayoutInflater.from(parent.context), parent, false))

        override fun getItemCount() = count
        override fun onBindViewHolder(holder: SVH, position: Int) {

}
    }
}
