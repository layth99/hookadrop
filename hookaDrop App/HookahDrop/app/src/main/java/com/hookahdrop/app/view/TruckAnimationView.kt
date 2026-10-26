package com.hookahdrop.app.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.Path
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.hookahdrop.app.R

/**
 * Animated truck icon that slides horizontally in a loop
 * Used in courier card for OUT_FOR_DELIVERY status
 */
class TruckAnimationView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val truckPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 4f
        strokeCap = Paint.Cap.ROUND
        strokeJoin = Paint.Join.ROUND
        color = ContextCompat.getColor(context, R.color.tracking_gold)
    }

    private val truckPath = Path()
    private var truckX = 0f
    private var animator: ValueAnimator? = null

    fun startAnimation() {
        stopAnimation()
        
        animator = ValueAnimator.ofFloat(-100f, width + 100f).apply {
            duration = 3000 // 3 second slide across
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
            addUpdateListener { animation ->
                truckX = animation.animatedValue as Float
                invalidate()
            }
            start()
        }
    }

    fun stopAnimation() {
        animator?.cancel()
        animator = null
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        buildTruckPath()
    }

    private fun buildTruckPath() {
        truckPath.reset()
        val centerY = height / 2f
        val truckHeight = height * 0.6f
        val truckWidth = truckHeight * 1.5f

        // Truck body (simplified from SVG)
        truckPath.moveTo(0f, centerY - truckHeight / 4)
        truckPath.lineTo(truckWidth * 0.6f, centerY - truckHeight / 4)
        truckPath.lineTo(truckWidth * 0.6f, centerY + truckHeight / 4)
        truckPath.lineTo(0f, centerY + truckHeight / 4)
        truckPath.close()

        // Truck cab
        truckPath.moveTo(truckWidth * 0.6f, centerY - truckHeight / 6)
        truckPath.lineTo(truckWidth, centerY - truckHeight / 6)
        truckPath.lineTo(truckWidth, centerY + truckHeight / 4)

        // Wheels
        truckPath.addCircle(truckWidth * 0.3f, centerY + truckHeight / 4, truckHeight * 0.15f, Path.Direction.CW)
        truckPath.addCircle(truckWidth * 0.8f, centerY + truckHeight / 4, truckHeight * 0.15f, Path.Direction.CW)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        canvas.save()
        canvas.translate(truckX, 0f)
        canvas.drawPath(truckPath, truckPaint)
        canvas.restore()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopAnimation()
    }
}
