package com.hookahdrop.app

import android.app.Activity
import android.app.DatePickerDialog
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.widget.Toast
import com.bumptech.glide.Glide
import com.hookahdrop.app.databinding.ActivityEditProfileBinding
import com.hookahdrop.app.network.ApiClient
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.Calendar

class EditProfileActivity : BaseProfileActivity() {

    private lateinit var b: ActivityEditProfileBinding
    private val PICK_IMAGE = 101

    private data class CountryEntry(val name: String, val dialCode: String, val flag: String)

    private val countriesList = listOf(
        CountryEntry("Tunisia",      "+216", "🇹🇳"),
        CountryEntry("France",       "+33",  "🇫🇷"),
        CountryEntry("Algeria",      "+213", "🇩🇿"),
        CountryEntry("Morocco",      "+212", "🇲🇦"),
        CountryEntry("USA",          "+1",   "🇺🇸"),
        CountryEntry("UK",           "+44",  "🇬🇧"),
        CountryEntry("Germany",      "+49",  "🇩🇪"),
        CountryEntry("Italy",        "+39",  "🇮🇹"),
        CountryEntry("Spain",        "+34",  "🇪🇸"),
        CountryEntry("Turkey",       "+90",  "🇹🇷"),
        CountryEntry("Saudi Arabia", "+966", "🇸🇦"),
        CountryEntry("UAE",          "+971", "🇦🇪"),
        CountryEntry("Egypt",        "+20",  "🇪🇬"),
        CountryEntry("Libya",        "+218", "🇱🇾"),
        CountryEntry("Jordan",       "+962", "🇯🇴")
    )
    private var selectedCountry = countriesList[0]  // Tunisia default

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityEditProfileBinding.inflate(layoutInflater)
        setContentView(b.root)

