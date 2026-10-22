package com.hookahdrop.app

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Intent
import android.graphics.Color
import android.graphics.RenderEffect
import android.graphics.Shader
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.view.Choreographer
import android.view.View
import android.view.WindowInsetsController
import android.view.animation.AccelerateDecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivitySplashBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.pow

class SplashActivity : AppCompatActivity() {

    companion object {
        const val COLOR_STEP_MS = 2000L
        const val COLOR_SMOOTH = 0.018f
        const val TOTAL_DURATION_MS = 10600L
        
        // Theme colors RGB (gold, rose, lime, royal blue, ice blue)
        val THEME_COLORS = arrayOf(
            floatArrayOf(201f / 255f, 162f / 255f, 39f / 255f),   // Gold
            floatArrayOf(232f / 255f, 92f / 255f, 112f / 255f),   // Rose
            floatArrayOf(168f / 255f, 214f / 255f, 84f / 255f),   // Lime
            floatArrayOf(78f / 255f, 124f / 255f, 232f / 255f),   // Royal blue
            floatArrayOf(40f / 255f, 170f / 255f, 230f / 255f)    // Ice blue
        )
        
        val COLOR_CHANGE_TIMES_MS = longArrayOf(900L, 2900L, 4900L, 6900L)
    }

    private lateinit var b: ActivitySplashBinding
    private lateinit var sessionManager: SessionManager
    
    // Theme color animation
    private var currentColorR = THEME_COLORS[0][0]
    private var currentColorG = THEME_COLORS[0][1]
    private var currentColorB = THEME_COLORS[0][2]
    private var targetColorR = THEME_COLORS[0][0]
    private var targetColorG = THEME_COLORS[0][1]
    private var targetColorB = THEME_COLORS[0][2]
    private var currentColorIndex = 0
    
    // Choreographer frame clock
    private var isActive = false
    private var lastFrameNanos: Long = 0
    private var elapsedMs: Long = 0
    
    private val handler = Handler(Looper.getMainLooper())
    private val animators = mutableListOf<Animator>()
    private var isDestroyed = false
    private var reduceMotion = false
    
