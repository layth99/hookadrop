package com.hookahdrop.app.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.hookahdrop.app.R
import com.hookahdrop.app.network.ApiOrder
import com.hookahdrop.app.databinding.ItemOrderBinding

class OrdersAdapter(
    private var orders: List<ApiOrder>,
    private val onOrderClick: (ApiOrder) -> Unit = {},
    private val onTrackOrderClick: (ApiOrder) -> Unit = {}
) : RecyclerView.Adapter<OrdersAdapter.VH>() {

    inner class VH(val b: ItemOrderBinding) : RecyclerView.ViewHolder(b.root) {
        init {
            b.root.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_ID.toInt()) onOrderClick(orders[pos])
            }
            b.btnTrackOrder.setOnClickListener {
                val pos = adapterPosition
                if (pos != RecyclerView.NO_ID.toInt()) onTrackOrderClick(orders[pos])
            }
        }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) =
        VH(ItemOrderBinding.inflate(LayoutInflater.from(parent.context), parent, false))

    override fun getItemCount() = orders.size

    fun updateOrders(newOrders: List<ApiOrder>) {
        orders = newOrders
        notifyDataSetChanged()
    }

    override fun onBindViewHolder(holder: VH, position: Int) {
        val order   = orders[position]
        val context = holder.b.root.context

        holder.b.tvOrderId.text    = "#${order.orderId}"
        holder.b.tvOrderTotal.text = "$${"%.2f".format(order.totalPrice)}"
        holder.b.tvOrderItems.text = "${order.items.size} item${if (order.items.size == 1) "" else "s"}"
        holder.b.tvOrderDate.text  = order.createdAt.take(10)
        holder.b.tvPaymentMethod.text = order.paymentMethod.replaceFirstChar { it.uppercase() }

        // Status
        val statusText  = order.status.replaceFirstChar { it.uppercase() }
        val statusColor = when (order.status.lowercase()) {
            "delivered"              -> ContextCompat.getColor(context, R.color.success)
            "out_for_delivery"       -> 0xFF22D3EE.toInt()
            "confirmed","processing" -> ContextCompat.getColor(context, R.color.accent_cyan)
            "cancelled","declined"   -> ContextCompat.getColor(context, R.color.input_border_error)
            else                     -> ContextCompat.getColor(context, R.color.text_secondary)
        }
        holder.b.tvOrderStatus.text = statusText
        holder.b.tvOrderStatus.setTextColor(statusColor)

        // Paid indicator
        if (order.isPaid) {
            holder.b.tvPaidStatus.text = "✓ Paid"
            holder.b.tvPaidStatus.setTextColor(ContextCompat.getColor(context, R.color.success))
        } else {
            holder.b.tvPaidStatus.text = "Unpaid"
            holder.b.tvPaidStatus.setTextColor(ContextCompat.getColor(context, R.color.input_border_error))
        }
    }
}
