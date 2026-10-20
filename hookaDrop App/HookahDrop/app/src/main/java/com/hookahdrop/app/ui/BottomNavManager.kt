package com.hookahdrop.app.ui

import android.animation.Animator
import android.animation.AnimatorListenerAdapter
import android.animation.AnimatorSet
import android.animation.ObjectAnimator
import android.animation.ValueAnimator
import android.content.res.ColorStateList
import android.view.View
import android.view.ViewTreeObserver
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.ImageView
import android.widget.TextView
import androidx.core.content.ContextCompat
import androidx.core.widget.ImageViewCompat
import com.hookahdrop.app.R

/**
 * BottomNavManager — Premium bottom navigation for HookaDrop.
 *
 * Features
 * ─────────
 *  • Sliding pill indicator that smoothly glides between tabs
 *  • Icon scale-bounce animation  1.0 → 1.14 → 1.0  (OvershootInterpolator)
 *  • Subtle vertical lift on active icon  (−3 dp)
 *  • Per-tab glow oval fade-in / fade-out
 *  • Cart badge: scale-in on appear, scale-out on disappear
 *  • Indicator positioned via post{} so it waits for layout measurement
 *  • Thread-safe: all UI work runs on the main thread
 *
 * Usage
 * ─────
 *   val nav = BottomNavManager(bottomNavView, NavTab.HOME)
 *   nav.setCartCount(3)
 *   nav.onTabClick = { tab -> /* navigate */ }
 */
