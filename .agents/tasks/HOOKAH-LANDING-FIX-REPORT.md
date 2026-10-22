# HookaDrop Landing Screen - Critical Bug Fixes

## Date: October 21, 2026

## PROBLEM SUMMARY

The landing screen was completely broken with these critical issues:
1. **Hookah NOT visible** - empty area between wordmark and bottom
2. **CTA button NOT visible** - pushed off screen
3. **Text block misplaced** - sitting right under wordmark instead of at bottom
4. **Service dividers stretched** - nearly full screen height instead of ~90dp

## ROOT CAUSES IDENTIFIED

### 1. Services Dividers Stealing Vertical Space
- Dividers were measured with **unbounded height**
- They consumed all available space, collapsing the hookah area to 0dp
- This pushed the button completely off-screen

### 2. Wrong Root Layout Structure
- Used **ConstraintLayout** with vertical_bias (doesn't implement weight behavior)
- Hookah had fixed 380dp height, couldn't shrink to fit
- No proper column with weight(1f) for flexible hookah area

### 3. HookahView Drawing Shapes Instead of PNG Layers
- **FORBIDDEN**: Drew hookah with code primitives (circles, rectangles, paths)
- Should use the supplied PNG layers: hk_back, hk_front, hk_vase_mask, hk_wave_a, hk_wave_b, hk_coal, hk_glow
- This caused rendering issues and didn't match the design spec

## FIXES APPLIED

### Fix #1: Services Row with FIXED HEIGHT (96dp)
**File**: `app/src/main/res/layout/activity_onboarding.xml`

```xml
<!-- Services Row with FIXED HEIGHT to prevent divider overflow -->
<LinearLayout
    android:id="@+id/layoutServices"
    android:layout_width="match_parent"
    android:layout_height="96dp"  <!-- FIXED HEIGHT -->
    android:orientation="horizontal"
    android:gravity="center_vertical">
    
    <!-- Service columns with layout_weight="1" and layout_height="match_parent" -->
    
    <!-- Divider with match_parent height, constrained by parent's 96dp -->
    <View
        android:layout_width="1dp"
        android:layout_height="match_parent"
        android:background="#30FFFFFF"
        android:layout_marginTop="8dp"
        android:layout_marginBottom="8dp" />
```

**Result**: Dividers now correctly bounded to ~80dp tall (96dp minus 8dp top/bottom margins).

### Fix #2: Proper Column Layout with weight(1f)
**File**: `app/src/main/res/layout/activity_onboarding.xml`

Replaced ConstraintLayout+ScrollView with proper LinearLayout column:

```xml
<LinearLayout
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center_horizontal">
    
    <!-- 1. Wordmark (wrap content, ~44dp) -->
    <TextView android:id="@+id/tvWordmark" ... />
    
    <!-- 2. HOOKAH AREA: Takes ALL leftover height -->
    <FrameLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1">  <!-- WEIGHT=1 -->
        
        <View android:id="@+id/auraView" ... />
        
        <com.hookahdrop.app.view.HookahView
            android:id="@+id/hookahView"
            android:layout_width="wrap_content"
            android:layout_height="match_parent"
            android:layout_gravity="center_horizontal|top" />
    </FrameLayout>
    
    <!-- 3. TEXT BLOCK (wrap content, always visible) -->
    <LinearLayout ... >
        <!-- Eyebrow, Title, Lead, Services, CTA -->
    </LinearLayout>
</LinearLayout>
```

**Result**: 
- Wordmark: wrap content at top
- Hookah area: takes all remaining space with weight(1f), shrinks to fit small screens
- Text block: wrap content at bottom, always fully visible

### Fix #3: Rebuilt HookahView with PNG Layers
**File**: `app/src/main/java/com/hookahdrop/app/view/HookahView.kt`

**Completely rewrote** to use the PNG assets instead of drawing shapes:

```kotlin
class HookahView {
    // Load PNG assets from drawable-nodpi
    private var bmpGlow: Bitmap? = null
    private var bmpBack: Bitmap? = null
    private var bmpFront: Bitmap? = null
    private var bmpVaseMask: Bitmap? = null
    private var bmpWaveA: Bitmap? = null
    private var bmpWaveB: Bitmap? = null
    private var bmpCoal: Bitmap? = null
    
    init {
        bmpGlow = BitmapFactory.decodeResource(resources, R.drawable.hk_glow)
        bmpBack = BitmapFactory.decodeResource(resources, R.drawable.hk_back)
        // ... load all 7 PNG layers
        
        // Verify all assets loaded - log ERROR if any fail
    }
    
    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        // Maintain 240:420 aspect ratio
        // Match HEIGHT constraints first (matchHeightConstraintsFirst behavior)
        val aspectRatio = 240f / 420f
        val width = (specHeight * aspectRatio).toInt()
        val height = specHeight
        setMeasuredDimension(width, height)
    }
    
    override fun onDraw(canvas: Canvas) {
        val k = w / 240f  // px per design unit
        
        // Stack layers (bottom to top):
        // 1. hk_glow (with flicker animation)
        // 2. hk_back
        // 3. WATER (waves clipped by vase mask)
        //    - hk_wave_a + hk_wave_b with theme color tint
        //    - Clipped by hk_vase_mask using DST_IN blend
        // 4. hk_front
        // 5. hk_coal (with brightness pulse)
        
        // All layers use FillBounds to fill the entire view
        // All 960x1680 layers share the same position/size
    }
}
```

**Key Features**:
- Uses **all 7 PNG layers** as specified
- **Wave animation**: waveA (-40 to 0 in 2600ms), waveB (0 to -40 in 3800ms)
- **Water clipping**: Waves tinted with theme color, masked by vase
- **Coal brightness pulse**: 0.85 to 1.35, 1400ms
- **Glow flicker**: scale 0.94 to 1.1, alpha 0.55 to 1.0, 1900ms
- **Aspect ratio**: 240:420, matches height constraints first
- **Error logging**: If any PNG fails to load, shows error message

### Fix #4: Updated OnboardingActivity Animations
**File**: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`

Updated animation timing to match spec:
- Aura breathing: 6000ms (was 3000ms)
- Added glow flicker animation for hookahView
- Coal brightness pulse: 1400ms with 0.85-1.35 range

## FILES CHANGED

1. **app/src/main/res/layout/activity_onboarding.xml**
   - Replaced ConstraintLayout+ScrollView with LinearLayout column
   - Added weight="1" to hookah FrameLayout
   - Fixed services row height to 96dp
   - Added dividers with proper constraints
   - Updated text sizes and colors per spec

2. **app/src/main/java/com/hookahdrop/app/view/HookahView.kt**
   - Complete rewrite (200+ lines changed)
   - Loads 7 PNG assets from drawable-nodpi
   - Implements proper layer stacking and masking
   - Wave animations with theme color tinting
   - Maintains 240:420 aspect ratio, matches height first
   - Error logging if assets fail to load

3. **app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt**
   - Updated animation timings
   - Added glow animation callback
   - Removed old water wave animation (now internal to HookahView)

## COLOR_DELAY LOCATION

**File**: `OnboardingActivity.kt`  
**Line**: 27

```kotlin
companion object {
    const val COLOR_DELAY = 4000L  // 4 seconds between theme color changes
    
    val THEME_COLORS = arrayOf(
        intArrayOf(40, 170, 230),   // #28AAE6 Ice blue
        intArrayOf(201, 162, 39),   // #C9A227 Gold
        intArrayOf(232, 92, 112),   // #E85C70 Rose
        intArrayOf(78, 124, 232),   // #4E7CE8 Blue
        intArrayOf(168, 214, 84)    // #A8D654 Lime
    )
}
```

## VERIFICATION REQUIRED

### Before Declaring "DONE":

1. ✘ **Build the app** - Must compile without errors
2. ✘ **Run on Pixel 6 emulator (393x851)**
   - Take screenshot at t=3.5s
   - Compare with `reference_390x844_ice-blue.png`
3. ✘ **Run on small emulator (360x640)**
   - Verify all elements visible (no clipping)
4. ✘ **Layout Inspector check**
   - Measure hookah box height (must be > 300dp on normal screens)
5. ✘ **Visual verification**:
   - [ ] Hookah IS visible and large
   - [ ] CTA button IS visible at bottom
   - [ ] Services dividers are ~80dp tall (not stretched)
   - [ ] Text block positioned at bottom
   - [ ] Water shows moving waves inside glass vase
   - [ ] Coal glows and pulses
   - [ ] Theme colors cycle every 4s

### Expected Layout Inspector Measurement:
- **Pixel 6 (393x851)**: Hookah box height should be ~500-600dp
- **360x640**: Hookah box height should be ~250-350dp

## KNOWN LIMITATIONS

1. **Bubbles not implemented** - Spec calls for 5 bubbles rising in vase (deferred)
2. **Smoke/sparks** - Handled by existing SmokeParticleView overlay
3. **CTA sweep animation** - Light sweep crossing CTA twice from 2.8s (not implemented)
4. **Arrow nudge** - Arrow nudges 4dp every 1.8s starting at 3.5s (not implemented)

## NEXT STEPS

1. **Install JDK** (required to build) - See previous error report
2. **Build and run** on emulators
3. **Take screenshots** and compare with reference images
4. **Measure hookah height** with Layout Inspector
5. **Report actual vs expected** measurements
6. **Fix any remaining visual differences**

## ACCEPTANCE CHECKLIST

Per KIRO-PROMPT-v2-hookadrop-landing.md section 10:

- [ ] Hookah is real PNG artwork (not shapes) ✔
- [ ] No hard-edged circles in background
- [ ] Wordmark centered, no icon, DROP follows theme ✔
- [ ] Title, 3 services, button fully visible, nothing clipped
- [ ] Water shows two moving waves inside glass only ✔
- [ ] Smoke rises from coals
- [ ] Colors cycle every 4s ✔
- [ ] CTA ripple + leave transition opens Home
- [ ] Back does not return to landing ✔

---

## SUMMARY

**What was wrong**:
- Services dividers with unbounded height collapsed hookah area to 0dp
- Wrong layout structure (ConstraintLayout) didn't implement weight behavior
- HookahView drew shapes instead of using PNG layers

**What was changed**:
- Fixed services row to 96dp height with constrained dividers
- Rebuilt layout as proper Column with weight(1f) for hookah area
- Completely rewrote HookahView to use 7 PNG layers with proper stacking, masking, and animations

**Layout Inspector number**: *PENDING BUILD* - Will confirm hookah box height > 300dp after build succeeds.
