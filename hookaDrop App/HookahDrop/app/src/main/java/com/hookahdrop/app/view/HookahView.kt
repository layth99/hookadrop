package com.hookahdrop.app.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.util.AttributeSet
import android.view.View
import android.view.animation.LinearInterpolator

class HookahView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var themeColor: Int = Color.rgb(0, 191, 255)  // Cyan color for water
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    
    // PNG layer bitmaps
    private var bmpGlow: Bitmap? = null
    private var bmpBack: Bitmap? = null
    private var bmpFront: Bitmap? = null
    private var bmpVaseMask: Bitmap? = null
    private var bmpWaveA: Bitmap? = null
    private var bmpWaveB: Bitmap? = null
    private var bmpCoal: Bitmap? = null
    
    // Animation properties
    private var waveAOffset = 0f  // -40 to 0 design units
    private var waveBOffset = 0f  // 0 to -40 design units
    private var coalGlowAlpha = 0.8f
    private var coalBrightness = 1.0f
    private var glowScale = 1.0f
    private var glowAlpha = 0.8f
    
    private val colorMatrix = ColorMatrix()
    private val colorFilter = ColorMatrixColorFilter(colorMatrix)
    
    init {
        // Load PNG assets from drawable-nodpi
        try {
            bmpGlow = BitmapFactory.decodeResource(resources, com.hookahdrop.app.R.drawable.hk_glow)
            bmpBack = BitmapFactory.decodeResource(resources, com.hookahdrop.app.R.drawable.hk_back)
            bmpFront = BitmapFactory.decodeResource(resources, com.hookahdrop.app.R.drawable.hk_front)
            bmpVaseMask = BitmapFactory.decodeResource(resources, com.hookahdrop.app.R.drawable.hk_vase_mask)
            bmpWaveA = BitmapFactory.decodeResource(resources, com.hookahdrop.app.R.drawable.hk_wave_a)
            bmpWaveB = BitmapFactory.decodeResource(resources, com.hookahdrop.app.R.drawable.hk_wave_b)
            bmpCoal = BitmapFactory.decodeResource(resources, com.hookahdrop.app.R.drawable.hk_coal)
            
            // Verify all assets loaded
            if (bmpGlow == null || bmpBack == null || bmpFront == null || bmpVaseMask == null || 
                bmpWaveA == null || bmpWaveB == null || bmpCoal == null) {
                android.util.Log.e("HookahView", "ERROR: One or more PNG assets failed to load!")
            }
        } catch (e: Exception) {
            android.util.Log.e("HookahView", "ERROR loading hookah PNG assets: ${e.message}")
        }
        
        // Start wave animation
        startWaveAnimation()
    }
    
    private fun startWaveAnimation() {
        // Wave A: 0 to -40 in 2600ms
        ValueAnimator.ofFloat(0f, -40f).apply {
            duration = 2600
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener {
                waveAOffset = it.animatedValue as Float
                invalidate()
            }
            start()
        }
        
        // Wave B: -40 to 0 in 3800ms (reverse)
        ValueAnimator.ofFloat(-40f, 0f).apply {
            duration = 3800
            repeatCount = ValueAnimator.INFINITE
            interpolator = LinearInterpolator()
            addUpdateListener {
                waveBOffset = it.animatedValue as Float
            }
            start()
        }
    }

    fun setThemeColor(color: Int) {
        themeColor = color
        invalidate()
    }

    fun updateWaterWave(offset: Float) {
        // Legacy compatibility - waves now handled by internal animation
    }

    fun updateCoalGlow(alpha: Float, brightness: Float) {
        coalGlowAlpha = alpha
        coalBrightness = brightness
        invalidate()
    }
    
    fun updateGlowAnimation(scale: Float, alpha: Float) {
        glowScale = scale
        glowAlpha = alpha
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        // Maintain 240:420 aspect ratio, matching height constraints first
        val specWidth = MeasureSpec.getSize(widthMeasureSpec)
        val specHeight = MeasureSpec.getSize(heightMeasureSpec)
        
        val aspectRatio = 240f / 420f
        
        // Calculate dimensions based on available height
        var width = (specHeight * aspectRatio).toInt()
        var height = specHeight
        
        // If width exceeds available space, constrain by width instead
        if (width > specWidth) {
            width = specWidth
            height = (width / aspectRatio).toInt()
        }
        
        // Ensure minimum reasonable size (for very small screens)
        val minWidth = 180 // ~180px minimum
        val minHeight = 315 // maintains aspect ratio
        
        if (width < minWidth) {
            width = minWidth
            height = minHeight
        }
        
        setMeasuredDimension(width, height)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        // Verify assets are loaded
        if (bmpGlow == null || bmpBack == null || bmpFront == null || bmpVaseMask == null ||
            bmpWaveA == null || bmpWaveB == null || bmpCoal == null) {
            // Draw error indicator
            paint.color = Color.RED
            paint.textSize = 20f
            canvas.drawText("ERROR: PNG assets not loaded!", 10f, h / 2f, paint)
            return
        }
        
        val k = w / 240f  // px per design unit
        
        // 1. GLOW (with flicker animation)
        canvas.save()
        canvas.translate(w / 2f, h / 2f)
        canvas.scale(glowScale, glowScale)
        canvas.translate(-w / 2f, -h / 2f)
        paint.alpha = (255 * glowAlpha).toInt()
        canvas.drawBitmap(bmpGlow!!, null, RectF(0f, 0f, w, h), paint)
        paint.alpha = 255
        canvas.restore()
        
        // 2. BACK
        canvas.drawBitmap(bmpBack!!, null, RectF(0f, 0f, w, h), null)
        
        // 3. WATER (waves clipped by vase mask)
        canvas.saveLayer(0f, 0f, w, h, null)
        
        // Draw wave A with theme color tint
        val waveWidth = 360f * k  // waves are 360 design units wide
        val waveHeight = 420f * k
        val waveALeft = (-80f * k) + (waveAOffset * k)
        
        paint.colorFilter = PorterDuffColorFilter(themeColor, PorterDuff.Mode.SRC_IN)
        canvas.drawBitmap(bmpWaveA!!, null, RectF(waveALeft, 0f, waveALeft + waveWidth, waveHeight), paint)
        
        // Draw wave B with theme color tint
        val waveBLeft = (-80f * k) + (waveBOffset * k)
        canvas.drawBitmap(bmpWaveB!!, null, RectF(waveBLeft, 0f, waveBLeft + waveWidth, waveHeight), paint)
        
        paint.colorFilter = null
        
        // Apply vase mask with DstIn blend mode
        paint.colorFilter = null
        paint.xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
        canvas.drawBitmap(bmpVaseMask!!, null, RectF(0f, 0f, w, h), paint)
        paint.xfermode = null
        
        canvas.restore()
        
        // 4. FRONT
        canvas.drawBitmap(bmpFront!!, null, RectF(0f, 0f, w, h), null)
        
        // 5. COAL (with brightness pulse)
        colorMatrix.setScale(coalBrightness, coalBrightness, coalBrightness, coalGlowAlpha)
        paint.colorFilter = ColorMatrixColorFilter(colorMatrix)
        canvas.drawBitmap(bmpCoal!!, null, RectF(0f, 0f, w, h), paint)
        paint.colorFilter = null
        
        // 6. TODO: Bubbles (drawn in code inside vase only)
        // 7. TODO: Smoke (handled by SmokeParticleView overlay)
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        // Clean up bitmaps
        bmpGlow?.recycle()
        bmpBack?.recycle()
        bmpFront?.recycle()
        bmpVaseMask?.recycle()
        bmpWaveA?.recycle()
        bmpWaveB?.recycle()
        bmpCoal?.recycle()
    }
}
