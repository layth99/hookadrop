package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import com.hookahdrop.app.data.Address
import com.hookahdrop.app.data.ProfileDataManager
import com.hookahdrop.app.databinding.ActivityAddressesBinding
import java.util.UUID

class AddressesActivity : BaseProfileActivity() {

    private lateinit var b: ActivityAddressesBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityAddressesBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.btnBack.setOnClickListener { navigateBack() }
        b.btnAddAddress.setOnClickListener {
            startActivity(Intent(this, AddMapActivity::class.java))
            overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        }

        setupBottomNav(b.root, 4)
        refreshList()
        fadeIn(b.root)
    }

    override fun onResume() {
        super.onResume()
        refreshList()
    }

    // â”€â”€ Render address cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    private fun refreshList() {
        b.addressContainer.removeAllViews()
        val addresses = ProfileDataManager.getAddresses()

        if (addresses.isEmpty()) {
            b.emptyState.visibility = View.VISIBLE
        } else {
            b.emptyState.visibility = View.GONE
            addresses.forEach { addr -> b.addressContainer.addView(buildAddressCard(addr)) }
        }
    }

    private fun buildAddressCard(addr: Address): View {
        val card = LayoutInflater.from(this)
            .inflate(android.R.layout.simple_list_item_1, null, false)

        // Build a proper card manually
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = if (addr.isDefault)
                getDrawable(R.drawable.bg_address_default)
            else
                getDrawable(R.drawable.bg_address_card)
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 0, dp(10)) }
            layoutParams = lp
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }

        // Label row
        val labelRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
        }

        // Label badge
        val labelBadge = TextView(this).apply {
            text = addr.label.ifEmpty { "Home" }
            textSize = 11f
            setTextColor(getColor(R.color.accent_cyan))
            background = getDrawable(R.drawable.bg_member_badge)
            setPadding(dp(10), dp(3), dp(10), dp(3))
        }
        labelRow.addView(labelBadge)

        // Default badge
        if (addr.isDefault) {
            val defaultBadge = TextView(this).apply {
                text = "DEFAULT"
                textSize = 10f
                setTextColor(getColor(R.color.white))
                background = getDrawable(R.drawable.bg_button_blue)
                setPadding(dp(8), dp(2), dp(8), dp(2))
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { setMargins(dp(8), 0, 0, 0) }
                layoutParams = lp
            }
            labelRow.addView(defaultBadge)
        }

        val spacer = View(this).apply {
            layoutParams = LinearLayout.LayoutParams(0, 1, 1f)
        }
        labelRow.addView(spacer)
        root.addView(labelRow)

        // Name
        root.addView(TextView(this).apply {
            text = addr.fullName
            textSize = 15f
            setTextColor(getColor(R.color.white))
            typeface = android.graphics.Typeface.DEFAULT_BOLD
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, dp(8), 0, 0) }
            layoutParams = lp
        })

        // Address lines
        val addressText = "${addr.street}\n${addr.city}, ${addr.postalCode}\n${addr.country}"
        root.addView(TextView(this).apply {
            text = addressText
            textSize = 13f
            setTextColor(getColor(R.color.text_secondary))
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, dp(4), 0, 0) }
            layoutParams = lp
        })

        // Phone
        if (addr.phone.isNotEmpty()) {
            root.addView(TextView(this).apply {
                text = addr.phone
                textSize = 13f
                setTextColor(getColor(R.color.text_secondary))
                val lp = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.WRAP_CONTENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { setMargins(0, dp(2), 0, dp(12)) }
                layoutParams = lp
            })
        }

        // Divider
        root.addView(View(this).apply {
            setBackgroundColor(getColor(R.color.card_border))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, dp(1)
            ).apply { setMargins(0, dp(4), 0, dp(10)) }
        })

        // Action row: Edit | Delete | Set Default
        val actionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = android.view.Gravity.CENTER_VERTICAL
        }

        val btnEdit = createTextButton("Edit", R.color.accent_cyan) {
            showAddressDialog(addr)
        }
        val btnDelete = createTextButton("Delete", android.R.color.holo_red_light) {
            confirmDelete(addr)
        }
        actionRow.addView(btnEdit)
        actionRow.addView(btnDelete)

        if (!addr.isDefault) {
            val btnDefault = createTextButton("Set Default", R.color.text_secondary) {
                ProfileDataManager.setDefaultAddress(addr.id)
                refreshList()
                toast("Default address updated")
            }
            actionRow.addView(btnDefault)
        }

        root.addView(actionRow)
        return root
    }

    private fun createTextButton(text: String, colorRes: Int, onClick: () -> Unit): Button {
        return Button(this).apply {
            this.text = text
            textSize = 13f
            setTextColor(getColor(colorRes))
            background = null
            isAllCaps = false
            setPadding(0, 0, dp(16), 0)
            setOnClickListener { onClick() }
        }
    }

    // â”€â”€ Add / Edit dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    private fun showAddressDialog(existing: Address?) {
        val view = LayoutInflater.from(this)
            .inflate(R.layout.dialog_address, null)

        val etLabel    = view.findViewById<EditText>(R.id.etLabel)
        val etFullName = view.findViewById<EditText>(R.id.etFullName)
        val etPhone    = view.findViewById<EditText>(R.id.etPhone)
        val etStreet   = view.findViewById<EditText>(R.id.etStreet)
        val etCity     = view.findViewById<EditText>(R.id.etCity)
        val etPostal   = view.findViewById<EditText>(R.id.etPostal)
        val etCountry  = view.findViewById<EditText>(R.id.etCountry)
        val cbDefault  = view.findViewById<CheckBox>(R.id.cbDefault)
        val tvTitle    = view.findViewById<TextView>(R.id.tvDialogTitle)
        val btnSave    = view.findViewById<Button>(R.id.btnSaveAddress)

        if (existing != null) {
            tvTitle.text     = "Edit Address"
            etLabel.setText(existing.label)
            etFullName.setText(existing.fullName)
            etPhone.setText(existing.phone)
            etStreet.setText(existing.street)
            etCity.setText(existing.city)
            etPostal.setText(existing.postalCode)
            etCountry.setText(existing.country)
            cbDefault.isChecked = existing.isDefault
        }

        val dialog = AlertDialog.Builder(this)
            .setView(view).create()
        dialog.window?.setBackgroundDrawableResource(android.R.color.transparent)

        btnSave.setOnClickListener {
            val label = etLabel.text.toString().trim().ifEmpty { "Home" }
            val name  = etFullName.text.toString().trim()
            if (name.isEmpty()) { etFullName.error = "Required"; return@setOnClickListener }
            val street = etStreet.text.toString().trim()
            if (street.isEmpty()) { etStreet.error = "Required"; return@setOnClickListener }
            val city = etCity.text.toString().trim()
            if (city.isEmpty()) { etCity.error = "Required"; return@setOnClickListener }

            val addr = Address(
                id          = existing?.id ?: UUID.randomUUID().toString(),
                label       = label,
                fullName    = name,
                phone       = etPhone.text.toString().trim(),
                street      = street,
                city        = city,
                postalCode  = etPostal.text.toString().trim(),
                country     = etCountry.text.toString().trim().ifEmpty { "Tunisia" },
                isDefault   = cbDefault.isChecked
            )

            if (existing != null) ProfileDataManager.updateAddress(addr)
            else                  ProfileDataManager.addAddress(addr)

            dialog.dismiss()
            refreshList()
            toast(if (existing != null) "Address updated" else "Address added")
        }

        dialog.show()
    }

    private fun confirmDelete(addr: Address) {
        AlertDialog.Builder(this)
            .setTitle("Delete this address?")
            .setMessage("This address will no longer be available during checkout.")
            .setPositiveButton("Delete") { _, _ ->
                ProfileDataManager.deleteAddress(addr.id)
                refreshList()
                toast("Address deleted")
            }
            .setNegativeButton("Cancel", null)
            .show()
    }

    private fun dp(value: Int) = (value * resources.displayMetrics.density).toInt()
}
