package com.hookahdrop.app

import android.os.Bundle
import android.view.LayoutInflater
import android.widget.LinearLayout
import android.widget.TextView
import androidx.core.content.ContextCompat
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.databinding.ActivityOrderDetailBinding
import com.hookahdrop.app.network.ApiOrder

class OrderDetailActivity : BaseProfileActivity() {

    private lateinit var b: ActivityOrderDetailBinding

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(LocaleManager.wrap(base))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityOrderDetailBinding.inflate(layoutInflater)
        setContentView(b.root)

        // Receive the order ID first (needed for click listener)
        val orderId = intent.getStringExtra("orderId") ?: ""

        b.btnBack.setOnClickListener { navigateBack() }
        
        // Order Tracking button click listener
        b.btnOrderTracking?.setOnClickListener {
            val trackingIntent = android.content.Intent(this, OrderTrackingActivity::class.java).apply {
                putExtra("orderId", orderId)
            }
            startActivity(trackingIntent)
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }

        // Receive the rest of order data via Intent extras
        val orderCode    = intent.getStringExtra("orderCode")    ?: ""
        val status       = intent.getStringExtra("status")       ?: "pending"
        val date         = intent.getStringExtra("date")         ?: ""
        val paymentMethod= intent.getStringExtra("paymentMethod")?: ""
        val isPaid       = intent.getBooleanExtra("isPaid",       false)
        val fullname     = intent.getStringExtra("fullname")     ?: ""
        val phone        = intent.getStringExtra("phone")        ?: ""
        val email        = intent.getStringExtra("email")        ?: ""
        val address      = intent.getStringExtra("address")      ?: ""
        val total        = intent.getDoubleExtra("totalPrice",    0.0)
        val shipping     = intent.getDoubleExtra("shippingPrice", 0.0)
        val tax          = intent.getDoubleExtra("tax",           0.0)
        val itemNames    = intent.getStringArrayListExtra("itemNames")    ?: arrayListOf()
        val itemQtys     = intent.getIntegerArrayListExtra("itemQtys")   ?: arrayListOf()
        val itemPrices   = intent.getDoubleArrayExtra("itemPrices")?.toList() ?: listOf()

        // Header title
        b.tvOrderTitle.text = "Order #$orderCode"

        // Status card
        b.tvOrderId.text = "#$orderCode"
        b.tvStatus.text  = status.replaceFirstChar { it.uppercase() }
        val (statusColor, statusBg) = statusStyle(status)
        b.tvStatus.setTextColor(statusColor)
        b.tvDate.text    = formatDate(date)
        b.tvPayment.text = paymentMethod.replaceFirstChar { it.uppercase() }

        if (isPaid) {
            b.tvIsPaid.text = "✓ Paid"
            b.tvIsPaid.setTextColor(ContextCompat.getColor(this, R.color.success))
        } else {
            b.tvIsPaid.text = "Unpaid"
            b.tvIsPaid.setTextColor(ContextCompat.getColor(this, R.color.input_border_error))
        }

        // Delivery
        b.tvFullname.text = fullname.ifEmpty { "—" }
        b.tvPhone.text    = phone.ifEmpty    { "—" }
        b.tvEmail.text    = email.ifEmpty    { "—" }
        b.tvAddress.text  = address.ifEmpty  { "—" }

        // Items
        val inflater = LayoutInflater.from(this)
        var subtotal = 0.0
        for (i in itemNames.indices) {
            val name  = itemNames.getOrNull(i) ?: continue
            val qty   = itemQtys.getOrNull(i)  ?: 1
            val price = itemPrices.getOrNull(i) ?: 0.0
            val lineTotal = price * qty
            subtotal += lineTotal

            val row = inflater.inflate(R.layout.item_order_line, b.itemsContainer, false)
            row.findViewById<TextView>(R.id.tvItemName).text  = name
            row.findViewById<TextView>(R.id.tvItemQty).text   = "×$qty"
            row.findViewById<TextView>(R.id.tvItemPrice).text = formatPrice(lineTotal)
            b.itemsContainer.addView(row)
        }

        // Totals
        b.tvSubtotal.text = formatPrice(subtotal)
        b.tvShipping.text = if (shipping == 0.0) "FREE" else formatPrice(shipping)
        b.tvTax.text      = formatPrice(tax)
        b.tvTotal.text    = formatPrice(total)

        fadeIn(b.root)
    }

    private fun statusStyle(status: String): Pair<Int, Int> {
        val color = when (status.lowercase()) {
            "delivered"             -> ContextCompat.getColor(this, R.color.success)
            "shipped"               -> 0xFF22D3EE.toInt()
            "confirmed","processing"-> ContextCompat.getColor(this, R.color.accent_cyan)
            "cancelled","declined"  -> ContextCompat.getColor(this, R.color.input_border_error)
            else                    -> ContextCompat.getColor(this, R.color.text_secondary)
        }
        return Pair(color, color)
    }

    private fun formatDate(raw: String): String {
        return try {
            // raw = "2026-01-15T10:30:00.000Z"
            val parts = raw.take(10).split("-")
            "${parts[2]}/${parts[1]}/${parts[0]}"
        } catch (_: Exception) { raw.take(10) }
    }

    private fun formatPrice(amount: Double): String =
        "$${"%.2f".format(amount)}"
}
