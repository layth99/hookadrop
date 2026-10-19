package com.hookahdrop.app.data

import android.content.Context
import android.content.SharedPreferences

/**
 * Persists session + extended profile fields in SharedPreferences.
 * No passwords or tokens are stored.
 */
class SessionManager(context: Context) {

    private val prefs: SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    companion object {
        private const val PREFS_NAME        = "hookahdrop_session"
        const val KEY_IS_LOGGED_IN          = "is_logged_in"
        const val KEY_USER_NAME             = "user_name"
        const val KEY_USER_EMAIL            = "user_email"
        const val KEY_FIRST_NAME            = "first_name"
        const val KEY_LAST_NAME             = "last_name"
        const val KEY_PHONE                 = "phone"
        const val KEY_DATE_OF_BIRTH         = "date_of_birth"
        const val KEY_MEMBER_SINCE          = "member_since"
        const val KEY_NOTIFICATIONS_ENABLED = "notifications_enabled"
        const val KEY_FCM_TOKEN             = "fcm_token"
        const val KEY_AVATAR                = "avatar_url"
    }

    // ── Core session ──────────────────────────────────────────────────────────
    fun saveSession(name: String, email: String) {
        val memberSince = if (prefs.getString(KEY_MEMBER_SINCE, null) == null)
            java.text.SimpleDateFormat("MMMM yyyy", java.util.Locale.getDefault())
                .format(java.util.Date())
        else prefs.getString(KEY_MEMBER_SINCE, "")!!

        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, true)
            .putString(KEY_USER_NAME, name)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_MEMBER_SINCE, memberSince)
            .apply()
    }

    fun isLoggedIn(): Boolean = prefs.getBoolean(KEY_IS_LOGGED_IN, false)

    fun getUserName(): String  = prefs.getString(KEY_USER_NAME,  "Guest") ?: "Guest"
    fun getUserEmail(): String = prefs.getString(KEY_USER_EMAIL, "")      ?: ""

    fun clearSession() { prefs.edit().clear().apply() }
    fun saveJwtToken(token: String) {
        prefs.edit().putString("jwt_token", token).apply()
    }

    fun getJwtToken(): String? = prefs.getString("jwt_token", null)

    fun saveUserId(userId: String) {
        prefs.edit().putString("user_id", userId).apply()
    }

    fun getUserId(): String? = prefs.getString("user_id", null)

    // ── Extended profile ──────────────────────────────────────────────────────
    fun getFirstName(): String  = prefs.getString(KEY_FIRST_NAME, "") ?: ""
    fun getLastName(): String   = prefs.getString(KEY_LAST_NAME, "")  ?: ""
    fun getPhone(): String      = prefs.getString(KEY_PHONE, "")      ?: ""
    fun getDateOfBirth(): String= prefs.getString(KEY_DATE_OF_BIRTH, "") ?: ""
    fun getMemberSince(): String= prefs.getString(KEY_MEMBER_SINCE, "") ?: ""

    fun saveProfile(firstName: String, lastName: String, username: String,
                    email: String, phone: String, dob: String) {
        val displayName = if (firstName.isNotEmpty()) "$firstName $lastName".trim()
                          else username.ifEmpty { getUserName() }
        prefs.edit()
            .putString(KEY_FIRST_NAME, firstName)
            .putString(KEY_LAST_NAME, lastName)
            .putString(KEY_USER_NAME, displayName)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_PHONE, phone)
            .putString(KEY_DATE_OF_BIRTH, dob)
            .apply()
    }

    fun isNotificationsEnabled(): Boolean =
        prefs.getBoolean(KEY_NOTIFICATIONS_ENABLED, true)

    fun setNotificationsEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_NOTIFICATIONS_ENABLED, enabled).apply()
    }

    // ── FCM token ─────────────────────────────────────────────────────────────
    fun saveFcmToken(token: String) {
        prefs.edit().putString(KEY_FCM_TOKEN, token).apply()
    }

    fun getFcmToken(): String? = prefs.getString(KEY_FCM_TOKEN, null)

    // ── Avatar ────────────────────────────────────────────────────────────────
    fun saveAvatar(url: String) {
        prefs.edit().putString(KEY_AVATAR, url).apply()
    }

    fun getAvatar(): String? = prefs.getString(KEY_AVATAR, null)

    // ── Save full profile from server response ────────────────────────────────
    fun saveProfileFromServer(user: org.json.JSONObject) {
        val firstName = user.optString("firstName", "")
        val lastName  = user.optString("lastName",  "")
        val username  = user.optString("username",  user.optString("name", ""))
        val email     = user.optString("email",     "")
        val phone     = user.optString("phone",     "")
        val dob       = user.optString("dateOfBirth", "")
        val avatar    = user.optString("avatar",    "")
        val memberSince = if (prefs.getString(KEY_MEMBER_SINCE, null) == null) {
            val created = user.optString("createdAt", "")
            if (created.isNotEmpty()) {
                try {
                    val sdf = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.getDefault())
                    val date = sdf.parse(created)
                    java.text.SimpleDateFormat("MMMM yyyy", java.util.Locale.getDefault()).format(date!!)
                } catch (_: Exception) { "" }
            } else ""
        } else prefs.getString(KEY_MEMBER_SINCE, "")!!
        prefs.edit()
            .putString(KEY_FIRST_NAME, firstName)
            .putString(KEY_LAST_NAME, lastName)
            .putString(KEY_USER_NAME, username)
            .putString(KEY_USER_EMAIL, email)
            .putString(KEY_PHONE, phone)
            .putString(KEY_DATE_OF_BIRTH, dob)
            .putString(KEY_AVATAR, avatar)
            .putString(KEY_MEMBER_SINCE, memberSince)
            .putBoolean(KEY_IS_LOGGED_IN, true)
            .apply()
    }
}
