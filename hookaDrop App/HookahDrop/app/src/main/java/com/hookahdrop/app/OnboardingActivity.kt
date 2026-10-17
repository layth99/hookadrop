package com.hookahdrop.app

import android.animation.*
import android.content.Intent
import android.graphics.Color
import android.graphics.drawable.GradientDrawable
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Bundle
import android.provider.Settings
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.*
import android.view.animation.*
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import com.hookahdrop.app.databinding.ActivityOnboardingNewBinding
import kotlin.random.Random

/**
 * PREMIUM ONBOARDING ACTIVITY
 * Complete animation choreography with entrance, continuous idle animations,
 * parallax, embers, smoke, Ken Burns, ripples, and interaction effects
 */
class OnboardingActivity : AppCompatActivity(), SensorEventListener {

    private lateinit var b: ActivityOnboardingNewBinding
    private val animators = mutableListOf<Animator>()
    private var sensorManager: SensorManager? = null
    private var accelerometer: Sensor? = null
    private var reduceMotion = false
    
    // Parallax smoothing
    private var currentParallaxX = 0f

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Edge-to-edge with transparent system bars
        WindowCompat.setDecorFitsSystemWindows(window, false)
        window.statusBarColor = Color.TRANSPARENT
        window.navigationBarColor = Color.TRANSPARENT
        
        b = ActivityOnboardingNewBinding.inflate(layoutInflater)
        setContentView(b.root)

        // Check reduce-motion setting
        reduceMotion = try {
            Settings.Global.getFloat(
                contentResolver, 
                Settings.Global.TRANSITION_ANIMATION_SCALE, 
                1f
            ) == 0f
        } catch (e: Exception) {
            false
        }

        // Apply cyan span to "been waiting" in headline
        applyHeadlineSpan()
        
        // Setup sensor for parallax
        sensorManager = getSystemService(SENSOR_SERVICE) as SensorManager
        accelerometer = sensorManager?.getDefaultSensor(Sensor.TYPE_ACCELEROMETER)
        
        // Setup card touch listeners
        setupCardTouchListeners()
        
        // Start entrance choreography
        b.root.post { playEntrance() }
        
