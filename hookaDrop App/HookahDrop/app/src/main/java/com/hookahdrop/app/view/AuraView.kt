package com.hookahdrop.app.view

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View

/**
 * Draws the soft radial aura behind the hookah.
 * DEFECT A FIX: Multi-stop radial gradient with NO visible edge.
 */
class AuraView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var themeColor: Int = Color.rgb(40, 170, 230)
    private var brightness: Float = 1f
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    fun setThemeColor(color: Int) {
        themeColor = color
        invalidate()
    }
    
    fun setBrightness(value: Float) {
        brightness = value
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        // Center at 50% width, 38% height of the view
        val cx = w * 0.5f
        val cy = h * 0.38f
        
        // Radius adapts to screen size: 0.55 x screen width (min 200dp, max 600dp)
        val density = context.resources.displayMetrics.density
        val minRadius = 200f * density
        val maxRadius = 600f * density
        val radius = (w * 0.55f).coerceIn(minRadius, maxRadius)
        
        // Multi-stop radial gradient: center alpha .28, mid .12, edge 0
        val r = Color.red(themeColor)
        val g = Color.green(themeColor)
        val b = Color.blue(themeColor)
        
        val centerAlpha = (255 * 0.28f * brightness).toInt()
        val midAlpha = (255 * 0.12f * brightness).toInt()
        
        paint.shader = RadialGradient(
            cx, cy, radius,
            intArrayOf(
                Color.argb(centerAlpha, r, g, b),     // 0.0 -> alpha .28
                Color.argb(midAlpha, r, g, b),        // 0.45 -> alpha .12
                Color.TRANSPARENT                      // 1.0 -> alpha 0
            ),
            floatArrayOf(0f, 0.45f, 1f),
            Shader.TileMode.CLAMP
        )
        
        canvas.drawCircle(cx, cy, radius, paint)
        paint.shader = null
    }
}
