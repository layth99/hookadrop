package com.hookahdrop.app.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.hookahdrop.app.R

/**
 * Custom view that renders an animated gold glow effect around a circle
 * Used in timeline steps to highlight completed states
 */
class GoldGlowView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val goldColor = ContextCompat.getColor(context, R.color.tracking_gold)
    
    private var glowAlpha = 0f
    private var glowAnimator: ValueAnimator? = null

    fun startGlow() {
        stopGlow()
        glowAnimator = ValueAnimator.ofFloat(0f, 0.3f, 0f).apply {
            duration = 2000 // 2 second pulse
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener { animator ->
                glowAlpha = animator.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    fun stopGlow() {
        glowAnimator?.cancel()
        glowAnimator = null
        glowAlpha = 0f
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        if (glowAlpha > 0) {
            val centerX = width / 2f
            val centerY = height / 2f
            val radius = width / 2f

            // Create radial gradient for glow effect
            val shader = RadialGradient(
                centerX, centerY, radius,
                intArrayOf(
                    Color.argb((glowAlpha * 255).toInt(), Color.red(goldColor), Color.green(goldColor), Color.blue(goldColor)),
                    Color.TRANSPARENT
                ),
                floatArrayOf(0.3f, 1f),
                Shader.TileMode.CLAMP
            )
            glowPaint.shader = shader
            canvas.drawCircle(centerX, centerY, radius, glowPaint)
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopGlow()
    }
}
