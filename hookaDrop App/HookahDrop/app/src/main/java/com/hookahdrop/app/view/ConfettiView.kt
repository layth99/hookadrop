package com.hookahdrop.app.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.hookahdrop.app.R
import kotlin.random.Random

/**
 * Confetti celebration animation for DELIVERED status
 * Colorful rectangles falling from top with rotation
 */
class ConfettiView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private data class Confetto(
        var x: Float,
        var y: Float,
        val width: Float,
        val height: Float,
        val color: Int,
        val speedY: Float,
        val speedX: Float,
        var rotation: Float,
        val rotationSpeed: Float
    )

    private val confetti = mutableListOf<Confetto>()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }

    private val colors = listOf(
        R.color.tracking_gold,
        R.color.accent,
        R.color.textPrimary,
        R.color.tracking_danger
    )

    private var animator: ValueAnimator? = null
    private val confettiCount = 50

    fun celebrate() {
        confetti.clear()

        // Create confetti pieces across the width
        repeat(confettiCount) {
            val x = Random.nextFloat() * width
            val y = -Random.nextFloat() * height * 0.5f // Start above screen
            val color = ContextCompat.getColor(context, colors.random())
            
            confetti.add(
                Confetto(
                    x = x,
                    y = y,
                    width = 8f + Random.nextFloat() * 8f,
                    height = 12f + Random.nextFloat() * 12f,
                    color = color,
                    speedY = 2f + Random.nextFloat() * 4f,
                    speedX = -1f + Random.nextFloat() * 2f,
                    rotation = Random.nextFloat() * 360f,
                    rotationSpeed = -5f + Random.nextFloat() * 10f
                )
            )
        }

        animator?.cancel()
        animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 3000 // 3 seconds to fall
            addUpdateListener {
                var allOffScreen = true
                
                confetti.forEach { piece ->
                    piece.y += piece.speedY
                    piece.x += piece.speedX
                    piece.rotation += piece.rotationSpeed
                    
                    if (piece.y < height + piece.height) {
                        allOffScreen = false
                    }
                }
                
                if (allOffScreen) {
                    cancel()
                    confetti.clear()
                }
                
                invalidate()
            }
            start()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        confetti.forEach { piece ->
            canvas.save()
            canvas.translate(piece.x, piece.y)
            canvas.rotate(piece.rotation)
            
            paint.color = piece.color
            canvas.drawRect(
                -piece.width / 2,
                -piece.height / 2,
                piece.width / 2,
                piece.height / 2,
                paint
            )
            
            canvas.restore()
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        animator?.cancel()
        animator = null
    }
}