        loadProfile()
        setupListeners()
        fadeIn(b.root)
    }

    private fun loadProfile() {
        // Show cached data immediately
        b.etFirstName.setText(session.getFirstName())
        b.etLastName.setText(session.getLastName())
        b.etUsername.setText(session.getUserName())
        b.etEmail.setText(session.getUserEmail())
        val savedPhone = session.getPhone()
        val matchedCountry = countriesList
            .sortedByDescending { it.dialCode.length }
            .firstOrNull { savedPhone.startsWith(it.dialCode) }
        if (matchedCountry != null) {
            selectedCountry = matchedCountry
            b.etPhone.setText(savedPhone.removePrefix(matchedCountry.dialCode).trimStart())
        } else {
            b.etPhone.setText(savedPhone)
        }
        b.tvCountryFlag.text = selectedCountry.flag
        b.tvCountryCode.text = selectedCountry.dialCode
        b.etDob.setText(session.getDateOfBirth())
        b.tvMemberSince.text = session.getMemberSince().ifEmpty { "—" }

        // Load saved avatar if available
        val avatarUrl = session.getAvatar()
        if (!avatarUrl.isNullOrEmpty()) {
            Glide.with(this)
                .load(avatarUrl)
                .circleCrop()
                .placeholder(R.drawable.bg_avatar_default)
                .error(R.drawable.bg_avatar_default)
                .into(b.ivAvatarPhoto)
        } else {
            b.ivAvatarPhoto.setImageResource(R.drawable.bg_avatar_default)
        }

        // Fetch latest from server in background
        val token = session.getJwtToken() ?: return
        CoroutineScope(Dispatchers.Main).launch {
            try {
                val response = withContext(Dispatchers.IO) {
                    ApiClient.get("/api/profile/me", token)
                }
                if (response.isSuccess) {
                    val user = response.json().optJSONObject("data")
                    if (user != null) {
                        // Update all fields from server
                        val firstName   = user.optString("firstName", "")
                        val lastName    = user.optString("lastName", "")
                        val username    = user.optString("username", user.optString("name", ""))
                        val email       = user.optString("email", "")
                        val phone       = user.optString("phone", "")
                        val dateOfBirth = user.optString("dateOfBirth", "")
                        val avatar      = user.optString("avatar", "")

                        b.etFirstName.setText(firstName)
                        b.etLastName.setText(lastName)
                        b.etUsername.setText(username)
                        b.etEmail.setText(email)

                        // Parse phone
                        val matchedCountry2 = countriesList
                            .sortedByDescending { it.dialCode.length }
                            .firstOrNull { phone.startsWith(it.dialCode) }
                        if (matchedCountry2 != null) {
                            selectedCountry = matchedCountry2
                            b.etPhone.setText(phone.removePrefix(matchedCountry2.dialCode).trimStart())
                            b.tvCountryFlag.text = selectedCountry.flag
                            b.tvCountryCode.text = selectedCountry.dialCode
                        } else {
                            b.etPhone.setText(phone)
                        }

                        b.etDob.setText(dateOfBirth)

                        // Load avatar
                        if (avatar.isNotEmpty()) {
                            Glide.with(this@EditProfileActivity)
                                .load(avatar)
                                .circleCrop()
                                .placeholder(R.drawable.bg_avatar_default)
                                .error(R.drawable.bg_avatar_default)
                                .into(b.ivAvatarPhoto)
                        }

                        // Save to cache
                        session.saveProfileFromServer(user)
                    }
                }
                // Silently ignore errors (offline fallback to cached data)
            } catch (e: Exception) {
                // Non-critical: use cached data
            }
        }
    }

    private fun setupListeners() {
        b.btnBack.setOnClickListener { navigateBack() }

        // Avatar tap → image picker
        b.avatarEdit.setOnClickListener { openImagePicker() }

        // DOB tap → DatePickerDialog
        b.etDob.setOnClickListener {
            val cal = Calendar.getInstance()
            val existing = b.etDob.text.toString().trim()
            if (existing.isNotEmpty()) {
                try {
                    val parts = existing.replace(" ", "").split("/")
                    if (parts.size == 3) {
                        cal.set(parts[2].toInt(), parts[1].toInt() - 1, parts[0].toInt())
                    }
                } catch (_: Exception) {}
            }
            val dialog = DatePickerDialog(
                this,
                android.R.style.Theme_DeviceDefault_Dialog_NoActionBar,
                { _, year, month, day ->
                    b.etDob.setText(String.format("%02d / %02d / %04d", day, month + 1, year))
                },
                cal.get(Calendar.YEAR),
                cal.get(Calendar.MONTH),
                cal.get(Calendar.DAY_OF_MONTH)
            )
            dialog.datePicker.maxDate = System.currentTimeMillis()
            dialog.show()
        }

        // Country code picker
        b.llCountryPicker.setOnClickListener {
            val items = countriesList.map { "${it.flag}  ${it.name} (${it.dialCode})" }.toTypedArray()
            android.app.AlertDialog.Builder(this)
                .setTitle("Select Country")
                .setItems(items) { _, which ->
                    selectedCountry = countriesList[which]
                    b.tvCountryFlag.text = selectedCountry.flag
                    b.tvCountryCode.text = selectedCountry.dialCode
                }
                .show()
        }

        b.btnSave.setOnClickListener {
            if (validateAndSave()) {
                toast("Profile saved successfully")
                navigateBack()
            }
        }
    }

    private fun validateAndSave(): Boolean {
        val first    = b.etFirstName.text.toString().trim()
        val last     = b.etLastName.text.toString().trim()
        val username = b.etUsername.text.toString().trim()
        val email    = b.etEmail.text.toString().trim()
        val localNumber = b.etPhone.text.toString().trim()
        val phone = if (localNumber.isNotEmpty()) selectedCountry.dialCode + localNumber else ""
        val dob      = b.etDob.text.toString().trim()

        if (username.isEmpty()) {
            b.etUsername.error = "Username is required"; return false
        }
        if (username.length < 3) {
            b.etUsername.error = "Minimum 3 characters"; return false
        }
        if (email.isNotEmpty() && !android.util.Patterns.EMAIL_ADDRESS.matcher(email).matches()) {
            b.etEmail.error = "Invalid email"; return false
        }
        if (localNumber.isNotEmpty() && localNumber.filter { it.isDigit() }.length < 6) {
            b.etPhone.error = "Invalid phone number"; return false
        }

        b.btnSave.isEnabled = false
        b.btnSave.text = "Saving..."

        val token = session.getJwtToken()
        if (token == null) {
            toast("Not signed in")
            b.btnSave.isEnabled = true
            b.btnSave.text = "Save Changes"
            return false
        }

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val body = org.json.JSONObject().apply {
                    put("firstName", first)
                    put("lastName", last)
                    put("username", username)
                    put("email", email)
                    put("phone", phone)
                    put("dateOfBirth", dob)
                }

                val response = withContext(Dispatchers.IO) {
                    ApiClient.put("/api/profile/update", body, token)
                }

                if (response.isSuccess) {
                    val updatedUser = response.json().optJSONObject("user")
                    if (updatedUser != null) {
                        session.saveProfileFromServer(updatedUser)
                    } else {
                        // Fallback: save locally
                        session.saveProfile(first, last, username, email, phone, dob)
                    }
                    toast("Profile saved successfully")
                    navigateBack()
                } else {
                    val errorMsg = response.json().optString("message", response.userFriendlyError())
                    toast(errorMsg)
                }
            } catch (e: Exception) {
                toast("Failed to save: ${e.message}")
            } finally {
                b.btnSave.isEnabled = true
                b.btnSave.text = "Save Changes"
            }
        }

        return true
    }

    // ── Image picker ──────────────────────────────────────────────────────────
    private fun openImagePicker() {
        val options = arrayOf("Choose from Gallery", "Remove Photo")
        android.app.AlertDialog.Builder(this)
            .setTitle("Profile Photo")
            .setItems(options) { _, which ->
                when (which) {
                    0 -> launchGallery()
                    1 -> toast("Photo removed")
                }
            }.show()
    }

    private fun launchGallery() {
        val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "image/*"
            addCategory(Intent.CATEGORY_OPENABLE)
            putExtra(Intent.EXTRA_MIME_TYPES, arrayOf("image/jpeg", "image/png", "image/webp"))
        }
        startActivityForResult(Intent.createChooser(intent, "Select photo"), PICK_IMAGE)
    }

    @Deprecated("Using legacy onActivityResult")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == PICK_IMAGE && resultCode == Activity.RESULT_OK) {
            val uri: Uri? = data?.data
            if (uri == null) { toast("Could not load image"); return }

            val mime = contentResolver.getType(uri)
            val allowed = listOf("image/jpeg", "image/jpg", "image/png", "image/webp")
            if (mime == null || mime !in allowed) {
                toast("Invalid file type. Use JPG, PNG or WebP only.")
                return
            }

            val size = contentResolver.openInputStream(uri)?.available() ?: 0
            if (size > 5 * 1024 * 1024) {
                toast("Image too large. Maximum 5MB allowed.")
                return
            }

            // Show local preview immediately
            b.ivAvatarPhoto.setImageURI(uri)
            uploadAvatarToBackend(uri)
        }
    }

    // ── Upload avatar to backend ──────────────────────────────────────────────
    private fun uploadAvatarToBackend(uri: Uri) {
        val token = session.getJwtToken() ?: run {
            toast("Not signed in"); return
        }

        b.btnSave.isEnabled = false
        b.btnSave.text      = "Uploading…"

        CoroutineScope(Dispatchers.Main).launch {
            try {
                val (bytes, mime, fileName) = withContext(Dispatchers.IO) {
                    val stream = contentResolver.openInputStream(uri)
                        ?: throw IllegalStateException("Cannot open image stream")
                    val readBytes = stream.use { it.readBytes() }
                    val resolvedMime = contentResolver.getType(uri) ?: "image/jpeg"
                    val ext = when (resolvedMime) {
                        "image/png"  -> "png"
                        "image/webp" -> "webp"
                        else         -> "jpg"
                    }
                    Triple(readBytes, resolvedMime, "avatar_${System.currentTimeMillis()}.$ext")
                }

                val response = ApiClient.postMultipart(
                    path      = "/api/profile/avatar",
                    fieldName = "avatar",
                    fileBytes = bytes,
                    mimeType  = mime,
                    fileName  = fileName,
                    token     = token
                )

                if (response.isSuccess) {
                    val avatarUrl = response.json().optString("avatar", "")
                    if (avatarUrl.isNotEmpty()) {
                        session.saveAvatar(avatarUrl)
                        Glide.with(this@EditProfileActivity)
                            .load(avatarUrl)
                            .circleCrop()
                            .placeholder(R.drawable.bg_avatar_default)
                            .error(R.drawable.bg_avatar_default)
                            .into(b.ivAvatarPhoto)
                    }
                    toast("Profile photo updated!")
                } else {
                    toast("Upload failed: ${response.userFriendlyError()}")
                }
            } catch (e: Exception) {
                toast("Upload error: ${e.message}")
            } finally {
                b.btnSave.isEnabled = true
                b.btnSave.text      = "Save Changes"
            }
        }
    }
}
