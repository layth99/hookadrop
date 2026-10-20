package com.hookahdrop.app

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.ContextCompat
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.databinding.ActivityLanguageBinding

class LanguageActivity : AppCompatActivity() {

    override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))


    private lateinit var b: ActivityLanguageBinding
    private var selectedLang = LocaleManager.LANG_EN

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        b = ActivityLanguageBinding.inflate(layoutInflater)
        setContentView(b.root)

        selectedLang = LocaleManager.getSavedLanguage(this)
        refreshChecks()

        b.btnBack.setOnClickListener {
            finish()
            overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
        }

        b.rowEnglish.setOnClickListener { select(LocaleManager.LANG_EN) }
        b.rowFrench.setOnClickListener  { select(LocaleManager.LANG_FR) }
        b.rowArabic.setOnClickListener  { select(LocaleManager.LANG_AR) }

        b.btnApply.setOnClickListener   { applyLanguage() }
    }

    private fun select(lang: String) {
        selectedLang = lang
        refreshChecks()
    }

    private fun refreshChecks() {
        val cyan = ContextCompat.getColor(this, R.color.accent_cyan)
        val def  = ContextCompat.getColor(this, R.color.card_border)

        b.checkEnglish.visibility = if (selectedLang == LocaleManager.LANG_EN) View.VISIBLE else View.GONE
        b.checkFrench.visibility  = if (selectedLang == LocaleManager.LANG_FR) View.VISIBLE else View.GONE
        b.checkArabic.visibility  = if (selectedLang == LocaleManager.LANG_AR) View.VISIBLE else View.GONE

        // Highlight selected row
        val rows = listOf(
            b.rowEnglish to LocaleManager.LANG_EN,
            b.rowFrench  to LocaleManager.LANG_FR,
            b.rowArabic  to LocaleManager.LANG_AR
        )
        rows.forEach { (row, lang) ->
            val color = if (lang == selectedLang) cyan else def
            row.foreground = null  // keep background; just change border via elevation
            row.alpha = if (lang == selectedLang) 1f else 0.75f
        }
    }

    private fun applyLanguage() {
        // Save + rebuild activity stack so every Activity re-inflates in new locale
        LocaleManager.setLocale(this, selectedLang)

        // Restart the entire app from HomeActivity to apply globally
        val intent = Intent(this, HomeActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        startActivity(intent)
        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
        finishAffinity()
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }
}
