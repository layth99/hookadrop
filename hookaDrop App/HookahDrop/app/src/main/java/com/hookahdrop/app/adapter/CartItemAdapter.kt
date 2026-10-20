package com.hookahdrop.app.adapter

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateInterpolator
import androidx.recyclerview.widget.RecyclerView
import com.hookahdrop.app.data.CartItem
import com.hookahdrop.app.data.DataProvider
import com.hookahdrop.app.databinding.ItemCartBinding

/**
 * Displays cart items with:
 *  • Quantity +/- controls (disabled states enforced)
 *  • Animated removal: fade-out (200ms) → height-collapse (250ms)
 *  • Callbacks for quantity changes and removal routed through CartManager in CartActivity
 */
class CartItemAdapter(
    private val onIncrease: (CartItem) -> Unit,
    private val onDecrease: (CartItem) -> Unit,
    private val onRemove: (CartItem, Int) -> Unit       // item + adapter position
) : RecyclerView.Adapter<CartItemAdapter.VH>() {

    // Working copy — never expose the mutable list directly
    private val items = mutableListOf<CartItem>()

    inner class VH(val b: ItemCartBinding) : RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemCartBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = items[position]
        with(holder.b) {

            // Load image: prefer remote URL (backend products) over local drawable
            val freshProduct = DataProvider.getProductById(item.product.id) ?: item.product
            if (freshProduct.imageUrl.isNotEmpty() && freshProduct.isRemote && isValidUrl(freshProduct.imageUrl)) {
                com.bumptech.glide.Glide.with(imgProduct.context)
                    .load(freshProduct.imageUrl)
                    .placeholder(com.hookahdrop.app.R.drawable.ic_hookah_neon)
                    .error(com.hookahdrop.app.R.drawable.ic_hookah_neon)
                    .centerCrop()
                    .into(imgProduct)
            } else if (freshProduct.imageRes != 0) {
                imgProduct.setImageResource(freshProduct.imageRes)
            } else {
                imgProduct.setImageResource(com.hookahdrop.app.R.drawable.ic_hookah_neon)
            }
            
            tvProductName.text  = item.product.name
            tvProductDesc.text  = item.product.description
            tvQuantity.text     = item.quantity.toString()
            tvProductPrice.text = formatPrice(item.product.price)

            // Disable decrease when qty == 1 (tap will trigger remove dialog in activity)
            btnDecrease.isEnabled = true      // always enabled; qty==1 removes
            btnIncrease.isEnabled = true

            btnIncrease.setOnClickListener {
                it.animate().scaleX(0.82f).scaleY(0.82f).setDuration(70)
                    .withEndAction { it.animate().scaleX(1f).scaleY(1f).setDuration(70).start() }
                    .start()
                onIncrease(item)
            }

            btnDecrease.setOnClickListener {
                it.animate().scaleX(0.82f).scaleY(0.82f).setDuration(70)
                    .withEndAction { it.animate().scaleX(1f).scaleY(1f).setDuration(70).start() }
                    .start()
                onDecrease(item)
            }

            btnRemove.setOnClickListener {
                val adapterPos = holder.bindingAdapterPosition
                if (adapterPos != RecyclerView.NO_POSITION) {
                    animateRemove(cartItemRoot, adapterPos, item)
                }
            }
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Replace the entire list (e.g. after CartManager update). */
    fun submitList(newItems: List<CartItem>) {
        items.clear()
        items.addAll(newItems)
        notifyDataSetChanged()
    }

    /** Refresh a single item's quantity without rebuilding the whole list. */
    fun refreshItem(productId: String) {
        val idx = items.indexOfFirst { it.product.id == productId }
        if (idx >= 0) notifyItemChanged(idx)
    }

    // ── Remove animation: fade → collapse ────────────────────────────────────

    private fun animateRemove(view: View, adapterPos: Int, item: CartItem) {
        // 1. Fade out (200ms)
        val fadeOut = ObjectAnimator.ofFloat(view, View.ALPHA, 1f, 0f).apply {
            duration = 200
            interpolator = AccelerateInterpolator()
        }

        // 2. Collapse height (250ms) — from measured height → 0
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

        // Play: fade first, then collapse
        AnimatorSet().apply {
            play(collapseH).after(fadeOut)
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: Animator) {
                    // Restore view state for RecyclerView recycling
                    view.alpha = 1f
                    val lp = view.layoutParams
                    lp.height = ViewGroup.LayoutParams.WRAP_CONTENT
                    view.layoutParams = lp
                    // Notify activity to update CartManager (fires notifyDataSetChanged via callback)
                    onRemove(item, adapterPos)
                }
            })
            start()
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun isValidUrl(url: String): Boolean {
        return url.startsWith("http://", ignoreCase = true) || 
               url.startsWith("https://", ignoreCase = true)
    }

    private fun formatPrice(price: Double): String {
        val rounded = Math.round(price).toInt()
        return if (price == rounded.toDouble()) "$rounded $" else "${"%.2f".format(price)} $"
    }
}
