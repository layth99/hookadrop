package com.hookahdrop.app

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.util.Patterns
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.hookahdrop.app.databinding.ActivityForgotPasswordBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class ForgotPasswordActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))



    private lateinit var b: ActivityForgotPasswordBinding
    private var isLoading = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityForgotPasswordBinding.inflate(layoutInflater)
        setContentView(b.root)

        setupClickListeners()
        playEntranceAnimation()
    }

    private fun playEntranceAnimation() {
        val views = listOf(
            b.btnBack, b.tvTitle, b.tvSubtitle,
            b.tvEmail, b.etEmail, b.btnVerify
        )
        views.forEachIndexed { i, v ->
            v.alpha = 0f; v.translationY = 30f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(v, View.TRANSLATION_Y, 30f, 0f).also {
                        it.duration = 450; it.startDelay = (i * 70).toLong()
                        it.interpolator = DecelerateInterpolator()
                    },
                    ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).also {
                        it.duration = 450; it.startDelay = (i * 70).toLong()
                    }
                )
                start()
            }
        }
    }

    private fun setupClickListeners() {
        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }

        b.btnVerify.setOnClickListener {
            if (!isLoading) buttonPress(it) { sendCode() }
        }
    }

    private fun sendCode() {
        val email = b.etEmail.text.toString().trim()

        if (email.isEmpty()) {
            b.etEmail.error = "Email is required"; return
        }
        if (!Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            b.etEmail.error = "Please enter a valid email address"; return
        }

        setLoading(true)

        CoroutineScope(Dispatchers.Main).launch {
            val body = JSONObject().apply { put("email", email) }
            val response = ApiClient.post("/api/auth/send-otp", body)
            setLoading(false)

            when {
                response.isNetworkError ->
                    b.etEmail.error = "Unable to connect. Check your internet."
                response.isSuccess -> {
                    // Navigate to 6-digit code screen, passing email
                    startActivity(Intent(this@ForgotPasswordActivity, VerifyCodeActivity::class.java).apply {
                        putExtra("email",  email)
                        putExtra("mode",   "reset") // distinguish from sign-up verify
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                else -> {
                    val msg = response.json().optString("message", "Email not found. Please check and try again.")
                    b.etEmail.error = msg
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        isLoading = loading
        b.btnVerify.isEnabled = !loading
        b.btnVerify.text      = if (loading) "Sending code…" else "Send Code"
    }

    private fun buttonPress(v: View, action: () -> Unit) {
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(v, View.SCALE_X, 1f, 0.96f, 1f),
                ObjectAnimator.ofFloat(v, View.SCALE_Y, 1f, 0.96f, 1f)
            )
            duration = 160
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: android.animation.Animator) = action()
            })
            start()
        }
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }
}
