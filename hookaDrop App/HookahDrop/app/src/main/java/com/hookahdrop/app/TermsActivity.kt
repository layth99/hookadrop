package com.hookahdrop.app

import android.os.Bundle
import android.text.Html
import androidx.appcompat.app.AppCompatActivity
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.databinding.ActivityTermsBinding

class TermsActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))


    private lateinit var b: ActivityTermsBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityTermsBinding.inflate(layoutInflater)
        setContentView(b.root)

        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }

        b.tvContent.text = Html.fromHtml(TERMS_HTML, Html.FROM_HTML_MODE_LEGACY)
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    companion object {
        // ── Draft Terms — must be reviewed by a qualified US legal adviser ────
        private const val TERMS_HTML = """
<b><big>HOOKADROP — TERMS AND CONDITIONS</big></b><br/>
<i>DRAFT — For review by a qualified legal adviser before publication.</i><br/><br/>

<b>1. Introduction and Acceptance of Terms</b><br/>
Welcome to HookaDrop. By creating an account or placing an order through the HookaDrop mobile application, you agree to be bound by these Terms and Conditions. If you do not agree, do not use the application. These Terms constitute a binding agreement between you and HookaDrop.<br/><br/>

<b>2. Eligibility and Minimum Age Requirements</b><br/>
You must be at least 21 years of age to purchase tobacco, hookah, or nicotine-related products where required by applicable law. HookaDrop requires all users to be at least 20 years of age to create an account. Age verification may be required at the time of delivery. It is your responsibility to know and comply with the laws of your state or jurisdiction regarding the purchase of tobacco and tobacco-related products. HookaDrop does not guarantee that all products are legal for purchase or delivery in your location.<br/><br/>

<b>3. Account Registration and Account Security</b><br/>
You are responsible for maintaining the confidentiality of your login credentials. You agree to provide accurate and complete information during registration. You must notify HookaDrop immediately if you become aware of any unauthorized access to your account. HookaDrop is not liable for any loss arising from your failure to secure your account.<br/><br/>

<b>4. Products and Product Information</b><br/>
HookaDrop offers hookah, shisha tobacco, flavors, charcoal, accessories, and related products. Product descriptions and images are provided for informational purposes and may not always reflect exact product specifications or packaging. HookaDrop reserves the right to modify or discontinue any product at any time without notice.<br/><br/>

<b>5. Orders and Order Acceptance</b><br/>
Placing an order constitutes an offer to purchase. HookaDrop reserves the right to accept or decline any order. Orders may be cancelled if a product is out of stock, if payment cannot be processed, or if there is reason to believe the order violates these Terms. You will be notified of any cancellation and any payment will be refunded.<br/><br/>

<b>6. Pricing, Taxes, and Payment Processing</b><br/>
All prices are displayed in US Dollars unless otherwise stated. Applicable taxes will be added at checkout where required by law. HookaDrop uses third-party payment processors. Payment card data is handled directly by the payment processor and is not stored on HookaDrop servers.<br/><br/>

<b>7. Delivery Areas, Delivery Conditions, and Failed Deliveries</b><br/>
HookaDrop delivers within supported areas only. Delivery of tobacco products is subject to legal restrictions that vary by state. HookaDrop does not guarantee delivery to every address. Someone of legal age must be present to accept delivery. Failed deliveries due to absence, incorrect address, or legal restrictions are the responsibility of the customer.<br/><br/>

<b>8. Age Verification and Identity Verification</b><br/>
HookaDrop may require age and identity verification before completing an order or at the point of delivery. Providing false information regarding your age is a violation of these Terms and may result in account termination and legal liability.<br/><br/>

<b>9. Restricted Products and Compliance With Applicable Laws</b><br/>
Certain products may be restricted or prohibited in your state or jurisdiction. It is your sole responsibility to verify whether a product is legal to purchase, possess, or use where you are located. HookaDrop does not warrant that any product is permissible in all jurisdictions and is not liable for purchases made in violation of local law.<br/><br/>

<b>10. Cancellations, Returns, Refunds</b><br/>
Orders may be cancelled before shipment. Once shipped, tobacco and consumable products generally cannot be returned for health and safety reasons unless they arrive damaged or are the wrong item. Refund requests must be submitted within 7 days of delivery. Refunds are processed through the original payment method and may take several business days.<br/><br/>

<b>11. User Responsibilities and Prohibited Activities</b><br/>
You agree not to use HookaDrop to purchase products for resale without authorization, to provide false information, to engage in fraudulent activity, or to violate any applicable laws. Prohibited activities may result in immediate account suspension.<br/><br/>

<b>12. Product Availability and Changes to Services</b><br/>
HookaDrop does not guarantee the availability of any product. The application, its features, and its product catalog may be modified, suspended, or discontinued at any time without notice.<br/><br/>

<b>13. Intellectual Property</b><br/>
All content within the HookaDrop application, including the name, logo, design, and product descriptions, is the property of HookaDrop or its licensors. You may not reproduce, distribute, or create derivative works without prior written permission.<br/><br/>

<b>14. Limitation of Liability</b><br/>
To the fullest extent permitted by applicable law, HookaDrop shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the application or products. HookaDrop's total liability shall not exceed the amount paid for the specific order giving rise to the claim.<br/><br/>

<b>15. Suspension and Termination of Accounts</b><br/>
HookaDrop reserves the right to suspend or terminate any account that violates these Terms, engages in fraudulent activity, or poses a legal or security risk, without prior notice. Upon termination, your right to use the application ceases immediately.<br/><br/>

<b>16. Privacy and Personal Information</b><br/>
Your use of HookaDrop is also governed by our Privacy Policy. By using the application, you consent to the collection and use of your information as described in the Privacy Policy.<br/><br/>

<b>17. Changes to These Terms</b><br/>
HookaDrop reserves the right to update these Terms at any time. Material changes will be communicated through the application. Continued use after changes are posted constitutes acceptance of the revised Terms.<br/><br/>

<b>18. Contact Information and Customer Support</b><br/>
For questions, support, or complaints, contact us through the Help &amp; Support section of the application. Business contact details will be provided upon request through official support channels.<br/><br/>

<i>These Terms are a draft and have not been reviewed by a licensed attorney. They should not be published or relied upon until reviewed and approved by a qualified US legal adviser with experience in e-commerce and tobacco product regulations.</i>
"""
    }
}
