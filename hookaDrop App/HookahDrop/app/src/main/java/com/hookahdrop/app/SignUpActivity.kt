package com.hookahdrop.app

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.graphics.Color
import android.os.Bundle
import android.text.InputType
import android.text.SpannableString
import android.text.Spanned
import android.text.method.LinkMovementMethod
import android.text.style.ClickableSpan
import android.text.style.ForegroundColorSpan
import android.util.Patterns
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.hookahdrop.app.databinding.ActivitySignUpBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class SignUpActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))



    private lateinit var b: ActivitySignUpBinding
    private var isPasswordVisible        = false
    private var isConfirmPasswordVisible = false
    private var isLoading                = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivitySignUpBinding.inflate(layoutInflater)
        setContentView(b.root)

        setupSpannableLinks()
        setupPasswordToggles()
        setupClickListeners()
        playEntranceAnimation()
    }

    // ── Entrance animation ────────────────────────────────────────────────────
    private fun playEntranceAnimation() {
        val views = listOf(
            b.imgLogo, b.tvTitle, b.tvSubtitle,
            b.tvName,    b.etName,
            b.tvEmail,   b.etEmail,
            b.tvPhone,   b.etPhone,
            b.tvAge,     b.etAge,
            b.tvPassword,   b.passwordContainer,
            b.tvConfirmPassword, b.confirmPasswordContainer,
            b.btnSignUp, b.tvSignIn
        )
        views.forEachIndexed { i, v ->
            v.alpha = 0f; v.translationY = 36f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(v, View.TRANSLATION_Y, 36f, 0f).also {
                        it.duration = 480; it.startDelay = (i * 45).toLong()
                        it.interpolator = DecelerateInterpolator()
                    },
                    ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).also {
                        it.duration = 480; it.startDelay = (i * 45).toLong()
                    }
                )
                start()
            }
        }
    }

    // ── Password toggles ──────────────────────────────────────────────────────
    private fun setupPasswordToggles() {
        b.ivEyeToggle.setOnClickListener {
            isPasswordVisible = !isPasswordVisible
            b.etPassword.inputType = if (isPasswordVisible)
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            b.etPassword.setSelection(b.etPassword.text?.length ?: 0)
        }
        b.ivEyeToggle2.setOnClickListener {
            isConfirmPasswordVisible = !isConfirmPasswordVisible
            b.etConfirmPassword.inputType = if (isConfirmPasswordVisible)
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            b.etConfirmPassword.setSelection(b.etConfirmPassword.text?.length ?: 0)
        }
    }

    // ── "Sign In" spannable link ──────────────────────────────────────────────
    private fun setupSpannableLinks() {
        val full  = "Already have an account? Sign In"
        val ss    = SpannableString(full)
        val start = full.indexOf("Sign In")
        val cyan  = ContextCompat.getColor(this, R.color.accent_cyan)
        ss.setSpan(ForegroundColorSpan(cyan), start, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        ss.setSpan(object : ClickableSpan() {
            override fun onClick(w: View) {
                finish()
                overridePendingTransition(R.anim.nav_exit, R.anim.nav_enter)
            }
            override fun updateDrawState(ds: android.text.TextPaint) {
                ds.color = cyan; ds.isUnderlineText = false
            }
        }, start, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        b.tvSignIn.text = ss
        b.tvSignIn.movementMethod = LinkMovementMethod.getInstance()
        b.tvSignIn.highlightColor = Color.TRANSPARENT
    }

    // ── Click listeners ───────────────────────────────────────────────────────
    private fun setupClickListeners() {
        b.btnSignUp.setOnClickListener {
            if (!isLoading) {
                AnimatorSet().apply {
                    playTogether(
                        ObjectAnimator.ofFloat(it, View.SCALE_X, 1f, 0.96f, 1f),
                        ObjectAnimator.ofFloat(it, View.SCALE_Y, 1f, 0.96f, 1f)
                    )
                    duration = 160
                    addListener(object : android.animation.AnimatorListenerAdapter() {
                        override fun onAnimationEnd(a: android.animation.Animator) = attemptSignUp()
                    })
                    start()
                }
            }
        }
    }

    // ── Validation ────────────────────────────────────────────────────────────
    private fun validate(): Boolean {
        val name            = b.etName.text.toString().trim()
        val email           = b.etEmail.text.toString().trim()
        val phone           = b.etPhone.text.toString().trim()
        val ageStr          = b.etAge.text.toString().trim()
        val password        = b.etPassword.text.toString()
        val confirmPassword = b.etConfirmPassword.text.toString()

        // Reset errors
        b.tvAgeError.visibility      = View.GONE
        b.tvPasswordError.visibility = View.GONE

        if (name.isEmpty()) {
            b.etName.error = "Username is required"; return false
        }
        if (email.isEmpty() || !Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            b.etEmail.error = "Please enter a valid email address"; return false
        }
        if (phone.isEmpty()) {
            b.etPhone.error = "Phone number is required"; return false
        }
        if (!phone.matches(Regex("^[+]?[0-9\\s\\-]{7,15}$"))) {
            b.etPhone.error = "Please enter a valid phone number"; return false
        }
        if (ageStr.isEmpty()) {
            b.etAge.error = "Age is required"; return false
        }
        val age = ageStr.toIntOrNull()
        if (age == null || age < 20) {
            b.tvAgeError.visibility = View.VISIBLE
            b.etAge.error = " "; return false
        }
        if (password.length < 6) {
            b.etPassword.error = "Password must be at least 6 characters"; return false
        }
        if (password != confirmPassword) {
            b.tvPasswordError.visibility = View.VISIBLE
            return false
        }
        return true
    }

    // ── Sign Up ───────────────────────────────────────────────────────────────
    private fun attemptSignUp() {
        if (!validate()) return

        val name     = b.etName.text.toString().trim()
        val email    = b.etEmail.text.toString().trim()
        val phone    = b.etPhone.text.toString().trim()
        val age      = b.etAge.text.toString().trim().toInt()
        val password = b.etPassword.text.toString()

        setLoading(true)

        CoroutineScope(Dispatchers.Main).launch {
            val body = JSONObject().apply {
                put("name",     name)
                put("email",    email)
                put("password", password)
                put("phone",    phone)
                put("age",      age)
                put("role",     "user")
                put("isAdmin",  false)
            }

            val response = ApiClient.post("/api/users", body)
            setLoading(false)

            when {
                response.isNetworkError -> {
                    val detail = response.json().optString("error")
                    val isLocal = ApiClient.BASE_URL.contains("10.0.2.2") || ApiClient.BASE_URL.contains("192.168")
                    val msg = if (isLocal) {
                        "Unable to connect to local server.\n\n" +
                        "• Make sure your local backend server is running (e.g. node server.js on port 8000).\n" +
                        "• Current URL: ${ApiClient.BASE_URL}\n" +
                        if (detail.isNotEmpty()) "\nError details: $detail" else ""
                    } else {
                        "Unable to connect to backend server.\n\n" +
                        "• Check your internet connection.\n" +
                        "• If using Render free hosting, the server may take ~30 seconds to wake up from cold start. Please wait a moment and try again.\n" +
                        "• If running locally, set USE_LOCAL = true in ApiClient.kt.\n" +
                        "• Target URL: ${ApiClient.BASE_URL}\n" +
                        if (detail.isNotEmpty()) "\nError details: $detail" else ""
                    }
                    showError(msg)
                }
                response.isSuccess -> {
                    val userId = response.json().optString("userId", "")
                    startActivity(Intent(this@SignUpActivity, EmailVerifyActivity::class.java).apply {
                        putExtra("userId", userId)
                        putExtra("email",  email)
                        putExtra("name",   name)
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                else -> {
                    val msg = response.json().optString("message", response.userFriendlyError())
                    showError(msg)
                }
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        isLoading = loading
        b.btnSignUp.isEnabled = !loading
        b.btnSignUp.text      = if (loading) "Creating account…" else "Create Account"
    }

    private fun showError(msg: String) {
        AlertDialog.Builder(this)
            .setTitle("Sign Up Failed")
            .setMessage(msg)
            .setPositiveButton("OK", null)
            .show()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }
}
