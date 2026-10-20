package com.hookahdrop.app.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.hookahdrop.app.data.Category
import com.hookahdrop.app.databinding.ItemCategoryListBinding

class CategoryAdapter(
    private val onClick: (Category) -> Unit
) : RecyclerView.Adapter<CategoryAdapter.VH>() {

    private var allCategories: List<Category> = emptyList()
    private var displayedCategories: List<Category> = emptyList()

    inner class VH(val b: ItemCategoryListBinding) : RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemCategoryListBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount() = displayedCategories.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val cat = displayedCategories[position]
        with(holder.b) {
            imgCatIcon.setImageResource(cat.iconRes)
            tvCatName.text        = cat.name
            tvCatDescription.text = cat.description
            tvCatCount.text       = "${cat.productCount} products"
            root.setOnClickListener {
                root.animate().scaleX(0.97f).scaleY(0.97f).setDuration(80)
                    .withEndAction {
                        root.animate().scaleX(1f).scaleY(1f).setDuration(80)
                            .withEndAction { onClick(cat) }.start()
                    }.start()
            }
        }
    }

    fun setAll(list: List<Category>) {
        allCategories      = list
        displayedCategories = list
        notifyDataSetChanged()
    }

    fun filter(query: String) {
        displayedCategories = if (query.isEmpty()) allCategories
        else allCategories.filter {
            it.name.contains(query, ignoreCase = true) ||
            it.description.contains(query, ignoreCase = true)
        }
        notifyDataSetChanged()
    }
}
