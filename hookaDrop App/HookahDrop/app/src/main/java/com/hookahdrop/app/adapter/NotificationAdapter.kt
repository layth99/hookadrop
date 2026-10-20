package com.hookahdrop.app.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.RecyclerView
import com.hookahdrop.app.R
import com.hookahdrop.app.data.AppNotification
import com.hookahdrop.app.databinding.ItemNotificationBinding
import java.text.SimpleDateFormat
import java.util.Locale
import java.util.TimeZone

enum class FilterType { ALL, ORDER, PAYMENT, SECURITY, SYSTEM }

class NotificationAdapter(
    private var items: List<AppNotification>,
    private val onItemClick: (AppNotification) -> Unit,
    private val onItemLongClick: (AppNotification) -> Unit = {}
) : RecyclerView.Adapter<NotificationAdapter.VH>() {

    inner class VH(val b: ItemNotificationBinding) : RecyclerView.ViewHolder(b.root) {
        init {
            b.cardRoot.setOnClickListener {
                val pos = bindingAdapterPosition
                if (pos != RecyclerView.NO_ID.toInt()) onItemClick(items[pos])
            }
            b.cardRoot.setOnLongClickListener {
                val pos = bindingAdapterPosition
                if (pos != RecyclerView.NO_ID.toInt()) onItemLongClick(items[pos])
                true
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemNotificationBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount() = items.size

    override fun onBindViewHolder(holder: VH, position: Int) {
        val notif   = items[position]
        val context = holder.b.root.context

        holder.b.tvNotifTitle.text   = notif.title
        holder.b.tvNotifMessage.text = notif.message
        holder.b.tvNotifTime.text    = formatDate(notif.createdAt)

        // ── Unread visual state ───────────────────────────────────────────
        if (!notif.isRead) {
            holder.b.viewLeftAccent.visibility = View.VISIBLE
            holder.b.cardRoot.alpha            = 1.0f
            holder.b.tvNotifTitle.setTextColor(
                ContextCompat.getColor(context, R.color.white))
        } else {
            holder.b.viewLeftAccent.visibility = View.GONE
            holder.b.cardRoot.alpha            = 0.70f
            holder.b.tvNotifTitle.setTextColor(
                ContextCompat.getColor(context, R.color.text_secondary))
        }

        // ── Icon and icon-frame by type ───────────────────────────────────
        val (iconRes, bgRes, tintRes) = when (notif.type) {
            "order" -> Triple(
                R.drawable.ic_orders,
                R.drawable.bg_notification_icon_order,
                R.color.accent_cyan)
            "security", "account" -> Triple(
                R.drawable.ic_shield,
                R.drawable.bg_notification_icon_security,
                R.color.badge_red)
            "payment" -> Triple(
                R.drawable.ic_credit_card,
                R.drawable.bg_notification_icon_payment,
                R.color.success)
            "promo", "product" -> Triple(
                R.drawable.ic_promo,
                R.drawable.bg_notification_icon_promo,
                R.color.warning)
            else -> Triple(
                R.drawable.ic_notification,
                R.drawable.bg_notification_icon_system,
                R.color.text_secondary)
        }
        holder.b.imgNotifIcon.setImageResource(iconRes)
        holder.b.imgNotifIcon.setColorFilter(ContextCompat.getColor(context, tintRes))
        holder.b.iconFrame.setBackgroundResource(bgRes)
    }

    // ── DiffUtil update ───────────────────────────────────────────────────

    fun updateList(newList: List<AppNotification>) {
        val diff = DiffUtil.calculateDiff(object : DiffUtil.Callback() {
            override fun getOldListSize() = items.size
            override fun getNewListSize() = newList.size
            override fun areItemsTheSame(o: Int, n: Int) = items[o].id == newList[n].id
            override fun areContentsTheSame(o: Int, n: Int) = items[o] == newList[n]
        })
        items = newList
        diff.dispatchUpdatesTo(this)
    }

    // ── Date formatter ────────────────────────────────────────────────────

    private fun formatDate(isoDate: String): String {
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.getDefault())
            parser.timeZone = TimeZone.getTimeZone("UTC")
            val date = parser.parse(isoDate) ?: return isoDate.take(10)
            val formatter = SimpleDateFormat("MMM d · HH:mm", Locale.getDefault())
            formatter.format(date)
        } catch (e: Exception) {
            isoDate.take(10)
        }
    }
}
