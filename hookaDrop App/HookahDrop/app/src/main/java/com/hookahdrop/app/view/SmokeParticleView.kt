package com.hookahdrop.app.view

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import kotlin.random.Random

class SmokeParticleView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr), Runnable {

    private data class Particle(
        var x: Float,
        var y: Float,
        var vx: Float,
        var vy: Float,
        var alpha: Float,
        var size: Float,
        val type: ParticleType,
        val color: Int,
        var life: Float,
        val maxLife: Float
    )

    private enum class ParticleType { SMOKE, SPARK }

    private val particles = mutableListOf<Particle>()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private var isPaused = false
    private val maxParticles = 110

    // Spawn zones
    var coalSpawnX = 0f
    var coalSpawnY = 0f

    fun pause() {
        isPaused = true
        removeCallbacks(this)
    }

    fun resume() {
        if (!isPaused) return
        isPaused = false
        post(this)
    }

    fun spawnSmoke(originX: Float, originY: Float, count: Int = 5) {
        repeat(count) {
            if (particles.size >= maxParticles) return@repeat
            
            val particle = Particle(
                x = originX + Random.nextFloat() * 20 - 10,
                y = originY,
                vx = Random.nextFloat() * 20 - 10,
                vy = -Random.nextFloat() * 40 - 30,
                alpha = 0f,
                size = Random.nextFloat() * 15 + 10,
                type = ParticleType.SMOKE,
                color = 0xFF9FB7D0.toInt(),
                life = 0f,
                maxLife = Random.nextFloat() * 3f + 2f
            )
            particles.add(particle)
        }
    }

    fun spawnSpark(originX: Float, originY: Float, count: Int = 2) {
        repeat(count) {
            if (particles.size >= maxParticles) return@repeat
            
            val colors = listOf(0xFFF5A524.toInt(), 0xFFFFD27A.toInt(), 0xFF22B8F0.toInt())
            val particle = Particle(
                x = originX + Random.nextFloat() * 15 - 7.5f,
                y = originY,
                vx = Random.nextFloat() * 30 - 15,
                vy = -Random.nextFloat() * 50 - 40,
                alpha = 0f,
                size = Random.nextFloat() * 2 + 2,
                type = ParticleType.SPARK,
                color = colors.random(),
                life = 0f,
                maxLife = Random.nextFloat() * 2f + 1.5f
            )
            particles.add(particle)
        }
    }

    override fun run() {
        if (!isPaused) {
            update()
            invalidate()
            postOnAnimation(this)
        }
    }

    private fun update() {
        val dt = 0.016f // ~60fps
        val iterator = particles.iterator()
        
        while (iterator.hasNext()) {
            val p = iterator.next()
            
            // Update position
            p.x += p.vx * dt
            p.y += p.vy * dt
            
            // Update velocity (slow down)
            p.vx *= 0.98f
            p.vy *= 0.99f
            
            // Update life
            p.life += dt
            
            // Update alpha (fade in, then fade out)
            if (p.life < 0.3f) {
                p.alpha = p.life / 0.3f
            } else if (p.life > p.maxLife - 0.5f) {
                p.alpha = (p.maxLife - p.life) / 0.5f
            } else {
                p.alpha = 1f
            }
            
            // Apply alpha limits
            p.alpha = p.alpha.coerceIn(0f, if (p.type == ParticleType.SMOKE) 0.15f else 0.8f)
            
            // Remove dead particles
            if (p.life >= p.maxLife || p.y < -100) {
                iterator.remove()
            }
        }
        
        // Spawn ambient particles from coal area if set
        if (coalSpawnX > 0 && coalSpawnY > 0 && particles.size < maxParticles - 5 && Random.nextFloat() < 0.3f) {
            spawnSmoke(coalSpawnX, coalSpawnY, 1)
            if (Random.nextFloat() < 0.2f) {
                spawnSpark(coalSpawnX, coalSpawnY, 1)
            }
        }
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        particles.forEach { p ->
            paint.alpha = (255 * p.alpha).toInt()
            
            when (p.type) {
                ParticleType.SMOKE -> {
                    // Soft smoke circle
                    paint.color = p.color
                    paint.maskFilter = BlurMaskFilter(p.size * 0.6f, BlurMaskFilter.Blur.NORMAL)
                    canvas.drawCircle(p.x, p.y, p.size, paint)
                    paint.maskFilter = null
                }
                ParticleType.SPARK -> {
                    // Small bright spark
                    paint.color = p.color
                    val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
                        shader = RadialGradient(
                            p.x, p.y, p.size * 2,
                            intArrayOf(p.color, Color.TRANSPARENT),
                            floatArrayOf(0f, 1f),
                            Shader.TileMode.CLAMP
                        )
                        alpha = (255 * p.alpha).toInt()
                    }
                    canvas.drawCircle(p.x, p.y, p.size * 2, glowPaint)
                    canvas.drawCircle(p.x, p.y, p.size, paint)
                }
            }
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        resume()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        pause()
    }
}
