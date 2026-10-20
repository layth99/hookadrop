package com.hookahdrop.app

import android.animation.ObjectAnimator
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.hookahdrop.app.data.CartManager
import com.hookahdrop.app.data.FavoritesManager
import com.hookahdrop.app.data.LocaleManager
import com.hookahdrop.app.data.ProfileDataManager
import com.hookahdrop.app.data.SessionManager
import com.hookahdrop.app.ui.BottomNavManager

/**
 * Base class for all Profile-system sub-pages.
 * Provides: entrance animation, BottomNavManager wiring, shared toast helper.
 */
abstract class BaseProfileActivity : AppCompatActivity() {

        override fun attachBaseContext(base: android.content.Context) =
        super.attachBaseContext(com.hookahdrop.app.data.LocaleManager.wrap(base))

    protected lateinit var session: SessionManager
    protected var navManager: BottomNavManager? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        session = SessionManager(this)
        CartManager.init(this)
        FavoritesManager.init(this) { session.getUserId() }
        ProfileDataManager.init(this)
    }

    // ── Standard entrance ─────────────────────────────────────────────────────
    protected fun fadeIn(root: View) {
        root.alpha = 0f
        ObjectAnimator.ofFloat(root, View.ALPHA, 0f, 1f).apply { duration = 250; start() }
    }

    // ── Back navigation with reverse transition ───────────────────────────────
    protected fun navigateBack() {
        finish()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    override fun onBackPressed() {
        super.onBackPressed()
        overridePendingTransition(R.anim.nav_back_enter, R.anim.nav_back_exit)
    }

    // ── Show a short toast ────────────────────────────────────────────────────
    protected fun toast(msg: String) =
        Toast.makeText(this, msg, Toast.LENGTH_SHORT).show()

    // ── Wire bottom nav using BottomNavManager ────────────────────────────────
    /**
     * @param rootView     The root view containing the included bottomNav layout.
     * @param activeTab    Which tab is currently active (e.g. NavTab.PROFILE).
     */
    protected fun setupBottomNav(rootView: View, activeTab: BottomNavManager.NavTab) {
        val navView = rootView.findViewById<View>(R.id.bottomNav) ?: return
        val manager = BottomNavManager(navView, activeTab)
        navManager = manager

        // Sync cart badge
        manager.setCartCount(CartManager.getTotalCount())

        manager.onTabClick = { tab ->
            when (tab) {
                BottomNavManager.NavTab.HOME -> {
                    startActivity(Intent(this, HomeActivity::class.java).apply {
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    })
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                BottomNavManager.NavTab.CATEGORIES -> {
                    startActivity(Intent(this, CategoriesActivity::class.java))
                    overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                }
                BottomNavManager.NavTab.CART -> {
                    if (activeTab != BottomNavManager.NavTab.CART) {
                        startActivity(Intent(this, CartActivity::class.java))
                        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                    }
                }
                BottomNavManager.NavTab.FAVORITES -> {
                    if (activeTab != BottomNavManager.NavTab.FAVORITES) {
                        startActivity(Intent(this, FavoritesActivity::class.java))
                        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                    }
                }
                BottomNavManager.NavTab.PROFILE -> {
                    if (activeTab != BottomNavManager.NavTab.PROFILE) {
                        startActivity(Intent(this, ProfileActivity::class.java).apply {
                            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                        })
                        overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit)
                    }
                }
            }
        }
    }

    // ── Legacy overload kept for backward compat (selectedIndex → NavTab) ────
    protected fun setupBottomNav(rootView: View, selectedIndex: Int) {
        val tab = when (selectedIndex) {
            0 -> BottomNavManager.NavTab.HOME
            1 -> BottomNavManager.NavTab.CATEGORIES
            2 -> BottomNavManager.NavTab.CART
            3 -> BottomNavManager.NavTab.FAVORITES
            4 -> BottomNavManager.NavTab.PROFILE
            else -> BottomNavManager.NavTab.HOME
        }
        setupBottomNav(rootView, tab)
    }

    // ── Update cart badge after cart changes ──────────────────────────────────
    protected fun updateNavCartBadge() {
        navManager?.setCartCount(CartManager.getTotalCount())
    }
}
