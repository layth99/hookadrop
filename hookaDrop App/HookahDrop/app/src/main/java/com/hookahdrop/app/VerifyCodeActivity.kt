package com.hookahdrop.app

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.os.CountDownTimer
import android.text.Editable
import android.text.TextWatcher
import android.view.KeyEvent
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.hookahdrop.app.databinding.ActivityVerifyCodeBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class VerifyCodeActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))



    private lateinit var b: ActivityVerifyCodeBinding
    private var countDown: CountDownTimer? = null
    private var isLoading = false

    private var email = ""
    private var mode  = "reset" // always "reset" for password flow

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityVerifyCodeBinding.inflate(layoutInflater)
        setContentView(b.root)

        email = intent.getStringExtra("email") ?: ""
        mode  = intent.getStringExtra("mode")  ?: "reset"

        b.tvEmail.text = maskEmail(email)

        setupOtpInputs()
        setupClickListeners()
        startCountdown()
        playEntranceAnimation()
    }

    // ── Entrance animation ────────────────────────────────────────────────────
    private fun playEntranceAnimation() {
        val views = listOf(
            b.btnBack, b.tvTitle, b.tvSubtitle, b.tvEmail,
            b.btnVerify, b.resendRow
        )
        views.forEachIndexed { i, v ->
            v.alpha = 0f; v.translationY = 28f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(v, View.TRANSLATION_Y, 28f, 0f).also {
                        it.duration = 420; it.startDelay = (i * 65).toLong()
                        it.interpolator = DecelerateInterpolator()
                    },
                    ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).also {
                        it.duration = 420; it.startDelay = (i * 65).toLong()
                    }
                )
                start()
            }
        }

        // 6 boxes pop in
        val boxes = listOf(b.etOtp1, b.etOtp2, b.etOtp3, b.etOtp4, b.etOtp5, b.etOtp6)
        boxes.forEachIndexed { i, et ->
            et.scaleX = 0f; et.scaleY = 0f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(et, View.SCALE_X, 0f, 1f).also {
                        it.interpolator = OvershootInterpolator(1.8f)
                        it.duration = 370; it.startDelay = (280 + i * 55).toLong()
                    },
                    ObjectAnimator.ofFloat(et, View.SCALE_Y, 0f, 1f).also {
                        it.interpolator = OvershootInterpolator(1.8f)
                        it.duration = 370; it.startDelay = (280 + i * 55).toLong()
                    }
                )
                start()
            }
        }
    }

    // ── OTP auto-advance ──────────────────────────────────────────────────────
    private fun setupOtpInputs() {
        val inputs = listOf(b.etOtp1, b.etOtp2, b.etOtp3, b.etOtp4, b.etOtp5, b.etOtp6)

        inputs.forEachIndexed { index, et ->
            et.addTextChangedListener(object : TextWatcher {
                override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
                override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
                override fun afterTextChanged(s: Editable?) {
                    hideError()
                    if (s?.length == 1) {
                        if (index < inputs.size - 1) inputs[index + 1].requestFocus()
                        else animateAllFilled()
                    }
                }
            })

            et.setOnKeyListener { _, keyCode, event ->
                if (keyCode == KeyEvent.KEYCODE_DEL &&
                    event.action == KeyEvent.ACTION_DOWN &&
                    et.text.isNullOrEmpty() && index > 0) {
                    inputs[index - 1].requestFocus()
                    inputs[index - 1].text?.clear()
                    true
                } else false
            }

            et.setOnFocusChangeListener { _, hasFocus ->
                et.background = ContextCompat.getDrawable(
                    this,
                    if (hasFocus) R.drawable.bg_otp_box_active else R.drawable.bg_otp_box
                )
            }
        }
    }

    // ── Countdown ─────────────────────────────────────────────────────────────
    private fun startCountdown() {
        b.tvResend.isEnabled = false
        b.tvResend.alpha     = 0.4f
        countDown?.cancel()
        countDown = object : CountDownTimer(60_000L, 1000L) {
            override fun onTick(ms: Long) {
                val s = ms / 1000
                b.tvTimer.text = "  %02d:%02d".format(s / 60, s % 60)
            }
            override fun onFinish() {
                b.tvTimer.text       = ""
                b.tvResend.isEnabled = true
                b.tvResend.alpha     = 1f
            }
        }.start()
    }

    // ── Click listeners ───────────────────────────────────────────────────────
    private fun setupClickListeners() {
        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }

        b.btnVerify.setOnClickListener {
            if (!isLoading) buttonPress(it) { submitCode() }
        }

        b.tvResend.setOnClickListener {
            if (!it.isEnabled || isLoading) return@setOnClickListener
            resendCode()
        }
    }

    // ── Submit code ───────────────────────────────────────────────────────────
    private fun submitCode() {
        val code = getCode()
        if (code.length < 6) {
            showError("Please enter all 6 digits."); shakeOtpRow(); return
        }

        setLoading(true)

        CoroutineScope(Dispatchers.Main).launch {
            val body = JSONObject().apply {
                put("email", email)
                put("otp",   code)
            }
            val response = ApiClient.post("/api/auth/verify-otp", body)
            setLoading(false)

            when {
                response.isNetworkError ->
                    showError("Unable to connect. Check your internet connection.")
                response.isSuccess -> {
                    // Code correct → go to new password screen
                    animateSuccess {
                        startActivity(Intent(this@VerifyCodeActivity, NewPasswordActivity::class.java).apply {
                            putExtra("email", email)
                            putExtra("code",  code)
                        })
                        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                    }
                }
                else -> {
                    val msg = response.json().optString("message", "Incorrect verification code. Please try again.")
                    showError(msg)
                    shakeOtpRow()
                    clearBoxes()
                }
            }
        }
    }

    // ── Resend ────────────────────────────────────────────────────────────────
    private fun resendCode() {
        setLoading(true)
        CoroutineScope(Dispatchers.Main).launch {
            val body = JSONObject().apply { put("email", email) }
            val response = ApiClient.post("/api/auth/send-otp", body)
            setLoading(false)

            if (response.isSuccess) {
                clearBoxes(); hideError()
                b.etOtp1.requestFocus()
                startCountdown()
                showInfo("New code sent to your email.")
            } else {
                showError("Failed to resend code. Please try again.")
            }
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun getCode() =
        listOf(b.etOtp1, b.etOtp2, b.etOtp3, b.etOtp4, b.etOtp5, b.etOtp6)
            .joinToString("") { it.text.toString() }

    private fun clearBoxes() =
        listOf(b.etOtp1, b.etOtp2, b.etOtp3, b.etOtp4, b.etOtp5, b.etOtp6)
            .forEach { it.text?.clear() }

    private fun animateAllFilled() {
        val boxes = listOf(b.etOtp1, b.etOtp2, b.etOtp3, b.etOtp4, b.etOtp5, b.etOtp6)
        boxes.forEachIndexed { i, et ->
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(et, View.SCALE_X, 1f, 1.08f, 1f),
                    ObjectAnimator.ofFloat(et, View.SCALE_Y, 1f, 1.08f, 1f)
                )
                duration = 200; startDelay = (i * 25).toLong()
                interpolator = OvershootInterpolator(2f); start()
            }
        }
    }

    private fun animateSuccess(onEnd: () -> Unit) {
        val boxes = listOf(b.etOtp1, b.etOtp2, b.etOtp3, b.etOtp4, b.etOtp5, b.etOtp6)
        boxes.forEach { et ->
            et.setTextColor(ContextCompat.getColor(this, R.color.gold))
            et.background = ContextCompat.getDrawable(this, R.drawable.bg_otp_box_active)
        }
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(b.otpRow, View.SCALE_X, 1f, 1.04f, 1f),
                ObjectAnimator.ofFloat(b.otpRow, View.SCALE_Y, 1f, 1.04f, 1f)
            )
            duration = 280
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: android.animation.Animator) = onEnd()
            })
            start()
        }
    }

    private fun shakeOtpRow() {
        ObjectAnimator.ofFloat(b.otpRow, View.TRANSLATION_X,
            0f, -16f, 16f, -12f, 12f, -8f, 8f, 0f
        ).apply { duration = 420; start() }
    }

    private fun showError(msg: String) {
        b.tvError.text = msg
        b.tvError.setTextColor(ContextCompat.getColor(this, R.color.badge_red))
        b.tvError.visibility = View.VISIBLE
    }

    private fun showInfo(msg: String) {
        b.tvError.text = msg
        b.tvError.setTextColor(ContextCompat.getColor(this, R.color.accent_cyan))
        b.tvError.visibility = View.VISIBLE
    }

    private fun hideError() { b.tvError.visibility = View.GONE }

    private fun setLoading(loading: Boolean) {
        isLoading = loading
        b.btnVerify.isEnabled = !loading
        b.btnVerify.text      = if (loading) "Verifying…" else "Verify Code"
    }

    private fun maskEmail(raw: String): String {
        val parts = raw.split("@")
        if (parts.size != 2) return raw
        val local  = parts[0]
        val visible = if (local.length <= 2) local else local.take(2)
        return "$visible****@${parts[1]}"
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

    override fun onDestroy() { super.onDestroy(); countDown?.cancel() }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }
}
