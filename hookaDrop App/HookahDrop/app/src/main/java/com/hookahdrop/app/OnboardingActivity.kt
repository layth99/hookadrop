package com.hookahdrop.app

import android.animation.*
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.HapticFeedbackConstants
import android.view.View
import android.view.animation.*
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivityOnboardingBinding

class OnboardingActivity : AppCompatActivity() {

    companion object {
        const val COLOR_DELAY = 4000L
        
        val THEME_COLORS = arrayOf(
            intArrayOf(40, 170, 230),   // Ice blue
            intArrayOf(201, 162, 39),   // Gold
            intArrayOf(232, 92, 112),   // Rose
            intArrayOf(78, 124, 232),   // Blue
            intArrayOf(168, 214, 84)    // Lime
        )
    }

    private lateinit var b: ActivityOnboardingBinding
    private val handler = Handler(Looper.getMainLooper())
    private val animators = mutableListOf<Animator>()
    
    private var currentColorIndex = 0
    private var themeColor: Int = Color.rgb(THEME_COLORS[0][0], THEME_COLORS[0][1], THEME_COLORS[0][2])
    
    private lateinit var colorCycleRunnable: Runnable

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityOnboardingBinding.inflate(layoutInflater)
        setContentView(b.root)

        setupViews()
        applyResponsiveRules()
        applyStyledText()

        b.root.post {
            setupParticleSpawnZones()
            startEntranceSequence()
        }

        if (!isReduceMotion()) {
            startColorCycle()
            startIdleAnimations()
        } else {
            // Apply theme color once without animation
            applyThemeColor(themeColor, false)
        }

