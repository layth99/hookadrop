package com.hookahdrop.app.view

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View

/**
 * Draws 3 soft radial gradient orbs with NO visible edges.
 * DEFECT A FIX: Removed BlurMaskFilter, using multi-stop radial gradients.
 */
class OrbView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var themeColor: Int = Color.rgb(40, 170, 230)
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    fun setThemeColor(color: Int) {
        themeColor = color
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        val density = resources.displayMetrics.density
        
        // Orb 1: left -70dp, top 6%, diameter 260dp, center alpha 0.30
        val orb1X = -70f * density
        val orb1Y = h * 0.06f
        val orb1Radius = 260f * density / 2f
        drawSoftOrb(canvas, orb1X, orb1Y, orb1Radius, 0.30f)
        
        // Orb 2: right -80dp, top 30%, diameter 220dp, center alpha 0.22
        val orb2X = w + 80f * density
        val orb2Y = h * 0.30f
        val orb2Radius = 220f * density / 2f
        drawSoftOrb(canvas, orb2X, orb2Y, orb2Radius, 0.22f)
        
        // Orb 3: left 25%, bottom -120dp, diameter 300dp, center alpha 0.18
        val orb3X = w * 0.25f
        val orb3Y = h + 120f * density
        val orb3Radius = 300f * density / 2f
        drawSoftOrb(canvas, orb3X, orb3Y, orb3Radius, 0.18f)
    }

    private fun drawSoftOrb(canvas: Canvas, cx: Float, cy: Float, radius: Float, centerAlpha: Float) {
        // Multi-stop radial gradient for soft edge with NO visible outline
        val r = Color.red(themeColor)
        val g = Color.green(themeColor)
        val b = Color.blue(themeColor)
        
        paint.shader = RadialGradient(
            cx, cy, radius,
            intArrayOf(
                Color.argb((255 * centerAlpha).toInt(), r, g, b),       // Center
                Color.argb((255 * centerAlpha * 0.7f).toInt(), r, g, b), // 60%
                Color.argb((255 * centerAlpha * 0.3f).toInt(), r, g, b), // 85%
                Color.TRANSPARENT                                         // Edge (100%)
            ),
            floatArrayOf(0f, 0.6f, 0.85f, 1f),
            Shader.TileMode.CLAMP
        )
        canvas.drawCircle(cx, cy, radius, paint)
        paint.shader = null
    }
}
