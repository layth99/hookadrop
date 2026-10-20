package com.hookahdrop.app.adapter

import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.bumptech.glide.Glide
import com.hookahdrop.app.R
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.Product
import com.hookahdrop.app.databinding.ItemProductBinding

class ProductAdapter(
    private var products: List<Product>,
    private val onProductClick: (Product) -> Unit = {},
    private val onFavoriteChanged: () -> Unit = {},
    private val onCartChanged: () -> Unit = {}
) : RecyclerView.Adapter<ProductAdapter.VH>() {

    inner class VH(val b: ItemProductBinding) : RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemProductBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount() = products.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val p = products[position]
        with(holder.b) {

            // ── Image: use Glide for remote URL, setImageResource for local drawable ──
            if (p.isRemote) {
                Glide.with(imgProduct.context)
                    .load(p.imageUrl)
                    .placeholder(R.drawable.ic_hookah_neon)
                    .error(R.drawable.ic_hookah_neon)
                    .centerInside()
                    .into(imgProduct)
            } else {
                imgProduct.setImageResource(p.imageRes)
            }

            tvProductName.text = p.name
            tvPrice.text       = "$%.2f".format(p.price)
            tvRating.text      = p.rating.toString()

            // Discount badge
            tvDiscount.visibility = if (p.discount > 0) View.VISIBLE else View.GONE
            if (p.discount > 0) tvDiscount.text = "-${p.discount}%"

            // NEW badge
            tvNew.visibility = if (p.isNew) View.VISIBLE else View.GONE

            // Reset + icon (RecyclerView recycling safety)
            btnAddToCart.setImageResource(R.drawable.ic_add)
            btnAddToCart.tag = null

            // ── Favorite button setup ──
            val isFav = FavoritesManager.isFavorite(p.id)
            btnFavorite.setImageResource(
                if (isFav) R.drawable.ic_favorite_filled 
                else R.drawable.ic_favorite
            )

            btnFavorite.setOnClickListener {
                val newState = FavoritesManager.toggle(p.id)
                btnFavorite.setImageResource(
                    if (newState) R.drawable.ic_favorite_filled 
                    else R.drawable.ic_favorite
                )
                // Heart pop animation
                btnFavorite.animate()
                    .scaleX(1.3f).scaleY(1.3f)
                    .setDuration(150)
                    .withEndAction {
                        btnFavorite.animate()
                            .scaleX(1f).scaleY(1f)
                            .setDuration(150)
                            .start()
                    }
                    .start()
                onFavoriteChanged()
            }

            // Tap card → open product detail
            root.setOnClickListener {
                root.animate().scaleX(0.97f).scaleY(0.97f).setDuration(80)
                    .withEndAction {
                        root.animate().scaleX(1f).scaleY(1f).setDuration(80)
                            .withEndAction { onProductClick(p) }
                            .start()
                    }.start()
            }

            // + button → add to cart with ✓ animation
            btnAddToCart.setOnClickListener { btn ->
                if (btn.tag == "animating") return@setOnClickListener
                btn.tag = "animating"

                CartManager.addProduct(p)
                onCartChanged()

                btn.animate().scaleX(0.72f).scaleY(0.72f).setDuration(90)
                    .withEndAction {
                        btnAddToCart.setImageResource(R.drawable.ic_check_white)
                        btn.animate().scaleX(1.15f).scaleY(1.15f).setDuration(130)
                            .withEndAction {
                                btn.animate().scaleX(1f).scaleY(1f).setDuration(80).start()
                            }.start()

                        Handler(Looper.getMainLooper()).postDelayed({
                            btn.animate().scaleX(0.72f).scaleY(0.72f).setDuration(80)
                                .withEndAction {
                                    btnAddToCart.setImageResource(R.drawable.ic_add)
                                    btn.animate().scaleX(1f).scaleY(1f).setDuration(90).start()
                                    btn.tag = null
                                }.start()
                        }, 1200)
                    }.start()
            }
        }
    }

    fun updateProducts(newProducts: List<Product>) {
        products = newProducts
        notifyDataSetChanged()
    }
}