class BottomNavManager(
    private val root: View,
    private var activeTab: NavTab = NavTab.HOME
) {

    // ── Tab enum ──────────────────────────────────────────────────────────────
    enum class NavTab(val index: Int) {
        HOME(0), CATEGORIES(1), CART(2), FAVORITES(3), PROFILE(4);

        companion object {
            fun fromIndex(i: Int) = values().firstOrNull { it.index == i } ?: HOME
        }
    }

    // ── Callback ──────────────────────────────────────────────────────────────
    var onTabClick: ((NavTab) -> Unit)? = null

    // ── Colors (lazy — safe before view is attached) ──────────────────────────
    private val colorActive   by lazy { ContextCompat.getColor(root.context, R.color.nav_selected) }
    private val colorInactive by lazy { ContextCompat.getColor(root.context, R.color.nav_unselected) }

    // ── View maps ─────────────────────────────────────────────────────────────
    private val tabViews  = HashMap<NavTab, View>(5)
    private val icons     = HashMap<NavTab, ImageView>(5)
    private val labels    = HashMap<NavTab, TextView>(5)
    private val glows     = HashMap<NavTab, View>(5)

    private val indicator: View? by lazy { root.findViewById(R.id.navActiveIndicator) }
    private val badge: TextView?  by lazy { root.findViewById(R.id.navCartBadge) }

    private var badgeCount = 0

    // ── Init ──────────────────────────────────────────────────────────────────
    init {
        mapViews()
        wireClicks()
        // Wait for first layout pass before positioning the indicator
        root.viewTreeObserver.addOnGlobalLayoutListener(object : ViewTreeObserver.OnGlobalLayoutListener {
            override fun onGlobalLayout() {
                root.viewTreeObserver.removeOnGlobalLayoutListener(this)
                applyState(activeTab, animate = false)
            }
        })
    }

    // ── View mapping ─────────────────────────────────────────────────────────
    private fun mapViews() {
        data class TabRes(val tab: NavTab, val tabId: Int, val iconId: Int, val labelId: Int, val glowId: Int)

        listOf(
            TabRes(NavTab.HOME,       R.id.navHome,       R.id.navHomeIcon,       R.id.navHomeLabel,       R.id.navHomeGlow),
            TabRes(NavTab.CATEGORIES, R.id.navCategories, R.id.navCategoriesIcon, R.id.navCategoriesLabel, R.id.navCategoriesGlow),
            TabRes(NavTab.CART,       R.id.navCart,       R.id.navCartIcon,       R.id.navCartLabel,       R.id.navCartGlow),
            TabRes(NavTab.FAVORITES,  R.id.navFavorites,  R.id.navFavoritesIcon,  R.id.navFavoritesLabel,  R.id.navFavoritesGlow),
            TabRes(NavTab.PROFILE,    R.id.navProfile,    R.id.navProfileIcon,    R.id.navProfileLabel,    R.id.navProfileGlow),
        ).forEach { r ->
            tabViews[r.tab] = root.findViewById(r.tabId)  ?: return@forEach
            icons[r.tab]    = root.findViewById(r.iconId) ?: return@forEach
            labels[r.tab]   = root.findViewById(r.labelId)?: return@forEach
            glows[r.tab]    = root.findViewById(r.glowId) ?: return@forEach
        }
    }

    // ── Click wiring ──────────────────────────────────────────────────────────
    private fun wireClicks() {
        tabViews.forEach { (tab, view) ->
            view.setOnClickListener {
                if (tab == activeTab) {
                    // Same tab — just re-pulse the icon (premium feel)
                    pulseIcon(icons[tab] ?: return@setOnClickListener)
                    return@setOnClickListener
                }
                val prev = activeTab
                activeTab = tab
                applyState(tab, animate = true, previous = prev)
                onTabClick?.invoke(tab)
            }
        }
    }

    // ── Public API ────────────────────────────────────────────────────────────

    /** Switch active tab without triggering onTabClick (e.g. on Activity onCreate). */
    fun setActive(tab: NavTab) {
        if (tab == activeTab) return
        val prev = activeTab
        activeTab = tab
        if (root.width > 0) {
            applyState(tab, animate = false, previous = prev)
        } else {
            root.post { applyState(tab, animate = false, previous = prev) }
        }
    }

    /** Update cart badge. 0 = hide with animation. */
    fun setCartCount(count: Int) {
        val b = badge ?: return
        if (count <= 0) {
            if (badgeCount > 0) hideBadge(b)
            badgeCount = 0
            return
        }
        val text = if (count > 99) "99+" else count.toString()
        if (badgeCount == 0) showBadge(b, text) else b.text = text
        badgeCount = count
    }

    // ── State application ─────────────────────────────────────────────────────

    private fun applyState(tab: NavTab, animate: Boolean, previous: NavTab? = null) {
        // Deactivate all except new active
        NavTab.values().filter { it != tab }.forEach { deactivate(it, animate && it == previous) }
        // Activate new
        activate(tab, animate)
        // Slide indicator
        slideIndicator(tab, animate)
    }

    // ── Activate ─────────────────────────────────────────────────────────────

    private fun activate(tab: NavTab, animate: Boolean) {
        val icon  = icons[tab]  ?: return
        val label = labels[tab] ?: return
        val glow  = glows[tab]  ?: return

        // Colors
        ImageViewCompat.setImageTintList(icon, ColorStateList.valueOf(colorActive))
        label.setTextColor(colorActive)

        if (animate) {
            // Bounce scale + lift
            AnimatorSet().apply {
                playTogether(
                    scaleAnim(icon, 1f, 1.14f, 1f, 280L),
                    ObjectAnimator.ofFloat(icon, View.TRANSLATION_Y, 0f, -3f, 0f).apply {
                        duration = 280
                        interpolator = DecelerateInterpolator(1.5f)
                    }
                )
                start()
            }
            // Glow fade in
            glow.animate().cancel()
            glow.animate()
                .alpha(1f)
                .setDuration(200)
                .setInterpolator(DecelerateInterpolator())
                .start()
        } else {
            icon.scaleX = 1f ; icon.scaleY = 1f ; icon.translationY = 0f
            glow.alpha = 1f
        }
    }

    // ── Deactivate ────────────────────────────────────────────────────────────

    private fun deactivate(tab: NavTab, animateGlow: Boolean) {
        val icon  = icons[tab]  ?: return
        val label = labels[tab] ?: return
        val glow  = glows[tab]  ?: return

        ImageViewCompat.setImageTintList(icon, ColorStateList.valueOf(colorInactive))
        label.setTextColor(colorInactive)
        icon.scaleX = 1f ; icon.scaleY = 1f ; icon.translationY = 0f

        if (animateGlow) {
            glow.animate().cancel()
            glow.animate()
                .alpha(0f)
                .setDuration(150)
                .setInterpolator(DecelerateInterpolator())
                .start()
        } else {
            glow.alpha = 0f
        }
    }

    // ── Indicator slide ───────────────────────────────────────────────────────

    private fun slideIndicator(tab: NavTab, animate: Boolean) {
        val ind = indicator ?: return
        if (root.width == 0) { root.post { slideIndicator(tab, animate) } ; return }

        val tabCount   = NavTab.values().size.toFloat()
        val tabW       = root.width / tabCount
        val indW       = ind.width.takeIf { it > 0 }?.toFloat()
            ?: (root.context.resources.displayMetrics.density * 32)
        val targetX    = tabW * tab.index + (tabW - indW) / 2f

        if (animate) {
            ObjectAnimator.ofFloat(ind, View.TRANSLATION_X, ind.translationX, targetX).apply {
                duration     = 300
                interpolator = DecelerateInterpolator(1.8f)
                start()
            }
        } else {
            ind.translationX = targetX
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun scaleAnim(view: View, from: Float, peak: Float, to: Float, dur: Long): AnimatorSet {
        return AnimatorSet().apply {
            playTogether(
                ObjectAnimator.ofFloat(view, View.SCALE_X, from, peak, to),
                ObjectAnimator.ofFloat(view, View.SCALE_Y, from, peak, to)
            )
            duration     = dur
            interpolator = OvershootInterpolator(2.2f)
        }
    }

    /** Quick pulse for tapping the already-active tab */
    private fun pulseIcon(icon: View) {
        scaleAnim(icon, 1f, 1.08f, 1f, 200L).start()
    }

    private fun showBadge(b: TextView, text: String) {
        b.text = text
        b.visibility = View.VISIBLE
        b.scaleX = 0f ; b.scaleY = 0f
        b.animate()
            .scaleX(1f).scaleY(1f)
            .setDuration(220)
            .setInterpolator(OvershootInterpolator(1.8f))
            .start()
    }

    private fun hideBadge(b: TextView) {
        b.animate()
            .scaleX(0f).scaleY(0f)
            .setDuration(150)
            .setInterpolator(DecelerateInterpolator())
            .withEndAction { b.visibility = View.GONE }
            .start()
    }
}
