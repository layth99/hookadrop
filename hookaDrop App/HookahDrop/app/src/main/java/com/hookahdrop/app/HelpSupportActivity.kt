package com.hookahdrop.app

import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.os.Bundle
import android.view.Gravity
import android.view.View
import android.widget.*
import androidx.appcompat.app.AlertDialog
import androidx.lifecycle.lifecycleScope
import com.hookahdrop.app.data.ProfileDataManager
import com.hookahdrop.app.databinding.ActivityHelpSupportBinding
import kotlinx.coroutines.launch
import org.json.JSONObject

class HelpSupportActivity : BaseProfileActivity() {

    private lateinit var b: ActivityHelpSupportBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityHelpSupportBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.btnBack.setOnClickListener { navigateBack() }

        buildFaqItems()
        setupCategorySpinner()
        setupSubmit()
        setupBottomNav(b.root, 4)
        fadeIn(b.root)
    }

    // ── FAQ accordion ─────────────────────────────────────────────────────────
    private fun buildFaqItems() {
        val faqList = ProfileDataManager.getFaq()
        b.faqContainer.removeAllViews()

        faqList.forEachIndexed { idx, item ->
            val card = buildFaqCard(item, idx == faqList.lastIndex)
            b.faqContainer.addView(card)
        }
    }

    private fun buildFaqCard(item: com.hookahdrop.app.data.FaqItem, isLast: Boolean): View {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            background = getDrawable(R.drawable.bg_faq_item)
            isClickable = true
            isFocusable = true
            val lp = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { setMargins(0, 0, 0, dp(8)) }
            layoutParams = lp
        }

        // Question row
        val questionRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(16), dp(16), dp(16), dp(16))
        }

        val tvQuestion = TextView(this).apply {
            text = item.question
            textSize = 14f
            setTextColor(getColor(R.color.white))
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
            setLineSpacing(0f, 1.3f)
        }

        val ivChevron = ImageView(this).apply {
            setImageDrawable(getDrawable(R.drawable.ic_chevron_down))
            layoutParams = LinearLayout.LayoutParams(dp(18), dp(18))
        }

        questionRow.addView(tvQuestion)
        questionRow.addView(ivChevron)
        root.addView(questionRow)

        // Answer (hidden by default)
        val tvAnswer = TextView(this).apply {
            text = item.answer
            textSize = 13f
            setTextColor(getColor(R.color.text_secondary))
            setPadding(dp(16), 0, dp(16), dp(16))
            visibility = View.GONE
            setLineSpacing(0f, 1.5f)
        }
        root.addView(tvAnswer)

        // Toggle on tap
        root.setOnClickListener {
            val expanding = tvAnswer.visibility == View.GONE
            tvAnswer.visibility = if (expanding) View.VISIBLE else View.GONE

            // Rotate chevron
            val rotation = if (expanding) 180f else 0f
            ObjectAnimator.ofFloat(ivChevron, View.ROTATION, rotation).apply {
                duration = 200; start()
            }
        }

        return root
    }

    // ── Category spinner ──────────────────────────────────────────────────────
    private fun setupCategorySpinner() {
        val categories = listOf(
            "Select a category",
            "Order",
            "Payment",
            "Delivery",
            "Account",
            "Technical Issue",
            "Other"
        )

        val adapter = object : ArrayAdapter<String>(
            this, android.R.layout.simple_spinner_item, categories
        ) {
            override fun getView(pos: Int, conv: View?, parent: android.view.ViewGroup): View {
                return super.getView(pos, conv, parent).also {
                    (it as? TextView)?.setTextColor(
                        if (pos == 0) getColor(R.color.hint_color)
                        else getColor(R.color.white)
                    )
                    it.setBackgroundColor(getColor(R.color.card_bg))
                }
            }

            override fun getDropDownView(pos: Int, conv: View?, parent: android.view.ViewGroup): View {
                return super.getDropDownView(pos, conv, parent).also {
                    (it as? TextView)?.setTextColor(
                        if (pos == 0) getColor(R.color.hint_color)
                        else getColor(R.color.white)
                    )
                    it.setBackgroundColor(getColor(R.color.card_bg))
                    it.setPadding(dp(16), dp(12), dp(16), dp(12))
                }
            }
        }
        adapter.setDropDownViewResource(android.R.layout.simple_spinner_dropdown_item)
        b.spinnerCategory.adapter = adapter
        b.spinnerCategory.setPopupBackgroundDrawable(getDrawable(R.drawable.bg_card_dark))
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    private fun setupSubmit() {
        b.btnSubmit.setOnClickListener {
            val subject     = b.etSubject.text.toString().trim()
            val description = b.etDescription.text.toString().trim()
            val category    = b.spinnerCategory.selectedItemPosition

            if (subject.isEmpty()) {
                b.etSubject.error = "Please enter a subject"; return@setOnClickListener
            }
            if (category == 0) {
                toast("Please select a category"); return@setOnClickListener
            }
            if (description.length < 20) {
                b.etDescription.error = "Please provide more detail (min 20 characters)"
                return@setOnClickListener
            }

            b.btnSubmit.isEnabled = false
            b.btnSubmit.text = "Sending..."

            lifecycleScope.launch {
                val body = JSONObject().apply {
                    put("subject", subject)
                    put("category", b.spinnerCategory.selectedItem.toString())
                    put("description", description)
                    put("orderNumber", b.etOrderNumber.text.toString().trim())
                }
                val response = com.hookahdrop.app.network.ApiClient.post(
                    "/api/support", body, session.getJwtToken()
                )
                if (response.isSuccess) {
                    showSuccessDialog()
                    clearForm()
                } else {
                    toast(response.userFriendlyError())
                }
                b.btnSubmit.isEnabled = true
                b.btnSubmit.text = "Submit Request"
            }
        }
    }

    private fun clearForm() {
        b.etSubject.text?.clear()
        b.etDescription.text?.clear()
        b.etOrderNumber.text?.clear()
        b.spinnerCategory.setSelection(0)
    }

    private fun showSuccessDialog() {
        AlertDialog.Builder(this)
            .setTitle("Request Submitted")
            .setMessage(
                "Thank you! Your support request has been received.\n\n" +
                "Our team will get back to you within 24 hours."
            )
            .setPositiveButton("OK", null)
            .show()
    }

    private fun dp(v: Int) = (v * resources.displayMetrics.density).toInt()
}
