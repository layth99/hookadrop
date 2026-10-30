package com.hookahdrop.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.hookahdrop.app.adapter.TimelineStepAdapter
import com.hookahdrop.app.data.*
import com.hookahdrop.app.databinding.ActivityOrderTrackingV2Binding
import com.hookahdrop.app.viewmodel.OrderTrackingViewModel
import com.hookahdrop.app.viewmodel.TrackingState
import java.text.SimpleDateFormat
import java.util.*

/**
 * Order Tracking Activity - V2 Redesign
 * Modern dark theme with gold accents matching HTML reference design
 * RecyclerView-based timeline with simplified animations
 */
class OrderTrackingActivity : BaseProfileActivity() {

    private lateinit var b: ActivityOrderTrackingV2Binding
    private val viewModel: OrderTrackingViewModel by viewModels()
    private var orderId: String = ""
    private val timelineAdapter = TimelineStepAdapter()

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(LocaleManager.wrap(base))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityOrderTrackingV2Binding.inflate(layoutInflater)
        setContentView(b.root)

        // Get order ID from intent
        orderId = intent.getStringExtra("orderId") ?: intent.getStringExtra("orderCode") ?: ""
        
        if (orderId.isEmpty()) {
            Toast.makeText(this, getString(R.string.tracking_error_no_order), Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setupUI()
        setupRecyclerView()
        observeViewModel()
        
        // Load tracking data
        viewModel.loadTracking(orderId)
        
        // Animate entrance
        fadeIn(b.root)
    }

    private fun setupRecyclerView() {
        b.recyclerViewTimeline.apply {
            layoutManager = LinearLayoutManager(this@OrderTrackingActivity)
            adapter = timelineAdapter
            isNestedScrollingEnabled = false
        }
    }

    private fun setupUI() {
        // Back button
        b.btnBack.setOnClickListener { navigateBack() }
        
        // Contact Support button
        b.btnContactSupport.setOnClickListener {
            // Placeholder - integrate with your support system
            Toast.makeText(this, "Contact support feature", Toast.LENGTH_SHORT).show()
        }
        
        // Call Courier button
        b.btnCallCourier.setOnClickListener {
            // Will be populated with actual courier phone when status is OUT_FOR_DELIVERY
            Toast.makeText(this, "Call courier", Toast.LENGTH_SHORT).show()
        }
    }

    private fun observeViewModel() {
        viewModel.trackingState.observe(this) { state ->
            when (state) {
                is TrackingState.Loading -> {
                    b.loadingOverlay.visibility = View.VISIBLE
                }
                is TrackingState.Success -> {
                    b.loadingOverlay.visibility = View.GONE
                    displayTracking(state.tracking)
                }
                is TrackingState.Error -> {
                    b.loadingOverlay.visibility = View.GONE
                    Toast.makeText(this, state.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun displayTracking(tracking: OrderTracking) {
        // Order ID
        b.tvOrderId.text = "Order #${tracking.orderNumber}"
        
        // ETA Card
        displayEtaCard(tracking)
        
        // Timeline
        displayTimeline(tracking)
        
        // Delivery Address
        displayAddress(tracking)
        
        // Courier Info Card
        displayCourierInfo(tracking)
        
        // Call Courier button visibility (show when courier is assigned)
        if (tracking.courier != null && tracking.courier.hasPhone()) {
            b.btnCallCourier.visibility = View.VISIBLE
            
            // Set up actual phone call with admin's assigned number
            val courierPhone = tracking.courier.phone
            b.btnCallCourier.setOnClickListener {
                val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$courierPhone"))
                startActivity(intent)
            }
        } else {
            b.btnCallCourier.visibility = View.GONE
        }
    }

    private fun displayEtaCard(tracking: OrderTracking) {
        val status = tracking.currentStatus
        
        // ETA Label
        if (status == OrderStatus.DELIVERED) {
            b.tvEtaLabel.text = getString(R.string.tracking_delivered_on)
        } else if (status == OrderStatus.CANCELLED) {
            b.tvEtaLabel.text = "Order Status"
        } else {
            b.tvEtaLabel.text = getString(R.string.tracking_estimated_delivery)
        }
        
        // ETA Time
        if (status == OrderStatus.DELIVERED) {
            // Show actual delivery time from history
            val deliveredEntry = tracking.history.find { it.status == OrderStatus.DELIVERED }
            b.tvEta.text = deliveredEntry?.formatTimestamp() ?: "Delivered"
        } else if (status == OrderStatus.CANCELLED) {
            b.tvEta.text = getString(R.string.tracking_status_cancelled)
        } else {
            // Show estimated delivery window
            b.tvEta.text = tracking.deliveryWindow?.formatForDisplay() ?: "Today, 6:30 – 7:00 PM"
        }
        
        // Status Label
        b.tvStatusLabel.text = when (status) {
            OrderStatus.CONFIRMED -> getString(R.string.step_confirmed)
            OrderStatus.PREPARED -> getString(R.string.step_prepared)
            OrderStatus.OUT_FOR_DELIVERY -> getString(R.string.step_out_for_delivery)
            OrderStatus.DELIVERED -> getString(R.string.step_delivered)
            OrderStatus.CANCELLED -> getString(R.string.tracking_status_cancelled)
            else -> getString(R.string.step_confirmed)
        }
    }

    private fun displayTimeline(tracking: OrderTracking) {
        // Check if order is cancelled - show special card instead of timeline
        if (tracking.currentStatus == OrderStatus.CANCELLED) {
            displayCancelledCard(tracking)
            b.timelineCard.visibility = View.GONE
            return
        }
        
        // Show timeline card for normal orders
        b.timelineCard.visibility = View.VISIBLE
        
        // Get timeline steps from data model
        val steps = tracking.timelineSteps
        
        // Submit to adapter
        timelineAdapter.submitList(steps)
        
        // Smooth scroll to active step after a delay
        val activeStepIndex = steps.indexOfFirst { it.state == TimelineStepState.ACTIVE }
        if (activeStepIndex != -1) {
            b.recyclerViewTimeline.postDelayed({
                b.recyclerViewTimeline.smoothScrollToPosition(activeStepIndex)
            }, 300)
        }
    }
    
    private fun displayCancelledCard(tracking: OrderTracking) {
        // For cancelled orders, show special red-tinted card
        val steps = tracking.timelineSteps
        timelineAdapter.submitList(steps)
        b.timelineCard.visibility = View.VISIBLE
    }

    private fun displayAddress(tracking: OrderTracking) {
        val address = tracking.deliveryAddress
        
        // Address text: "Home · 123 Main Street"
        b.tvAddress.text = "${address.label} · ${address.line}"
        
        // Items and total: "3 items · Total $119.00"
        b.tvItemsTotal.text = getString(
            R.string.tracking_items_total,
            tracking.itemsCount,
            tracking.total
        )
    }
    
    private fun displayCourierInfo(tracking: OrderTracking) {
        val courier = tracking.courier
        
        if (courier != null) {
            // Show courier card
            b.courierCard.visibility = View.VISIBLE
            
            // Courier name
            b.tvCourierName.text = courier.name ?: "Delivery Driver"
            
            // Courier initials (for avatar)
            val initials = courier.name?.trim()?.split(" ")
                ?.take(2)
                ?.mapNotNull { it.firstOrNull()?.uppercaseChar() }
                ?.joinToString("") ?: "?"
            b.tvCourierInitials.text = initials
            
            // Courier phone
            b.tvCourierPhone.text = courier.phone ?: ""
            
            // Courier vehicle (optional)
            if (!courier.vehicle.isNullOrBlank()) {
                b.tvCourierVehicle.visibility = View.VISIBLE
                b.tvCourierVehicle.text = courier.vehicle
            } else {
                b.tvCourierVehicle.visibility = View.GONE
            }
        } else {
            // Hide courier card if no driver assigned
            b.courierCard.visibility = View.GONE
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        // Clean up any resources if needed
    }
}
