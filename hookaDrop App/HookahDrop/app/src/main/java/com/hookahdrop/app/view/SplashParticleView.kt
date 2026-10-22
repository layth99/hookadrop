package com.hookahdrop.app.view

import android.content.Context
import android.graphics.*
import android.provider.Settings
import android.util.AttributeSet
import android.view.Choreographer
import android.view.View
import kotlin.math.*
import kotlin.random.Random

/**
 * Full particle system for splash screen: smoke wisps, plumes, embers, gold dust, sparks.
 * 60fps Choreographer-driven, max 340 particles, frame-rate independent.
 */
class SplashParticleView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    companion object {
        const val MAX_PARTICLES = 340
        const val SPRITE_SIZE = 128
    }
    
    enum class ParticleType {
        SMOKE_WISP, BOTTOM_PLUME, EMBER, GOLD_DUST, SPARK
    }
    
    private data class Particle(
        var active: Boolean = false,
        var type: ParticleType = ParticleType.SMOKE_WISP,
        var x: Float = 0f,
        var y: Float = 0f,
        var vx: Float = 0f,
        var vy: Float = 0f,
        var radius: Float = 0f,
        var radiusGrowth: Float = 0f,
        var alpha: Float = 0f,
        var peakAlpha: Float = 0f,
        var life: Float = 0f,
        var maxLife: Float = 0f,
        var phase: Float = 0f,
        var color: Int = Color.WHITE
    )
    
    private val particles = Array(MAX_PARTICLES) { Particle() }
    private var particleCount = 0
    
    // Theme color (RGB 0..1)
    private var themeColorR = 201f / 255f
    private var themeColorG = 162f / 255f
    private var themeColorB = 39f / 255f
    
    // Pre-rendered soft sprite
    private var spriteBitmap: Bitmap? = null
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val screenPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val addPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    
    // Choreographer frame clock
    private var isActive = false
    private var lastFrameNanos: Long = 0
    private var elapsedMs: Long = 0
    private var emissionActive = false
    private var reduceMotion = false
    
    // Emission rate multiplier for small screens
    private var emissionMultiplier = 1f
    
    init {
        reduceMotion = try {
            Settings.Global.getFloat(
                context.contentResolver,
                Settings.Global.ANIMATOR_DURATION_SCALE, 1f
            ) <= 0.5f
        } catch (e: Exception) {
            false
        }
        
        // Create soft radial gradient sprite
        createSprite()
        
        // Setup blend mode paints
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            screenPaint.blendMode = BlendMode.SCREEN
            addPaint.blendMode = BlendMode.PLUS
        } else {
            screenPaint.xfermode = PorterDuffXfermode(PorterDuff.Mode.SCREEN)
            addPaint.xfermode = PorterDuffXfermode(PorterDuff.Mode.ADD)
        }
    }
    
    private fun createSprite() {
        val bitmap = Bitmap.createBitmap(SPRITE_SIZE, SPRITE_SIZE, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        
        val center = SPRITE_SIZE / 2f
        val radius = center
        
        val gradient = RadialGradient(
            center, center, radius,
            intArrayOf(Color.WHITE, Color.TRANSPARENT),
            floatArrayOf(0f, 1f),
            Shader.TileMode.CLAMP
        )
        
        val p = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = gradient
        }
        
        canvas.drawCircle(center, center, radius, p)
        spriteBitmap = bitmap
    }
    
    fun updateThemeColor(r: Float, g: Float, b: Float) {
        themeColorR = r
        themeColorG = g
        themeColorB = b
    }
    
    fun startEmission() {
        if (reduceMotion) return
        emissionActive = true
    }
    
    fun stopEmission() {
        emissionActive = false
    }
    
    fun burstSparks(count: Int, baseSpeed: Float) {
        if (reduceMotion) return
        
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        val centerX = w / 2f
        val centerY = h * 0.40f // Logo center
        
        repeat(count) {
            if (particleCount >= MAX_PARTICLES) return@repeat
            
            val particle = particles.firstOrNull { !it.active } ?: return@repeat
            
            val angle = Random.nextFloat() * 2f * PI.toFloat()
            val speed = baseSpeed * Random.nextFloat() * (1.4f - 0.4f) + 0.4f
            
            particle.active = true
            particle.type = ParticleType.SPARK
            particle.x = centerX
            particle.y = centerY
            particle.vx = cos(angle) * speed * resources.displayMetrics.density
            particle.vy = sin(angle) * speed * resources.displayMetrics.density
            particle.radius = (Random.nextFloat() * (2.4f - 1.2f) + 1.2f) * resources.displayMetrics.density
            particle.radiusGrowth = 0f
            particle.life = 0f
            particle.maxLife = Random.nextFloat() * (110f - 50f) + 50f
            particle.phase = Random.nextFloat() * 2f * PI.toFloat()
            
            // Theme color mixed 60% with white
            val mixR = themeColorR * 0.6f + 1f * 0.4f
            val mixG = themeColorG * 0.6f + 1f * 0.4f
            val mixB = themeColorB * 0.6f + 1f * 0.4f
            particle.color = Color.rgb(
                (mixR * 255).toInt().coerceIn(0, 255),
                (mixG * 255).toInt().coerceIn(0, 255),
                (mixB * 255).toInt().coerceIn(0, 255)
            )
            particle.peakAlpha = 1f
            
            particleCount++
        }
    }
    
    fun burstPuffs(count: Int) {
        if (reduceMotion) return
        
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        val centerX = w / 2f
        val centerY = h * 0.40f
        
        repeat(count) {
            if (particleCount >= MAX_PARTICLES) return@repeat
            
            val particle = particles.firstOrNull { !it.active } ?: return@repeat
            
            val angle = Random.nextFloat() * 2f * PI.toFloat()
            val speed = 0.9f
            
            particle.active = true
            particle.type = ParticleType.SMOKE_WISP
            particle.x = centerX
            particle.y = centerY
            particle.vx = cos(angle) * speed * resources.displayMetrics.density
            particle.vy = sin(angle) * speed * resources.displayMetrics.density
            particle.radius = (Random.nextFloat() * (60f - 30f) + 30f) * resources.displayMetrics.density
            particle.radiusGrowth = 0f
            particle.life = 0f
            particle.maxLife = Random.nextFloat() * (140f - 90f) + 90f
            particle.phase = Random.nextFloat() * 2f * PI.toFloat()
            particle.peakAlpha = 0.2f
            
            // Smoke color (average of theme and light blue)
            val avgR = (themeColorR + 205f / 255f) / 2f
            val avgG = (themeColorG + 222f / 255f) / 2f
            val avgB = (themeColorB + 244f / 255f) / 2f
            particle.color = Color.rgb(
                (avgR * 255).toInt(),
                (avgG * 255).toInt(),
                (avgB * 255).toInt()
            )
            
            particleCount++
        }
    }
    
    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        
        // Reduce emission by 50% on screens < 360dp
        emissionMultiplier = if (w / resources.displayMetrics.density < 360f) 0.5f else 1f
    }
    
    fun pause() {
        isActive = false
    }
    
    fun resume() {
        if (!isActive && !reduceMotion) {
            isActive = true
            lastFrameNanos = 0
            Choreographer.getInstance().postFrameCallback(frameCallback)
        }
    }
    
    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!isActive) return
            
            if (lastFrameNanos == 0L) {
                lastFrameNanos = frameTimeNanos
            }
            
            val dt = ((frameTimeNanos - lastFrameNanos) / 1_000_000).toFloat() // ms
            lastFrameNanos = frameTimeNanos
            elapsedMs += dt.toLong()
            
            updateParticles(dt)
            if (emissionActive) emitParticles()
            
            invalidate()
            Choreographer.getInstance().postFrameCallback(this)
        }
    }
    
    private fun updateParticles(dt: Float) {
        val frameFactor = dt / 16.67f // Frame-rate independent scaling
        val w = width.toFloat()
        val h = height.toFloat()
        
        particles.forEach { p ->
            if (!p.active) return@forEach
            
            // Update life
            p.life += 1f * frameFactor
            if (p.life >= p.maxLife) {
                p.active = false
                particleCount--
                return@forEach
            }
            
            // Update position
            p.x += p.vx * frameFactor
            p.y += p.vy * frameFactor
            
            when (p.type) {
                ParticleType.SMOKE_WISP, ParticleType.BOTTOM_PLUME -> {
                    // Velocity damping
                    p.vx *= 0.99f.pow(frameFactor)
                    p.vy *= 0.99f.pow(frameFactor)
                    
                    // Lateral swirl
                    p.vx += sin(p.life * 0.05f + p.y * 0.02f) * 0.012f * frameFactor * resources.displayMetrics.density
                    
                    // Radius growth
                    p.radius += 0.12f * frameFactor * resources.displayMetrics.density
                    
                    // Alpha: sin(pi * life/maxLife)
                    val u = p.life / p.maxLife
                    p.alpha = sin(PI.toFloat() * u) * p.peakAlpha
                }
                
                ParticleType.EMBER, ParticleType.GOLD_DUST -> {
                    // Sway
                    p.x += sin(p.life * 0.04f + p.phase) * 0.25f * frameFactor * resources.displayMetrics.density
                    
                    // Flicker alpha
                    val u = p.life / p.maxLife
                    val flicker = 0.5f + 0.5f * sin(p.life * 0.15f + p.phase)
                    p.alpha = sin(PI.toFloat() * u) * flicker * (if (p.type == ParticleType.GOLD_DUST) 0.8f else 1f)
                }
                
                ParticleType.SPARK -> {
                    // Gravity
                    p.vy += 0.003f * frameFactor * resources.displayMetrics.density
                    
                    // Damping
                    p.vx *= 0.99f.pow(frameFactor)
                    p.vy *= 0.99f.pow(frameFactor)
                    
                    // Alpha fade
                    val u = p.life / p.maxLife
                    p.alpha = sin(PI.toFloat() * u)
                }
            }
        }
    }
    
    private fun emitParticles() {
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        val centerX = w / 2f
        val centerY = h * 0.40f
        
        // Logo smoke wisps (40% per frame, starting at t=0.9s)
        if (elapsedMs >= 900 && Random.nextFloat() < 0.40f * emissionMultiplier) {
            if (particleCount < MAX_PARTICLES) {
                val particle = particles.firstOrNull { !it.active } ?: return
                
                particle.active = true
                particle.type = ParticleType.SMOKE_WISP
                particle.x = centerX + (Random.nextFloat() * 50f - 25f) * resources.displayMetrics.density
                particle.y = centerY - 30f * resources.displayMetrics.density
                particle.vx = (Random.nextFloat() * 0.25f - 0.125f) * resources.displayMetrics.density
                particle.vy = -(Random.nextFloat() * (0.7f - 0.3f) + 0.3f) * resources.displayMetrics.density
                particle.radius = (Random.nextFloat() * (48f - 26f) + 26f) * resources.displayMetrics.density
                particle.radiusGrowth = 0.12f * resources.displayMetrics.density
                particle.life = 0f
                particle.maxLife = Random.nextFloat() * (260f - 170f) + 170f
                particle.phase = Random.nextFloat() * 2f * PI.toFloat()
                particle.peakAlpha = 0.16f
                
                // Average of theme and (205,222,244)
                val avgR = (themeColorR + 205f / 255f) / 2f
                val avgG = (themeColorG + 222f / 255f) / 2f
                val avgB = (themeColorB + 244f / 255f) / 2f
                particle.color = Color.rgb(
                    (avgR * 255).toInt(),
                    (avgG * 255).toInt(),
                    (avgB * 255).toInt()
                )
                
                particleCount++
            }
        }
        
        // Bottom plumes (20% per frame)
        if (Random.nextFloat() < 0.20f * emissionMultiplier) {
            if (particleCount < MAX_PARTICLES) {
                val particle = particles.firstOrNull { !it.active } ?: return
                
                particle.active = true
                particle.type = ParticleType.BOTTOM_PLUME
                particle.x = Random.nextFloat() * w
                particle.y = h + 30f * resources.displayMetrics.density
                particle.vx = (Random.nextFloat() * 0.30f - 0.15f) * resources.displayMetrics.density
                particle.vy = -(Random.nextFloat() * (1.0f - 0.5f) + 0.5f) * resources.displayMetrics.density
                particle.radius = (Random.nextFloat() * (90f - 50f) + 50f) * resources.displayMetrics.density
                particle.radiusGrowth = 0.12f * resources.displayMetrics.density
                particle.life = 0f
                particle.maxLife = Random.nextFloat() * (620f - 420f) + 420f
                particle.phase = Random.nextFloat() * 2f * PI.toFloat()
                particle.peakAlpha = 0.045f
                
                val avgR = (themeColorR + 205f / 255f) / 2f
                val avgG = (themeColorG + 222f / 255f) / 2f
                val avgB = (themeColorB + 244f / 255f) / 2f
                particle.color = Color.rgb(
                    (avgR * 255).toInt(),
                    (avgG * 255).toInt(),
                    (avgB * 255).toInt()
                )
                
                particleCount++
            }
        }
        
        // Embers (10% per frame x 35%)
        if (Random.nextFloat() < 0.10f * 0.35f * emissionMultiplier) {
            if (particleCount < MAX_PARTICLES) {
                val particle = particles.firstOrNull { !it.active } ?: return
                
                particle.active = true
                particle.type = ParticleType.EMBER
                particle.x = Random.nextFloat() * w
                particle.y = h
                particle.vx = 0f
                particle.vy = -(Random.nextFloat() * (1.4f - 0.6f) + 0.6f) * resources.displayMetrics.density
                particle.radius = (Random.nextFloat() * (2.4f - 1.4f) + 1.4f) * resources.displayMetrics.density
                particle.radiusGrowth = 0f
                particle.life = 0f
                particle.maxLife = h / (0.9f * resources.displayMetrics.density)
                particle.phase = Random.nextFloat() * 2f * PI.toFloat()
                particle.peakAlpha = 1f
                particle.color = Color.rgb(255, 140, 50)
                
                particleCount++
            }
        }
        
        // Gold dust (10% per frame x 65%)
        if (Random.nextFloat() < 0.10f * 0.65f * emissionMultiplier) {
            if (particleCount < MAX_PARTICLES) {
                val particle = particles.firstOrNull { !it.active } ?: return
                
                particle.active = true
                particle.type = ParticleType.GOLD_DUST
                particle.x = Random.nextFloat() * w
                particle.y = Random.nextFloat() * h
                particle.vx = 0f
                particle.vy = -(Random.nextFloat() * (0.25f - 0.1f) + 0.1f) * resources.displayMetrics.density
                particle.radius = (Random.nextFloat() * (2f - 0.8f) + 0.8f) * resources.displayMetrics.density
                particle.radiusGrowth = 0f
                particle.life = 0f
                particle.maxLife = Random.nextFloat() * (400f - 200f) + 200f
                particle.phase = Random.nextFloat() * 2f * PI.toFloat()
                particle.peakAlpha = 0.8f
                particle.color = Color.rgb(255, 215, 120)
                
                particleCount++
            }
        }
    }
    
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        if (spriteBitmap == null) return
        
        val sprite = spriteBitmap!!
        val spriteHalf = SPRITE_SIZE / 2f
        
        particles.forEach { p ->
            if (!p.active || p.alpha <= 0f) return@forEach
            
            val selectedPaint = when (p.type) {
                ParticleType.SMOKE_WISP, ParticleType.BOTTOM_PLUME -> screenPaint
                else -> addPaint
            }
            
            // Tint sprite with particle color and alpha
            val colorFilter = PorterDuffColorFilter(
                Color.argb((p.alpha * 255).toInt(), Color.red(p.color), Color.green(p.color), Color.blue(p.color)),
                PorterDuff.Mode.MULTIPLY
            )
            selectedPaint.colorFilter = colorFilter
            
            // Draw sprite scaled to particle radius
            val scale = p.radius * 2f / SPRITE_SIZE
            canvas.save()
            canvas.translate(p.x, p.y)
            canvas.scale(scale, scale)
            canvas.drawBitmap(sprite, -spriteHalf, -spriteHalf, selectedPaint)
            canvas.restore()
        }
        
        screenPaint.colorFilter = null
        addPaint.colorFilter = null
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        isActive = false
        spriteBitmap?.recycle()
    }
}
