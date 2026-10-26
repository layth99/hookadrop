package com.hookahdrop.app.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.hookahdrop.app.R

/**
 * Shimmer effect for delivery window card
 * Gold gradient sweeps across horizontally
 */
class ShimmerView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val shimmerPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var shimmerX = 0f
    private var animator: ValueAnimator? = null
    private val goldColor = ContextCompat.getColor(context, R.color.tracking_gold)

    fun startShimmer() {
        stopShimmer()
        
        animator = ValueAnimator.ofFloat(-width.toFloat(), width.toFloat() * 2).apply {
            duration = 2000 // 2 second sweep
            repeatCount = ValueAnimator.INFINITE
            addUpdateListener { animation ->
                shimmerX = animation.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    fun stopShimmer() {
        animator?.cancel()
        animator = null
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        updateShader()
    }

    private fun updateShader() {
        if (width > 0) {
            val shimmerWidth = width * 0.3f
            shimmerPaint.shader = LinearGradient(
                0f, 0f, shimmerWidth, 0f,
                intArrayOf(
                    Color.TRANSPARENT,
                    Color.argb(40, Color.red(goldColor), Color.green(goldColor), Color.blue(goldColor)),
                    Color.TRANSPARENT
                ),
                floatArrayOf(0f, 0.5f, 1f),
                Shader.TileMode.CLAMP
            )
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        if (shimmerX > -width && shimmerX < width * 2) {
            canvas.save()
            canvas.translate(shimmerX, 0f)
            canvas.drawRect(0f, 0f, width * 0.3f, height.toFloat(), shimmerPaint)
            canvas.restore()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopShimmer()
    }
}
