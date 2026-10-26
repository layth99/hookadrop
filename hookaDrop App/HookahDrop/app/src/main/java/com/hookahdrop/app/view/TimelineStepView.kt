package com.hookahdrop.app.view

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ValueAnimator
import android.content.Context
import android.util.AttributeSet
import android.view.LayoutInflater
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.FrameLayout
import androidx.core.content.ContextCompat
import com.hookahdrop.app.R
import com.hookahdrop.app.data.TimelineStep
import com.hookahdrop.app.data.TimelineStepState
import com.hookahdrop.app.databinding.ItemTimelineStepBinding

/**
 * Custom view that represents a single step in the order tracking timeline
 * Handles state changes and animations for circle, icon, and connector
 */
class TimelineStepView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    private val binding: ItemTimelineStepBinding
    private var currentState = TimelineStepState.PENDING
    private var connectorAnimator: ValueAnimator? = null

    init {
        binding = ItemTimelineStepBinding.inflate(LayoutInflater.from(context), this, true)
    }

    fun bind(step: TimelineStep, isLastStep: Boolean) {
        // Set text content
        binding.tvStepTitle.text = step.title
        binding.tvStepTimestamp.text = step.timestamp ?: ""
        binding.tvStepTimestamp.visibility = if (step.timestamp != null) View.VISIBLE else View.GONE

        // Set icon
        binding.ivIcon.setImageResource(getIconResource(step.icon))

        // Show connector unless it's the last step
        binding.connectorLine.visibility = if (!isLastStep) View.VISIBLE else View.GONE

        // Apply initial state without animation
        applyState(step.state, animated = false)
    }

    fun animateToState(newState: TimelineStepState, delay: Long = 0) {
        if (newState == currentState) return

        postDelayed({
            applyState(newState, animated = true)
        }, delay)
    }

    private fun applyState(state: TimelineStepState, animated: Boolean) {
        currentState = state

        when (state) {
            TimelineStepState.COMPLETED -> {
                if (animated) {
                    animateCircleToCompleted()
                } else {
                    setCircleCompleted()
                }
            }
            TimelineStepState.ACTIVE -> {
                if (animated) {
                    animateCircleToActive()
                } else {
                    setCircleActive()
                }
            }
            TimelineStepState.PENDING -> {
                setCirclePending()
            }
            TimelineStepState.CANCELLED -> {
                if (animated) {
                    animateCircleToCancelled()
                } else {
                    setCircleCancelled()
                }
            }
        }
    }

    private fun animateCircleToCompleted() {
        // Scale animation on circle
        binding.circleContainer.animate()
            .scaleX(1.15f)
            .scaleY(1.15f)
            .setDuration(200)
            .withEndAction {
                setCircleCompleted()
                binding.circleContainer.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(200)
                    .start()
            }
            .start()

        // Animate connector fill
        animateConnectorFill()
    }

    private fun animateCircleToActive() {
        // Pulse animation for active step
        binding.circleContainer.animate()
            .scaleX(1.1f)
            .scaleY(1.1f)
            .setDuration(300)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .withEndAction {
                setCircleActive()
                binding.circleContainer.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(300)
                    .start()
            }
            .start()
    }

    private fun animateCircleToCancelled() {
        // Fade to cancelled state
        binding.circleContainer.alpha = 1f
        binding.circleContainer.animate()
            .alpha(0.5f)
            .setDuration(300)
            .withEndAction {
                setCircleCancelled()
                binding.circleContainer.alpha = 1f
            }
            .start()
    }

    private fun animateConnectorFill() {
        // Animate connector from pending color to gold
        val startColor = ContextCompat.getColor(context, R.color.tracking_pending)
        val endColor = ContextCompat.getColor(context, R.color.tracking_gold)

        connectorAnimator?.cancel()
        connectorAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 550 // From design tokens
            addUpdateListener { animator ->
                val fraction = animator.animatedValue as Float
                val color = blendColors(startColor, endColor, fraction)
                binding.connectorLine.setBackgroundColor(color)
            }
            start()
        }
    }

    private fun setCircleCompleted() {
        binding.circleBackground.setBackgroundResource(R.drawable.bg_circle_completed)
        binding.ivIcon.setColorFilter(ContextCompat.getColor(context, R.color.background))
        binding.connectorLine.setBackgroundColor(ContextCompat.getColor(context, R.color.tracking_gold))
        
        // Show and start glow effect
        binding.glowBackground.visibility = View.VISIBLE
        (binding.glowBackground as? GoldGlowView)?.startGlow()
    }

    private fun setCircleActive() {
        binding.circleBackground.setBackgroundResource(R.drawable.bg_circle_completed)
        binding.ivIcon.setColorFilter(ContextCompat.getColor(context, R.color.background))
        binding.connectorLine.setBackgroundColor(ContextCompat.getColor(context, R.color.tracking_pending))
    }

    private fun setCirclePending() {
        binding.circleBackground.setBackgroundResource(R.drawable.bg_circle_pending)
        binding.ivIcon.setColorFilter(ContextCompat.getColor(context, R.color.textSecondary))
        binding.connectorLine.setBackgroundColor(ContextCompat.getColor(context, R.color.tracking_pending))
    }

    private fun setCircleCancelled() {
        binding.circleBackground.setBackgroundResource(R.drawable.bg_circle_cancelled)
        binding.ivIcon.setColorFilter(ContextCompat.getColor(context, android.R.color.white))
        binding.connectorLine.setBackgroundColor(ContextCompat.getColor(context, R.color.tracking_danger))
    }

    private fun getIconResource(icon: com.hookahdrop.app.data.TimelineIcon): Int {
        return when (icon) {
            com.hookahdrop.app.data.TimelineIcon.CHECK -> R.drawable.ic_tracking_check
            com.hookahdrop.app.data.TimelineIcon.BOX -> R.drawable.ic_tracking_box
            com.hookahdrop.app.data.TimelineIcon.TRUCK -> R.drawable.ic_tracking_truck
            com.hookahdrop.app.data.TimelineIcon.FLAG -> R.drawable.ic_tracking_flag
            com.hookahdrop.app.data.TimelineIcon.X -> R.drawable.ic_tracking_x
        }
    }

    private fun blendColors(from: Int, to: Int, ratio: Float): Int {
        val inverseRatio = 1 - ratio
        val r = Color.red(to) * ratio + Color.red(from) * inverseRatio
        val g = Color.green(to) * ratio + Color.green(from) * inverseRatio
        val b = Color.blue(to) * ratio + Color.blue(from) * inverseRatio
        return Color.rgb(r.toInt(), g.toInt(), b.toInt())
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        connectorAnimator?.cancel()
        connectorAnimator = null
    }
}
