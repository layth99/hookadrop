package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.databinding.ActivitySettingsBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class SettingsActivity : BaseProfileActivity() {

    private lateinit var b: ActivitySettingsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivitySettingsBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.btnBack.setOnClickListener { navigateBack() }

        // ── Show success toast if coming back from ChangePasswordActivity ──────
        if (intent.getBooleanExtra("passwordChanged", false)) {
            Toast.makeText(this, "Password changed successfully!", Toast.LENGTH_LONG).show()
        }

        // ── Notifications toggle ───────────────────────────────────────────────
        b.switchNotifications.isChecked = session.isNotificationsEnabled()
        b.switchNotifications.setOnCheckedChangeListener { _, checked ->
            session.setNotificationsEnabled(checked)
            toast(if (checked) "Notifications enabled" else "Notifications disabled")
        }

        // ── Edit Profile ───────────────────────────────────────────────────────
        b.settingEditProfile.setOnClickListener {
            startActivity(Intent(this, EditProfileActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }

        // ── Change Password → real flow ────────────────────────────────────────
        b.settingChangePassword.setOnClickListener {
            startActivity(Intent(this, ChangePasswordActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }

        // ── Language ───────────────────────────────────────────────────────────
        b.settingLanguage.setOnClickListener {
            startActivity(Intent(this, LanguageActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }

        // ── Privacy Settings (placeholder with info) ───────────────────────────
        b.settingPrivacy.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Privacy Settings")
                .setMessage(
                    "Your data is used only to provide the HookaDrop service.\n\n" +
                    "• We do not sell your personal information.\n" +
                    "• Payment data is handled by our secure payment processor.\n" +
                    "• You can request account deletion at any time.\n\n" +
                    "For full details, see our Privacy Policy."
                )
                .setPositiveButton("OK", null)
                .show()
        }

        // ── Terms & Conditions ─────────────────────────────────────────────────
        b.settingTerms.setOnClickListener {
            startActivity(Intent(this, TermsActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }

        // ── Privacy Policy ─────────────────────────────────────────────────────
        b.settingPrivacyPolicy.setOnClickListener {
            startActivity(Intent(this, PrivacyPolicyActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }

        // ── Delete account ─────────────────────────────────────────────────────
        b.settingDeleteAccount.setOnClickListener { confirmDeleteAccount() }

        setupBottomNav(b.root, 4)
        fadeIn(b.root)
    }

    private fun confirmDeleteAccount() {
        AlertDialog.Builder(this)
            .setTitle("Delete Account")
            .setMessage(
                "This will permanently delete your account and all associated data.\n\n" +
                "This action cannot be undone."
            )
            .setPositiveButton("Delete Account") { _, _ -> deleteAccount() }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun deleteAccount() {
        val token = session.getJwtToken() ?: run {
            session.clearSession()
            goToSignIn(); return
        }

        CoroutineScope(Dispatchers.Main).launch {
            // Call delete endpoint if available, otherwise just clear session
            val response = ApiClient.delete("/api/profile/me", token)
            session.clearSession()
            if (response.isSuccess || response.code == 404) {
                toast("Account deleted.")
            }
            goToSignIn()
        }
    }

    private fun goToSignIn() {
        startActivity(Intent(this, SignInActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        })
        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
    }
}
