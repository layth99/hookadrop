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
import android.view.View
import android.view.animation.DecelerateInterpolator
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessaging
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivitySignInBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

class SignInActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))



    private lateinit var binding: ActivitySignInBinding
    private lateinit var sessionManager: SessionManager
    private var isPasswordVisible = false
    private var isLoading = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySignInBinding.inflate(layoutInflater)
        setContentView(binding.root)

        sessionManager = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { sessionManager.getUserId() }

        // Already logged in → go straight to Home
        if (sessionManager.isLoggedIn()) {
            goHome(); return
        }

        setupSpannableLinks()
        setupPasswordToggle()
        setupClickListeners()
        playEntranceAnimation()

        // Show success message if coming back from password reset
        if (intent.getBooleanExtra("passwordReset", false)) {
            android.widget.Toast.makeText(
                this,
                "Password changed successfully! Please sign in.",
                android.widget.Toast.LENGTH_LONG
            ).show()
        }
    }

    // ── Entrance animation ────────────────────────────────────────────────────

    private fun playEntranceAnimation() {
        val views = listOf(
            binding.imgLogo, binding.tvTitle,
            binding.tvEmail, binding.etEmail,
            binding.tvPassword, binding.passwordContainer,
            binding.tvForgotPassword, binding.btnSignIn,
            binding.socialRow, binding.tvSignUp
        )
        views.forEachIndexed { index, view ->
            view.alpha = 0f; view.translationY = 40f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(view, View.TRANSLATION_Y, 40f, 0f).also {
                        it.duration = 500; it.startDelay = (index * 60).toLong()
                        it.interpolator = DecelerateInterpolator()
                    },
                    ObjectAnimator.ofFloat(view, View.ALPHA, 0f, 1f).also {
                        it.duration = 500; it.startDelay = (index * 60).toLong()
                    }
                )
                start()
            }
        }
    }

    // ── Password toggle ───────────────────────────────────────────────────────

    private fun setupPasswordToggle() {
        binding.ivEyeToggle.setOnClickListener {
            isPasswordVisible = !isPasswordVisible
            binding.etPassword.inputType = if (isPasswordVisible)
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            binding.etPassword.setSelection(binding.etPassword.text?.length ?: 0)
        }
    }

    // ── Spannable "Sign Up" link ──────────────────────────────────────────────

    private fun setupSpannableLinks() {
        val full  = "Don't have an account? Sign Up"
        val ss    = SpannableString(full)
        val start = full.indexOf("Sign Up")
        ss.setSpan(ForegroundColorSpan(ContextCompat.getColor(this, R.color.accent_cyan)),
            start, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        ss.setSpan(object : ClickableSpan() {
            override fun onClick(widget: View) { navigateTo(SignUpActivity::class.java) }
            override fun updateDrawState(ds: android.text.TextPaint) {
                ds.color = ContextCompat.getColor(this@SignInActivity, R.color.accent_cyan)
                ds.isUnderlineText = false
            }
        }, start, full.length, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE)
        binding.tvSignUp.text = ss
        binding.tvSignUp.movementMethod = LinkMovementMethod.getInstance()
        binding.tvSignUp.highlightColor = Color.TRANSPARENT
    }

    // ── Click listeners ───────────────────────────────────────────────────────

    private fun setupClickListeners() {
        binding.btnSignIn.setOnClickListener {
            if (!isLoading) attemptLogin()
        }
        binding.tvForgotPassword.setOnClickListener {
            navigateTo(ForgotPasswordActivity::class.java)
        }
        binding.btnBackToOnboarding.setOnClickListener {
            startActivity(Intent(this, OnboardingActivity::class.java))
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
            finish()
        }
    }

    // ── REAL LOGIN — calls POST /api/auth/login ───────────────────────────────

    private fun attemptLogin() {
        val email    = binding.etEmail.text.toString().trim()
        val password = binding.etPassword.text.toString()

        if (email.isEmpty()) {
            binding.etEmail.error = "Email is required"; return
        }
        if (password.isEmpty()) {
            binding.etPassword.error = "Password is required"; return
        }

        setLoading(true)

        CoroutineScope(Dispatchers.Main).launch {
            val body = JSONObject().apply {
                put("email",    email)
                put("password", password)
            }

            val response = ApiClient.post("/api/auth/login", body)

            setLoading(false)

            // ── Handle unverified account (403) ──────────────────────────────
            if (response.code == 403) {
                val json       = response.json()
                val needsVerif = json.optBoolean("requiresVerification", false)
                if (needsVerif) {
                    val uid   = json.optString("userId", "")
                    val umail = json.optString("email",  email)
                    setLoading(false)
                    androidx.appcompat.app.AlertDialog.Builder(this@SignInActivity)
                        .setTitle("Email Not Verified")
                        .setMessage("Please verify your email before signing in.\n\nA new code will be sent to $umail.")
                        .setPositiveButton("Verify Now") { _, _ ->
                            startActivity(Intent(this@SignInActivity, EmailVerifyActivity::class.java).apply {
                                putExtra("userId", uid)
                                putExtra("email",  umail)
                                putExtra("name",   "")
                            })
                            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                        }
                        .setNegativeButton("Cancel", null)
                        .show()
                    return@launch
                }
            }

            if (response.isSuccess) {
                val json  = response.json()
                val token = json.optString("token")
                val user  = json.optJSONObject("user")

                if (token.isNotEmpty() && user != null) {

                    // ── Block non-customer accounts from the app ──────────────
                    val role    = user.optString("role", "user")
                    val isAdmin = user.optBoolean("isAdmin", false)

                    if (isAdmin || role == "admin" || role == "viewer" || role == "delivery") {
                        setLoading(false)
                        androidx.appcompat.app.AlertDialog.Builder(this@SignInActivity)
                            .setTitle("Access Denied")
                            .setMessage(
                                "This app is for customers only.\n\n" +
                                "Admin accounts must use the HookaDrop Dashboard."
                            )
                            .setPositiveButton("OK", null)
                            .show()
                        return@launch
                    }

                    val name      = user.optString("name",  email.substringBefore("@"))
                    val userEmail = user.optString("email", email)
                    val userId    = user.optString("_id",   "")

                    sessionManager.saveSession(name, userEmail)
                    sessionManager.saveJwtToken(token)
                    sessionManager.saveUserId(userId)
                    sessionManager.saveProfileFromServer(user)

                    // Register FCM token with backend after successful login
                    FirebaseMessaging.getInstance().token.addOnSuccessListener { fcmToken ->
                        sessionManager.saveFcmToken(fcmToken)
                        CoroutineScope(Dispatchers.IO).launch {
                            try {
                                val prefBody = JSONObject().apply {
                                    put("fcmToken", fcmToken)
                                    put("notificationsEnabled", sessionManager.isNotificationsEnabled())
                                }
                                // Backend PATCH /api/notifications/preferences — using PUT (no patch() in ApiClient)
                                ApiClient.put("/api/notifications/preferences", prefBody, token)
                            } catch (e: Exception) {
                                // Non-critical: token will sync on next profile visit
                            }
                        }
                    }

                    goHome()
                } else {
                    showError("Login failed. Please try again.")
                }
            } else {
                showError(response.userFriendlyError())
            }
        }
    }

    private fun setLoading(loading: Boolean) {
        isLoading = loading
        binding.btnSignIn.isEnabled = !loading
        binding.btnSignIn.text      = if (loading) "Signing in…" else "Sign In"
    }

    private fun showError(msg: String) {
        Toast.makeText(this, msg, Toast.LENGTH_LONG).show()
    }

    // ── Navigation ────────────────────────────────────────────────────────────

    private fun goHome() {
        startActivity(Intent(this, HomeActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
    }

    private fun <T> navigateTo(clazz: Class<T>) {
        startActivity(Intent(this, clazz))
        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }
}
