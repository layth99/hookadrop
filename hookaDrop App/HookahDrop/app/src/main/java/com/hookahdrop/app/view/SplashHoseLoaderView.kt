package com.hookahdrop.app.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import kotlin.math.min

/**
 * Hookah hose progress loader with SVG path, percentage display, and status text.
 * Design space: 320x56 units, scaled to view width.
 */
class SplashHoseLoaderView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    companion object {
        const val COLOR_STEP_MS = 2000L
        const val COLOR_SMOOTH = 0.018f
        const val DESIGN_WIDTH = 320f
        const val DESIGN_HEIGHT = 56f
    }
    
    // Theme color (RGB 0..1)
    private var themeColorR = 201f / 255f
    private var themeColorG = 162f / 255f
    private var themeColorB = 39f / 255f
    
    // Progress 0..1
    var progress: Float = 0f
        set(value) {
            field = value.coerceIn(0f, 1f)
            updateStatusText()
            invalidate()
        }
    
    private var currentStatusText = ""
    private var statusAlpha = 1f
    private var statusAnimator: ValueAnimator? = null
    
    private val hosePath = Path()
    private val pathMeasure = PathMeasure()
    
    private val rimPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        color = Color.parseColor("#C9A227")
    }
    
    private val bodyPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
        color = Color.parseColor("#0A0A0A")
    }
    
    private val ribsPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.BUTT
        color = Color.WHITE
    }
    
    private val flowPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }
    
    private val glowPaint1 = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }
    
    private val glowPaint2 = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeCap = Paint.Cap.ROUND
    }
    
    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.LEFT
        textSize = 11f * resources.displayMetrics.scaledDensity
        letterSpacing = 0.2f
        color = Color.parseColor("#D3D8DE")
    }
    
    private val percentPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        textAlign = Paint.Align.RIGHT
        textSize = 28f * resources.displayMetrics.scaledDensity
        color = Color.WHITE
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }
    
    private val dotPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        style = Paint.Style.FILL
    }
    
    private val mouthpiecePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.parseColor("#0A0A0A")
    }
    
    private val mouthpieceStrokePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        color = Color.parseColor("#C9A227")
    }
    
    private val couplingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = Color.parseColor("#C9A227")
    }
    
    init {
        // Parse SVG path: M12 40C50 40 62 14 104 16S168 46 214 38S268 12 292 22
        hosePath.moveTo(12f, 40f)
        hosePath.cubicTo(50f, 40f, 62f, 14f, 104f, 16f)
        // S168 46 214 38 means smooth cubic: reflect previous control point
        hosePath.cubicTo(146f, 18f, 168f, 46f, 214f, 38f) // Approximation of smooth cubic
        // S268 12 292 22
        hosePath.cubicTo(260f, 30f, 268f, 12f, 292f, 22f) // Approximation of smooth cubic
        
        pathMeasure.setPath(hosePath, false)
        
        updateStatusText()
    }
    
    fun updateThemeColor(r: Float, g: Float, b: Float) {
        themeColorR = r
        themeColorG = g
        themeColorB = b
        invalidate()
    }
    
    private fun updateStatusText() {
        val newText = when {
            progress < 0.28f -> "LIGHTING THE COALS"
            progress < 0.55f -> "FILLING THE WATER"
            progress < 0.82f -> "CHOOSING YOUR FLAVOR"
            else -> "ALMOST READY"
        }
        
        if (newText != currentStatusText) {
            val oldText = currentStatusText
            currentStatusText = newText
            
            // Cross-fade 150ms
            statusAnimator?.cancel()
            statusAnimator = ValueAnimator.ofFloat(1f, 0f).apply {
                duration = 75
                addUpdateListener {
                    statusAlpha = it.animatedValue as Float
                    invalidate()
                }
                start()
            }
            
            // Fade back in
            statusAnimator = ValueAnimator.ofFloat(0f, 1f).apply {
                duration = 75
                startDelay = 75
                addUpdateListener {
                    statusAlpha = it.animatedValue as Float
                    invalidate()
                }
                start()
            }
        }
    }
    
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        // Calculate scale from design space to view size
        val scale = w / DESIGN_WIDTH
        val dp = resources.displayMetrics.density
        
        // Draw in design space, scaled
        canvas.save()
        
        // Top row: status text (left) and percentage (right)
        val topY = 8f * dp
        
        // Status text
        textPaint.alpha = (statusAlpha * 255).toInt()
        canvas.drawText(currentStatusText, 0f, topY, textPaint)
        
        // Percentage text with glow
        val percentText = "${(progress * 100).toInt()}%"
        
        // Glow (theme color, radius 18dp, alpha 0.75)
        percentPaint.setShadowLayer(
            18f * dp,
            0f, 0f,
            Color.argb((0.75f * 255).toInt(), 
                (themeColorR * 255).toInt(),
                (themeColorG * 255).toInt(),
                (themeColorB * 255).toInt())
        )
        canvas.drawText(percentText, w, topY, percentPaint)
        percentPaint.clearShadowLayer()
        
        // Hose drawing area (below text, centered vertically)
        val hoseY = h / 2f + 4f * dp
        canvas.translate(0f, hoseY)
        canvas.scale(scale, scale)
        
        // Draw hose path 4 times
        
        // 1. Gold rim
        rimPaint.strokeWidth = 14f
        rimPaint.alpha = (0.75f * 255).toInt()
        canvas.drawPath(hosePath, rimPaint)
        rimPaint.alpha = 255
        
        // 2. Black body
        bodyPaint.strokeWidth = 10f
        canvas.drawPath(hosePath, bodyPaint)
        
        // 3. Ribs (dashed)
        ribsPaint.strokeWidth = 10f
        ribsPaint.alpha = (0.14f * 255).toInt()
        ribsPaint.pathEffect = DashPathEffect(floatArrayOf(1.5f, 5f), 0f)
        canvas.drawPath(hosePath, ribsPaint)
        ribsPaint.alpha = 255
        ribsPaint.pathEffect = null
        
        // 4. Progress flow with glow
        if (progress > 0f) {
            val flowLength = pathMeasure.length * progress
            val flowPath = Path()
            pathMeasure.getSegment(0f, flowLength, flowPath, true)
            
            // Theme color
            val themeColor = Color.rgb(
                (themeColorR * 255).toInt(),
                (themeColorG * 255).toInt(),
                (themeColorB * 255).toInt()
            )
            
            // Glow layers (Screen/Add blend would be ideal, but complex in onDraw)
            // Using simple alpha overlay instead
            glowPaint2.strokeWidth = 14f
            glowPaint2.color = themeColor
            glowPaint2.alpha = (0.25f * 255).toInt()
            canvas.drawPath(flowPath, glowPaint2)
            
            glowPaint1.strokeWidth = 8f
            glowPaint1.color = themeColor
            glowPaint1.alpha = (0.5f * 255).toInt()
            canvas.drawPath(flowPath, glowPaint1)
            
            // Main flow
            flowPaint.strokeWidth = 4f
            flowPaint.color = themeColor
            canvas.drawPath(flowPath, flowPaint)
            
            // Head dot with glow
            val pos = FloatArray(2)
            pathMeasure.getPosTan(flowLength, pos, null)
            
            // Dot glow (theme color)
            dotPaint.color = themeColor
            dotPaint.alpha = (0.5f * 255).toInt()
            canvas.drawCircle(pos[0], pos[1], 6.5f, dotPaint)
            
            // White dot
            dotPaint.color = Color.WHITE
            dotPaint.alpha = 255
            canvas.drawCircle(pos[0], pos[1], 4.5f, dotPaint)
        }
        
        // Mouthpiece (static): 26x11 rounded rect at (288,15) rotated -28deg
        canvas.save()
        canvas.translate(288f, 15f)
        canvas.rotate(-28f)
        
        val mouthpieceRect = RectF(-13f, -5.5f, 13f, 5.5f)
        canvas.drawRoundRect(mouthpieceRect, 4f, 4f, mouthpiecePaint)
        
        mouthpieceStrokePaint.strokeWidth = 1.4f
        canvas.drawRoundRect(mouthpieceRect, 4f, 4f, mouthpieceStrokePaint)
        
        // Gold band at x=15 (offset from center -13), width 3.5
        val bandRect = RectF(15f - 13f, -5.5f, 15f - 13f + 3.5f, 5.5f)
        canvas.drawRect(bandRect, couplingPaint)
        
        canvas.restore()
        
        // Coupling (static): 9x14 rounded rect at (4,33)
        val couplingRect = RectF(4f, 33f - 7f, 4f + 9f, 33f + 7f)
        canvas.drawRoundRect(couplingRect, 3f, 3f, couplingPaint)
        
        canvas.restore()
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        statusAnimator?.cancel()
    }
}
