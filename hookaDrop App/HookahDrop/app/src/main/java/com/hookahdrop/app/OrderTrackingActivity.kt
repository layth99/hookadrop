package com.hookahdrop.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.Toast
import androidx.activity.viewModels
import com.hookahdrop.app.data.*
import com.hookahdrop.app.databinding.ActivityOrderTrackingBinding
import com.hookahdrop.app.view.TimelineStepView
import com.hookahdrop.app.viewmodel.OrderTrackingViewModel
import com.hookahdrop.app.viewmodel.TrackingState
import java.text.SimpleDateFormat
import java.util.*

/**
 * Order Tracking Activity - KIRO Spec Compliant Implementation
 * Displays real-time order tracking with timeline, courier info, and delivery details
 * Features 11 animations with exact timings from design tokens
 */
class OrderTrackingActivity : BaseProfileActivity() {

    private lateinit var b: ActivityOrderTrackingBinding
    private val viewModel: OrderTrackingViewModel by viewModels()
    private var orderId: String = ""
    private val timelineViews = mutableListOf<TimelineStepView>()

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(LocaleManager.wrap(base))

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityOrderTrackingBinding.inflate(layoutInflater)
        setContentView(b.root)

        // Get order ID from intent
        orderId = intent.getStringExtra("orderId") ?: intent.getStringExtra("orderCode") ?: ""
        