    override fun onCreate(savedInstanceState: Bundle?) {
        // Install AndroidX SplashScreen to prevent white flash
        val splashScreen = installSplashScreen()
        
        super.onCreate(savedInstanceState)
        b = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(b.root)

        // Initialize managers
        sessionManager = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { sessionManager.getUserId() }

        // Check reduce motion setting
        reduceMotion = try {
            Settings.Global.getFloat(
                contentResolver,
                Settings.Global.ANIMATOR_DURATION_SCALE, 1f
            ) <= 0.5f
        } catch (e: Exception) {
            false
        }

        // Silent background API ping
        CoroutineScope(Dispatchers.IO).launch {
            try {
                ApiClient.get("/api/categories")
            } catch (_: Exception) {}
        }

        // Setup edge-to-edge
        WindowCompat.setDecorFitsSystemWindows(window, false)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                it.setSystemBarsAppearance(
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                    WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                )
            }
        }
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT

        // Dismiss system splash immediately
        splashScreen.setOnExitAnimationListener { it.remove() }
        
        // Start animation sequence
        startAnimationSequence()
    }
    
    private fun startAnimationSequence() {
        if (reduceMotion) {
            // Reduce motion: show logo and tagline immediately, skip animations
            b.imgLogo.alpha = 1f
            b.taglineContainer.alpha = 1f
            b.loaderView.alpha = 1f
            b.loaderView.progress = 0.99f
            
            // Navigate when ready (minimum 1s)
            handler.postDelayed({ navigateAway() }, 1000)
            return
        }
        
        // Start Choreographer loop
        isActive = true
        Choreographer.getInstance().postFrameCallback(frameCallback)
        
        // Timeline: schedule all events
        
        // 0ms: Smoke starts fading in (handled by SmokeBackgroundView init)
        
        // 200ms: Spark burst + orbs fade in
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            b.particleView.burstSparks(10, 1.2f)
            b.orbsView.startAnimations()
        }, 200)
        
        // 500ms: Loader fades in, particle emission starts
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            fadeIn(b.loaderView, 800)
            b.particleView.startEmission()
        }, 500)
        
        // 600ms: Aura grows in
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            b.orbsView.startAuraAnimations()
        }, 600)
        
        // 800ms: Logo reveal with blur + spark burst
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            revealLogo()
            b.particleView.burstSparks(46, 3.6f)
            b.particleView.burstPuffs(12)
        }, 800)
        
        // 2200ms: Logo float + aura breathing
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            startLogoFloat()
            b.orbsView.startAuraBreathing()
        }, 2200)
        
        // 2400ms: Tagline fades in + hairlines grow + first light sweep
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            fadeIn(b.taglineContainer, 900)
            animateHairlines()
            startLogoLightSweep()
        }, 2400)
        
        // 9200ms: EXIT sequence
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            startExitSequence()
        }, 9200)
        
        // 10600ms: Navigate away
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            navigateAway()
        }, 10600)
    }
    
    private val frameCallback = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!isActive || isDestroyed) return
            
            if (lastFrameNanos == 0L) {
                lastFrameNanos = frameTimeNanos
            }
            
            val dt = ((frameTimeNanos - lastFrameNanos) / 1_000_000).toFloat() // ms
            lastFrameNanos = frameTimeNanos
            elapsedMs += dt.toLong()
            
            // Update theme color target based on elapsed time
            updateThemeColorTarget()
            
            // Smooth current color toward target (exponential smoothing, frame-rate independent)
            val smoothFactor = 1f - (1.0 - COLOR_SMOOTH).pow((dt / 16.67).toDouble()).toFloat()
            currentColorR += (targetColorR - currentColorR) * smoothFactor
            currentColorG += (targetColorG - currentColorG) * smoothFactor
            currentColorB += (targetColorB - currentColorB) * smoothFactor
            
            // Propagate to all views
            b.smokeBackground.updateThemeColor(currentColorR, currentColorG, currentColorB)
            b.orbsView.updateThemeColor(currentColorR, currentColorG, currentColorB)
            b.particleView.updateThemeColor(currentColorR, currentColorG, currentColorB)
            b.loaderView.updateThemeColor(currentColorR, currentColorG, currentColorB)
            
            // Update progress on loader
            b.loaderView.progress = progressForTime((elapsedMs / 1000f))
            
            Choreographer.getInstance().postFrameCallback(this)
        }
    }
    
    private fun updateThemeColorTarget() {
        // Check if we should change target color
        for (i in COLOR_CHANGE_TIMES_MS.indices) {
            if (elapsedMs >= COLOR_CHANGE_TIMES_MS[i]) {
                val newIndex = i + 1
                if (newIndex != currentColorIndex && newIndex < THEME_COLORS.size) {
                    currentColorIndex = newIndex
                    targetColorR = THEME_COLORS[newIndex][0]
                    targetColorG = THEME_COLORS[newIndex][1]
                    targetColorB = THEME_COLORS[newIndex][2]
                }
            }
        }
    }
    
    private fun progressForTime(t: Float): Float {
        // Progress curve p(t) from spec
        val x = ((t - 0.6f) / 8.3f).coerceIn(0f, 1f)
        return when {
            x < 0.30f -> x / 0.30f * 0.34f
            x < 0.55f -> 0.34f + (x - 0.30f) / 0.25f * 0.22f
            else -> 0.56f + (x - 0.55f) / 0.45f * 0.44f
        }
    }
    
    private fun revealLogo() {
        // Logo reveal: blur 14dp→0, alpha 0→1, scale 0.70→1, duration 1.3s
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            // Use RenderEffect blur on API 31+
            b.imgLogo.setRenderEffect(
                RenderEffect.createBlurEffect(14f * resources.displayMetrics.density, 
                    14f * resources.displayMetrics.density, 
                    Shader.TileMode.CLAMP)
            )
            
            ValueAnimator.ofFloat(14f, 0f).apply {
                duration = 1300
                interpolator = AccelerateDecelerateInterpolator()
                addUpdateListener {
                    val blur = it.animatedValue as Float
                    b.imgLogo.setRenderEffect(
                        if (blur > 0.1f) {
                            RenderEffect.createBlurEffect(
                                blur * resources.displayMetrics.density,
                                blur * resources.displayMetrics.density,
                                Shader.TileMode.CLAMP
                            )
                        } else {
                            null
                        }
                    )
                }
                start()
            }.also { animators.add(it) }
        }
        
        // Alpha and scale
        b.imgLogo.alpha = 0f
        b.imgLogo.scaleX = 0.70f
        b.imgLogo.scaleY = 0.70f
        
        ObjectAnimator.ofFloat(b.imgLogo, View.ALPHA, 0f, 1f).apply {
            duration = 1300
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.imgLogo, View.SCALE_X, 0.70f, 1f).apply {
            duration = 1300
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.imgLogo, View.SCALE_Y, 0.70f, 1f).apply {
            duration = 1300
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
    }
    
    private fun startLogoFloat() {
        // Logo float: translateY 0→-5dp, 4.2s ease-in-out alternate
        val floatDistance = -5f * resources.displayMetrics.density
        ObjectAnimator.ofFloat(b.imgLogo, View.TRANSLATION_Y, 0f, floatDistance).apply {
            duration = 4200
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
    }
    
    private fun startLogoLightSweep() {
        // Light sweep: every 5s, starting at 2.4s (handled via repeating handler)
        // For simplicity, we'll just add a subtle glow effect instead of complex sweep
        // TODO: Implement full sweep with offscreen layer if needed
    }
    
    private fun animateHairlines() {
        // Left hairline grows from text outward (pivotX = 1.0 for right edge)
        b.hairlineLeft.pivotX = b.hairlineLeft.width.toFloat()
        ObjectAnimator.ofFloat(b.hairlineLeft, View.SCALE_X, 0f, 1f).apply {
            duration = 900
            startDelay = 100
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
        
        // Right hairline grows from text outward (pivotX = 0 for left edge)
        b.hairlineRight.pivotX = 0f
        ObjectAnimator.ofFloat(b.hairlineRight, View.SCALE_X, 0f, 1f).apply {
            duration = 900
            startDelay = 100
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
    }
    
    private fun startExitSequence() {
        // Stop particle emission
        b.particleView.stopEmission()
        
        // Spark burst
        b.particleView.burstSparks(60, 4.6f)
        b.particleView.burstPuffs(16)
        
        // Logo + tagline: scale 1→1.18, blur 0→10dp, fade out over 900ms
        ObjectAnimator.ofFloat(b.imgLogo, View.SCALE_X, 1f, 1.18f).apply {
            duration = 900
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.imgLogo, View.SCALE_Y, 1f, 1.18f).apply {
            duration = 900
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.imgLogo, View.ALPHA, 1f, 0f).apply {
            duration = 900
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.taglineContainer, View.SCALE_X, 1f, 1.18f).apply {
            duration = 900
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.taglineContainer, View.SCALE_Y, 1f, 1.18f).apply {
            duration = 900
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.taglineContainer, View.ALPHA, 1f, 0f).apply {
            duration = 900
            start()
        }.also { animators.add(it) }
        
        // Loader: slide down 12dp + fade out over 400ms
        ObjectAnimator.ofFloat(b.loaderView, View.TRANSLATION_Y, 0f, 12f * resources.displayMetrics.density).apply {
            duration = 400
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.loaderView, View.ALPHA, 1f, 0f).apply {
            duration = 400
            start()
        }.also { animators.add(it) }
        
        // Exit veil fades in over 700ms starting at 9700ms (500ms from now)
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            ObjectAnimator.ofFloat(b.exitVeil, View.ALPHA, 0f, 1f).apply {
                duration = 700
                start()
            }.also { animators.add(it) }
        }, 500)
    }
    
    private fun navigateAway() {
        if (isDestroyed || isFinishing) return
        
        val destination = if (sessionManager.isLoggedIn())
            HomeActivity::class.java
        else
            OnboardingActivity::class.java

        val intent = Intent(this, destination).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
        finish()
    }
    
    private fun fadeIn(view: View, duration: Long) {
        ObjectAnimator.ofFloat(view, View.ALPHA, 0f, 1f).apply {
            this.duration = duration
            start()
        }.also { animators.add(it) }
    }
    
    override fun onPause() {
        super.onPause()
        isActive = false
        b.smokeBackground.pause()
        b.orbsView.pause()
        b.particleView.pause()
        animators.forEach { if (it.isRunning) it.pause() }
    }
    
    override fun onResume() {
        super.onResume()
        if (!reduceMotion && !isDestroyed) {
            isActive = true
            lastFrameNanos = 0
            Choreographer.getInstance().postFrameCallback(frameCallback)
            b.smokeBackground.resume()
            b.orbsView.resume()
            b.particleView.resume()
            animators.forEach { if (it.isPaused) it.resume() }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        isDestroyed = true
        isActive = false
        handler.removeCallbacksAndMessages(null)
        animators.forEach { it.cancel() }
        animators.clear()
    }
}
