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

    // Listener — CartManager / FavoritesManager run on any thread
    private val favListener: () -> Unit = { runOnUiThread { refreshAll() } }

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityFavoritesBinding.inflate(layoutInflater)
        setContentView(b.root)

        session = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this)

        setupRecyclerView()
        setupHeader()
        setupSearch()
        setupSortButton()
        setupEmptyState()
        setupRetry()
        setupBottomNav()

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
            // Step 1 — warm the product cache if empty so MongoDB IDs can be resolved
            val cache = RemoteDataProvider.getAllCachedProducts()
            if (cache.isEmpty()) {
                withContext(Dispatchers.IO) { RemoteDataProvider.getProducts(forceRefresh = true) }
            }

            // Step 2 — sync backend wishlist if user is logged in
            // getWishlist() returns null on network/API error and a list (possibly empty)
            // on a successful response. We only replace local state when the call succeeded.
            val userId = session.getUserId()
            if (!userId.isNullOrEmpty()) {
                val backendIds = withContext(Dispatchers.IO) {
                    RemoteDataProvider.getWishlist(userId)
                }
                if (backendIds != null) {
                    // Authoritative backend result — replace local set exactly
                    FavoritesManager.replaceAll(backendIds)
                }
                // If backendIds is null (network/API failure), keep local state intact
            }

            // Step 3 — build + display
            loadFavoriteProducts()
            applyFiltersAndDisplay()
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
        if (ids.isEmpty()) {
            favoriteProducts = mutableListOf()
            return
        }

        // Build from whatever is already in the RemoteDataProvider cache
        val allCached = RemoteDataProvider.getAllCachedProducts()

        favoriteProducts = ids.mapNotNull { id ->
            // 1. Remote cache (fastest)
            allCached.find { it.id == id }
                // 2. Static DataProvider (hardcoded products with p1, p2… IDs)
                ?: DataProvider.getProductById(id)
        }.toMutableList()

        // If some IDs could not be resolved (MongoDB IDs not yet in cache),
        // trigger a background fetch so the next refresh shows them
        val missingIds = ids.filter { id ->
            allCached.none { it.id == id } && DataProvider.getProductById(id) == null
        }
        if (missingIds.isNotEmpty()) {
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
        adapter.submitList(products)
    }

    private fun showEmptyState() {
        b.rvFavorites.visibility = View.GONE
        b.errorState.visibility  = View.GONE
        b.emptyState.visibility  = View.VISIBLE
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

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun formatPrice(price: Double): String {
        val rounded = Math.round(price).toInt()
        return if (price == rounded.toDouble()) "\$$rounded" else "\$${"%.2f".format(price)}"
    }
}
