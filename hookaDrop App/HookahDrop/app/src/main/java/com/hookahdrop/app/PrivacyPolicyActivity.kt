package com.hookahdrop.app

import android.os.Bundle
import android.text.Html
import androidx.appcompat.app.AppCompatActivity
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.databinding.ActivityTermsBinding  // reuse same layout

class PrivacyPolicyActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))


    private lateinit var b: ActivityTermsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityTermsBinding.inflate(layoutInflater)
        setContentView(b.root)

        // Override the header title to "Privacy Policy"
        // (The layout reuse is intentional — same scroll structure)
        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }

        b.tvContent.text = Html.fromHtml(PRIVACY_HTML, Html.FROM_HTML_MODE_LEGACY)
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    companion object {
        private const val PRIVACY_HTML = """
<b><big>HOOKADROP — PRIVACY POLICY</big></b><br/>
<i>DRAFT — For review by a qualified legal adviser before publication.</i><br/><br/>

<b>1. Information We Collect</b><br/>
We collect information you provide during registration (name, email address, phone number, age), information collected when you place orders (delivery address, order history), and technical information such as device identifiers and usage data for improving the application.<br/><br/>

<b>2. How We Use Your Information</b><br/>
We use your information to process orders, send order confirmation and delivery updates, provide customer support, improve the application, and comply with legal obligations including age verification for tobacco product sales.<br/><br/>

<b>3. Payment Information</b><br/>
Payment card data is processed directly by our third-party payment processor. HookaDrop does not store full card numbers, CVV codes, or other sensitive payment credentials on its servers.<br/><br/>

<b>4. Information Sharing</b><br/>
We do not sell your personal information to third parties. We may share information with delivery partners to fulfil your orders, payment processors for transaction processing, and regulatory authorities where required by law.<br/><br/>

<b>5. Data Retention</b><br/>
We retain your account and order information for as long as your account is active or as required to comply with legal obligations. You may request deletion of your account at any time through the Settings screen.<br/><br/>

<b>6. Your Rights</b><br/>
Depending on your jurisdiction, you may have rights to access, correct, or delete your personal information. To exercise these rights, contact us through the Help &amp; Support section of the application.<br/><br/>

<b>7. Cookies and Analytics</b><br/>
The application may use analytics tools to understand usage patterns. This data is aggregated and does not identify individual users by name.<br/><br/>

<b>8. Children's Privacy</b><br/>
The HookaDrop application is not intended for users under 20 years of age. We do not knowingly collect personal information from minors.<br/><br/>

<b>9. Security</b><br/>
We implement reasonable technical and organizational measures to protect your information. However, no transmission over the internet is completely secure, and we cannot guarantee absolute security.<br/><br/>

<b>10. Changes to This Policy</b><br/>
We may update this Privacy Policy from time to time. Changes will be communicated through the application. Continued use after changes are posted constitutes acceptance.<br/><br/>

<b>11. Contact</b><br/>
For privacy-related questions, contact us through the Help &amp; Support section of the HookaDrop application.<br/><br/>

<i>This Privacy Policy is a draft and has not been reviewed by a licensed attorney.</i>
"""
    }
}
