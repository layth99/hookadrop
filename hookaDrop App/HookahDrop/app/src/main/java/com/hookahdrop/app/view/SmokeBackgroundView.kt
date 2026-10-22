package com.hookahdrop.app.view

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.*
import android.provider.Settings
import android.util.AttributeSet
import android.view.View
import android.view.animation.AccelerateDecelerateInterpolator

/**
 * Reusable animated smoke background component.
 * Draws smoke with BlendMode.Screen so black background vanishes.
 * 
 * Usage:
 * - Splash: tint=null, intensity=1.0f
 * - Landing: tint=themeColor, intensity=0.9f
 */
class SmokeBackgroundView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var smokeBitmap: Bitmap? = null
    private var smokeBitmapMirrored: Bitmap? = null
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    
    // Animation properties for Layer A
    private var layerATranslateY = 0f
    private var layerAScale = 1.10f
    private var layerARotation = -2f
    
    // Animation properties for Layer B
    private var layerBTranslateY = 0f
    private var layerBTranslateX = 0f
    private var layerBScale = 1.22f
    private var layerBRotation = 2f
    
    // Component properties
    private var componentAlpha = 0f
    private var tintColor: Int? = null
    var intensity = 1f
        set(value) {
            field = value
            invalidate()
        }
    
    private val animators = mutableListOf<ValueAnimator>()
    private val colorMatrix = ColorMatrix()
    private val colorFilter = ColorMatrixColorFilter(colorMatrix)
    
    // Theme color tinting (RGB 0..1)
    private var themeColorR = 1f
    private var themeColorG = 1f
    private var themeColorB = 1f
    private val themePaint = Paint(Paint.ANTI_ALIAS_FLAG)
    
    init {
        // Load and decode smoke bitmap once, downsampled to screen width
        loadSmokeBitmap()
        
        // Start animations unless reduce motion is enabled
        if (!isReduceMotion()) {
            startAnimations()
        }
        
        // Fade in component
        ValueAnimator.ofFloat(0f, 1f).apply {
            duration = 1400 // Changed from 1200ms to 1400ms per spec
            addUpdateListener {
                componentAlpha = it.animatedValue as Float
                invalidate()
            }
            start()
        }.also { animators.add(it) }
    }
    
    /**
     * Update theme color for Color blend mode tinting.
     * @param r Red component 0..1
     * @param g Green component 0..1
     * @param b Blue component 0..1
     */
    fun updateThemeColor(r: Float, g: Float, b: Float) {
        themeColorR = r
        themeColorG = g
        themeColorB = b
        invalidate()
    }
    
    fun fadeIn() {
        // Already handled in init, but can be called externally to trigger re-fade if needed
    }
    
    private fun loadSmokeBitmap() {
        try {
            val options = BitmapFactory.Options().apply {
                inJustDecodeBounds = true
            }
            BitmapFactory.decodeResource(resources, com.hookahdrop.app.R.drawable.bg_smoke, options)
            
            // Calculate sample size to downsample to approximately screen width
            val targetWidth = resources.displayMetrics.widthPixels
            val sampleSize = calculateInSampleSize(options, targetWidth, targetWidth * 3 / 2)
            
            options.inJustDecodeBounds = false
            options.inSampleSize = sampleSize
            
            val original = BitmapFactory.decodeResource(resources, com.hookahdrop.app.R.drawable.bg_smoke, options)
            
            if (original != null) {
                smokeBitmap = original
                
                // Create mirrored version for Layer B
                val matrix = Matrix().apply { preScale(-1f, 1f) }
                smokeBitmapMirrored = Bitmap.createBitmap(
                    original, 0, 0, 
                    original.width, original.height, 
                    matrix, false
                )
            }
        } catch (e: Exception) {
            android.util.Log.e("SmokeBackgroundView", "Failed to load smoke bitmap: ${e.message}")
        }
    }
    
    private fun calculateInSampleSize(options: BitmapFactory.Options, reqWidth: Int, reqHeight: Int): Int {
        val height = options.outHeight
        val width = options.outWidth
        var inSampleSize = 1
        
        if (height > reqHeight || width > reqWidth) {
            val halfHeight = height / 2
            val halfWidth = width / 2
            
            while (halfHeight / inSampleSize >= reqHeight && halfWidth / inSampleSize >= reqWidth) {
                inSampleSize *= 2
            }
        }
        
        return inSampleSize
    }
    
    private fun isReduceMotion(): Boolean {
        return try {
            Settings.Global.getFloat(
                context.contentResolver,
                Settings.Global.TRANSITION_ANIMATION_SCALE,
                1f
            ) == 0f
        } catch (e: Exception) {
            false
        }
    }
    
    private fun startAnimations() {
        // Layer A animations (22s and 28s cycles)
        ValueAnimator.ofFloat(0.04f, -0.04f).apply {
            duration = 22000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                layerATranslateY = it.animatedValue as Float
                invalidate()
            }
            start()
        }.also { animators.add(it) }
        
        ValueAnimator.ofFloat(1.10f, 1.24f).apply {
            duration = 22000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                layerAScale = it.animatedValue as Float
            }
            start()
        }.also { animators.add(it) }
        
        ValueAnimator.ofFloat(-2f, 2f).apply {
            duration = 28000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                layerARotation = it.animatedValue as Float
            }
            start()
        }.also { animators.add(it) }
        
        // Layer B animations (31s, 37s, 34s cycles)
        ValueAnimator.ofFloat(-0.03f, 0.03f).apply {
            duration = 31000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                layerBTranslateY = it.animatedValue as Float
            }
            start()
        }.also { animators.add(it) }
        
        ValueAnimator.ofFloat(-0.02f, 0.02f).apply {
            duration = 37000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                layerBTranslateX = it.animatedValue as Float
            }
            start()
        }.also { animators.add(it) }
        
        ValueAnimator.ofFloat(1.22f, 1.08f).apply {
            duration = 31000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                layerBScale = it.animatedValue as Float
            }
            start()
        }.also { animators.add(it) }
        
        ValueAnimator.ofFloat(2f, -2f).apply {
            duration = 34000
            repeatCount = ValueAnimator.INFINITE
            repeatMode = ValueAnimator.REVERSE
            interpolator = AccelerateDecelerateInterpolator()
            addUpdateListener {
                layerBRotation = it.animatedValue as Float
            }
            start()
        }.also { animators.add(it) }
    }
    
    fun setTintColor(color: Int?) {
        tintColor = color
        invalidate()
    }
    
    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        
        if (smokeBitmap == null || smokeBitmapMirrored == null) return
        if (componentAlpha <= 0f) return
        
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0 || h <= 0) return
        
        // Start with a large offscreen layer for all smoke effects
        val mainLayerId = canvas.saveLayer(0f, 0f, w, h, null)
        
        // First: Draw both smoke layers with Screen blend
        val smokeLayerId = canvas.saveLayer(0f, 0f, w, h, null)
        
        // Apply tint if provided (legacy support for Landing page)
        if (tintColor != null) {
            applyTintColorMatrix(tintColor!!)
            paint.colorFilter = colorFilter
        } else {
            paint.colorFilter = null
        }
        
        // Draw Layer A (original, alpha 0.60 per spec)
        drawSmokeLayer(
            canvas, smokeBitmap!!, w, h,
            alpha = 0.60f * intensity * componentAlpha,
            translateX = -0.10f * w,
            translateY = -0.10f * h + layerATranslateY * h,
            baseScale = 1.20f,
            animScale = layerAScale,
            rotation = layerARotation
        )
        
        // Draw Layer B (mirrored, alpha 0.42 per spec)
        drawSmokeLayer(
            canvas, smokeBitmapMirrored!!, w, h,
            alpha = 0.42f * intensity * componentAlpha,
            translateX = -0.10f * w + layerBTranslateX * w,
            translateY = -0.10f * h + layerBTranslateY * h,
            baseScale = 1.20f,
            animScale = layerBScale,
            rotation = layerBRotation
        )
        
        // Close smoke layer with Screen blend
        val screenPaint = Paint().apply {
            xfermode = PorterDuffXfermode(PorterDuff.Mode.SCREEN)
        }
        canvas.restoreToCount(smokeLayerId)
        
        // Second: Apply theme color tint using BlendMode.Color (API 29+) or PorterDuff.Multiply fallback
        themePaint.color = Color.argb((0.75f * 255).toInt(), 
            (themeColorR * 255).toInt(), 
            (themeColorG * 255).toInt(), 
            (themeColorB * 255).toInt())
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            themePaint.blendMode = BlendMode.COLOR
        } else {
            themePaint.xfermode = PorterDuffXfermode(PorterDuff.Mode.MULTIPLY)
        }
        
        canvas.drawRect(0f, 0f, w, h, themePaint)
        themePaint.xfermode = null
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            themePaint.blendMode = null
        }
        
        // Third: Apply bottom fade mask (DstIn with vertical gradient)
        val maskPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            shader = LinearGradient(
                0f, 0f, 0f, h,
                intArrayOf(
                    Color.argb(255, 255, 255, 255), // Opaque at top (0%)
                    Color.argb(255, 255, 255, 255), // Opaque at 40%
                    Color.argb((0.18f * 255).toInt(), 255, 255, 255) // Alpha 0.18 at bottom (100%)
                ),
                floatArrayOf(0f, 0.40f, 1.0f),
                Shader.TileMode.CLAMP
            )
            xfermode = PorterDuffXfermode(PorterDuff.Mode.DST_IN)
        }
        canvas.drawRect(0f, 0f, w, h, maskPaint)
        
        // Restore main layer
        canvas.restoreToCount(mainLayerId)
        
        paint.colorFilter = null
    }
    
    private fun drawSmokeLayer(
        canvas: Canvas, 
        bitmap: Bitmap, 
        w: Float, 
        h: Float,
        alpha: Float,
        translateX: Float,
        translateY: Float,
        baseScale: Float,
        animScale: Float,
        rotation: Float
    ) {
        canvas.save()
        
        // Center transform
        canvas.translate(w / 2f, h / 2f)
        canvas.rotate(rotation)
        canvas.scale(baseScale * animScale, baseScale * animScale)
        canvas.translate(translateX / (baseScale * animScale), translateY / (baseScale * animScale))
        
        // Draw bitmap centered
        val bw = bitmap.width.toFloat()
        val bh = bitmap.height.toFloat()
        
        // Scale to cover screen
        val scaleX = w / bw
        val scaleY = h / bh
        val scale = maxOf(scaleX, scaleY)
        
        val destRect = RectF(
            -bw * scale / 2f,
            -bh * scale / 2f,
            bw * scale / 2f,
            bh * scale / 2f
        )
        
        paint.alpha = (255 * alpha).toInt()
        canvas.drawBitmap(bitmap, null, destRect, paint)
        paint.alpha = 255
        
        canvas.restore()
    }
    
    private fun applyTintColorMatrix(color: Int) {
        // Extract RGB components
        val r = Color.red(color) / 255f
        val g = Color.green(color) / 255f
        val b = Color.blue(color) / 255f
        
        // Create colorization matrix
        // luma = 0.299R + 0.587G + 0.114B
        // colorized = luma * tint * 1.6
        // result = 35% original + 65% colorized
        
        val matrix = ColorMatrix(floatArrayOf(
            0.35f + 0.65f * 0.299f * r * 1.6f, 0.65f * 0.299f * g * 1.6f, 0.65f * 0.299f * b * 1.6f, 0f, 0f,
            0.65f * 0.587f * r * 1.6f, 0.35f + 0.65f * 0.587f * g * 1.6f, 0.65f * 0.587f * b * 1.6f, 0f, 0f,
            0.65f * 0.114f * r * 1.6f, 0.65f * 0.114f * g * 1.6f, 0.35f + 0.65f * 0.114f * b * 1.6f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        ))
        
        // Clamp values
        val clampMatrix = ColorMatrix(floatArrayOf(
            1f, 0f, 0f, 0f, 0f,
            0f, 1f, 0f, 0f, 0f,
            0f, 0f, 1f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        ))
        
        colorMatrix.set(matrix)
        colorMatrix.postConcat(clampMatrix)
    }
    
    fun pause() {
        animators.forEach { it.pause() }
    }
    
    fun resume() {
        animators.forEach { if (it.isPaused) it.resume() }
    }
    
    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        animators.forEach { it.cancel() }
        animators.clear()
        smokeBitmap?.recycle()
        smokeBitmapMirrored?.recycle()
    }
}
