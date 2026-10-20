package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.TextWatcher
import android.view.View
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.LinearLayoutManager
import com.hookahdrop.app.adapter.FavoriteItemAdapter
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.DataProvider
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.Product
import com.hookahdrop.app.data.RemoteDataProvider
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivityFavoritesBinding
import com.hookahdrop.app.ui.BottomNavManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class FavoritesActivity : AppCompatActivity() {

    private lateinit var b: ActivityFavoritesBinding
    private lateinit var session: SessionManager
    private lateinit var adapter: FavoriteItemAdapter
    private lateinit var navManager: BottomNavManager

    // ── Sort options ──────────────────────────────────────────────────────────
    enum class SortOrder {
        RECENTLY_ADDED, PRICE_LOW_HIGH, PRICE_HIGH_LOW, RATING, NAME_AZ, NAME_ZA
    }

    private var currentSort    = SortOrder.RECENTLY_ADDED
    private var searchQuery    = ""
    private var isSearchVisible = false

    // Source-of-truth order (order items were added to favorites)
    private var favoriteProducts = mutableListOf<Product>()

    // Pagination state
    private var currentPage = 1
    private var totalPages = 1
    private val itemsPerPage = 4
    private var allFavoriteProducts = listOf<Product>()

    // Listener — CartManager / FavoritesManager run on any thread
    private val favListener: () -> Unit = { runOnUiThread { refreshAll() } }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityFavoritesBinding.inflate(layoutInflater)
        setContentView(b.root)

        session = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { session.getUserId() }

        setupRecyclerView()
        setupHeader()
        setupSearch()
        setupSortButton()
        setupEmptyState()
        setupRetry()
        setupBottomNav()
        setupPagination()

        FavoritesManager.addListener(favListener)

        // 150 ms skeleton delay for a polished load feel
        Handler(Looper.getMainLooper()).postDelayed({ showFavoritesContent() }, 150)
    }

    override fun onResume() {
        super.onResume()
        updateCartBadge()
        if (::navManager.isInitialized) navManager.setActive(BottomNavManager.NavTab.FAVORITES)
    }

    override fun onDestroy() {
        FavoritesManager.removeListener(favListener)
        super.onDestroy()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    // ── RecyclerView ──────────────────────────────────────────────────────────

    private fun setupRecyclerView() {
        adapter = FavoriteItemAdapter(
            onHeartClick = { product, _ -> handleRemoveFavorite(product) },
            onViewClick  = { product    -> openProductDetail(product.id) },
            onRentClick  = { product    -> handleRent(product) }
        )
        b.rvFavorites.layoutManager = LinearLayoutManager(this)
        b.rvFavorites.adapter       = adapter
        b.rvFavorites.itemAnimator  = null   // we drive animations ourselves
    }

    // ── Data loading ──────────────────────────────────────────────────────────

    /**
     * Called once after the 150 ms skeleton delay.
     * First ensures the product cache is warm, then syncs wishlist from backend,
     * then shows products.
     */
    private fun showFavoritesContent() {
        b.skeletonContainer.visibility = View.GONE

        CoroutineScope(Dispatchers.Main).launch {
            // FIRST: Load and display local favorites immediately
            loadFavoriteProducts()
            applyFiltersAndDisplay()
            android.util.Log.d("FavoritesActivity", "Initial display with ${favoriteProducts.size} local favorites")

            // Step 1 — warm the product cache if empty so MongoDB IDs can be resolved
            val cache = RemoteDataProvider.getAllCachedProducts()
            if (cache.isEmpty()) {
                android.util.Log.d("FavoritesActivity", "Loading products from backend...")
                withContext(Dispatchers.IO) { RemoteDataProvider.getProducts(forceRefresh = true) }
            }

            // Step 2 — sync backend wishlist if user is logged in
            val userId = session.getUserId()
            android.util.Log.d("FavoritesActivity", "Syncing with backend for userId: $userId")
            
            if (!userId.isNullOrEmpty()) {
                val localFavCount = FavoritesManager.getFavoriteIds().size
                val backendIds = withContext(Dispatchers.IO) {
                    RemoteDataProvider.getWishlist(userId)
                }
                android.util.Log.d("FavoritesActivity", "Backend returned: ${backendIds?.size ?: "null"} items")
                
                if (backendIds != null) {
                    // CRITICAL FIX: Only replace if backend has data OR if local is empty
                    if (backendIds.isNotEmpty() || localFavCount == 0) {
                        android.util.Log.d("FavoritesActivity", "Replacing local favorites with backend")
                        FavoritesManager.replaceAll(backendIds)
                    } else {
                        android.util.Log.w("FavoritesActivity", 
                            "Backend empty but local has $localFavCount items - keeping local (backend may not be synced yet)")
                    }
                } else {
                    android.util.Log.w("FavoritesActivity", "Backend sync failed, keeping local favorites")
                }
            } else {
                android.util.Log.w("FavoritesActivity", "User not logged in, skipping backend sync")
            }

            // Step 3 — rebuild + display after sync
            loadFavoriteProducts()
            applyFiltersAndDisplay()
            android.util.Log.d("FavoritesActivity", "Final display with ${favoriteProducts.size} favorites")
        }
    }

    /**
     * Full refresh — called by FavoritesManager listener after any toggle
     * from ANY screen (ProductDetail, Home, Categories, this page).
     */
    private fun refreshAll() {
        if (b.skeletonContainer.visibility == View.VISIBLE) return
        loadFavoriteProducts()
        applyFiltersAndDisplay()
        updateCartBadge()
    }

    /**
     * Resolves the current set of favorited IDs into Product objects.
     * Fetches from backend if not in cache — never silently drops a product.
     */
    private fun loadFavoriteProducts() {
        val ids = FavoritesManager.getFavoriteIds()
        android.util.Log.d("FavoritesActivity", "loadFavoriteProducts() - Found ${ids.size} favorite IDs: ${ids.joinToString()}")
        
        if (ids.isEmpty()) {
            favoriteProducts = mutableListOf()
            android.util.Log.d("FavoritesActivity", "No favorites to load")
            return
        }

        // Build from whatever is already in the RemoteDataProvider cache
        val allCached = RemoteDataProvider.getAllCachedProducts()
        android.util.Log.d("FavoritesActivity", "Cached products: ${allCached.size}")

        favoriteProducts = ids.mapNotNull { id ->
            // 1. Remote cache (fastest)
            allCached.find { it.id == id }
                // 2. Static DataProvider (hardcoded products with p1, p2… IDs)
                ?: DataProvider.getProductById(id)
        }.toMutableList()
        
        android.util.Log.d("FavoritesActivity", "Resolved ${favoriteProducts.size} products from ${ids.size} IDs")

        // If some IDs could not be resolved (MongoDB IDs not yet in cache),
        // trigger a background fetch so the next refresh shows them
        val missingIds = ids.filter { id ->
            allCached.none { it.id == id } && DataProvider.getProductById(id) == null
        }
        if (missingIds.isNotEmpty()) {
            android.util.Log.w("FavoritesActivity", "Missing ${missingIds.size} products from cache, fetching...")
            CoroutineScope(Dispatchers.Main).launch {
                // Force a full product sync to populate the cache
                withContext(Dispatchers.IO) { RemoteDataProvider.getProducts(forceRefresh = true) }
                // Then rebuild the list with the freshly cached products
                loadFavoriteProducts()
                applyFiltersAndDisplay()
            }
        }
    }

    /**
     * Applies current search query + sort order, then updates the UI.
     */
    private fun applyFiltersAndDisplay() {
        // Reset to page 1 when filters or search change
        currentPage = 1
        
        var filtered = if (searchQuery.isBlank()) {
            favoriteProducts.toList()
        } else {
            favoriteProducts.filter { p ->
                p.name.contains(searchQuery, ignoreCase = true) ||
                p.description.contains(searchQuery, ignoreCase = true) ||
                (DataProvider.getCategoryById(p.categoryId)?.name
                    ?.contains(searchQuery, ignoreCase = true) == true)
            }
        }

        filtered = when (currentSort) {
            SortOrder.RECENTLY_ADDED  -> filtered                          // DataProvider order
            SortOrder.PRICE_LOW_HIGH  -> filtered.sortedBy { it.price }
            SortOrder.PRICE_HIGH_LOW  -> filtered.sortedByDescending { it.price }
            SortOrder.RATING          -> filtered.sortedByDescending { it.rating }
            SortOrder.NAME_AZ         -> filtered.sortedBy { it.name }
            SortOrder.NAME_ZA         -> filtered.sortedByDescending { it.name }
        }

        updateItemCount(favoriteProducts.size)

        if (filtered.isEmpty() && searchQuery.isBlank()) {
            showEmptyState()
        } else {
            showList(filtered)
        }
    }

    private fun showList(products: List<Product>) {
        b.emptyState.visibility  = View.GONE
        b.errorState.visibility  = View.GONE
        b.rvFavorites.visibility = View.VISIBLE
        
        // Store all products and calculate pagination
        allFavoriteProducts = products
        totalPages = kotlin.math.ceil(products.size.toDouble() / itemsPerPage).toInt().coerceAtLeast(1)
        
        // Ensure current page is valid
        if (currentPage > totalPages) {
            currentPage = totalPages
        }
        
        // Show paginated items
        val startIndex = (currentPage - 1) * itemsPerPage
        val endIndex = (startIndex + itemsPerPage).coerceAtMost(products.size)
        val pageItems = products.subList(startIndex, endIndex)
        
        adapter.submitList(pageItems)
        updatePaginationUI()
    }

    private fun showEmptyState() {
        b.rvFavorites.visibility = View.GONE
        b.errorState.visibility  = View.GONE
        b.emptyState.visibility  = View.VISIBLE
        b.paginationComponent.paginationContainer.visibility = View.GONE
    }

    // ── Header ────────────────────────────────────────────────────────────────

    private fun setupHeader() {
        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }

        b.btnSearch.setOnClickListener {
            isSearchVisible = !isSearchVisible
            if (isSearchVisible) {
                b.searchBar.visibility = View.VISIBLE
                b.etSearch.requestFocus()
            } else {
                b.searchBar.visibility = View.GONE
                searchQuery = ""
                b.etSearch.setText("")
                b.btnClearSearch.visibility = View.GONE
                applyFiltersAndDisplay()
            }
        }
    }

    // ── Search ────────────────────────────────────────────────────────────────

    private fun setupSearch() {
        b.etSearch.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                searchQuery = s?.toString() ?: ""
                b.btnClearSearch.visibility = if (searchQuery.isNotEmpty()) View.VISIBLE else View.GONE
                applyFiltersAndDisplay()
            }
        })

        b.btnClearSearch.setOnClickListener {
            b.etSearch.setText("")
            searchQuery = ""
            b.btnClearSearch.visibility = View.GONE
        }
    }

    // ── Sort by ───────────────────────────────────────────────────────────────

    private fun setupSortButton() {
        b.btnSortBy.setOnClickListener {
            val options = arrayOf(
                "Recently Added",
                "Price: Low to High",
                "Price: High to Low",
                "Rating",
                "Name: A–Z",
                "Name: Z–A"
            )
            val current = currentSort.ordinal

            AlertDialog.Builder(this)
                .setTitle("Sort by")
                .setSingleChoiceItems(options, current) { dialog, which ->
                    currentSort = SortOrder.values()[which]
                    b.tvSortLabel.text = options[which]
                    applyFiltersAndDisplay()
                    dialog.dismiss()
                }
                .show()
        }
    }

    // ── Favorite removal ──────────────────────────────────────────────────────

    /**
     * Called after the card's remove animation completes.
     * FavoritesManager.toggle() fires the listener → refreshAll() rebuilds list.
     */
    private fun handleRemoveFavorite(product: Product) {
        FavoritesManager.toggle(product.id)   // local toggle → listener → refreshAll()
        // Sync removal to backend wishlist
        val userId = session.getUserId()
        if (!userId.isNullOrEmpty()) {
            CoroutineScope(Dispatchers.IO).launch {
                RemoteDataProvider.removeFromWishlist(userId, product.id)
            }
        }
    }

    // ── View product ──────────────────────────────────────────────────────────

    private fun openProductDetail(productId: String) {
        val intent = Intent(this, ProductDetailActivity::class.java).apply {
            putExtra(ProductDetailActivity.EXTRA_PRODUCT_ID, productId)
        }
        startActivity(intent)
        overridePendingTransition(0, 0)  // ProductDetailActivity handles its own enter animation
    }

    // ── Rent ──────────────────────────────────────────────────────────────────

    /**
     * No dedicated rental flow exists yet in the project.
     * Opens ProductDetailActivity where the user can add to cart as a purchase/rental intent.
     * When a RentalActivity is implemented, replace this with the proper Intent.
     */
    private fun handleRent(product: Product) {
        AlertDialog.Builder(this)
            .setTitle("Rent: ${product.name}")
            .setMessage(
                "Price: ${formatPrice(product.price)}\n\n" +
                "Add to your cart to proceed with the rental. " +
                "You can review the full details on the product page."
            )
            .setPositiveButton("View Details") { _, _ ->
                openProductDetail(product.id)
            }
            .setNegativeButton("Add to Cart") { _, _ ->
                CartManager.addProduct(product)
                updateCartBadge()
                Toast.makeText(this, "${product.name} added to cart", Toast.LENGTH_SHORT).show()
            }
            .setNeutralButton("Cancel", null)
            .show()
    }

    // ── Empty + Error states ──────────────────────────────────────────────────

    private fun setupEmptyState() {
        b.btnExplore.setOnClickListener {
            startActivity(Intent(this, HomeActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            })
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }
    }

    private fun setupRetry() {
        b.btnRetry.setOnClickListener {
            b.errorState.visibility    = View.GONE
            b.skeletonContainer.visibility = View.VISIBLE
            Handler(Looper.getMainLooper()).postDelayed({ showFavoritesContent() }, 150)
        }
    }

    // ── Item count ────────────────────────────────────────────────────────────

    private fun updateItemCount(count: Int) {
        b.tvItemCount.text = "$count item${if (count == 1) "" else "s"} saved"
    }

    // ── Cart badge ────────────────────────────────────────────────────────────

    private fun updateCartBadge() {
        val count = CartManager.getTotalCount()
        if (::navManager.isInitialized) {
            navManager.setCartCount(count)
        }
    }

    // ── Bottom nav ────────────────────────────────────────────────────────────

    private fun setupBottomNav() {
        val navView = b.root.findViewById<View>(R.id.bottomNav) ?: return
        navManager = BottomNavManager(navView, BottomNavManager.NavTab.FAVORITES)
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
                    // Already here — scroll to top
                    b.scrollContent.smoothScrollTo(0, 0)
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
        val endIndex = (startIndex + itemsPerPage).coerceAtMost(allFavoriteProducts.size)
        val pageItems = allFavoriteProducts.subList(startIndex, endIndex)
        
        adapter.submitList(pageItems)
        updatePaginationUI()
        
        // Scroll to top of favorites list when changing pages
        b.scrollContent.smoothScrollTo(0, b.rvFavorites.top)
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
                        this@FavoritesActivity,
                        if (isActive) R.color.white else R.color.text_secondary
                    )
                )
                background = ContextCompat.getDrawable(
                    this@FavoritesActivity,
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

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun formatPrice(price: Double): String {
        val rounded = Math.round(price).toInt()
        return if (price == rounded.toDouble()) "\$$rounded" else "\$${"%.2f".format(price)}"
    }
}
