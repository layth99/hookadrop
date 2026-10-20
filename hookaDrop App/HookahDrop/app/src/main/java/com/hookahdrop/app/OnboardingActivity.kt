package com.hookahdrop.app

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.text.SpannableString
import android.text.Spanned
import android.text.style.ForegroundColorSpan
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.hookahdrop.app.databinding.ActivityOnboardingBinding

/**
 * ONBOARDING
 * Staggered entrance:
 *   0   ms – logo fades in
 *   150 ms – left photo slides from left
 *   300 ms – right column slides from right
 *   500 ms – eyebrow slides up
 *   650 ms – subtitle slides up (cyan span on "been waiting")
 *   750 ms – description slides up
 *   850 ms – features slide up
 *   950 ms – CTA button bounces up
 *  1050 ms – page dots appear
 */
class OnboardingActivity : AppCompatActivity() {

    private lateinit var b: ActivityOnboardingBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityOnboardingBinding.inflate(layoutInflater)
        setContentView(b.root)

        // Set up rounded-corner clipping for collage images
        b.imgHookah1.clipToOutline = true
        b.imgHookah1.outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
        b.imgHookah2.clipToOutline = true
        b.imgHookah2.outlineProvider = android.view.ViewOutlineProvider.BACKGROUND
        b.imgHookah3.clipToOutline = true
        b.imgHookah3.outlineProvider = android.view.ViewOutlineProvider.BACKGROUND

        applySubtitleSpan()
        b.root.post { playEntrance() }

        b.btnGetStart.setOnClickListener { navigateToSignIn() }
    }

    // ── Cyan "been waiting" span ──────────────────────────────────────────────
    private fun applySubtitleSpan() {
        val full  = "The experience you've\nbeen waiting for"
        val ss    = SpannableString(full)
        val start = full.indexOf("been waiting")
        val end   = start + "been waiting".length
        ss.setSpan(
            ForegroundColorSpan(ContextCompat.getColor(this, R.color.cyan)),
            start, end, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE
        )
        b.tvSubtitle.text = ss
    }

    // ── Entrance choreography ─────────────────────────────────────────────────
    private fun playEntrance() {
        // Logo fades in
        fadeIn(b.ivLogo, 0)

        // Left image slides from left
        slide(b.imgHookah1, 150, fromX = -120f)

        // Right column slides from right
        slide(b.rightColumn, 300, fromX = 120f)

        // Eyebrow label slides up
        slideUp(b.layoutEyebrow, 500)

        // Headline slides up
        slideUp(b.tvSubtitle, 650)

        // Description slides up
        slideUp(b.tvDescription, 750)

        // Features slide up
        slideUp(b.layoutFeatures, 850)

        // CTA button bounces up
        slideUp(b.btnGetStart, 950)

        // Page dots appear
        slideUp(b.layoutDots, 1050)
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private fun fadeIn(v: View, delay: Long) {
        ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).apply {
            duration = 500; startDelay = delay; start()
        }
    }

    private fun slide(v: View, delay: Long, fromX: Float) {
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(v, View.TRANSLATION_X, fromX, 0f).also {
                    it.duration = 650; it.startDelay = delay
                    it.interpolator = DecelerateInterpolator(2f)
                },
                ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).also {
                    it.duration = 600; it.startDelay = delay
                }
            )
            start()
        }
    }

    private fun pop(v: View, delay: Long) {
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(v, View.SCALE_X, 0f, 1f).also {
                    it.duration = 450; it.startDelay = delay
                    it.interpolator = OvershootInterpolator(2.5f)
                },
                ObjectAnimator.ofFloat(v, View.SCALE_Y, 0f, 1f).also {
                    it.duration = 450; it.startDelay = delay
                    it.interpolator = OvershootInterpolator(2.5f)
                },
                ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).also {
                    it.duration = 350; it.startDelay = delay
                }
            )
            start()
        }
    }

    private fun slideUp(v: View, delay: Long) {
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(v, View.TRANSLATION_Y, 70f, 0f).also {
                    it.duration = 600; it.startDelay = delay
                    it.interpolator = DecelerateInterpolator(2f)
                },
                ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).also {
                    it.duration = 500; it.startDelay = delay
                }
            )
            start()
        }
    }

    // ── Navigate (DO NOT CHANGE) ───────────────────────────────────────────────
    private fun navigateToSignIn() {
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(b.btnGetStart, View.SCALE_X, 1f, 0.95f, 1f),
                ObjectAnimator.ofFloat(b.btnGetStart, View.SCALE_Y, 1f, 0.95f, 1f)
            )
            duration = 160
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: android.animation.Animator) {
                    startActivity(Intent(this@OnboardingActivity, SignInActivity::class.java))
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                    finish()
                }
            })
            start()
        }
    }
}