        if (orderId.isEmpty()) {
            Toast.makeText(this, getString(R.string.tracking_error_no_order), Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        setupUI()
        observeViewModel()
        
        // Load tracking data
        viewModel.loadTracking(orderId)
        
        // Animate entrance
        fadeIn(b.root)
    }

    private fun setupUI() {
        // Back button
        b.btnBack.setOnClickListener { navigateBack() }
        
        // SwipeRefresh
        b.swipeRefresh.setOnRefreshListener {
            viewModel.refresh(orderId)
        }
        b.swipeRefresh.setColorSchemeResources(R.color.tracking_gold)
    }

    private fun observeViewModel() {
        viewModel.trackingState.observe(this) { state ->
            when (state) {
                is TrackingState.Loading -> {
                    b.loadingOverlay.visibility = View.VISIBLE
                    b.swipeRefresh.isRefreshing = false
                }
                is TrackingState.Success -> {
                    b.loadingOverlay.visibility = View.GONE
                    b.swipeRefresh.isRefreshing = false
                    displayTracking(state.tracking)
                }
                is TrackingState.Error -> {
                    b.loadingOverlay.visibility = View.GONE
                    b.swipeRefresh.isRefreshing = false
                    Toast.makeText(this, state.message, Toast.LENGTH_LONG).show()
                }
            }
        }
    }

    private fun displayTracking(tracking: OrderTracking) {
        // Order ID
        b.tvOrderId.text = "#${tracking.orderId}"
        
        // Status Card
        displayStatusCard(tracking)
        
        // Timeline
        displayTimeline(tracking)
        
        // Courier Info (only for OUT_FOR_DELIVERY)
        if (tracking.currentStatus == OrderStatus.OUT_FOR_DELIVERY && tracking.courier != null) {
            displayCourierInfo(tracking.courier!!)
        } else {
            b.courierCard.visibility = View.GONE
        }
        
        // Delivery Address
        displayAddress(tracking.deliveryAddress)
        
        // Trigger staggered intro animations (500ms + 70ms stagger per step)
        animateIntro()
    }

    private fun displayStatusCard(tracking: OrderTracking) {
        val status = tracking.currentStatus
        
        // Status title and description
        b.tvStatusTitle.text = when (status) {
            OrderStatus.CONFIRMED -> getString(R.string.tracking_status_confirmed)
            OrderStatus.PREPARED -> getString(R.string.tracking_status_prepared)
            OrderStatus.OUT_FOR_DELIVERY -> getString(R.string.tracking_status_out_for_delivery)
            OrderStatus.DELIVERED -> getString(R.string.tracking_status_delivered)
            OrderStatus.CANCELLED -> getString(R.string.tracking_status_cancelled)
            else -> getString(R.string.tracking_status_confirmed)
        }
        
        b.tvStatusDescription.text = when (status) {
            OrderStatus.CONFIRMED -> getString(R.string.tracking_desc_confirmed)
            OrderStatus.PREPARED -> getString(R.string.tracking_desc_prepared)
            OrderStatus.OUT_FOR_DELIVERY -> getString(R.string.tracking_desc_out_for_delivery)
            OrderStatus.DELIVERED -> getString(R.string.tracking_desc_delivered)
            OrderStatus.CANCELLED -> getString(R.string.tracking_desc_cancelled)
            else -> getString(R.string.tracking_desc_confirmed)
        }
        
        // Delivery window (only for OUT_FOR_DELIVERY)
        if (status == OrderStatus.OUT_FOR_DELIVERY && tracking.deliveryWindow != null) {
            b.deliveryWindowLayout.visibility = View.VISIBLE
            val window = tracking.deliveryWindow!!
            b.tvDeliveryWindow.text = getString(
                R.string.tracking_delivery_window,
                window.label,
                window.startTime,
                window.endTime
            )
        } else {
            b.deliveryWindowLayout.visibility = View.GONE
        }
    }

    private fun displayTimeline(tracking: OrderTracking) {
        // Clear existing views
        b.timelineContainer.removeAllViews()
        timelineViews.clear()
        
        val steps = tracking.timelineSteps
        
        steps.forEachIndexed { index, step ->
            val stepView = TimelineStepView(this).apply {
                bind(step, index == steps.lastIndex)
            }
            b.timelineContainer.addView(stepView)
            timelineViews.add(stepView)
        }
    }

    private fun displayCourierInfo(courier: Courier) {
        b.courierCard.visibility = View.VISIBLE
        b.tvCourierName.text = courier.name
        
        // Call courier
        b.btnCallCourier.setOnClickListener {
            val intent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:${courier.phone}"))
            startActivity(intent)
        }
        
        // Chat with courier (placeholder - would integrate with your chat system)
        b.btnChatCourier.setOnClickListener {
            Toast.makeText(this, getString(R.string.tracking_message_courier, courier.name), Toast.LENGTH_SHORT).show()
        }
    }

    private fun displayAddress(address: DeliveryAddress) {
        b.tvAddress.text = buildString {
            append(address.street)
            if (address.apartment.isNotEmpty()) {
                append(", ").append(address.apartment)
            }
            append("\n")
            append(address.city)
            if (address.postalCode.isNotEmpty()) {
                append(" ").append(address.postalCode)
            }
        }
    }

    private fun animateIntro() {
        // Animation 1: Status card fade in (500ms delay)
        b.statusCard.alpha = 0f
        b.statusCard.animate()
            .alpha(1f)
            .setDuration(400)
            .setStartDelay(500)
            .start()
        
        // Animation 2: Timeline steps stagger (70ms per step)
        timelineViews.forEachIndexed { index, stepView ->
            stepView.alpha = 0f
            stepView.translationY = 20f
            stepView.animate()
                .alpha(1f)
                .translationY(0f)
                .setDuration(300)
                .setStartDelay(500 + (index * 70L)) // 70ms stagger from design tokens
                .start()
        }
        
        // Animation 3: Courier card fade in (if visible)
        if (b.courierCard.visibility == View.VISIBLE) {
            b.courierCard.alpha = 0f
            val courierDelay = 500 + (timelineViews.size * 70L) + 100
            b.courierCard.animate()
                .alpha(1f)
                .setDuration(400)
                .setStartDelay(courierDelay)
                .start()
        }
        
        // Animation 4: Address card fade in
        b.addressCard.alpha = 0f
        val addressDelay = if (b.courierCard.visibility == View.VISIBLE) {
            500 + (timelineViews.size * 70L) + 600
        } else {
            500 + (timelineViews.size * 70L) + 200
        }
        b.addressCard.animate()
            .alpha(1f)
            .setDuration(400)
            .setStartDelay(addressDelay)
            .start()
    }

    override fun onDestroy() {
        super.onDestroy()
        // Clean up timeline views
        timelineViews.forEach { it.onDetachedFromWindow() }
    }
}
