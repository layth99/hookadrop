package com.hookahdrop.app.view

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.provider.Settings
import android.util.AttributeSet
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import kotlin.math.pow

/**
 * Renders 3 soft radial gradient orbs + aura behind the logo.
 * All orbs drift with slow animations and respond to theme color changes.
 */
class SplashOrbsView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    
    // Theme color (RGB 0..1)
    private var themeColorR = 201f / 255f
    private var themeColorG = 162f / 255f
    private var themeColorB = 39f / 255f
    
    // Orbs state
    private data class OrbState(
        var baseX: Float,
        var baseY: Float,
        var size: Float,
        var driftX: Float = 0f,
        var driftY: Float = 0f,
        var scale: Float = 1f,
        var alpha: Float = 0f
    )
    
    private val orbs = listOf(
        OrbState(0f, 0f, 340f), // Orb 1
        OrbState(0f, 0f, 300f), // Orb 2
        OrbState(0f, 0f, 380f)  // Orb 3
    )
    
    // Aura state
    private var auraAlpha = 0f
    private var auraScale = 0.4f
    private var auraBrightness = 1f
    
    private val animators = mutableListOf<Animator>()
    private var reduceMotion = false
    
    init {
        reduceMotion = try {
            Settings.Global.getFloat(
                context.contentResolver,
                Settings.Global.ANIMATOR_DURATION_SCALE, 1f
            ) <= 0.5f
        } catch (e: Exception) {
            false
        }
    }
    
    fun updateThemeColor(r: Float, g: Float, b: Float) {
        themeColorR = r
        themeColorG = g
        themeColorB = b
        invalidate()
    }
    
    fun startAnimations() {
        if (reduceMotion) {
            // In reduce-motion mode, just fade in immediately
            orbs.forEach { it.alpha = 1f }
            auraAlpha = 1f
            auraScale = 1f
            invalidate()
            return
        }
        
        // Orbs fade in 1.6s starting at 0.2s (handled by SplashActivity timing)
        orbs.forEach { orb ->
            ValueAnimator.ofFloat(0f, 1f).apply {
                duration = 1600
                interpolator = AccelerateDecelerateInterpolator()
                addUpdateListener {
                    orb.alpha = it.animatedValue as Float
                    invalidate()
                }
                start()
            }.also { animators.add(it) }
        }
        
        // Start drift animations for each orb
        startOrbDrift()
    }
    
    fun startAuraAnimations() {
        if (reduceMotion) {
            auraAlpha = 1f
            auraScale = 1f
            invalidate()
            return
        }
        
        // Aura entrance: alpha 0 + scale 0.4 → alpha 1 + scale 1 over 1.6s
        // Starts at 0.6s (handled by SplashActivity timing)
        AnimatorSet().apply {
            playTogether(
                ValueAnimator.ofFloat(0f, 1f).apply {
                    duration = 1600
                    addUpdateListener {
                        auraAlpha = it.animatedValue as Float
                        invalidate()
                    }
                },
                ValueAnimator.ofFloat(0.4f, 1f).apply {
                    duration = 1600
                    // cubic-bezier(.22,1,.36,1) approximation
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener {
                        auraScale = it.animatedValue as Float
                    }
                }
            )
            start()
        }.also { animators.add(it) }
    }
    
    fun startAuraBreathing() {
        if (reduceMotion) return
        
        // Aura breathing: brightness 0.8 to 1.4, 5s ease-in-out alternate
        // Starts at 2.2s (handled by SplashActivity timing)
        ValueAnimator.ofFloat(0.8f, 1.4f).apply {
            duration = 5000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                auraBrightness = it.animatedValue as Float
                invalidate()
            }
            start()
        }.also { animators.add(it) }
    }
    
    private fun startOrbDrift() {
        // Orb 1: drift (+90, +120) dp, scale 1.25, 13s alternate
        AnimatorSet().apply {
            playTogether(
                ValueAnimator.ofFloat(0f, 90f * resources.displayMetrics.density).apply {
                    duration = 13000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener { orbs[0].driftX = it.animatedValue as Float }
                },
                ValueAnimator.ofFloat(0f, 120f * resources.displayMetrics.density).apply {
                    duration = 13000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener { orbs[0].driftY = it.animatedValue as Float }
                },
                ValueAnimator.ofFloat(1f, 1.25f).apply {
                    duration = 13000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener { orbs[0].scale = it.animatedValue as Float; invalidate() }
                }
            )
            start()
        }.also { animators.add(it) }
        
        // Orb 2: drift (-110, -90) dp, scale 0.85, 17s alternate
        AnimatorSet().apply {
            playTogether(
                ValueAnimator.ofFloat(0f, -110f * resources.displayMetrics.density).apply {
                    duration = 17000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener { orbs[1].driftX = it.animatedValue as Float }
                },
                ValueAnimator.ofFloat(0f, -90f * resources.displayMetrics.density).apply {
                    duration = 17000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener { orbs[1].driftY = it.animatedValue as Float }
                },
                ValueAnimator.ofFloat(1f, 0.85f).apply {
                    duration = 17000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener { orbs[1].scale = it.animatedValue as Float; invalidate() }
                }
            )
            start()
        }.also { animators.add(it) }
        
        // Orb 3: drift (-80, -70) dp, scale 1.2, 15s alternate
        AnimatorSet().apply {
            playTogether(
                ValueAnimator.ofFloat(0f, -80f * resources.displayMetrics.density).apply {
                    duration = 15000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener { orbs[2].driftX = it.animatedValue as Float }
                },
                ValueAnimator.ofFloat(0f, -70f * resources.displayMetrics.density).apply {
                    duration = 15000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener { orbs[2].driftY = it.animatedValue as Float }
                },
                ValueAnimator.ofFloat(1f, 1.2f).apply {
                    duration = 15000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    addUpdateListener { orbs[2].scale = it.animatedValue as Float; invalidate() }
                }
            )
            start()
        }.also { animators.add(it) }
    }
    
    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        
        val wf = w.toFloat()
        val hf = h.toFloat()
        val dp = resources.displayMetrics.density
        
        // Orb 1: left -120 dp, top 4% height, 340dp
        orbs[0].baseX = -120 * dp
        orbs[0].baseY = hf * 0.04f
        
        // Orb 2: right -130 dp, top 34% height, 300dp
        orbs[1].baseX = wf - (-130 * dp)
        orbs[1].baseY = hf * 0.34f
        
        // Orb 3: left 18%, bottom -170 dp, 380dp
        orbs[2].baseX = wf * 0.18f
        orbs[2].baseY = hf - (-170 * dp)
    }
    
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        val dp = resources.displayMetrics.density
        
        // Theme color for gradients
        val themeColor = Color.argb(255, 
            (themeColorR * 255).toInt(),
            (themeColorG * 255).toInt(),
            (themeColorB * 255).toInt())
        
        // Draw aura (centered at 50% width / 40% height, 380dp)
        if (auraAlpha > 0f) {
            val auraX = w / 2f
            val auraY = h * 0.40f
            val auraSize = 380f * dp * auraScale
            val auraRadius = auraSize / 2f
            
            // Radial gradient: theme alpha .34 at center, .12 at 42%, 0 at 70%
            val auraGradient = RadialGradient(
                auraX, auraY, auraRadius,
                intArrayOf(
                    Color.argb((0.34f * auraAlpha * auraBrightness * 255).toInt(), 
                        (themeColorR * 255).toInt(),
                        (themeColorG * 255).toInt(),
                        (themeColorB * 255).toInt()),
                    Color.argb((0.12f * auraAlpha * auraBrightness * 255).toInt(), 
                        (themeColorR * 255).toInt(),
                        (themeColorG * 255).toInt(),
                        (themeColorB * 255).toInt()),
                    Color.TRANSPARENT
                ),
                floatArrayOf(0f, 0.42f, 0.70f),
                Shader.TileMode.CLAMP
            )
            
            paint.shader = auraGradient
            canvas.drawCircle(auraX, auraY, auraRadius, paint)
        }
        
        // Draw orbs
        orbs.forEachIndexed { index, orb ->
            if (orb.alpha <= 0f) return@forEachIndexed
            
            val x = orb.baseX + orb.driftX
            val y = orb.baseY + orb.driftY
            val size = orb.size * dp * orb.scale
            val radius = size / 2f
            
            // Radial gradient: theme color alpha .34 at center to alpha 0 at 68% radius
            val gradient = RadialGradient(
                x, y, radius,
                intArrayOf(
                    Color.argb((0.34f * orb.alpha * 255).toInt(), 
                        (themeColorR * 255).toInt(),
                        (themeColorG * 255).toInt(),
                        (themeColorB * 255).toInt()),
                    Color.TRANSPARENT
                ),
                floatArrayOf(0f, 0.68f),
                Shader.TileMode.CLAMP
            )
            
            paint.shader = gradient
            canvas.drawCircle(x, y, radius, paint)
        }
        
        paint.shader = null
    }
    
    fun pause() {
        animators.forEach { if (it.isRunning) it.pause() }
    }
    
    fun resume() {
        animators.forEach { if (it.isPaused) it.resume() }
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        animators.forEach { it.cancel() }
        animators.clear()
    }
}
