package com.hookahdrop.app.view

import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View

/**
 * Full-screen overlay covering lower 56% with vertical gradient.
 * DEFECT B FIX: Starts with fully transparent, no visible edge.
 */
class BottomScrimView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        // Gradient covers lower 56% of screen
        val startY = h * 0.44f  // Start at 44% (covers lower 56%)
        val midY = h * (0.44f + 0.56f * 0.38f)  // 38% into the gradient
        val endY = h  // End at bottom
        
        // Vertical gradient: 0.0 -> transparent, 0.38 -> rgba(7,7,8,0.82), 1.0 -> rgba(5,5,6,0.96)
        paint.shader = LinearGradient(
            0f, startY,
            0f, endY,
            intArrayOf(
                Color.TRANSPARENT,                           // 0.0 -> fully transparent (NO visible edge)
                Color.argb((255 * 0.82f).toInt(), 7, 7, 8), // 0.38 -> rgba(7,7,8,0.82)
                Color.argb((255 * 0.96f).toInt(), 5, 5, 6)  // 1.0 -> rgba(5,5,6,0.96)
            ),
            floatArrayOf(0f, 0.38f, 1f),
            Shader.TileMode.CLAMP
        )
        
        canvas.drawRect(0f, startY, w, endY, paint)
        paint.shader = null
    }
}
