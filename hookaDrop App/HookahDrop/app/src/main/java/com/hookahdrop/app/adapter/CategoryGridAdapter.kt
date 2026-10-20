package com.hookahdrop.app.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.hookahdrop.app.data.Category
import com.hookahdrop.app.databinding.ItemCategoryGridBinding

class CategoryGridAdapter(
    private val categories: List<Category>,
    private val onClick: (Category) -> Unit
) : RecyclerView.Adapter<CategoryGridAdapter.VH>() {

    inner class VH(val b: ItemCategoryGridBinding) : RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemCategoryGridBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount() = categories.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val cat = categories[position]
        with(holder.b) {
            imgCategoryIcon.setImageResource(cat.iconRes)
            tvCategoryName.text  = cat.name
            // tvProductCount removed from layout
            root.setOnClickListener {
                root.animate().scaleX(0.93f).scaleY(0.93f).setDuration(80)
                    .withEndAction {
                        root.animate().scaleX(1f).scaleY(1f).setDuration(80)
                            .withEndAction { onClick(cat) }.start()
                    }.start()
            }
        }
    }
}