        setupInteractions()
    }

    private fun isReduceMotion(): Boolean {
        return try {
            Settings.Global.getFloat(
                contentResolver,
                Settings.Global.TRANSITION_ANIMATION_SCALE,
                1f
            ) == 0f
        } catch (e: Exception) {
            false
        }
    }

    private fun setupViews() {
        // Initial theme color
        applyThemeColor(themeColor, false)
    }

    private fun setupParticleSpawnZones() {
        // Set coal spawn position based on hookah view center
        val hookahLoc = IntArray(2)
        b.hookahView.getLocationOnScreen(hookahLoc)
        val rootLoc = IntArray(2)
        b.root.getLocationOnScreen(rootLoc)
        
        b.smokeView.coalSpawnX = b.hookahView.width / 2f + (hookahLoc[0] - rootLoc[0])
        b.smokeView.coalSpawnY = hookahLoc[1] - rootLoc[1] + b.hookahView.height * 0.1f
    }

    private fun applyResponsiveRules() {
        val heightDp = resources.configuration.screenHeightDp
        val widthDp = resources.configuration.screenWidthDp

        // Adapt to different screen sizes
        when {
            // Very small phones (< 600dp height)
            heightDp < 600 -> {
                // Hide optional elements to maximize space for hookah
                b.layoutEyebrow.visibility = View.GONE
                b.tvLead.visibility = View.GONE
                b.layoutServices.visibility = View.GONE
                
                // Smaller text and button
                b.tvTitle.textSize = 22f
                b.tvWordmark.textSize = 12f
                b.btnGetStart.layoutParams.height = 48.dpToPx().toInt()
                b.btnGetStart.textSize = 14f
            }
            
            // Small phones (< 680dp height)
            heightDp < 680 -> {
                // Keep eyebrow and lead, hide only subtitles
                b.tvService1Subtitle.visibility = View.GONE
                b.tvService2Subtitle.visibility = View.GONE
                b.tvService3Subtitle.visibility = View.GONE
                
                // Compact sizing
                b.tvTitle.textSize = 23f
                b.btnGetStart.layoutParams.height = 52.dpToPx().toInt()
                
                // Smaller service circles (44dp instead of 52dp)
                resizeServiceCircle(b.viewServiceCircle1, b.ivServiceIcon1, 44, 22)
                resizeServiceCircle(b.viewServiceCircle2, b.ivServiceIcon2, 44, 22)
                resizeServiceCircle(b.viewServiceCircle3, b.ivServiceIcon3, 44, 22)
                
                // Reduce services row height
                val servicesParams = b.layoutServices.layoutParams
                servicesParams.height = 80.dpToPx().toInt()
                b.layoutServices.layoutParams = servicesParams
            }
            
            // Medium phones (< 760dp height)
            heightDp < 760 -> {
                // Hide only eyebrow
                b.layoutEyebrow.visibility = View.GONE
                b.tvTitle.textSize = 25f
            }
            
            // Wide/short screens (landscape-ish aspect ratio)
            widthDp > heightDp -> {
                // Landscape mode - compact layout
                b.layoutEyebrow.visibility = View.GONE
                b.tvLead.visibility = View.GONE
                b.tvTitle.textSize = 22f
                b.tvTitle.maxLines = 2
                
                // Horizontal services layout if very wide
                if (widthDp > 800) {
                    // Keep all services visible
                } else {
                    // Compact services
                    b.tvService1Subtitle.visibility = View.GONE
                    b.tvService2Subtitle.visibility = View.GONE
                    b.tvService3Subtitle.visibility = View.GONE
                }
            }
            
            // Large screens (tablets, >= 760dp height)
            else -> {
                // All elements visible, use larger sizes if tablet
                if (widthDp >= 600) {
                    // Tablet mode - scale up
                    b.tvWordmark.textSize = 16f
                    b.tvTitle.textSize = 32f
                    b.tvLead.textSize = 15f
                    b.btnGetStart.layoutParams.height = 64.dpToPx().toInt()
                    b.btnGetStart.textSize = 17f
                    
                    // Larger service circles
                    resizeServiceCircle(b.viewServiceCircle1, b.ivServiceIcon1, 64, 28)
                    resizeServiceCircle(b.viewServiceCircle2, b.ivServiceIcon2, 64, 28)
                    resizeServiceCircle(b.viewServiceCircle3, b.ivServiceIcon3, 64, 28)
                    
                    // Taller services row
                    val servicesParams = b.layoutServices.layoutParams
                    servicesParams.height = 120.dpToPx().toInt()
                    b.layoutServices.layoutParams = servicesParams
                }
            }
        }
        
        // Ensure button params are applied
        b.btnGetStart.requestLayout()
    }

    private fun resizeServiceCircle(circleView: View, iconView: ImageView, circleSizeDp: Int, iconSizeDp: Int) {
        // Resize circle
        val circleSizePx = circleSizeDp.dpToPx().toInt()
        val circleParams = (circleView.parent as FrameLayout).layoutParams
        circleParams.width = circleSizePx
        circleParams.height = circleSizePx
        (circleView.parent as FrameLayout).layoutParams = circleParams
        
        // Resize icon
        val iconSizePx = iconSizeDp.dpToPx().toInt()
        val iconParams = iconView.layoutParams
        iconParams.width = iconSizePx
        iconParams.height = iconSizePx
        iconView.layoutParams = iconParams
    }

    private fun applyStyledText() {
        // Wordmark: HOOKA (white) + DROP (theme color)
        val wordmark = "HOOKADROP"
        val wordmarkSpan = SpannableString(wordmark)
        val dropStart = wordmark.indexOf("DROP")
        wordmarkSpan.setSpan(
            ForegroundColorSpan(themeColor),
            dropStart,
            dropStart + 4,
            Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
        )
        b.tvWordmark.text = wordmarkSpan

        // Title: "been waiting" in theme color
        val title = "The experience you've\nbeen waiting\nfor"
        val titleSpan = SpannableString(title)
        val highlightStart = title.indexOf("been waiting")
        if (highlightStart != -1) {
            titleSpan.setSpan(
                ForegroundColorSpan(themeColor),
                highlightStart,
                highlightStart + 12,
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
            )
        }
        b.tvTitle.text = titleSpan
    }

    private fun startColorCycle() {
        colorCycleRunnable = object : Runnable {
            override fun run() {
                currentColorIndex = (currentColorIndex + 1) % THEME_COLORS.size
                themeColor = Color.rgb(
                    THEME_COLORS[currentColorIndex][0],
                    THEME_COLORS[currentColorIndex][1],
                    THEME_COLORS[currentColorIndex][2]
                )
                applyThemeColor(themeColor, true)
                handler.postDelayed(this, COLOR_DELAY)
            }
        }
        handler.postDelayed(colorCycleRunnable, COLOR_DELAY)
    }

    private fun applyThemeColor(color: Int, animate: Boolean) {
        val duration = if (animate) 1000L else 0L

        // Update wordmark DROP color
        val wordmark = "HOOKADROP"
        val wordmarkSpan = SpannableString(wordmark)
        val dropStart = wordmark.indexOf("DROP")
        wordmarkSpan.setSpan(
            ForegroundColorSpan(color),
            dropStart,
            dropStart + 4,
            Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
        )
        b.tvWordmark.text = wordmarkSpan

        // Update title "been waiting" color
        val title = "The experience you've\nbeen waiting\nfor"
        val titleSpan = SpannableString(title)
        val highlightStart = title.indexOf("been waiting")
        if (highlightStart != -1) {
            titleSpan.setSpan(
                ForegroundColorSpan(color),
                highlightStart,
                highlightStart + 12,
                Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
            )
        }
        b.tvTitle.text = titleSpan

        // Update hookah water color
        b.hookahView.setThemeColor(color)

        // Update service circle backgrounds
        updateCircleTint(b.viewServiceCircle1, color, 0.12f, 0.45f)
        updateCircleTint(b.viewServiceCircle2, color, 0.12f, 0.45f)
        updateCircleTint(b.viewServiceCircle3, color, 0.12f, 0.45f)

        // Update orb colors
        b.orbView.setThemeColor(color)

        // Update aura color
        b.auraView.setThemeColor(color)
        
        // SMOKE BACKGROUND: Update tint with animated theme color (intensity 0.9)
        b.smokeBackground.intensity = 0.9f
        b.smokeBackground.setTintColor(color)
    }

    private fun updateCircleTint(view: View, color: Int, fillOpacity: Float, borderOpacity: Float) {
        // Service circles: 12% fill, 45% border as per spec
        val fillColor = Color.argb((255 * fillOpacity).toInt(), Color.red(color), Color.green(color), Color.blue(color))
        view.backgroundTintList = android.content.res.ColorStateList.valueOf(fillColor)
    }

    private fun startEntranceSequence() {
        // Fade in backgrounds (orbs, aura, smoke handled by their own views)

        // 200-1000ms: Logo fades in, scales, moves
        handler.postDelayed({
            b.tvWordmark.alpha = 0f
            b.tvWordmark.translationY = 12.dpToPx()
            b.tvWordmark.scaleX = 0.92f
            b.tvWordmark.scaleY = 0.92f

            val animSet = AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(b.tvWordmark, View.ALPHA, 0f, 1f),
                    ObjectAnimator.ofFloat(b.tvWordmark, View.TRANSLATION_Y, 12.dpToPx(), 0f),
                    ObjectAnimator.ofFloat(b.tvWordmark, View.SCALE_X, 0.92f, 1f),
                    ObjectAnimator.ofFloat(b.tvWordmark, View.SCALE_Y, 0.92f, 1f)
                )
                duration = 800
                interpolator = CubicBezierInterpolator(0.22f, 0.61f, 0.36f, 1f)
            }
            animSet.start()
        }, 200)

        // Hookah entrance
        handler.postDelayed({
            b.hookahView.alpha = 0f
            b.hookahView.translationY = 34.dpToPx()
            b.hookahView.scaleX = 0.96f
            b.hookahView.scaleY = 0.96f

            val animSet = AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(b.hookahView, View.ALPHA, 0f, 1f),
                    ObjectAnimator.ofFloat(b.hookahView, View.TRANSLATION_Y, 34.dpToPx(), 0f),
                    ObjectAnimator.ofFloat(b.hookahView, View.SCALE_X, 0.96f, 1f),
                    ObjectAnimator.ofFloat(b.hookahView, View.SCALE_Y, 0.96f, 1f)
                )
                duration = 1400
                interpolator = CubicBezierInterpolator(0.22f, 0.61f, 0.36f, 1f)
            }
            animSet.start()

            // Start hookah breathing after entrance
            handler.postDelayed({
                if (!isReduceMotion()) {
                    startHookahBreathing()
                }
            }, 1400)
        }, 550)

        // 1650ms: Eyebrow
        handler.postDelayed({
            if (b.layoutEyebrow.visibility == View.VISIBLE) {
                b.layoutEyebrow.animate().alpha(1f).setDuration(400).start()
            }
        }, 1650)

        // 1720ms: Title
        handler.postDelayed({
            b.tvTitle.animate().alpha(1f).setDuration(400).start()
        }, 1720)

        // 1800ms: Lead
        handler.postDelayed({
            if (b.tvLead.visibility == View.VISIBLE) {
                b.tvLead.animate().alpha(1f).setDuration(400).start()
            }
        }, 1800)

        // 1880ms: Services
        handler.postDelayed({
            if (b.layoutServices.visibility == View.VISIBLE) {
                b.layoutServices.animate().alpha(1f).setDuration(400).start()
            }
        }, 1880)

        // 1960ms: CTA
        handler.postDelayed({
            b.btnGetStart.animate().alpha(1f).setDuration(400).start()
        }, 1960)
    }

    private fun startHookahBreathing() {
        ObjectAnimator.ofFloat(b.hookahView, View.SCALE_X, 1f, 1.02f).apply {
            duration = 3000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }

        ObjectAnimator.ofFloat(b.hookahView, View.SCALE_Y, 1f, 1.02f).apply {
            duration = 3000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
    }

    private fun startIdleAnimations() {
        // Aura breathing: brightness 0.8 to 1.35, 6000ms
        ValueAnimator.ofFloat(0.8f, 1.35f).apply {
            duration = 6000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                val brightness = it.animatedValue as Float
                b.auraView.setBrightness(brightness)
            }
            start()
        }.also { animators.add(it) }

        // Orb drift
        ObjectAnimator.ofFloat(b.orbView, View.TRANSLATION_X, -20.dpToPx(), 20.dpToPx()).apply {
            duration = 13000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }

        ObjectAnimator.ofFloat(b.orbView, View.TRANSLATION_Y, -15.dpToPx(), 15.dpToPx()).apply {
            duration = 17000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }

        // Hookah glow flicker
        ValueAnimator.ofFloat(0.55f, 1f).apply {
            duration = 1900
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                val alpha = it.animatedValue as Float
                val scale = 0.94f + (alpha - 0.55f) / (1f - 0.55f) * (1.1f - 0.94f)
                b.hookahView.updateGlowAnimation(scale, alpha)
            }
            start()
        }.also { animators.add(it) }

        // Coal glow flicker
        ValueAnimator.ofFloat(0.85f, 1.35f).apply {
            duration = 1400
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                val brightness = it.animatedValue as Float
                b.hookahView.updateCoalGlow(0.8f, brightness)
            }
            start()
        }.also { animators.add(it) }

        // Start particle system
        b.smokeView.resume()
        
        // Smoke background animations are self-contained
    }

    private fun setupInteractions() {
        // CTA button click
        b.btnGetStart.setOnClickListener {
            onCtaClick()
        }

        // Service item taps
        b.layoutService1.setOnClickListener { onServiceItemClick(it, b.viewServiceCircle1) }
        b.layoutService2.setOnClickListener { onServiceItemClick(it, b.viewServiceCircle2) }
        b.layoutService3.setOnClickListener { onServiceItemClick(it, b.viewServiceCircle3) }

        // Hookah tap
        b.hookahView.setOnClickListener {
            performHapticFeedback(12)
            val loc = IntArray(2)
            b.hookahView.getLocationOnScreen(loc)
            val rootLoc = IntArray(2)
            b.root.getLocationOnScreen(rootLoc)
            b.smokeView.spawnSmoke(
                b.hookahView.width / 2f + (loc[0] - rootLoc[0]),
                loc[1] - rootLoc[1] + b.hookahView.height * 0.1f,
                15
            )
        }
    }

    private fun onCtaClick() {
        performHapticFeedback(12)

        // Scale animation
        b.btnGetStart.animate()
            .scaleX(0.96f)
            .scaleY(0.96f)
            .setDuration(100)
            .withEndAction {
                b.btnGetStart.animate()
                    .scaleX(1f)
                    .scaleY(1f)
                    .setDuration(100)
                    .withEndAction {
                        handler.postDelayed({ doLeaveTransition() }, 200)
                    }
                    .start()
            }
            .start()
    }

    private fun onServiceItemClick(layout: View, circle: View) {
        performHapticFeedback(6)

        // Circle pop animation
        AnimatorSet().apply {
            playSequentially(
                ObjectAnimator.ofFloat(circle, View.SCALE_X, 1f, 1.22f).setDuration(225).apply {
                    interpolator = OvershootInterpolator()
                },
                ObjectAnimator.ofFloat(circle, View.SCALE_X, 1.22f, 1f).setDuration(225)
            )
            start()
        }

        AnimatorSet().apply {
            playSequentially(
                ObjectAnimator.ofFloat(circle, View.SCALE_Y, 1f, 1.22f).setDuration(225).apply {
                    interpolator = OvershootInterpolator()
                },
                ObjectAnimator.ofFloat(circle, View.SCALE_Y, 1.22f, 1f).setDuration(225)
            )
            start()
        }

        // Smoke puff
        val loc = IntArray(2)
        circle.getLocationOnScreen(loc)
        val rootLoc = IntArray(2)
        b.root.getLocationOnScreen(rootLoc)
        b.smokeView.spawnSmoke(
            loc[0] - rootLoc[0] + circle.width / 2f,
            loc[1] - rootLoc[1] + circle.height / 2f,
            10
        )
    }

    private fun doLeaveTransition() {
        // Text group slides down and fades
        val textViews = listOf(b.tvWordmark, b.layoutEyebrow, b.tvTitle, b.tvLead, b.layoutServices, b.btnGetStart)
        textViews.forEach { view ->
            view.animate()
                .translationY(26.dpToPx())
                .alpha(0f)
                .setDuration(500)
                .start()
        }

        // Hookah scales up and fades
        b.hookahView.animate()
            .scaleX(1.16f)
            .scaleY(1.16f)
            .translationY(-12.dpToPx())
            .alpha(0f)
            .setDuration(800)
            .start()

        b.auraView.animate()
            .alpha(0f)
            .setDuration(800)
            .start()

        // Black veil
        handler.postDelayed({
            b.veilView.animate()
                .alpha(1f)
                .setDuration(300)
                .start()
        }, 700)

        // Navigate
        handler.postDelayed({
            navigateToHome()
        }, 900)
    }

    private fun navigateToHome() {
        android.util.Log.d("OnboardingActivity", "=== navigateToHome START ===")
        
        try {
            val sessionManager = SessionManager(this)
            val destination = if (sessionManager.isLoggedIn()) {
                android.util.Log.d("OnboardingActivity", "User logged in → HomeActivity")
                HomeActivity::class.java
            } else {
                android.util.Log.d("OnboardingActivity", "User not logged in → SignInActivity")
                SignInActivity::class.java
            }
            
            val intent = Intent(this, destination)
            intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            
            startActivity(intent)
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
            finish()
            
            android.util.Log.d("OnboardingActivity", "Navigation successful!")
            
        } catch (e: Exception) {
            android.util.Log.e("OnboardingActivity", "=== NAVIGATION CRASH ===", e)
            
            // Show error with stack trace
            val errorMsg = "Navigation failed: ${e.javaClass.simpleName}\n${e.message}"
            Toast.makeText(this, errorMsg, Toast.LENGTH_LONG).show()
            
            // Try fallback to DebugTestActivity so user isn't stuck
            try {
                android.util.Log.d("OnboardingActivity", "Attempting fallback to DebugTestActivity")
                val fallbackIntent = Intent(this, DebugTestActivity::class.java)
                fallbackIntent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                startActivity(fallbackIntent)
                finish()
            } catch (e2: Exception) {
                android.util.Log.e("OnboardingActivity", "Even fallback failed!", e2)
                // Don't call finish() - let user see the error
            }
        }
    }

    private fun performHapticFeedback(durationMs: Long) {
        try {
            val vibrator = getSystemService(VIBRATOR_SERVICE) as? Vibrator
            if (vibrator?.hasVibrator() == true) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    vibrator.vibrate(VibrationEffect.createOneShot(durationMs, VibrationEffect.DEFAULT_AMPLITUDE))
                } else {
                    @Suppress("DEPRECATION")
                    vibrator.vibrate(durationMs)
                }
            }
        } catch (e: SecurityException) {
            android.util.Log.w("OnboardingActivity", "Vibration permission not granted", e)
            // Fallback to view haptic feedback
            try {
                b.btnGetStart.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
            } catch (e2: Exception) {
                // Silently fail - haptic feedback is not critical
            }
        } catch (e: Exception) {
            android.util.Log.w("OnboardingActivity", "Haptic feedback failed", e)
        }
    }

    override fun onPause() {
        super.onPause()
        b.smokeView.pause()
        b.smokeBackground.pause()
    }

    override fun onResume() {
        super.onResume()
        if (!isReduceMotion()) {
            b.smokeView.resume()
            b.smokeBackground.resume()
        }
    }

    override fun onDestroy() {
        super.onDestroy()

        // Cancel all animators
        animators.forEach { it.cancel() }
        animators.clear()

        // Clear handler callbacks
        handler.removeCallbacksAndMessages(null)
    }

    // Helper extensions
    private fun Float.dpToPx(): Float = this * resources.displayMetrics.density
    private fun Int.dpToPx(): Float = this.toFloat() * resources.displayMetrics.density
}

// Custom interpolator for easeOutCubic
class CubicBezierInterpolator(
    private val x1: Float,
    private val y1: Float,
    private val x2: Float,
    private val y2: Float
) : TimeInterpolator {
    override fun getInterpolation(input: Float): Float {
        // Simplified cubic bezier approximation
        val t = input
        return (1 - t) * (1 - t) * (1 - t) * 0f +
                3 * (1 - t) * (1 - t) * t * y1 +
                3 * (1 - t) * t * t * y2 +
                t * t * t * 1f
    }
}
