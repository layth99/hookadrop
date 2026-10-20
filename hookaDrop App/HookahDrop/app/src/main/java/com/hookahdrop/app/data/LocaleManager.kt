package com.hookahdrop.app.data

import android.content.Context
import android.content.res.Configuration
import java.util.Locale

/**
 * Manages app locale — persists the selected language in SharedPreferences
 * and applies it to any new Context.
 */
object LocaleManager {

    private const val PREFS   = "hookahdrop_locale"
    private const val KEY_LANG = "selected_language"

    const val LANG_EN = "en"
    const val LANG_FR = "fr"
    const val LANG_AR = "ar"

    /** Returns the saved language code (default: "en"). */
    fun getSavedLanguage(ctx: Context): String =
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(KEY_LANG, LANG_EN) ?: LANG_EN

    /** Saves the language code and wraps the context. */
    fun setLocale(ctx: Context, langCode: String): Context {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit().putString(KEY_LANG, langCode).apply()
        return applyLocale(ctx, langCode)
    }

    /** Applies the locale to an existing context (call in attachBaseContext). */
    fun applyLocale(ctx: Context, langCode: String): Context {
        val locale = Locale(langCode)
        Locale.setDefault(locale)
        val config = Configuration(ctx.resources.configuration)
        config.setLocale(locale)
        config.setLayoutDirection(locale)
        return ctx.createConfigurationContext(config)
    }

    /** Wraps the base context on activity creation. */
    fun wrap(ctx: Context): Context = applyLocale(ctx, getSavedLanguage(ctx))
}
