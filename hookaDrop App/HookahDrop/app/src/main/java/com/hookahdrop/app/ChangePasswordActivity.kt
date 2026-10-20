package com.hookahdrop.app

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.View
import android.view.animation.DecelerateInterpolator
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivityChangePasswordBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class ChangePasswordActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))



    private lateinit var b: ActivityChangePasswordBinding
    private lateinit var session: SessionManager
    private var isLoading         = false
    private var eyeAVisible       = false
    private var eyeB1Visible      = false
    private var eyeB2Visible      = false
    private var verifiedPassword  = ""   // current password verified on Step A

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityChangePasswordBinding.inflate(layoutInflater)
        setContentView(b.root)
        session = SessionManager(this)

        setupEyeToggles()
        setupStrengthMeter()
        setupClickListeners()
        playEntrance()
    }

    // ── Entrance ──────────────────────────────────────────────────────────────
    private fun playEntrance() {
        val views = listOf(b.btnBack, b.iconWrap, b.tvTitle, b.tvStep, b.stepA)
        views.forEachIndexed { i, v ->
            v.alpha = 0f; v.translationY = 30f
            AnimatorSet().apply {
                playTogether(
                    ObjectAnimator.ofFloat(v, View.TRANSLATION_Y, 30f, 0f).also {
                        it.duration = 400; it.startDelay = (i * 60).toLong()
                        it.interpolator = DecelerateInterpolator()
                    },
                    ObjectAnimator.ofFloat(v, View.ALPHA, 0f, 1f).also {
                        it.duration = 400; it.startDelay = (i * 60).toLong()
                    }
                )
                start()
            }
        }
    }

    // ── Eye toggles ───────────────────────────────────────────────────────────
    private fun setupEyeToggles() {
        b.ivEyeA.setOnClickListener {
            eyeAVisible = !eyeAVisible
            b.etCurrentPassword.inputType = if (eyeAVisible)
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            b.etCurrentPassword.setSelection(b.etCurrentPassword.text?.length ?: 0)
        }
        b.ivEyeB1.setOnClickListener {
            eyeB1Visible = !eyeB1Visible
            b.etNewPassword.inputType = if (eyeB1Visible)
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            b.etNewPassword.setSelection(b.etNewPassword.text?.length ?: 0)
        }
        b.ivEyeB2.setOnClickListener {
            eyeB2Visible = !eyeB2Visible
            b.etConfirmNewPassword.inputType = if (eyeB2Visible)
                InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD
            else InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_PASSWORD
            b.etConfirmNewPassword.setSelection(b.etConfirmNewPassword.text?.length ?: 0)
        }
    }

    // ── Strength meter ────────────────────────────────────────────────────────
    private fun setupStrengthMeter() {
        b.etNewPassword.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, b2: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) {
                val pw = s?.toString() ?: ""
                val score = calcStrength(pw)
                b.strengthBar.progress = score
                val (label, color) = when (score) {
                    0    -> "" to R.color.text_muted
                    1    -> "Weak" to R.color.badge_red
                    2    -> "Fair" to R.color.warning
                    3    -> "Good" to R.color.accent_cyan
                    else -> "Strong" to R.color.success
                }
                b.tvStrength.text = if (label.isNotEmpty()) "Strength: $label" else ""
                b.strengthBar.progressTintList =
                    android.content.res.ColorStateList.valueOf(ContextCompat.getColor(this@ChangePasswordActivity, color))
                hideErrorB()
            }
        })
        b.etConfirmNewPassword.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, st: Int, c: Int, a: Int) {}
            override fun onTextChanged(s: CharSequence?, st: Int, b2: Int, c: Int) {}
            override fun afterTextChanged(s: Editable?) { hideErrorB() }
        })
    }

    private fun calcStrength(pw: String): Int {
        var s = 0
        if (pw.length >= 8)                          s++
        if (pw.any { it.isDigit() })                 s++
        if (pw.any { it.isUpperCase() })             s++
        if (pw.any { "!@#\$%^&*()_+-=[]{}".contains(it) }) s++
        return s
    }

    // ── Click listeners ───────────────────────────────────────────────────────
    private fun setupClickListeners() {
        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }

        b.btnContinue.setOnClickListener { if (!isLoading) verifyCurrentPassword() }
        b.btnSave.setOnClickListener     { if (!isLoading) saveNewPassword() }
    }

    // ── Step A: verify current password ──────────────────────────────────────
    private fun verifyCurrentPassword() {
        val current = b.etCurrentPassword.text.toString()
        if (current.isEmpty()) {
            showErrorA("Current password is required."); return
        }

        setLoading(true, "A")

        CoroutineScope(Dispatchers.Main).launch {
            // We verify by attempting login with current credentials
            val email = session.getUserEmail()
            val body  = JSONObject().apply {
                put("email",    email)
                put("password", current)
            }
            val response = ApiClient.post("/api/auth/login", body)
            setLoading(false, "A")

            when {
                response.isNetworkError ->
                    showErrorA("Unable to connect. Check your internet.")
                response.isSuccess -> {
                    verifiedPassword = current
                    switchToStepB()
                }
                else ->
                    showErrorA("Current password is incorrect. Please try again.")
            }
        }
    }

    // ── Step B: save new password ─────────────────────────────────────────────
    private fun saveNewPassword() {
        val newPw     = b.etNewPassword.text.toString()
        val confirmPw = b.etConfirmNewPassword.text.toString()

        if (newPw.length < 8) {
            showErrorB("Password must be at least 8 characters."); return
        }
        if (newPw == verifiedPassword) {
            showErrorB("New password must be different from your current password."); return
        }
        if (newPw != confirmPw) {
            showErrorB("Passwords do not match.")
            shakeView(b.etConfirmNewPassword); return
        }

        setLoading(true, "B")

        CoroutineScope(Dispatchers.Main).launch {
            val token = session.getJwtToken()
            val body  = JSONObject().apply {
                put("currentPassword", verifiedPassword)
                put("newPassword",     newPw)
            }
            val response = ApiClient.put("/api/auth/change-password", body, token)
            setLoading(false, "B")

            when {
                response.isNetworkError ->
                    showErrorB("Unable to connect. Check your internet.")
                response.isSuccess -> {
                    // Success — back to Settings with message
                    startActivity(Intent(this@ChangePasswordActivity, SettingsActivity::class.java).apply {
                        putExtra("passwordChanged", true)
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                    finish()
                }
                response.code == 429 -> {
                    val daysLeft = response.json().optInt("daysLeft", 0)
                    val msg = if (daysLeft > 0)
                        "You can change your password again in $daysLeft day${if (daysLeft == 1) "" else "s"}."
                    else
                        response.json().optString("message", "Password change not allowed yet.")
                    showErrorB(msg)
                }
                else -> {
                    val msg = response.json().optString("message", "Password change failed. Please try again.")
                    showErrorB(msg)
                }
            }
        }
    }

    // ── Transition Step A → Step B ────────────────────────────────────────────
    private fun switchToStepB() {
        b.tvStep.text = "Step 2 of 2 — Enter new password"
        b.stepA.animate().alpha(0f).translationX(-60f).setDuration(200)
            .withEndAction {
                b.stepA.visibility = View.GONE
                b.stepB.alpha      = 0f
                b.stepB.translationX = 60f
                b.stepB.visibility = View.VISIBLE
                b.stepB.animate().alpha(1f).translationX(0f).setDuration(220).start()
                b.etNewPassword.requestFocus()
            }.start()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private fun setLoading(loading: Boolean, step: String) {
        isLoading = loading
        if (step == "A") {
            b.btnContinue.isEnabled = !loading
            b.btnContinue.text      = if (loading) "Verifying…" else "Continue"
        } else {
            b.btnSave.isEnabled = !loading
            b.btnSave.text      = if (loading) "Saving…" else "Save Password"
        }
    }

    private fun showErrorA(msg: String) {
        b.tvErrorA.text = msg; b.tvErrorA.visibility = View.VISIBLE
    }
    private fun showErrorB(msg: String) {
        b.tvErrorB.text = msg; b.tvErrorB.visibility = View.VISIBLE
    }
    private fun hideErrorB() { b.tvErrorB.visibility = View.GONE }

    private fun shakeView(v: View) {
        ObjectAnimator.ofFloat(v, View.TRANSLATION_X,
            0f, -14f, 14f, -10f, 10f, -6f, 6f, 0f).apply { duration = 380; start() }
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }
}
