package com.hookahdrop.app.adapter

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.graphics.drawable.GradientDrawable
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateInterpolator
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.hookahdrop.app.R
import com.hookahdrop.app.data.DataProvider
import com.hookahdrop.app.data.Product
import com.hookahdrop.app.databinding.ItemFavoriteBinding

/**
 * Displays favorite products as horizontal cards.
 *
 * Sorting is applied externally before [submitList] is called.
 * Removal uses fade-out (200 ms) → height-collapse (250 ms) animation.
 */
class FavoriteItemAdapter(
    private val onHeartClick : (Product, Int) -> Unit,  // toggle favorite
    private val onViewClick  : (Product)     -> Unit,   // open product detail
    private val onRentClick  : (Product)     -> Unit    // start rental flow
) : RecyclerView.Adapter<FavoriteItemAdapter.VH>() {

    private val items = mutableListOf<Product>()

    inner class VH(val b: ItemFavoriteBinding) : RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemFavoriteBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val product  = items[position]
        val context  = holder.b.root.context
        val category = com.hookahdrop.app.data.RemoteDataProvider.getCategoryByIdSync(product.categoryId)
            ?: com.hookahdrop.app.data.DataProvider.getCategoryById(product.categoryId)

        with(holder.b) {
            // Image — Glide for remote, drawable for local
            if (product.isRemote) {
                Glide.with(imgFavProduct.context)
                    .load(product.imageUrl)
                    .placeholder(R.drawable.ic_hookah_neon)
                    .error(R.drawable.ic_hookah_neon)
                    .centerInside()
                    .into(imgFavProduct)
            } else {
                imgFavProduct.setImageResource(product.imageRes)
            }

            // Text fields
            tvFavName.text     = product.name
            tvFavCategory.text = category?.name ?: product.categoryId
            tvFavRating.text   = product.rating.toString()
            tvFavPrice.text    = formatPrice(product.price)

            // Star display — filled stars rounded to nearest 0.5
            tvRatingStars.text = buildStars(product.rating)

            // Availability — all products in DataProvider are available by default
            val available = true   // extend with product.isAvailable when model supports it
            tvAvailability.text = if (available) "Available" else "Unavailable"
            tvAvailability.setTextColor(
                ContextCompat.getColor(context,
                    if (available) R.color.text_secondary else R.color.input_border_error)
            )
            // Availability dot colour
            val dotDrawable = dotAvailability.background.mutate() as? GradientDrawable
            dotDrawable?.setColor(
                ContextCompat.getColor(context,
                    if (available) android.R.color.holo_green_light
                    else R.color.input_border_error)
            )

            // Rent button disabled if unavailable
            btnRent.isEnabled = available

            // Heart — always filled cyan here (this IS the favorites page)
            btnHeart.setImageResource(R.drawable.ic_favorite_filled_cyan)

            // ── Listeners ─────────────────────────────────────────────────────
            btnHeart.setOnClickListener {
                val adapterPos = holder.bindingAdapterPosition
                if (adapterPos != RecyclerView.NO_POSITION) {
                    // Pop animation then notify
                    AnimatorSet().apply {
                        playTogether(
                            ObjectAnimator.ofFloat(btnHeart, View.SCALE_X, 1f, 1.35f, 1f),
                            ObjectAnimator.ofFloat(btnHeart, View.SCALE_Y, 1f, 1.35f, 1f)
                        )
                        duration = 220
                        addListener(object : AnimatorListenerAdapter() {
                            override fun onAnimationEnd(a: Animator) {
                                animateRemove(favItemRoot, adapterPos, product)
                            }
                        })
                        start()
                    }
                }
            }

            btnView.setOnClickListener {
                it.animate().scaleX(0.92f).scaleY(0.92f).setDuration(70)
                    .withEndAction { it.animate().scaleX(1f).scaleY(1f).setDuration(70).start() }
                    .start()
                onViewClick(product)
            }

            btnRent.setOnClickListener {
                if (!available) return@setOnClickListener
                it.animate().scaleX(0.92f).scaleY(0.92f).setDuration(70)
                    .withEndAction { it.animate().scaleX(1f).scaleY(1f).setDuration(70).start() }
                    .start()
                onRentClick(product)
            }
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    fun submitList(newItems: List<Product>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    fun currentList(): List<Product> = items.toList()

    // ── Remove animation: heart pop → fade → height collapse ─────────────────

    private fun animateRemove(view: View, adapterPos: Int, product: Product) {
        val fadeOut = ObjectAnimator.ofFloat(view, View.ALPHA, 1f, 0f).apply {
            duration = 200
            interpolator = AccelerateInterpolator()
        }

        view.measure(View.MeasureSpec.UNSPECIFIED, View.MeasureSpec.UNSPECIFIED)
        val startH = view.measuredHeight

        val collapseH = ValueAnimator.ofInt(startH, 0).apply {
            duration = 250
            addUpdateListener { anim ->
                val lp = view.layoutParams
                lp.height = anim.animatedValue as Int
                view.layoutParams = lp
                view.requestLayout()
            }
        }

        AnimatorSet().apply {
            play(collapseH).after(fadeOut)
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: Animator) {
                    view.alpha = 1f
                    val lp = view.layoutParams
                    lp.height = ViewGroup.LayoutParams.WRAP_CONTENT
                    view.layoutParams = lp
                    onHeartClick(product, adapterPos)
                }
            })
            start()
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun formatPrice(price: Double): String {
        val rounded = Math.round(price).toInt()
        return if (price == rounded.toDouble()) "\$$rounded" else "\$${"%.2f".format(price)}"
    }

    /** Builds a star string like "★★★★☆" from a 0–5 float rating. */
    private fun buildStars(rating: Float): String {
        val full  = rating.toInt().coerceIn(0, 5)
        val half  = if (rating - full >= 0.5f) 1 else 0
        val empty = (5 - full - half).coerceAtLeast(0)
        return "★".repeat(full) + (if (half == 1) "★" else "") + "☆".repeat(empty)
    }
}
