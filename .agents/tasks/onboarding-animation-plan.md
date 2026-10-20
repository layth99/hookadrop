# Implementation Plan: OnboardingActivity Animation Rewrite

## Overview
Rewrite `OnboardingActivity.kt` to implement the complete animation choreography for the new redesigned onboarding page. The layout (`activity_onboarding_new.xml`) exists with all necessary view IDs and drawables. This plan implements entrance animations, continuous idle animations (smoke, embers, parallax, Ken Burns, ripples), and interaction effects.

## Project Context
- **Language**: Kotlin
- **Build System**: Gradle, compileSdk 34, ViewBinding enabled
- **Architecture**: Single-activity onboarding with ObjectAnimator-based animations
- **Navigation**: Intent to SignInActivity with R.anim.nav_enter/nav_exit transitions
- **Key Dependencies**: androidx.core:core-ktx, androidx.appcompat, material, lottie (available but not needed)
- **Existing Pattern**: Current OnboardingActivity uses ObjectAnimator + AnimatorSet for staggered entrance (see existing fade/slide/pop helpers)
- **All Drawables Verified**: bg_onboarding_gradient, bg_radial_glow_pulse, smk.png, hookah_photo_1/2/3.jpg, ic_hookah_neon, ic_delivery, ic_diamond, ic_headset, bg_collage_card_left/right, bg_diagonal_shine, bg_feature_ripple, bg_cta_glow, bg_cta_button, bg_shimmer_sweep, bg_smoke_burst all exist
- **Color Resources**: R.color.cyan (#08B9F5) exists in colors.xml

---

## Implementation Steps

- [ ] 1. **Rewrite OnboardingActivity.kt entrance choreography**
      Replace the existing entrance animation logic with the new precise timing and effects. Implement:
      - 100ms: ivLogo drops from -24px translationY (start pos), scale 0.7→1.0 with OvershootInterpolator(1.2f), alpha 0→1 (600ms duration)
      - 300ms: cardLeft clip-reveal wipe from bottom via translationY = cardLeft.height at start, animate to 0f over 1000ms with PathInterpolator(0.7f, 0f, 0.2f, 1f), alpha stays 1
      - 480ms: cardTopRight same wipe (translationY from height→0, 1000ms, same interpolator)
      - 660ms: cardBottomRight same wipe
      - 900ms: layoutEyebrow alpha 0→1 (400ms), lineLeft/lineRight scaleX 0→1 pivot left/right (500ms DecelerateInterpolator), tvEyebrow alpha 0→1 + translationY 10→0 (400ms)
      - 1000ms: tvHeadline alpha 0→1 + translationY 20→0 (600ms DecelerateInterpolator) — word-by-word is too complex for single TextView, use simple fade+slide
      - 1500ms: Apply SpannableString ForegroundColorSpan to "been waiting" in tvHeadline with R.color.cyan (reuse existing applySubtitleSpan pattern but target tvHeadline and "been waiting" substring)
      - 1500ms: tvSubtitle alpha 0→1 + translationY 18dp→0 (600ms)
      - 1700ms: layoutFeatures alpha 0→1 (400ms), then iconDelivery/iconDiamond/iconHeadset each pop in (scale 0.4→1 OvershootInterpolator(1.5f) + alpha 0→1, 500ms, stagger 120ms); divider1/divider2 scaleY 0→1 (400ms, pivot top)
      - 2000ms: btnGetStart translationY 40dp→0 + scale 0.9→1 (700ms OvershootInterpolator(1.2f)) + alpha 0→1; ctaGlow alpha 0→0.6 (500ms)
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Run the app on emulator, open OnboardingActivity, confirm entrance plays in correct sequence with no visual glitches, headline shows "been waiting" in cyan, CTA springs up at 2000ms.

- [ ] 2. **Implement continuous idle background animations (smoke, radial glow)**
      After entrance completes (~2200ms), start looping animations:
      - radialGlow: ObjectAnimator alpha 0.45→0.75, 3000ms, RepeatMode.REVERSE, RepeatCount.INFINITE
      - smoke1: Two simultaneous animators in AnimatorSet looping RESTART: translationY 0→-200dp (18000ms, LinearInterpolator), translationX sway 0→20→0→-20→0 (8000ms, AccelerateDecelerateInterpolator, REVERSE). On animation repeat listener: reset translationY to 0 when RESTART
      - smoke2: Same pattern but translationY 0→-200dp (28000ms), different sway timing
      Store all Animator references in `private val animators = mutableListOf<Animator>()` for cleanup
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Run app, observe smoke drifting upward continuously, radial glow pulsing behind collage, no memory leaks after leaving activity (check in Android Profiler or logcat for warnings).

- [ ] 3. **Implement embers (18-22 animated dots rising with fade)**
      Create 20 small circular View programmatically in onCreate, add to embersContainer:
      - Random initial positions across screen width (0..screenWidth), start at bottom (screenHeight)
      - Size: 2-4dp random, shape: circular with random color from amber (#F5A524), gold (#FFD27A), cyan (#22B8F0) — 1 in 5 cyan
      - Create custom drawable: GradientDrawable with OVAL shape, solid color, shadow layer (setPaint blur)
      - Each ember: translationY from screenHeight to -100dp (random duration 6000-12000ms, LinearInterpolator, RESTART repeat), alpha fade-in 0→0.8 (800ms at start), fade-out at 80% progress (alpha 0.8→0 over last 20% of duration), random horizontal drift ±30dp (separate animator, random duration 4000-8000ms, REVERSE repeat)
      - Stagger start delays randomly 0-3000ms
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Run app, see 20 small glowing dots rising slowly across the screen with drift, fading in/out smoothly, colors mix amber/gold/cyan.

- [ ] 4. **Implement photo card continuous animations (Ken Burns, floating, parallax, light sweep)**
      - Ken Burns zoom: cardLeft/cardTopRight/cardBottomRight each get nested ImageView scale animation: scaleX/scaleY 1.0→1.08 (14000ms DecelerateInterpolator, REVERSE, INFINITE) — apply to ImageView (imgHookah1/2/3), not FrameLayout
      - Floating: cardLeft translationY 0→-5dp (5000ms, AccelerateDecelerateInterpolator, REVERSE, INFINITE), cardTopRight (6000ms), cardBottomRight (7000ms)
      - Light sweep: shineLeft/shineTopRight/shineBottomRight translationX from -view.width to +view.width (1200ms AccelerateInterpolator) + alpha 0→0.6→0 (AnimatorSet with two sequential alpha animators 0→0.6 600ms, 0.6→0 600ms), repeat every 5000ms with initial stagger delays 0ms, 1666ms, 3333ms
      - Parallax: register SensorManager.getDefaultSensor(Sensor.TYPE_ACCELEROMETER), onSensorChanged: read x/y tilt, apply bounded translationX/Y to cards (cardLeft ±8dp, cardTopRight ±14dp, cardBottomRight ±20dp) with smooth interpolation (lerp current + new * 0.1f)
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Run on physical device, tilt phone and observe cards shifting at different depths (parallax), see gentle floating motion, Ken Burns slow zoom on photos, periodic diagonal light sweep across each card.

- [ ] 5. **Implement feature icon continuous animations (ripples, micro-movements)**
      - Ripples (ripple1/2/3): scale 1.0→1.5 + alpha 0.6→0 (2400ms LinearInterpolator, RESTART, INFINITE), stagger start delays 0ms, 800ms, 1600ms
      - iconDelivery: translationX 0→3dp→0 (1400ms, AccelerateDecelerateInterpolator, REVERSE, INFINITE)
      - iconDiamond: AnimatorSet with scaleX/scaleY 1.0→1.05 + rotation 0→5 degrees (3000ms, REVERSE, INFINITE, DecelerateInterpolator)
      - iconHeadset: scaleX/scaleY 1.0→1.1 (2000ms, AccelerateDecelerateInterpolator, REVERSE, INFINITE)
      Start these after entrance completes
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Run app, observe cyan ripples expanding from each feature icon (staggered), delivery icon nudging right, diamond sparkling with rotation, headset pulsing scale.

- [ ] 6. **Implement CTA button continuous animations (glow breathing, shimmer sweep, arrow nudge)**
      - ctaGlow: alpha 0.4→0.8 (2400ms, AccelerateDecelerateInterpolator, REVERSE, INFINITE)
      - ctaShimmer: translationX -400dp→+400dp (2800ms LinearInterpolator, RESTART, INFINITE) + alpha pulse 0→0.8→0 using two sequential animators in loop
      - Arrow animation not feasible without separate TextView for "→"; skip or accept static arrow
      Start after entrance completes
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Run app, observe glowing pulse behind CTA button, shimmering light sweep moving left-to-right continuously across button surface.

- [ ] 7. **Implement CTA button press interaction (scale + smoke burst transition)**
      btnGetStart.setOnClickListener:
      - Haptic feedback: view.performHapticFeedback(HapticFeedbackConstants.VIRTUAL_KEY)
      - Scale down animation: ObjectAnimator scaleX/scaleY 1.0→0.96 (100ms)
      - On scale complete: smokeBurst.visibility = VISIBLE, smokeBurst.alpha = 1f, animate scale from 0f to 30f (circular expand from button center — use pivotX/Y = btnGetStart center coords) + alpha 0→1 (900ms AccelerateInterpolator)
      - On smokeBurst animation end: startActivity(Intent(this, SignInActivity::class.java)), overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit), finish()
      Reuse existing navigateToSignIn() pattern but add haptic + smoke burst
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Run app, tap "Let's Get Started", feel haptic vibration, button scales down, dark smoke circle expands over screen, then navigates to SignInActivity with smooth transition.

- [ ] 8. **Implement photo card press interaction (lift on touch)**
      Set OnTouchListener on cardLeft, cardTopRight, cardBottomRight:
      - ACTION_DOWN: animate scale 1.0→1.03 + elevation increase (150ms OvershootInterpolator), brighten shineLeft/shineTopRight/shineBottomRight alpha 0→0.3 (150ms)
      - ACTION_UP / ACTION_CANCEL: animate scale 1.03→1.0 (150ms), shine alpha 0.3→0 (150ms)
      Return false to allow scrolling
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Run app, press and hold any photo card, observe slight lift/scale + shine brightens, release and card returns to normal, scroll still works.

- [ ] 9. **Implement reduce-motion accessibility support**
      In onCreate, check Settings.Global.getFloat(contentResolver, Settings.Global.TRANSITION_ANIMATION_SCALE, 1f) == 0f:
      - If true: skip embers spawn, skip smoke drift/sway (keep static), skip parallax sensor registration, skip floating, skip Ken Burns, skip ripples
      - Keep entrance animations (they are one-time functional), keep simple CTA glow/shimmer (low motion), keep button press
      Store boolean `private val isReduceMotion: Boolean` and conditionally start idle animations
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Enable "Remove animations" in Android Developer Options (Settings > System > Developer options > Window/Transition animation scale > off), relaunch app, confirm no embers/smoke/parallax/floating, entrance still plays, CTA interaction works.

- [ ] 10. **Lifecycle cleanup: cancel all animators and unregister sensor in onDestroy**
      Override onDestroy():
      - animators.forEach { it.cancel() }; animators.clear()
      - sensorManager?.unregisterListener(this)
      - embersContainer.removeAllViews()
      Prevents memory leaks and sensor battery drain
      
      Files: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`
      
      Verify: Run app, open OnboardingActivity, press back to exit, check Android Profiler or LeakCanary (if available) for no leaked OnboardingActivity instances, no sensor listener warnings in logcat.

- [ ] 11. **Full integration test: run complete animation sequence end-to-end**
      - Launch app fresh install, observe complete entrance choreography from logo drop to CTA spring (0-2000ms)
      - Wait 10 seconds, verify all idle animations running: smoke drifting, embers rising, cards floating/zooming, ripples, glow pulsing
      - Tilt device, confirm parallax shifts cards
      - Tap and hold a photo card, confirm lift interaction
      - Tap CTA button, confirm haptic, smoke burst, navigation to SignInActivity
      - Test on API 24 (minSdk) and API 34 (targetSdk) devices or emulators
      - Test in reduce-motion mode
      
      Files: N/A (testing only)
      
      Verify: Record screen video or walk through with stakeholder, confirm design spec matched exactly: timing, colors (cyan "been waiting"), all animations smooth 60fps, navigation works, no crashes.

---

## Notes
- **ViewBinding**: Use `ActivityOnboardingNewBinding` (layout: activity_onboarding_new.xml). Confirmed ViewBinding is enabled in build.gradle.
- **Navigation**: Preserve existing Intent to SignInActivity with overridePendingTransition(R.anim.nav_enter, R.anim.nav_exit) + finish(). Nav animations exist in res/anim/.
- **Content Preservation**: Logo (ic_hookah_neon), 3 photos (hookah_photo_1/2/3.jpg), 3 icons (ic_delivery, ic_diamond, ic_headset), all texts from layout XML stay unchanged. Only Kotlin animation logic is new.
- **Performance**: ObjectAnimator on View properties (translationX/Y, scaleX/Y, alpha, rotation) is GPU-accelerated. Avoid animating layout properties. Target 60fps on mid-range devices (test on emulator with "Profile GPU Rendering" enabled).
- **Sensor Battery**: Accelerometer listener only active while OnboardingActivity is visible; unregistered in onDestroy.
- **Reduce-Motion**: Android's TRANSITION_ANIMATION_SCALE setting is the standard accessibility check for motion sensitivity.
- **Drawable Dependencies**: All referenced drawables verified to exist: gradients, card backgrounds with rounded corners (14dp radius, 1dp white border 12% alpha per design), ripples, glows, smoke burst radial gradient.
- **Timing Precision**: Use `postDelayed` or `startDelay` on ObjectAnimator for precise millisecond choreography. Chain dependent animations with AnimatorListenerAdapter.onAnimationEnd.
- **Color Span**: SpannableString with ForegroundColorSpan is the standard Android approach for inline text coloring (similar to existing applySubtitleSpan in old OnboardingActivity).

## Acceptance Criteria
- [ ] Entrance choreography plays in exact sequence: logo 100ms, cards 300/480/660ms, eyebrow 900ms, headline 1000ms (with cyan "been waiting"), subtitle 1500ms, features 1700ms (icons pop, ripples appear), CTA 2000ms
- [ ] Background animations loop infinitely: radial glow pulses, smoke drifts upward, 20 embers rise and fade
- [ ] Photo cards have Ken Burns zoom, floating motion, parallax tilt response (on physical device), and periodic light sweep
- [ ] Feature icons have staggered ripples, delivery nudges, diamond sparkles, headset pulses
- [ ] CTA button has breathing glow and shimmer sweep
- [ ] Tapping CTA triggers haptic, scale down, smoke burst expansion, then navigates to SignInActivity
- [ ] Pressing photo cards lifts them with shine brightening
- [ ] Reduce-motion mode disables embers, smoke drift, parallax, floating, Ken Burns, ripples; keeps entrance and CTA press
- [ ] No memory leaks: all animators cancelled and sensor unregistered in onDestroy
- [ ] Smooth 60fps performance on Android API 24-34, no crashes
- [ ] Logo, photos, texts, icons, navigation preserved exactly as specified

---

**Plan authored by**: Planning Agent  
**Target file**: `app/src/main/java/com/hookahdrop/app/OnboardingActivity.kt`  
**Layout file**: `app/src/main/res/layout/activity_onboarding_new.xml` (already exists, read-only for this task)  
**Estimated complexity**: High (11 steps, complex animation choreography, sensor integration, lifecycle management)
