package com.hookahdrop.app.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.hookahdrop.app.R
import kotlin.math.cos
import kotlin.math.sin
import kotlin.random.Random

/**
 * Particle burst animation for DELIVERED status
 * Creates an explosion of gold particles radiating outward
 */
class ParticleBurstView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private data class Particle(
        var x: Float,
        var y: Float,
        val angle: Float,
        val speed: Float,
        val size: Float,
        var alpha: Float = 1f
    )

    private val particles = mutableListOf<Particle>()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.tracking_gold)
        style = Paint.Style.FILL
    }

    private var animator: ValueAnimator? = null
    private val particleCount = 30

    fun burst(centerX: Float, centerY: Float) {
        // Clear old particles
        particles.clear()

        // Create new particles radiating outward
        repeat(particleCount) {
            val angle = (360f / particleCount) * it + Random.nextFloat() * 10f
            val speed = 2f + Random.nextFloat() * 3f
            val size = 4f + Random.nextFloat() * 6f

            particles.add(
                Particle(
                    x = centerX,
                    y = centerY,
                    angle = angle,
                    speed = speed,
                    size = size
                )
            )
        }

        // Animate particles
        animator?.cancel()
        animator = ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1000 // 1 second burst
            addUpdateListener { animation ->
                val progress = animation.animatedValue as Float
                
                particles.forEach { particle ->
                    // Move outward
                    val distance = particle.speed * progress * 100f
                    particle.x += cos(Math.toRadians(particle.angle.toDouble())).toFloat() * particle.speed
                    particle.y += sin(Math.toRadians(particle.angle.toDouble())).toFloat() * particle.speed
                    
                    // Fade out
                    particle.alpha = 1f - progress
                }
                
                invalidate()
            }
            start()
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        particles.forEach { particle ->
            paint.alpha = (particle.alpha * 255).toInt()
            canvas.drawCircle(particle.x, particle.y, particle.size, paint)
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        animator?.cancel()
        animator = null
    }
}
