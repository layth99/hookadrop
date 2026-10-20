package com.hookahdrop.app

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.os.Bundle
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.bumptech.glide.Glide
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.DataProvider
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.RemoteDataProvider
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivityProductDetailBinding
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class ProductDetailActivity : AppCompatActivity() {

    private lateinit var b: ActivityProductDetailBinding
    private lateinit var session: SessionManager

    companion object {
        const val EXTRA_PRODUCT_ID = "product_id"
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityProductDetailBinding.inflate(layoutInflater)
        setContentView(b.root)

        window.setBackgroundDrawableResource(android.R.color.transparent)

        CartManager.init(this)
        FavoritesManager.init(this)
        session = SessionManager(this)
        // Update FavoritesManager with userId provider after session is initialized
        FavoritesManager.init(this) { session.getUserId() }

        val productId = intent.getStringExtra(EXTRA_PRODUCT_ID) ?: run { finish(); return }

        // Try cache / static first for instant display, then fetch from backend
        val cachedProduct = RemoteDataProvider.getProductByIdSync(productId)
            ?: DataProvider.getProductById(productId)

        if (cachedProduct != null) {
            bindProduct(cachedProduct)
            playEnterAnimation()
        }

        // Always fetch fresh data from backend in background
        CoroutineScope(Dispatchers.Main).launch {
            val freshProduct = withContext(Dispatchers.IO) {
                RemoteDataProvider.getProductById(productId)
            }
            if (freshProduct != null && !isFinishing) {
                bindProduct(freshProduct)
                if (cachedProduct == null) playEnterAnimation()
            } else if (cachedProduct == null) {
                // Neither cache nor backend — close
                finish()
            }
        }
    }

    private fun bindProduct(product: com.hookahdrop.app.data.Product) {
        val category = RemoteDataProvider.getCategoryByIdSync(product.categoryId)
            ?: DataProvider.getCategoryById(product.categoryId)

        // Image — Glide for remote, drawable for local
        if (product.isRemote) {
            Glide.with(b.imgProduct.context)
                .load(product.imageUrl)
                .placeholder(R.drawable.ic_hookah_neon)
                .error(R.drawable.ic_hookah_neon)
                .centerInside()
                .into(b.imgProduct)
        } else {
            b.imgProduct.setImageResource(product.imageRes)
        }

        b.tvProductName.text  = product.name
        b.tvProductId.text    = "ID: ${product.id.uppercase()}"
        b.tvCategory.text     = category?.name ?: product.categoryId
        b.tvRating.text       = product.rating.toString()
        b.tvReviewCount.text  = "(${product.reviewCount} reviews)"
        b.tvPrice.text        = "$%.2f".format(product.price)
        b.tvDescription.text  = product.description

        if (product.originalPrice > 0) {
            b.tvOriginalPrice.visibility = View.VISIBLE
            b.tvOriginalPrice.text       = "$%.2f".format(product.originalPrice)
            b.tvOriginalPrice.paintFlags =
                b.tvOriginalPrice.paintFlags or android.graphics.Paint.STRIKE_THRU_TEXT_FLAG
        }
        b.tvDiscount.visibility = if (product.discount > 0) View.VISIBLE else View.GONE
        if (product.discount > 0) b.tvDiscount.text = "-${product.discount}%"
        b.tvNew.visibility = if (product.isNew) View.VISIBLE else View.GONE

        refreshFavIcon(product.id)

        b.btnClose.setOnClickListener { closeWithAnimation() }
        b.backdrop.setOnClickListener { closeWithAnimation() }

        b.btnFavorite.setOnClickListener {
            val nowFav = FavoritesManager.toggle(product.id)
            refreshFavIcon(product.id)
            // Sync to backend wishlist
            val userId = session.getUserId()
            if (!userId.isNullOrEmpty()) {
                CoroutineScope(Dispatchers.IO).launch {
                    if (nowFav) RemoteDataProvider.addToWishlist(userId, product.id)
                    else        RemoteDataProvider.removeFromWishlist(userId, product.id)
                }
            }
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(b.btnFavorite, View.SCALE_X, 1f, 1.3f, 1f),
                    ObjectAnimator.ofFloat(b.btnFavorite, View.SCALE_Y, 1f, 1.3f, 1f)
                )
                duration = 300; interpolator = OvershootInterpolator(2f); start()
            }
        }

        b.btnAddToCart.setOnClickListener {
            CartManager.addProduct(product)
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(b.btnAddToCart, View.SCALE_X, 1f, 0.94f, 1f),
                    ObjectAnimator.ofFloat(b.btnAddToCart, View.SCALE_Y, 1f, 0.94f, 1f)
                )
                duration = 200; start()
            }
            Toast.makeText(this, "${product.name} added to cart", Toast.LENGTH_SHORT).show()
        }
    }

    private fun refreshFavIcon(productId: String) {
        b.imgFavorite.setImageResource(
            if (FavoritesManager.isFavorite(productId)) R.drawable.ic_favorite_filled
            else R.drawable.ic_favorite
        )
    }

    private fun playEnterAnimation() {
        b.backdrop.alpha = 0f
        b.bottomSheet.translationY = 1200f
        val dimBg   = ObjectAnimator.ofFloat(b.backdrop, View.ALPHA, 0f, 1f).apply { duration = 300 }
        val slideUp = ObjectAnimator.ofFloat(b.bottomSheet, View.TRANSLATION_Y, 1200f, 0f).apply {
            duration = 420; interpolator = DecelerateInterpolator(2f)
        }
        AnimatorSet().apply { playTogether(dimBg, slideUp); start() }
    }

    private fun closeWithAnimation() {
        val dimOut    = ObjectAnimator.ofFloat(b.backdrop, View.ALPHA, 1f, 0f).apply { duration = 280 }
        val slideDown = ObjectAnimator.ofFloat(b.bottomSheet, View.TRANSLATION_Y, 0f, 1200f).apply {
            duration = 320; interpolator = android.view.animation.AccelerateInterpolator(2f)
        }
        AnimatorSet().apply {
            playTogether(dimOut, slideDown)
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: android.animation.Animator) {
                    finish(); overridePendingTransition(0, 0)
                }
            })
            start()
        }
    }

    @Suppress("MissingSuperCall")
    override fun onBackPressed() { closeWithAnimation() }
}
