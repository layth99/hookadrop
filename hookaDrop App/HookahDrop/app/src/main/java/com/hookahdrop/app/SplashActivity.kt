package com.hookahdrop.app

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.LinearInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivitySplashBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SplashActivity : AppCompatActivity() {

    private lateinit var b: ActivitySplashBinding
    private val handler = Handler(Looper.getMainLooper())
    private lateinit var sessionManager: SessionManager
    private var isDestroyed = false
    private val smokeAnimators = mutableListOf<Animator>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(b.root)

        sessionManager = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { sessionManager.getUserId() }

        // Silent background ping to wake up Render cloud server early during splash screen
        CoroutineScope(Dispatchers.IO).launch {
            try {
                ApiClient.get("/api/categories")
            } catch (_: Exception) {}
        }

        @Suppress("DEPRECATION")
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_FULLSCREEN or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )

        runSequence()
    }

    private fun runSequence() {

        // Step 1 (0ms): Smoke layers fade in slowly at corners
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            animateSmoke()
        }, 0)

        // Step 2 (400ms): Cyan halo expands behind logo
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            b.cyanHalo.scaleX = 0.3f; b.cyanHalo.scaleY = 0.3f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(b.cyanHalo, View.ALPHA, 0f, 0.6f).also { it.duration = 800 },
                    ObjectAnimator.ofFloat(b.cyanHalo, View.SCALE_X, 0.3f, 1.1f, 1f).also {
                        it.duration = 900; it.interpolator = OvershootInterpolator(1.3f)
                    },
                    ObjectAnimator.ofFloat(b.cyanHalo, View.SCALE_Y, 0.3f, 1.1f, 1f).also {
                        it.duration = 900; it.interpolator = OvershootInterpolator(1.3f)
                    }
                )
                start()
            }
            // Glow rings also appear
            b.logoContainer.alpha = 1f
            b.glowRing.scaleX = 0.2f; b.glowRing.scaleY = 0.2f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(b.glowRing, View.SCALE_X, 0.2f, 1.1f, 1f).also {
                        it.duration = 800; it.interpolator = OvershootInterpolator(1.2f)
                    },
                    ObjectAnimator.ofFloat(b.glowRing, View.SCALE_Y, 0.2f, 1.1f, 1f).also {
                        it.duration = 800; it.interpolator = OvershootInterpolator(1.2f)
                    },
                    ObjectAnimator.ofFloat(b.glowRing, View.ALPHA, 0f, 0.7f).also { it.duration = 600 }
                )
                start()
            }
        }, 400)

        // Step 3 (700ms): Logo fades + scales in
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            b.imgLogo.alpha = 0f; b.imgLogo.scaleX = 0.75f; b.imgLogo.scaleY = 0.75f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(b.imgLogo, View.ALPHA, 0f, 1f).also {
                        it.duration = 700
                    },
                    ObjectAnimator.ofFloat(b.imgLogo, View.SCALE_X, 0.75f, 1f).also {
                        it.duration = 700; it.interpolator = DecelerateInterpolator(2f)
                    },
                    ObjectAnimator.ofFloat(b.imgLogo, View.SCALE_Y, 0.75f, 1f).also {
                        it.duration = 700; it.interpolator = DecelerateInterpolator(2f)
                    }
                )
                start()
            }
        }, 700)

        // Step 4 (1400ms): Premium shimmer sweep across logo
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            b.shimmerOverlay.alpha = 0f
            b.shimmerOverlay.translationX = -220f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(b.shimmerOverlay, View.ALPHA, 0f, 0.55f, 0f).also {
                        it.duration = 700
                    },
                    ObjectAnimator.ofFloat(b.shimmerOverlay, View.TRANSLATION_X, -220f, 220f).also {
                        it.duration = 700; it.interpolator = LinearInterpolator()
                    }
                )
                start()
            }
            // Intensify halo briefly during shimmer
            ObjectAnimator.ofFloat(b.cyanHalo, View.ALPHA, 0.6f, 0.85f, 0.5f).apply {
                duration = 700; start()
            }
        }, 1400)

        // Step 5 (1500ms): Logo idle pulse + glow rotation
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            ObjectAnimator.ofFloat(b.imgLogo, View.SCALE_X, 1f, 1.04f, 1f).apply {
                duration = 2200; repeatCount = ValueAnimator.INFINITE
                interpolator = AccelerateDecelerateInterpolator(); start()
            }
            ObjectAnimator.ofFloat(b.imgLogo, View.SCALE_Y, 1f, 1.04f, 1f).apply {
                duration = 2200; repeatCount = ValueAnimator.INFINITE
                interpolator = AccelerateDecelerateInterpolator(); start()
            }
            rotate(b.glowRing, 9000, clockwise = true)
            ObjectAnimator.ofFloat(b.cyanHalo, View.ALPHA, 0.5f, 0.25f, 0.5f).apply {
                duration = 2000; repeatCount = ValueAnimator.INFINITE
                interpolator = AccelerateDecelerateInterpolator(); start()
            }
        }, 1500)

        // Step 6 (1200ms): Cyan loading bar animates
        handler.postDelayed({
            if (isDestroyed) return@postDelayed
            val track = b.loadingBar.parent as? FrameLayout ?: return@postDelayed
            ObjectAnimator.ofFloat(track, View.ALPHA, 0f, 1f).apply { duration = 300; start() }
            track.post {
                if (isDestroyed) return@post
                val trackWidth = track.width
                if (trackWidth <= 0) return@post
                ValueAnimator.ofInt(0, trackWidth).apply {
                    duration = 2000; interpolator = DecelerateInterpolator(1.4f)
                    addUpdateListener { anim ->
                        if (isDestroyed) return@addUpdateListener
                        val w = anim.animatedValue as Int
                        val lp = b.loadingBar.layoutParams
                        lp.width = w
                        b.loadingBar.layoutParams = lp
                    }
                    start()
                }
            }
        }, 1200)

        // Step 7 (3200ms): Navigate away
        handler.postDelayed({ navigateAway() }, 3200)
    }

    private fun animateSmoke() {
        val smokeLayers = listOf(b.smokeTL, b.smokeTR, b.smokeBL, b.smokeBR)
        val targetAlphas = listOf(0.38f, 0.30f, 0.42f, 0.33f)
        val driftAmounts = listOf(-12f, 10f, 8f, -10f)

        smokeLayers.forEachIndexed { i, view ->
            // Initial fade-in
            ObjectAnimator.ofFloat(view, View.ALPHA, 0f, targetAlphas[i]).apply {
                duration = 1200; startDelay = (i * 200).toLong()
                interpolator = DecelerateInterpolator(); start()
            }
            // Breathing opacity loop (starts after fade-in)
            handler.postDelayed({
                if (isDestroyed) return@postDelayed
                ObjectAnimator.ofFloat(view, View.ALPHA,
                    targetAlphas[i], targetAlphas[i] * 0.65f, targetAlphas[i]).apply {
                    duration = 2800L + i * 400L
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    start()
                }.also { smokeAnimators.add(it) }
                // Slow upward drift
                ObjectAnimator.ofFloat(view, View.TRANSLATION_Y, 0f, driftAmounts[i]).apply {
                    duration = 3500L + i * 500L
                    repeatCount = ValueAnimator.INFINITE
                    repeatMode = ValueAnimator.REVERSE
                    interpolator = AccelerateDecelerateInterpolator()
                    start()
                }.also { smokeAnimators.add(it) }
                // Very subtle scale breathing
                ObjectAnimator.ofFloat(view, View.SCALE_X, 1f, 1.04f, 1f).apply {
                    duration = 4000L + i * 300L
                    repeatCount = ValueAnimator.INFINITE
                    interpolator = AccelerateDecelerateInterpolator()
                    start()
                }.also { smokeAnimators.add(it) }
            }, 1400L + i * 200L)
        }
    }

    private fun fadeIn(v: View, duration: Long) {
        ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).apply {
            this.duration = duration; start()
        }
    }

    private fun rotate(v: View, durationMs: Long, clockwise: Boolean) {
        ObjectAnimator.ofFloat(v, View.ROTATION, 0f, if (clockwise) 360f else -360f).apply {
            duration    = durationMs
            repeatCount = ValueAnimator.INFINITE
            repeatMode  = ValueAnimator.RESTART
            interpolator = LinearInterpolator()
            start()
        }
    }

    private fun navigateAway() {
        if (isDestroyed || isFinishing) return

        val destination = if (sessionManager.isLoggedIn())
            HomeActivity::class.java
        else
            OnboardingActivity::class.java

        ObjectAnimator.ofFloat(b.root, View.ALPHA, 1f, 0f).apply {
            duration = 500
            addListener(object : AnimatorListenerAdapter() {
                override fun onAnimationEnd(animation: Animator) {
                    if (isDestroyed || isFinishing) return
                    val intent = Intent(this@SplashActivity, destination)
                    if (sessionManager.isLoggedIn()) {
                        intent.flags =
                            Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    }
                    startActivity(intent)
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                    finish()
                }
            })
            start()
        }
    }

    override fun onDestroy() {
        isDestroyed = true
        handler.removeCallbacksAndMessages(null)
        smokeAnimators.forEach { it.cancel() }
        smokeAnimators.clear()
        super.onDestroy()
    }
}
