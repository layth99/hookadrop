package com.hookahdrop.app

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.text.InputType
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import com.hookahdrop.app.databinding.ActivityNewPasswordBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class NewPasswordActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))



    private lateinit var b: ActivityNewPasswordBinding
    private var isPass1Visible = false
    private var isPass2Visible = false
    private var isLoading      = false

    private var email = ""
    private var code  = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityNewPasswordBinding.inflate(layoutInflater)
        setContentView(b.root)

        email = intent.getStringExtra("email") ?: ""
        code  = intent.getStringExtra("code")  ?: ""

        setupPasswordToggles()
        setupClickListeners()
        playEntranceAnimation()
    }

    private fun playEntranceAnimation() {
        val views = listOf(
            b.tvTitle, b.tvSubtitle,
            b.tvPassword,        b.passwordContainer,
            b.tvConfirmPassword, b.confirmPasswordContainer,
            b.btnResetPassword
        )
        views.forEachIndexed { i, v ->
            v.alpha = 0f; v.translationY = 35f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(v, View.TRANSLATION_Y, 35f, 0f).also {
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

    private fun setupPasswordToggles() {
        b.ivEyeToggle1.setOnClickListener {
            isPass1Visible = !isPass1Visible
            b.etPassword.inputType = if (isPass1Visible)
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            b.etPassword.setSelection(b.etPassword.text?.length ?: 0)
        }
        b.ivEyeToggle2.setOnClickListener {
            isPass2Visible = !isPass2Visible
            b.etConfirmPassword.inputType = if (isPass2Visible)
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            b.etConfirmPassword.setSelection(b.etConfirmPassword.text?.length ?: 0)
        }
    }

    private fun setupClickListeners() {
        b.btnResetPassword.setOnClickListener {
            if (!isLoading) buttonPress(it) { attemptReset() }
        }
    }

    private fun attemptReset() {
        val p1 = b.etPassword.text.toString()
        val p2 = b.etConfirmPassword.text.toString()

        if (p1.isEmpty()) {
            b.etPassword.error = "Password is required"; return
        }
        if (p1.length < 6) {
            b.etPassword.error = "Password must be at least 6 characters"; return
        }
        if (p2.isEmpty()) {
            b.etConfirmPassword.error = "Please confirm your password"; return
        }
        if (p1 != p2) {
            shakeView(b.confirmPasswordContainer)
            b.etConfirmPassword.error = "Passwords do not match"
            return
        }

        setLoading(true)

        CoroutineScope(Dispatchers.Main).launch {
            val body = JSONObject().apply {
                put("email",       email)
                put("newPassword", p1)
            }
            val response = ApiClient.put("/api/auth/reset-password", body)
            setLoading(false)

            when {
                response.isNetworkError ->
                    b.etPassword.error = "Unable to connect. Please check your internet."
                response.isSuccess -> {
                    // Password changed — go back to Sign In
                    startActivity(Intent(this@NewPasswordActivity, SignInActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_NEW_TASK
                        putExtra("passwordReset", true)
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                    finish()
                }
                else -> {
                    val msg = response.json().optString("message", "Password reset failed. Please try again.")
                    b.etPassword.error = msg
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        isLoading = loading
        b.btnResetPassword.isEnabled = !loading
        b.btnResetPassword.text      = if (loading) "Saving…" else "Reset Password"
    }

    private fun shakeView(v: View) {
        ObjectAnimator.ofFloat(v, View.TRANSLATION_X,
            0f, -16f, 16f, -12f, 12f, -8f, 8f, 0f
        ).apply { duration = 420; start() }
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
