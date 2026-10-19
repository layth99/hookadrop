package com.hookahdrop.app

import android.Manifest
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.Settings
import android.view.View
import android.widget.TextView
import androidx.appcompat.app.AlertDialog
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.bumptech.glide.Glide
import com.google.firebase.messaging.FirebaseMessaging
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.ProfileDataManager
import com.hookahdrop.app.data.RemoteDataProvider
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.databinding.ActivityProfileBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONObject

class ProfileActivity : BaseProfileActivity() {

    private lateinit var b: ActivityProfileBinding

    companion object {
        private const val RC_NOTIF_PERMISSION = 1001
    }

    /**
     * Single notification-switch listener stored as a field so it can be removed and
     * re-attached by loadServerNotificationPreference() without duplicating it.
     */
    private val notificationSwitchListener =
        android.widget.CompoundButton.OnCheckedChangeListener { _, checked ->
            onNotificationSwitchChanged(checked)
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityProfileBinding.inflate(layoutInflater)
        setContentView(b.root)

        bindUserInfo()
        setupMenuItems()
        setupSignOut()
        setupBottomNav(b.root, 4)
        fadeIn(b.root)
        loadOrderCount()
    }

    override fun onResume() {
        super.onResume()
        bindUserInfo()
        loadOrderCount()
        // Sync notification preference from server (across-device consistency)
        loadServerNotificationPreference()
    }

    private fun bindUserInfo() {
        b.tvProfileName.text  = session.getUserName()
        b.tvProfileEmail.text = session.getUserEmail().ifEmpty { "member@hookahdrop.com" }
        b.switchNotifications.isChecked = session.isNotificationsEnabled()

        // Load avatar if saved
        val avatarUrl = session.getAvatar()
        if (!avatarUrl.isNullOrEmpty()) {
            Glide.with(this)
                .load(avatarUrl)
                .circleCrop()
                .placeholder(R.drawable.bg_avatar_default)
                .error(R.drawable.bg_avatar_default)
                .into(b.imgAvatar)
        } else {
            b.imgAvatar.setImageResource(R.drawable.bg_avatar_default)
        }
    }

    // ── Load real order count from backend ────────────────────────────────────
    private fun loadOrderCount() {
        val token = session.getJwtToken() ?: return
        val userId = session.getUserId() ?: return
        lifecycleScope.launch {
            try {
                val orders = withContext(Dispatchers.IO) {
                    RemoteDataProvider.getMyOrders(userId, token)
                }
                b.tvOrderCount.text = orders.size.toString()
            } catch (e: Exception) {
                // Keep showing 0 silently on error
            }
        }
    }

    private fun setupMenuItems() {
        // Whole banner → EditProfile
        b.bannerUserCard.setOnClickListener {
            ripple(it) { navigate(EditProfileActivity::class.java) }
        }
        // Avatar tap → EditProfile too (image change lives there)
        b.avatarContainer.setOnClickListener {
            ripple(it) { navigate(EditProfileActivity::class.java) }
        }
        b.btnEditProfileIcon.setOnClickListener {
            ripple(it) { navigate(EditProfileActivity::class.java) }
        }

        b.itemMyOrders.setOnClickListener  { ripple(it) { navigate(OrdersActivity::class.java) } }
        b.itemAddresses.setOnClickListener { ripple(it) { navigate(AddressesActivity::class.java) } }
        b.itemPayment.setOnClickListener   { ripple(it) { navigate(PaymentMethodsActivity::class.java) } }
        b.itemPromoCodes.setOnClickListener{ ripple(it) { navigate(PromoCodesActivity::class.java) } }
        b.itemSettings.setOnClickListener  { ripple(it) { navigate(SettingsActivity::class.java) } }
        b.itemHelp.setOnClickListener      { ripple(it) { navigate(HelpSupportActivity::class.java) } }

        // Attach the shared listener once here; loadServerNotificationPreference will
        // detach/reattach this same instance — never creating a second listener.
        b.switchNotifications.setOnCheckedChangeListener(notificationSwitchListener)
    }

