package com.hookahdrop.app

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.json.JSONObject

class HookahDropFirebaseService : FirebaseMessagingService() {

    companion object {
        const val CHANNEL_ORDERS     = "orders_channel"
        const val CHANNEL_SECURITY   = "security_channel"
        const val CHANNEL_PROMOTIONS = "promotions_channel"
    }

    /**
     * Called when a new FCM token is generated or refreshed.
     * Saves locally and, if the user is logged in, syncs to the backend.
     */
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        val session = SessionManager(this)
        session.saveFcmToken(token)

        if (session.isLoggedIn()) {
            val jwtToken = session.getJwtToken() ?: return
            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val body = JSONObject().apply {
                        put("fcmToken", token)
                        put("notificationsEnabled", session.isNotificationsEnabled())
                    }
                    // Backend PATCH /api/notifications/preferences — using PUT as ApiClient has no patch()
                    ApiClient.put("/api/notifications/preferences", body, jwtToken)
                } catch (e: Exception) {
                    // Non-critical: token will sync on next profile visit
                }
            }
        }
    }

    /**
     * Called when a push message is received while the app is in the foreground.
     */
    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        val session = SessionManager(this)
        if (!session.isNotificationsEnabled()) return

        createNotificationChannels()

        val title = message.notification?.title
            ?: message.data["title"]
            ?: getString(R.string.app_name)
        val body = message.notification?.body
            ?: message.data["body"]
            ?: ""

        val type = message.data["type"] ?: ""
        val channelId = when (type) {
            "order"              -> CHANNEL_ORDERS
            "security"           -> CHANNEL_SECURITY
            "promo", "product",
            "account"            -> CHANNEL_PROMOTIONS
            else                 -> CHANNEL_PROMOTIONS
        }

        val intent = Intent(this, NotificationsActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        val pendingIntent = PendingIntent.getActivity(
            this, 0, intent,
            PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setAutoCancel(true)
            .setContentIntent(pendingIntent)
            .setPriority(
                if (channelId == CHANNEL_SECURITY || channelId == CHANNEL_ORDERS)
                    NotificationCompat.PRIORITY_HIGH
                else
                    NotificationCompat.PRIORITY_DEFAULT
            )
            .build()

        val notificationId = System.currentTimeMillis().toInt()
        try {
            NotificationManagerCompat.from(this).notify(notificationId, notification)
        } catch (e: SecurityException) {
            // POST_NOTIFICATIONS permission not granted — silently drop
        }
    }

    private fun createNotificationChannels() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return

        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val channels = listOf(
            NotificationChannel(
                CHANNEL_ORDERS, "Orders",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Order status updates" },
            NotificationChannel(
                CHANNEL_SECURITY, "Security Alerts",
                NotificationManager.IMPORTANCE_HIGH
            ).apply { description = "Login and security events" },
            NotificationChannel(
                CHANNEL_PROMOTIONS, "Promotions",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply { description = "New products and promo codes" }
        )

        channels.forEach { manager.createNotificationChannel(it) }
    }
}