        // CTA button click
        b.btnGetStart.setOnClickListener { navigateToSignIn() }
    }

    // ── Apply cyan color to "been waiting" ─────────────────────────────────────
    private fun applyHeadlineSpan() {
        val full = "The experience you've\nbeen waiting for"
        val ss = SpannableString(full)
        val start = full.indexOf("been waiting")
        if (start != -1) {
            val end = start + "been waiting".length
            ss.setSpan(
                ForegroundColorSpan(Color.parseColor("#22B8F0")),
                start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
            )
        }
        b.tvHeadline.text = ss
    }

    // ── Entrance choreography ──────────────────────────────────────────────────
    private fun playEntrance() {
        // 100ms: Logo drops in
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(b.ivLogo, "translationY", -24f.dpToPx(), 0f).apply { 
                    duration = 600
                    interpolator = OvershootInterpolator(1.5f)
                },
                ObjectAnimator.ofFloat(b.ivLogo, "scaleX", 0.7f, 1f).apply { 
                    duration = 600
                    interpolator = OvershootInterpolator(1.5f)
                },
                ObjectAnimator.ofFloat(b.ivLogo, "scaleY", 0.7f, 1f).apply { 
                    duration = 600
                    interpolator = OvershootInterpolator(1.5f)
                },
                ObjectAnimator.ofFloat(b.ivLogo, "alpha", 0f, 1f).apply { duration = 400 }
            )
            startDelay = 100
            start()
        }.also { animators.add(it) }

        // 300ms: Left card wipe reveal (clip illusion via translationY)
        b.cardLeft.translationY = 600f.dpToPx()
        ObjectAnimator.ofFloat(b.cardLeft, "translationY", 600f.dpToPx(), 0f).apply {
            duration = 1000
            startDelay = 300
            interpolator = PathInterpolator(0.7f, 0f, 0.2f, 1f)
            start()
        }.also { animators.add(it) }

        // 480ms: Top-right card wipe
        b.cardTopRight.translationY = 300f.dpToPx()
        ObjectAnimator.ofFloat(b.cardTopRight, "translationY", 300f.dpToPx(), 0f).apply {
            duration = 1000
            startDelay = 480
            interpolator = PathInterpolator(0.7f, 0f, 0.2f, 1f)
            start()
        }.also { animators.add(it) }

        // 660ms: Bottom-right card wipe
        b.cardBottomRight.translationY = 300f.dpToPx()
        ObjectAnimator.ofFloat(b.cardBottomRight, "translationY", 300f.dpToPx(), 0f).apply {
            duration = 1000
            startDelay = 660
            interpolator = PathInterpolator(0.7f, 0f, 0.2f, 1f)
            start()
        }.also { animators.add(it) }

        // 900ms: Eyebrow (lines grow, text fades up)
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(b.layoutEyebrow, "alpha", 0f, 1f).apply { duration = 400 },
                ObjectAnimator.ofFloat(b.lineLeft, "scaleX", 0f, 1f).apply { 
                    duration = 500
                    interpolator = DecelerateInterpolator()
                },
                ObjectAnimator.ofFloat(b.lineRight, "scaleX", 0f, 1f).apply { 
                    duration = 500
                    interpolator = DecelerateInterpolator()
                },
                ObjectAnimator.ofFloat(b.tvEyebrow, "translationY", 10f.dpToPx(), 0f).apply { duration = 400 },
                ObjectAnimator.ofFloat(b.tvEyebrow, "alpha", 0f, 1f).apply { duration = 400 }
            )
            startDelay = 900
            start()
        }.also { animators.add(it) }

        // 1000ms: Headline slide up with fade
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(b.tvHeadline, "translationY", 30f.dpToPx(), 0f).apply { 
                    duration = 600
                    interpolator = DecelerateInterpolator(2f)
                },
                ObjectAnimator.ofFloat(b.tvHeadline, "alpha", 0f, 1f).apply { duration = 500 }
            )
            startDelay = 1000
            start()
        }.also { animators.add(it) }

        // 1500ms: Subtitle slide up with fade
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(b.tvSubtitle, "translationY", 18f.dpToPx(), 0f).apply { duration = 500 },
                ObjectAnimator.ofFloat(b.tvSubtitle, "alpha", 0f, 1f).apply { duration = 500 }
            )
            startDelay = 1500
            start()
        }.also { animators.add(it) }

        // 1700ms: Features layout fade in
        ObjectAnimator.ofFloat(b.layoutFeatures, "alpha", 0f, 1f).apply {
            duration = 400
            startDelay = 1700
            start()
        }.also { animators.add(it) }

        // 1700ms, 1820ms, 1940ms: Feature icons pop in
        popIcon(b.iconDelivery, 1700)
        popIcon(b.iconDiamond, 1820)
        popIcon(b.iconHeadset, 1940)

        // 1700ms, 1820ms: Dividers draw top to bottom
        ObjectAnimator.ofFloat(b.divider1, "scaleY", 0f, 1f).apply {
            duration = 400
            startDelay = 1700
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.divider2, "scaleY", 0f, 1f).apply {
            duration = 400
            startDelay = 1820
            start()
        }.also { animators.add(it) }

        // 2000ms: CTA button spring in
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(b.btnGetStart, "translationY", 40f.dpToPx(), 0f).apply { 
                    duration = 600
                    interpolator = OvershootInterpolator(2f)
                },
                ObjectAnimator.ofFloat(b.btnGetStart, "scaleX", 0.9f, 1f).apply { 
                    duration = 600
                    interpolator = OvershootInterpolator(1.5f)
                },
                ObjectAnimator.ofFloat(b.btnGetStart, "scaleY", 0.9f, 1f).apply { 
                    duration = 600
                    interpolator = OvershootInterpolator(1.5f)
                },
                ObjectAnimator.ofFloat(b.btnGetStart, "alpha", 0f, 1f).apply { duration = 500 },
                ObjectAnimator.ofFloat(b.ctaGlow, "alpha", 0f, 0.6f).apply { duration = 600 }
            )
            startDelay = 2000
            start()
        }.also { animators.add(it) }

        // After entrance completes, start continuous animations
        b.root.postDelayed({ 
            if (!isDestroyed) {
                startContinuousAnimations()
            }
        }, 2500)
    }

    private fun popIcon(icon: View, delay: Long) {
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(icon, "scaleX", 0.4f, 1f).apply { 
                    duration = 450
                    interpolator = OvershootInterpolator(2f)
                },
                ObjectAnimator.ofFloat(icon, "scaleY", 0.4f, 1f).apply { 
                    duration = 450
                    interpolator = OvershootInterpolator(2f)
                },
                ObjectAnimator.ofFloat(icon, "alpha", 0f, 1f).apply { duration = 350 }
            )
            startDelay = delay
            start()
        }.also { animators.add(it) }
    }

    // ── Continuous idle animations ─────────────────────────────────────────────
    private fun startContinuousAnimations() {
        // Radial glow pulse
        ObjectAnimator.ofFloat(b.radialGlow, "alpha", 0.45f, 0.75f).apply {
            duration = 3000
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }

        if (!reduceMotion) {
            // Smoke drift
            startSmokeDrift()
            
            // Embers
            spawnEmbers()
            
            // Photo animations
            startPhotoAnimations()
            
            // Ripples
            startRipples()
            
            // Icon micro-animations
            startIconAnimations()
        }
        
        // CTA animations (kept even in reduce-motion)
        startCtaAnimations()
    }

    private fun startSmokeDrift() {
        // Smoke 1 upward drift
        ObjectAnimator.ofFloat(b.smoke1, "translationY", 0f, -200f.dpToPx()).apply {
            duration = 18000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
            interpolator = LinearInterpolator()
            start()
        }.also { animators.add(it) }
        
        // Smoke 1 sway
        ObjectAnimator.ofFloat(b.smoke1, "translationX", -20f.dpToPx(), 20f.dpToPx()).apply {
            duration = 8000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
        
        // Smoke 2 upward drift
        ObjectAnimator.ofFloat(b.smoke2, "translationY", 0f, -200f.dpToPx()).apply {
            duration = 28000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
            interpolator = LinearInterpolator()
            start()
        }.also { animators.add(it) }
        
        // Smoke 2 sway
        ObjectAnimator.ofFloat(b.smoke2, "translationX", -20f.dpToPx(), 20f.dpToPx()).apply {
            duration = 10000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
    }

    private fun spawnEmbers() {
        val screenWidth = resources.displayMetrics.widthPixels
        val screenHeight = resources.displayMetrics.heightPixels
        
        repeat(20) { i ->
            val ember = View(this).apply {
                val size = (2 + Random.nextFloat() * 2).dpToPx().toInt()
                layoutParams = FrameLayout.LayoutParams(size, size)
                
                // Color: 1 in 5 cyan, else amber/gold
                val color = when {
                    i % 5 == 0 -> Color.parseColor("#22B8F0")
                    i % 2 == 0 -> Color.parseColor("#F5A524")
                    else -> Color.parseColor("#FFD27A")
                }
                
                background = GradientDrawable().apply {
                    shape = GradientDrawable.OVAL
                    setColor(color)
                }
                
                // Random initial position
                translationX = Random.nextFloat() * screenWidth
                translationY = screenHeight.toFloat()
            }
            
            b.embersContainer.addView(ember)
            
            // Animate ember
            animateEmber(ember, screenWidth.toFloat(), screenHeight.toFloat())
        }
    }

    private fun animateEmber(ember: View, screenWidth: Float, screenHeight: Float) {
        val duration = (6000 + Random.nextInt(6000)).toLong()
        val startDelay = Random.nextInt(3000).toLong()
        
        // Rising animation
        val riseAnim = ObjectAnimator.ofFloat(ember, "translationY", screenHeight, -50f.dpToPx()).apply {
            this.duration = duration
            this.startDelay = startDelay
            interpolator = LinearInterpolator()
        }
        
        // Horizontal drift
        val driftOffset = Random.nextFloat() * 100f - 50f
        val driftAnim = ObjectAnimator.ofFloat(
            ember, 
            "translationX", 
            ember.translationX, 
            ember.translationX + driftOffset
        ).apply {
            this.duration = duration
            this.startDelay = startDelay
            repeatMode = ValueAnimator.REVERSE
            repeatCount = ValueAnimator.INFINITE
            interpolator = AccelerateDecelerateInterpolator()
        }
        
        // Alpha fade (keyframes)
        val fadeAnim = ObjectAnimator.ofFloat(ember, "alpha", 0f, 0.8f, 0.8f, 0f).apply {
            this.duration = duration
            this.startDelay = startDelay
            setEvaluator(TypeEvaluator<Float> { fraction, _, _ ->
                when {
                    fraction < 0.15f -> fraction / 0.15f * 0.8f
                    fraction > 0.85f -> (1f - (fraction - 0.85f) / 0.15f) * 0.8f
                    else -> 0.8f
                }
            })
        }
        
        riseAnim.addListener(object : AnimatorListenerAdapter() {
            override fun onAnimationEnd(animation: Animator) {
                if (!isDestroyed) {
                    // Re-randomize and restart
                    ember.translationX = Random.nextFloat() * screenWidth
                    ember.translationY = screenHeight
                    animateEmber(ember, screenWidth, screenHeight)
                }
            }
        })
        
        riseAnim.start()
        driftAnim.start()
        fadeAnim.start()
        
        animators.add(riseAnim)
        animators.add(driftAnim)
        animators.add(fadeAnim)
    }

    private fun startPhotoAnimations() {
        // Ken Burns zoom on images
        listOf(b.imgHookah1, b.imgHookah2, b.imgHookah3).forEach { img ->
            ObjectAnimator.ofFloat(img, "scaleX", 1.0f, 1.08f).apply {
                duration = 14000
                repeatCount = ValueAnimator.INFINITE
                repeatMode = ValueAnimator.REVERSE
                interpolator = AccelerateDecelerateInterpolator()
                start()
            }.also { animators.add(it) }
            
            ObjectAnimator.ofFloat(img, "scaleY", 1.0f, 1.08f).apply {
                duration = 14000
                repeatCount = ValueAnimator.INFINITE
                repeatMode = ValueAnimator.REVERSE
                interpolator = AccelerateDecelerateInterpolator()
                start()
            }.also { animators.add(it) }
        }
        
        // Floating cards
        listOf(
            b.cardLeft to 5000L,
            b.cardTopRight to 6000L,
            b.cardBottomRight to 7000L
        ).forEach { (card, dur) ->
            // Store original translationY to add floating offset
            val originalY = card.translationY
            ObjectAnimator.ofFloat(card, "translationY", originalY, originalY - 5f.dpToPx()).apply {
                duration = dur
                repeatCount = ValueAnimator.INFINITE
                repeatMode = ValueAnimator.REVERSE
                interpolator = AccelerateDecelerateInterpolator()
                start()
            }.also { animators.add(it) }
        }
        
        // Light sweep (simplified as alpha pulse with stagger)
        listOf(
            b.shineLeft to 0L,
            b.shineTopRight to 1666L,
            b.shineBottomRight to 3333L
        ).forEach { (shine, stagger) ->
            b.root.postDelayed({
                startShinePulse(shine)
            }, stagger)
        }
    }

    private fun startShinePulse(shine: View) {
        AnimatorSet().apply {
            playSequentially(
                ObjectAnimator.ofFloat(shine, "alpha", 0f, 0.3f).apply { duration = 600 },
                ObjectAnimator.ofFloat(shine, "alpha", 0.3f, 0f).apply { duration = 600 }
            )
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    if (!isDestroyed) {
                        b.root.postDelayed({ startShinePulse(shine) }, 3800)
                    }
                }
            })
            start()
        }
    }

    private fun startRipples() {
        listOf(
            b.ripple1 to 0L,
            b.ripple2 to 800L,
            b.ripple3 to 1600L
        ).forEach { (ripple, stagger) ->
            ObjectAnimator.ofPropertyValuesHolder(
                ripple,
                PropertyValuesHolder.ofFloat("scaleX", 1f, 1.5f),
                PropertyValuesHolder.ofFloat("scaleY", 1f, 1.5f),
                PropertyValuesHolder.ofFloat("alpha", 0.6f, 0f)
            ).apply {
                duration = 2400
                repeatCount = ValueAnimator.INFINITE
                repeatMode = ValueAnimator.RESTART
                startDelay = stagger
                interpolator = LinearInterpolator()
                start()
            }.also { animators.add(it) }
        }
    }

    private fun startIconAnimations() {
        // Delivery icon nudge
        ObjectAnimator.ofFloat(b.iconDelivery, "translationX", 0f, 3f.dpToPx()).apply {
            duration = 1400
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
        
        // Diamond sparkle
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(b.iconDiamond, "scaleX", 1f, 1.1f).apply {
                    duration = 3000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = DecelerateInterpolator()
                },
                ObjectAnimator.ofFloat(b.iconDiamond, "scaleY", 1f, 1.1f).apply {
                    duration = 3000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = DecelerateInterpolator()
                },
                ObjectAnimator.ofFloat(b.iconDiamond, "rotation", 0f, 8f).apply {
                    duration = 3000
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                }
            )
            start()
        }
        
        // Headset pulse
        ObjectAnimator.ofFloat(b.iconHeadset, "scaleX", 1f, 1.1f).apply {
            duration = 2000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.iconHeadset, "scaleY", 1f, 1.1f).apply {
            duration = 2000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
    }

    private fun startCtaAnimations() {
        // Glow breathing
        ObjectAnimator.ofFloat(b.ctaGlow, "alpha", 0.4f, 0.8f).apply {
            duration = 2400
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            start()
        }.also { animators.add(it) }
        
        // Shimmer sweep
        b.ctaShimmer.visibility = View.VISIBLE
        ObjectAnimator.ofFloat(b.ctaShimmer, "translationX", -400f.dpToPx(), 400f.dpToPx()).apply {
            duration = 2800
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.RESTART
            interpolator = LinearInterpolator()
            start()
        }.also { animators.add(it) }
        
        ObjectAnimator.ofFloat(b.ctaShimmer, "alpha", 0f, 0.4f, 0f).apply {
            duration = 2800
            repeatCount = ValueAnimator.INFINITE
            setEvaluator(TypeEvaluator<Float> { fraction, _, _ ->
                when {
                    fraction < 0.5f -> fraction * 2f * 0.4f
                    else -> (2f - fraction * 2f) * 0.4f
                }
            })
            start()
        }.also { animators.add(it) }
    }

    // ── Card touch interaction ─────────────────────────────────────────────────
    private fun setupCardTouchListeners() {
        listOf(
            b.cardLeft to b.shineLeft,
            b.cardTopRight to b.shineTopRight,
            b.cardBottomRight to b.shineBottomRight
        ).forEach { (card, shine) ->
            card.setOnTouchListener { v, event ->
                when (event.action) {
                    MotionEvent.ACTION_DOWN -> {
                        v.animate()
                            .scaleX(1.03f)
                            .scaleY(1.03f)
                            .setDuration(150)
                            .setInterpolator(OvershootInterpolator())
                            .start()
                        shine.animate().alpha(0.3f).setDuration(150).start()
                        true
                    }
                    MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> {
                        v.animate()
                            .scaleX(1f)
                            .scaleY(1f)
                            .setDuration(150)
                            .start()
                        shine.animate().alpha(0f).setDuration(150).start()
                        false
                    }
                    else -> false
                }
            }
        }
    }

    // ── Navigate to SignIn with smoke burst ────────────────────────────────────
    private fun navigateToSignIn() {
        b.btnGetStart.isEnabled = false
        b.btnGetStart.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
        
        // Scale down button
        b.btnGetStart.animate()
            .scaleX(0.96f)
            .scaleY(0.96f)
            .setDuration(100)
            .withEndAction {
                // Smoke burst expansion
                b.smokeBurst.visibility = View.VISIBLE
                b.smokeBurst.pivotX = b.btnGetStart.x + b.btnGetStart.width / 2f
                b.smokeBurst.pivotY = b.btnGetStart.y + b.btnGetStart.height / 2f
                
                AnimatorSet().apply {
                    playTogether(
                        ObjectAnimator.ofFloat(b.smokeBurst, "scaleX", 0f, 30f).apply { 
                            interpolator = AccelerateInterpolator() 
                        },
                        ObjectAnimator.ofFloat(b.smokeBurst, "scaleY", 0f, 30f).apply { 
                            interpolator = AccelerateInterpolator() 
                        },
                        ObjectAnimator.ofFloat(b.smokeBurst, "alpha", 0f, 1f)
                    )
                    duration = 900
                    addListener(object : AnimatorListenerAdapter() {
                        override fun onAnimationEnd(animation: Animator) {
                            startActivity(Intent(this@OnboardingActivity, SignInActivity::class.java))
                            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                            finish()
                        }
                    })
                    start()
                }
            }
            .start()
    }

    // ── Lifecycle ──────────────────────────────────────────────────────────────
    override fun onResume() {
        super.onResume()
        if (!reduceMotion) {
            accelerometer?.let {
                sensorManager?.registerListener(this, it, SensorManager.SENSOR_DELAY_GAME)
            }
        }
    }

    override fun onPause() {
        super.onPause()
        sensorManager?.unregisterListener(this)
    }

    override fun onDestroy() {
        super.onDestroy()
        animators.forEach { it.cancel() }
        animators.clear()
        sensorManager?.unregisterListener(this)
        b.embersContainer.removeAllViews()
    }

    // ── SensorEventListener ────────────────────────────────────────────────────
    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type == Sensor.TYPE_ACCELEROMETER) {
            val x = -event.values[0] / 9.8f
            
            // Smooth parallax with bounds to prevent accumulation
            currentParallaxX = (currentParallaxX * 0.9f + x * 0.1f).coerceIn(-1f, 1f)
            
            b.cardLeft.translationX = currentParallaxX * 8f * resources.displayMetrics.density
            b.cardTopRight.translationX = currentParallaxX * 14f * resources.displayMetrics.density
            b.cardBottomRight.translationX = currentParallaxX * 20f * resources.displayMetrics.density
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // ── Helpers ────────────────────────────────────────────────────────────────
    private fun Float.dpToPx() = this * resources.displayMetrics.density
    private fun Int.dpToPx() = this * resources.displayMetrics.density
}