    /** All toggle-handling logic extracted so it can be called from both the listener
     *  and onRequestPermissionsResult without duplication. */
    private fun onNotificationSwitchChanged(checked: Boolean) {
        if (checked) {
            // Android 13+ requires runtime POST_NOTIFICATIONS permission
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                if (ContextCompat.checkSelfPermission(
                        this, Manifest.permission.POST_NOTIFICATIONS
                    ) != PackageManager.PERMISSION_GRANTED
                ) {
                    // Request permission; the switch will be re-set in onRequestPermissionsResult
                    ActivityCompat.requestPermissions(
                        this,
                        arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                        RC_NOTIF_PERMISSION
                    )
                    // Temporarily revert until permission result is known (suppress listener)
                    b.switchNotifications.setOnCheckedChangeListener(null)
                    b.switchNotifications.isChecked = false
                    b.switchNotifications.setOnCheckedChangeListener(notificationSwitchListener)
                    return
                }
            }
            // Permission already granted (or < API 33) — register FCM token
            session.setNotificationsEnabled(true)
            FirebaseMessaging.getInstance().token.addOnSuccessListener { token ->
                session.saveFcmToken(token)
                syncNotificationPreference(enabled = true, fcmToken = token)
            }.addOnFailureListener {
                syncNotificationPreference(enabled = true, fcmToken = null)
            }
        } else {
            session.setNotificationsEnabled(false)
            syncNotificationPreference(enabled = false, fcmToken = null)
        }
    }

    private fun setupSignOut() {
        b.btnSignOut.setOnClickListener {
            AlertDialog.Builder(this)
                .setTitle("Sign Out")
                .setMessage("Are you sure you want to sign out of your account?")
                .setPositiveButton("Sign Out") { _, _ ->
                    session.clearSession()
                    CartManager.clear()
                    FavoritesManager.clear()
                    startActivity(Intent(this, SignInActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun <T> navigate(clazz: Class<T>) {
        startActivity(Intent(this, clazz))
        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
    }

    private fun ripple(v: View, action: () -> Unit) {
        AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(v, View.SCALE_X, 1f, 0.97f, 1f),
                ObjectAnimator.ofFloat(v, View.SCALE_Y, 1f, 0.97f, 1f)
            )
            duration = 140
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: android.animation.Animator) = action()
            })
            start()
        }
    }

    // ── Notification preference sync ─────────────────────────────────────────

    private fun syncNotificationPreference(enabled: Boolean, fcmToken: String?) {
        val token = session.getJwtToken() ?: return
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val body = JSONObject().apply {
                    put("notificationsEnabled", enabled)
                    if (fcmToken != null) put("fcmToken", fcmToken)
                }
                // Backend PATCH /api/notifications/preferences — using PUT as ApiClient has no patch()
                ApiClient.put("/api/notifications/preferences", body, token)
            } catch (e: Exception) {
                // Non-critical: local pref already saved
            }
        }
    }

    private fun loadServerNotificationPreference() {
        val token = session.getJwtToken() ?: return
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    ApiClient.get("/api/notifications/preferences", token)
                }
                if (response.isSuccess) {
                    val json    = response.json()
                    val enabled = json.optBoolean("notificationsEnabled", session.isNotificationsEnabled())
                    session.setNotificationsEnabled(enabled)
                    // Update switch without triggering the listener (detach, set, reattach same instance)
                    b.switchNotifications.setOnCheckedChangeListener(null)
                    b.switchNotifications.isChecked = enabled
                    b.switchNotifications.setOnCheckedChangeListener(notificationSwitchListener)
                }
            } catch (e: Exception) {
                // Non-critical
            }
        }
    }

    // ── Runtime permission result ─────────────────────────────────────────────

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == RC_NOTIF_PERMISSION) {
            if (grantResults.isNotEmpty() &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED
            ) {
                // Permission granted — let the listener handle FCM registration by
                // detaching it, setting the check, then re-attaching so it fires once.
                b.switchNotifications.setOnCheckedChangeListener(null)
                b.switchNotifications.isChecked = true
                b.switchNotifications.setOnCheckedChangeListener(notificationSwitchListener)
                // Manually drive the enable path (listener was detached during isChecked=true)
                onNotificationSwitchChanged(true)
            } else {
                // Permission denied — update switch silently, no listener call needed
                b.switchNotifications.setOnCheckedChangeListener(null)
                b.switchNotifications.isChecked = false
                b.switchNotifications.setOnCheckedChangeListener(notificationSwitchListener)
                session.setNotificationsEnabled(false)
                toast("Allow notifications in Settings to receive updates")
                // Offer to open app settings
                AlertDialog.Builder(this)
                    .setTitle("Notification Permission")
                    .setMessage(
                        "To receive order updates and alerts, please allow notifications in the app settings."
                    )
                    .setPositiveButton("Open Settings") { _, _ ->
                        startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                            data = Uri.fromParts("package", packageName, null)
                        })
                    }
                    .setNegativeButton("Not Now", null)
                    .show()
            }
        }
    }
}
