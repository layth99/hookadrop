package com.hookahdrop.app.adapter

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.hookahdrop.app.R
import com.hookahdrop.app.data.TimelineIcon
import com.hookahdrop.app.data.TimelineStep
import com.hookahdrop.app.data.TimelineStepState
import com.hookahdrop.app.databinding.ItemTrackingStepV2Binding

/**
 * RecyclerView adapter for Order Tracking timeline steps (V2 redesign)
 * Displays 4 steps with icons, states, and descriptions matching HTML reference
 */
class TimelineStepAdapter : RecyclerView.Adapter<TimelineStepAdapter.TimelineStepViewHolder>() {

    private val steps = mutableListOf<TimelineStep>()

    fun submitList(newSteps: List<TimelineStep>) {
        steps.clear()
        steps.addAll(newSteps)
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TimelineStepViewHolder {
        val binding = ItemTrackingStepV2Binding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return TimelineStepViewHolder(binding)
    }

    override fun onBindViewHolder(holder: TimelineStepViewHolder, position: Int) {
        holder.bind(steps[position], position == steps.lastIndex)
    }

    override fun getItemCount(): Int = steps.size

    class TimelineStepViewHolder(
        private val binding: ItemTrackingStepV2Binding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(step: TimelineStep, isLast: Boolean) {
            val context = binding.root.context

            // Set icon based on step type
            val iconRes = when (step.iconType) {
                TimelineIcon.CHECK -> R.drawable.ic_tracking_check
                TimelineIcon.BOX -> R.drawable.ic_tracking_box
                TimelineIcon.TRUCK -> R.drawable.ic_tracking_truck
                TimelineIcon.FLAG -> R.drawable.ic_tracking_flag
                TimelineIcon.X -> R.drawable.ic_tracking_x
            }
            binding.ivStepIcon.setImageResource(iconRes)

            // Set step title and description
            binding.tvStepTitle.text = step.title
            binding.tvStepDescription.text = step.description

            // Handle timestamp (show if available)
            if (!step.timestamp.isNullOrEmpty()) {
                binding.tvTimestamp.text = step.timestamp
                binding.tvTimestamp.visibility = View.VISIBLE
            } else {
                binding.tvTimestamp.visibility = View.GONE
            }

            // Style based on state
            when (step.state) {
                TimelineStepState.COMPLETED, TimelineStepState.ACTIVE -> {
                    // Gold filled circle
                    binding.circleBackground.setBackgroundResource(R.drawable.bg_circle_gold)
                    
                    // Icon tint - dark background color
                    binding.ivStepIcon.setColorFilter(
                        ContextCompat.getColor(context, R.color.tracking_background)
                    )
                    
                    // Title color - white for completed/active
                    binding.tvStepTitle.setTextColor(
                        ContextCompat.getColor(context, R.color.tracking_text)
                    )
                    
                    // Solid gold connector
                    binding.connector.setBackgroundColor(
                        ContextCompat.getColor(context, R.color.tracking_gold)
                    )
                    
                    // Animate connector fill for completed steps
                    if (step.state == TimelineStepState.COMPLETED && !isLast) {
                        binding.connector.pivotY = 0f
                        binding.connector.scaleY = 0f
                        binding.connector.animate()
                            .scaleY(1f)
                            .setDuration(550)
                            .setStartDelay(350)
                            .start()
                    }
                }
                
                TimelineStepState.PENDING -> {
                    // Gray outlined circle
                    binding.circleBackground.setBackgroundResource(R.drawable.bg_circle_pending_v2)
                    
                    // Icon tint - muted gray
                    binding.ivStepIcon.setColorFilter(
                        ContextCompat.getColor(context, R.color.tracking_text_muted)
                    )
                    
                    // Title color - muted gray for pending
                    binding.tvStepTitle.setTextColor(
                        ContextCompat.getColor(context, R.color.tracking_text_muted)
                    )
                    
                    // Dashed gray connector
                    binding.connector.setBackgroundResource(R.drawable.bg_connector_dashed)
                }
                
                TimelineStepState.CANCELLED -> {
                    // Red styling for cancelled state
                    binding.circleBackground.setBackgroundColor(
                        ContextCompat.getColor(context, R.color.tracking_danger)
                    )
                    binding.ivStepIcon.setColorFilter(
                        ContextCompat.getColor(context, R.color.tracking_text)
                    )
                    binding.tvStepTitle.setTextColor(
                        ContextCompat.getColor(context, R.color.tracking_text)
                    )
                }
                
                else -> {
                    // Default fallback
                    binding.circleBackground.setBackgroundResource(R.drawable.bg_circle_pending_v2)
                    binding.ivStepIcon.setColorFilter(
                        ContextCompat.getColor(context, R.color.tracking_text_muted)
                    )
                    binding.tvStepTitle.setTextColor(
                        ContextCompat.getColor(context, R.color.tracking_text_muted)
                    )
                }
            }

            // Show "Now" badge only for ACTIVE state
            if (step.state == TimelineStepState.ACTIVE) {
                binding.tvNowBadge.visibility = View.VISIBLE
            } else {
                binding.tvNowBadge.visibility = View.GONE
            }

            // Hide connector for last item
            if (isLast) {
                binding.connector.visibility = View.GONE
            } else {
                binding.connector.visibility = View.VISIBLE
            }
        }
    }
}
