package com.hookahdrop.app.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.hookahdrop.app.data.HeroBanner
import com.hookahdrop.app.databinding.ItemHeroBannerBinding

class HeroBannerAdapter(
    private val banners: List<HeroBanner>,
    private val onShopNow: (HeroBanner) -> Unit
) : RecyclerView.Adapter<HeroBannerAdapter.VH>() {

    inner class VH(val b: ItemHeroBannerBinding) : RecyclerView.ViewHolder(b.root)

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemHeroBannerBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount() = banners.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val banner = banners[position]
        with(holder.b) {
            imgHero.setImageResource(banner.imageRes)
            tvHeroTitle.text    = banner.title
            tvHeroSubtitle.text = banner.subtitle
            btnShopNow.setOnClickListener { onShopNow(banner) }
        }
    }
}
