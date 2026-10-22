# Implementation Plan: HookaDrop Animated Splash Screen Replacement

## Project Context

**Tech Stack**: Android XML Views + Kotlin (NOT Jetpack Compose)  
**Build Configuration**: minSdk 24, compileSdk 34, targetSdk 34  
- BlendMode API available (API 29+) but needs compatibility handling for API 24-28
- RenderEffect (blur) available only on API 31+, graceful degradation required
- AndroidX SplashScreen API available via androidx.core:core-splashscreen

**Existing Components to Reuse**:
- `SmokeBackgroundView.kt` - Already animates bg_smoke.png with Screen blend, needs extension for live theme color tinting via BlendMode.Color
- Navigation targets: `HomeActivity` (logged in) or `OnboardingActivity` (not logged in)
- `SessionManager` for login check
- Existing nav animations: `nav_enter.xml`, `nav_exit.xml`

**Key Requirements from Spec**:
- Total duration: 10.6 seconds
- Theme color cycle: gold → rose → lime → royal blue → ice blue, with exponential smoothing
- Constants: `COLOR_STEP_MS = 2000`, `COLOR_SMOOTH = 0.018`
- Layers: background → smoke → orbs/aura → bottom scrim → particles → logo → tagline → loader → exit veil
- NO circles/rings/arcs/shockwaves/bubbles - removed intentionally
- Hookah hose loader with exact SVG path, percentage (28sp), status text
- Particle system: max 340 particles, 60fps, cached sprite, no allocations in draw loop
- Verification: screenshots at 0.7, 1.5, 2.6, 4.0, 6.0, 8.0, 9.6, 10.8s compared with reference frames

---

## Implementation Steps

- [ ] 1. Copy asset files to drawable-nodpi with lowercase names
      Copy `logo_hookadrop.png` → `logo_hookadrop.png` and `bg_smoke.png` → `bg_smoke.png` from the source pack to `app/src/main/res/drawable-nodpi/`. These are already lowercase, verify they decode properly.
      Files: 
      - `app/src/main/res/drawable-nodpi/logo_hookadrop.png` (new)
      - `app/src/main/res/drawable-nodpi/bg_smoke.png` (verify/replace if exists)
      Verify: Build the project with `./gradlew assembleDebug` - no resource compilation errors.

- [ ] 2. Add AndroidX SplashScreen API dependency and configure theme
      Add `implementation 'androidx.core:core-splashscreen:1.0.1'` to app/build.gradle dependencies. Update `Theme.HookahDrop.Splash` in `res/values/themes.xml` to use the AndroidX splash API: set `android:windowSplashScreenBackground` to `#111111`, `postSplashScreenTheme` to `@style/Theme.HookahDrop.Splash`, and ensure no icon animation (`android:windowSplashScreenAnimatedIcon` omitted or transparent). This prevents white flash.
      Files: 
      - `app/build.gradle`
      - `app/src/main/res/values/themes.xml`
      Verify: Sync Gradle successfully with `./gradlew build --dry-run`.

- [ ] 3. Extend SmokeBackgroundView to support live theme color tinting
      Add `updateThemeColor(color: Int)` method to `SmokeBackgroundView.kt`. Replace the current ColorMatrix tinting approach with BlendMode.Color at alpha 0.75 applied over the smoke layers (API 29+). For API 24-28, fall back to ColorMatrix with the provided color. The smoke should fade toward the bottom with a vertical gradient mask (DstIn blend with gradient from alpha 1.0 at 40% height to alpha 0.18 at bottom). Store the theme color as a property and call invalidate() when it changes. Keep existing animation logic intact.
      Files: `app/src/main/java/com/hookahdrop/app/view/SmokeBackgroundView.kt`
      Verify: Run unit tests or visual inspection in an isolated test activity showing color changes. No errors in build.

- [ ] 4. Create SplashOrbsView - renders 3 soft radial gradient orbs + aura
      New custom View in `app/src/main/java/com/hookahdrop/app/view/SplashOrbsView.kt`. Draws 4 radial gradients (3 orbs + 1 aura) using Canvas.drawCircle with RadialGradient shaders (theme color at center with varying alphas, fading to transparent). Each orb has position (dp), size (dp), and a drift animation (AnimatorSet with translate + scale, durations 13s/17s/15s for orbs 1/2/3, alternate infinite, ease-in-out). Aura is centered at 50% width / 40% height, 380dp size, fades in from alpha 0 + scale 0.4 to alpha 1 + scale 1 over 1.6s starting at 0.6s, then breathes (brightness multiplier 0.8 to 1.4, 5s alternate) starting at 2.2s. Accepts `updateThemeColor(color: Int)` to update gradients. Respect reduce-motion setting (Settings.Global.ANIMATOR_DURATION_SCALE). NO flat circles or visible edges - use smooth radial gradients only.
      Files: `app/src/main/java/com/hookahdrop/app/view/SplashOrbsView.kt` (new)
      Verify: Add to a test layout, build and inspect visually. Orbs should be soft glows, no hard edges.

- [ ] 5. Create SplashParticleView - full particle system with 60fps frame clock
      New custom View in `app/src/main/java/com/hookahdrop/app/view/SplashParticleView.kt`. Choreographer-based frame loop with delta time. Particle types: logo smoke wisps, bottom plumes, embers, gold dust, sparks. Max 340 live particles. Pre-render one soft radial-gradient sprite (white) at init and draw it tinted with appropriate blend modes (Screen for smoke, Plus for embers/dust/sparks). Particle logic: position, velocity, radius, alpha, life, maxLife. Emission rates from spec (smoke wisps 40% per frame starting 0.9s, plumes 20%, embers 10%×35%, gold dust 10%×65%). Spark bursts at t=0.2s (10 sparks), t=0.8s (46 sparks + 12 puffs), t=9.2s (60 sparks + 16 puffs). Apply swirl/sway/flicker math from spec. NO allocations in draw loop - reuse particle pool. Stop emission at 9.2s. Pause in onVisibilityChanged. Accepts `updateThemeColor(color: Int)` for themed particles. Reduce emission rates by 50% on screens < 360dp width.
      Files: `app/src/main/java/com/hookahdrop/app/view/SplashParticleView.kt` (new)
      Verify: Add to test layout, run on emulator, observe particles. Use `adb shell dumpsys gfxinfo com.hookahdrop.app` during animation to check jank (target <5% dropped frames). Confirm particle count never exceeds 340.

- [ ] 6. Create SplashHoseLoaderView - hookah hose progress bar with SVG path
      New custom View in `app/src/main/java/com/hookahdrop/app/view/SplashHoseLoaderView.kt`. Parse SVG path `M12 40C50 40 62 14 104 16S168 46 214 38S268 12 292 22` using PathParser (or manually to Path). Draw 4 times: (1) gold rim stroke #C9A227 width 14 alpha 0.75, (2) black body stroke #0A0A0A width 10, (3) ribs stroke white alpha 0.14 width 10 dashed [1.5, 5], (4) progress flow - theme color stroke width 4 from 0 to progress×pathLength with glow (same stroke width 8 alpha 0.5 and width 14 alpha 0.25 underneath), plus white dot at head. Static mouthpiece (26×11 rounded rect at (288,15) rotated -28°) and coupling (9×14 rounded rect at (4,33)). Draw percentage text on right (28sp, weight 800, white, glow = theme alpha 0.75 radius 18) and status text on left (11sp, uppercase, letter-spacing 0.2em, color #D3D8DE). Status changes with progress: <0.28 "Lighting the coals", <0.55 "Filling the water", <0.82 "Choosing your flavor", else "Almost ready", with 150ms cross-fade. Canvas scaled to container width. Accepts `setProgress(p: Float)` and `updateThemeColor(color: Int)`.
      Files: `app/src/main/java/com/hookahdrop/app/view/SplashHoseLoaderView.kt` (new)
      Verify: Add to test layout with animated progress 0→1 over 10s, check all 4 status messages appear at correct times, hose draws smoothly.

- [ ] 7. Create new activity_splash.xml layout with exact layer order
      Replace entire `app/src/main/res/layout/activity_splash.xml`. Root FrameLayout with `android:background="#111111"`, `android:fitsSystemWindows="false"` for edge-to-edge. Layers from bottom to top:
      1. `SmokeBackgroundView` (match_parent, id=smokeBackground)
      2. `SplashOrbsView` (match_parent, id=orbsView)
      3. View for bottom scrim (match_parent, id=bottomScrim, background=vertical gradient transparent to rgba(5,5,6,0.85))
      4. `SplashParticleView` (match_parent, id=particleView)
      5. ImageView for logo (232dp × 252dp, centered at 50% width / 40% height via ConstraintLayout or manual positioning, id=imgLogo, src=@drawable/logo_hookadrop, scaleType=fitCenter, alpha=0)
      6. LinearLayout for tagline (centered horizontally, top = 40% height + 156dp, horizontal orientation): View (hairline left 34dp × 1dp), TextView (10sp, uppercase, letterSpacing=0.26, color=#9AA1A9, text="PREMIUM HOOKAH EXPERIENCE", 12dp margin sides), View (hairline right)
      7. `SplashHoseLoaderView` (width=min(320dp, 84% screen width), centered horizontally, bottom = 9% height + 8dp + navigationBarInset, id=loaderView)
      8. View for exit veil (match_parent, id=exitVeil, background=#111111, alpha=0)
      All views start alpha=0 except background and smoke. Remove all existing splash elements (arc, ring, ember container, old loading bar).
      Files: `app/src/main/res/layout/activity_splash.xml`
      Verify: Build and inflate layout in Android Studio layout preview - no errors, all views present.

- [ ] 8. Create drawable resources for tagline hairlines and bottom scrim
      Create `app/src/main/res/drawable/splash_tagline_hairline_left.xml` (shape gradient horizontal from transparent to white alpha 0.4), mirrored version for right. Create `app/src/main/res/drawable/splash_bottom_scrim.xml` (shape gradient vertical from transparent at top to #DD050506 at bottom, height=match_parent).
      Files: 
      - `app/src/main/res/drawable/splash_tagline_hairline_left.xml` (new)
      - `app/src/main/res/drawable/splash_tagline_hairline_right.xml` (new)
      - `app/src/main/res/drawable/splash_bottom_scrim.xml` (new)
      Verify: Reference in layout preview, gradients render correctly.

- [ ] 9. Rewrite SplashActivity.kt with Choreographer-based animation driver
      Complete rewrite of `app/src/main/java/com/hookahdrop/app/SplashActivity.kt`. Initialize AndroidX SplashScreen with `installSplashScreen()` before `setContentView`. Setup edge-to-edge with WindowInsetsController (light status bar icons, transparent bars). Choreographer.postFrameCallback loop with delta time tracking. Implement theme color cycle: targets = [gold, rose, lime, royal, ice blue] at [0.9s, 2.9s, 4.9s, 6.9s], exponential smoothing `currentColor += (targetColor - currentColor) * (1 - pow(1 - 0.018, dt/16.67))` per frame, propagate to all views via `updateThemeColor(color)`. Timeline from spec (see section 11 of KIRO-PROMPT-splash.md): smoke fade-in, orbs/aura entrances, logo reveal with blur (RenderEffect API 31+, else scale+fade only), tagline fade + hairline growth, loader progress `p(t)` with designed curve, particle emissions, logo float + light sweep (every 5s starting 2.4s - use offscreen layer + SrcAtop blend for sweep on logo only), exit sequence at 9.2s (logo scale+blur+fade, loader slide, veil fade, spark burst), navigate at 10.6s to HomeActivity or OnboardingActivity via SessionManager check with FLAG_ACTIVITY_NEW_TASK | FLAG_ACTIVITY_CLEAR_TASK, call finish(). Handle reduce-motion (Settings.Global.ANIMATOR_DURATION_SCALE <= 0.5): skip particles, loops, show static logo/tagline/loader with real progress, short fade only. Pause Choreographer callback in onPause, resume in onResume. Cancel all animations in onDestroy. Keep constants: `COLOR_STEP_MS = 2000`, `COLOR_SMOOTH = 0.018`, `TOTAL_DURATION = 10600L`.
      Files: `app/src/main/java/com/hookahdrop/app\SplashActivity.kt`
      Verify: Run on Pixel 6 API 33 emulator, full animation plays for 10.6s, navigates to HomeActivity or OnboardingActivity, Back button does not return to splash.

- [ ] 10. Implement logo light sweep animation
      In SplashActivity animation loop, at t=2.4s start first sweep, repeat every 5s. Use offscreen bitmap layer: draw logo into layer, draw diagonal white gradient band (45% logo width, transparent → white alpha 0.9 → transparent, rotated 105°) moving left to right over 1.4s with BlendMode.SrcAtop so band only shows on logo pixels. Apply to logo ImageView via custom Drawable or Canvas overlay. This requires extending logo rendering or using a custom view wrapper.
      Files: `app/src/main/java/com/hookahdrop/app/SplashActivity.kt` or new `SplashLogoView.kt` if needed
      Verify: Watch logo during splash, white sweep moves across it every 5 seconds starting at 2.4s.

- [ ] 11. Build and run initial verification on Pixel 6 emulator
      Build APK with `./gradlew assembleDebug`, install to Pixel 6 API 33 emulator (`adb install -r app/build/outputs/apk/debug/app-debug.apk`), launch app. Full splash should play, navigate away, Back should not return. Check logcat for errors.
      Files: N/A (verification step)
      Verify: App runs, splash plays ~10.6s, navigates correctly. No crashes in logcat.

- [ ] 12. Take reference screenshots at specified timestamps
      Use `adb shell screencap` or Android Studio screenshot tool at t=0.7, 1.5, 2.6, 4.0, 6.0, 8.0, 9.6, 10.8 seconds. Manually trigger screenshots by tapping emulator screen or using timestamp-based automation script. Compare pixel-by-pixel with reference frames in `hookaDrop App/hookadrop-splash-kiro-pack/frames/` (splash_t00.7s.png, splash_t01.5s.png, etc). List every visual difference: color mismatch, size, position, particle density, etc.
      Files: N/A (verification step)
      Verify: Screenshots captured, differences documented in a comparison checklist.

- [ ] 13. Fix visual discrepancies found in screenshot comparison
      Iteratively adjust timing constants, colors (ensure RGB values match spec exactly: gold [201,162,39], rose [232,92,112], lime [168,214,84], royal [78,124,232], ice [40,170,230]), sizes (logo 232×252dp, orbs 340/300/380dp, aura 380dp), positions (logo center 50%w/40%h, tagline +156dp from logo center, loader bottom 9%h+8dp), particle emission rates, alpha values, blend modes until screenshots match reference frames within anti-aliasing tolerance. Re-screenshot after each fix iteration.
      Files: All custom views and SplashActivity.kt as needed
      Verify: New screenshots match reference frames except for minor anti-aliasing and font rendering differences. Document remaining differences with technical reasons.

- [ ] 14. Run on 360x640 emulator and adjust for small screens
      Create or use existing small-screen emulator (360x640dp). Run splash, verify nothing clipped, loader above nav bar, particle emission reduced by 50%. Adjust layout constraints or programmatic positioning if needed (use screen height/width checks in code).
      Files: Layout or View classes as needed
      Verify: Splash renders correctly on 360x640, no clipping, loader visible and positioned correctly.

- [ ] 15. Measure performance with Android Studio Profiler or gfxinfo
      While splash is running on Pixel 6 emulator, run `adb shell dumpsys gfxinfo com.hookahdrop.app` to get frame stats. Parse "Janky frames" percentage (target <5%). Alternatively, use Android Studio Profiler CPU/GPU recording during splash. Log current particle count in SplashParticleView and confirm max is ≤340. If jank >5%, optimize: reduce particle count, cache more bitmaps, remove allocations, simplify gradients.
      Files: N/A (profiling step)
      Verify: Jank percentage ≤5%, max particle count ≤340 logged in logcat or profiler.

- [ ] 16. Verify acceptance checklist from spec section 13
      Go through each item:
      - [ ] No circles/rings/shockwaves/bubbles/rosette/rays, no extra text under logo
      - [ ] Smoke visible on sides, tinted by theme color, fading toward bottom, no black box
      - [ ] Color transitions take ~3s, final color is ice blue
      - [ ] Logo uses real PNG, reveals from blur (API 31+), floats, light sweep every 5s
      - [ ] Tagline hairlines do NOT overlap text (12dp gap)
      - [ ] Hose loader visible: percentage 28sp right, status text left, flow+head along hose reaching mouthpiece at 100%
      - [ ] Particle load smooth 60fps, ≤340 particles
      - [ ] Exit at 9.2s, Landing opens, Back does not return to splash
      - [ ] Works on 360×640, 393×851, 412×915dp, no clipping, loader above nav bar
      Files: N/A (verification checklist)
      Verify: All items checked off with notes on any that cannot be fully met (e.g., blur only on API 31+).

- [ ] 17. Final documentation and cleanup
      Write summary document at `.agents/tasks/splash-implementation-summary.md` with:
      - (a) Files created/changed (list all)
      - (b) Constants: COLOR_STEP_MS=2000, COLOR_SMOOTH=0.018, TOTAL_DURATION=10600ms
      - (c) Acceptance checklist with ✔/✘ for each item
      - (d) Jank measurement result from step 15
      - (e) Any visual differences from reference frames that could not be removed, with technical explanations (e.g., "Particle random seed differs", "Blur unavailable on API 24-30", "Font weight 800 not available in system font, used 700")
      Remove any debug logs, temporary test activities, unused imports. Ensure code is clean and follows project Kotlin style.
      Files: All implementation files, plus `.agents/tasks/splash-implementation-summary.md` (new)
      Verify: Document is complete, code is clean, ready for review.

---

## Key Technical Decisions

1. **BlendMode API Compatibility (API 24-28)**: Use runtime SDK check. On API 29+, use BlendMode.Screen/Color/SrcAtop/Plus. On API 24-28, fall back to PorterDuff modes (Screen, Multiply approximation for Color, SrcAtop, Add for Plus) or ColorMatrix for tinting. Test on API 24 emulator.

2. **RenderEffect Blur (API 31+)**: Logo blur reveal only works on API 31+. On API 24-30, use scale+fade entrance without blur. Document this in acceptance checklist.

3. **Choreographer vs ValueAnimator**: Use Choreographer.postFrameCallback for the main animation driver (single frame clock, delta time) driving theme color, progress curve, particle updates. Use ValueAnimators only for view-specific animations (orb drifts, aura breathing, logo float) that Android handles efficiently.

4. **Particle Optimization**: Pre-render a single 64x64 soft radial gradient sprite (white) at init, draw it scaled and tinted per particle instead of creating new gradients. Use object pooling for particle structs (FloatArray or data class pool) to avoid GC pressure. Clip particle rendering to visible screen bounds.

5. **SVG Path Parsing**: Use `androidx.core.graphics.PathParser.createPathFromPathData()` (available in AndroidX) for the hose SVG path. Measure with PathMeasure to get length and getPosition for head dot. Cache the path and PathMeasure instance.

6. **Tagline Hairlines Positioning**: Use a horizontal LinearLayout: [hairline View 34dp wide] [12dp spacer] [TextView] [12dp spacer] [hairline View 34dp wide]. Animate hairline scaleX from 0 to 1 growing outward (set pivot to inner edge).

7. **Progress Curve Implementation**: The spec's p(t) formula is piecewise. Store as a function: `fun progressForTime(t: Float): Float` implementing the exact math. This decouples visual progress from any real loading (which is handled separately via the background API ping).

8. **Exit Navigation**: Use `Intent(this, destination).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK }` then `startActivity()` and `finish()` to ensure splash is removed from back stack and Landing is root.

9. **Reduce Motion Handling**: Check `Settings.Global.getFloat(contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE)` at splash start. If ≤0.5, set a boolean flag and skip: particle emissions, orb/aura animations, logo float/sweep, color cycling (use static ice blue). Show logo/tagline/loader immediately, use real loading progress if available, navigate when ready (min 1s).

10. **Color Smoothing Frame Rate Independence**: The spec's `0.018` smoothing is per-60fps-frame. Convert to frame-rate independent: `smoothed += (target - smoothed) * (1 - Math.pow(1 - 0.018, deltaTimeMs / 16.67))`. This ensures consistent behavior at variable frame rates.

---

## Build and Verification Commands

**Build APK**:
```bash
cd "c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop"
./gradlew assembleDebug
```

**Install to emulator**:
```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

**Screenshot at specific time** (manual timing):
```bash
# Launch app, wait for timestamp, then:
adb exec-out screencap -p > splash_t00.7s_actual.png
```

**Performance check**:
```bash
adb shell dumpsys gfxinfo com.hookahdrop.app reset  # Reset stats
# Run splash animation once
adb shell dumpsys gfxinfo com.hookahdrop.app
# Look for "Janky frames: X (Y%)" in output
```

**Check current package/activity**:
```bash
adb shell dumpsys activity activities | grep mResumedActivity
```

---

## Files Summary

**New Files** (10):
- `app/src/main/res/drawable-nodpi/logo_hookadrop.png`
- `app/src/main/java/com/hookahdrop/app/view/SplashOrbsView.kt`
- `app/src/main/java/com/hookahdrop/app/view/SplashParticleView.kt`
- `app/src/main/java/com/hookahdrop/app/view/SplashHoseLoaderView.kt`
- `app/src/main/res/drawable/splash_tagline_hairline_left.xml`
- `app/src/main/res/drawable/splash_tagline_hairline_right.xml`
- `app/src/main/res/drawable/splash_bottom_scrim.xml`
- Possibly `app/src/main/java/com/hookahdrop/app/view/SplashLogoView.kt` (if logo sweep needs custom view)
- `.agents/tasks/splash-implementation-summary.md`

**Modified Files** (5):
- `app/build.gradle` (add AndroidX SplashScreen dependency)
- `app/src/main/res/values/themes.xml` (configure splash theme)
- `app/src/main/res/layout/activity_splash.xml` (complete replacement)
- `app/src/main/java/com/hookahdrop/app/view/SmokeBackgroundView.kt` (add updateThemeColor method)
- `app/src/main/java/com/hookahdrop/app/SplashActivity.kt` (complete rewrite)

**Verified Existing Files** (keep unchanged):
- `app/src/main/res/drawable-nodpi/bg_smoke.png` (verify/replace)
- `app/src/main/res/anim/nav_enter.xml`
- `app/src/main/res/anim/nav_exit.xml`
- `com.hookahdrop.app.data.SessionManager` (use for login check)
- `com.hookahdrop.app.HomeActivity` (navigation target)
- `com.hookahdrop.app.OnboardingActivity` (navigation target)

---

## Constants Reference

```kotlin
// SplashActivity.kt
const val COLOR_STEP_MS = 2000L           // Time between color target changes
const val COLOR_SMOOTH = 0.018f           // Exponential smoothing factor (per 60fps frame)
const val TOTAL_DURATION_MS = 10600L      // Total splash duration
const val EXIT_START_MS = 9200L           // When exit sequence begins
const val NAVIGATION_MS = 10600L          // When to navigate away

// Theme colors RGB (order: gold, rose, lime, royal blue, ice blue)
val COLOR_GOLD = Color.rgb(201, 162, 39)
val COLOR_ROSE = Color.rgb(232, 92, 112)
val COLOR_LIME = Color.rgb(168, 214, 84)
val COLOR_ROYAL = Color.rgb(78, 124, 232)
val COLOR_ICE = Color.rgb(40, 170, 230)
val THEME_COLORS = listOf(COLOR_GOLD, COLOR_ROSE, COLOR_LIME, COLOR_ROYAL, COLOR_ICE)
val COLOR_CHANGE_TIMES_MS = listOf(900L, 2900L, 4900L, 6900L)  // When target switches
```

---

## Testing Matrix

| Device Config | Resolution | API Level | Expected Behavior |
|---|---|---|---|
| Pixel 6 | 393×851 dp | 33 | Full animation with blur, Screen blend, all particles |
| Small phone | 360×640 dp | 33 | Full animation, 50% particle emission, no clipping |
| Pixel 6 | 393×851 dp | 31 | Full animation with blur (RenderEffect) |
| Older device | 393×851 dp | 24 | No blur (scale+fade only), PorterDuff fallback, ColorMatrix tint |
| Any | Any | Any with reduce-motion ON | Static logo/tagline/loader, no particles/loops, short fade only |

---

## Open Questions / Risks

1. **Logo light sweep complexity**: Drawing sweep with SrcAtop blend only on logo pixels requires offscreen layer. If ImageView doesn't support custom drawing easily, may need custom SplashLogoView wrapping ImageView + Canvas overlay. Fallback: skip sweep if too complex (note in final doc).

2. **PathParser availability**: `androidx.core.graphics.PathParser` is in AndroidX but may require specific version. If unavailable, manually parse SVG path to Path using cubicTo/quadTo (tedious but possible). Verify during step 6.

3. **Particle performance on low-end devices**: Target is 60fps with ≤340 particles. If actual device jank >5%, may need to reduce max particles to 200 or simplify sprite. Test on multiple emulator configs.

4. **Screenshot timing accuracy**: Taking screenshots at exact timestamps (0.7s, 1.5s, etc) requires manual timing or automation script. Manual is error-prone. Consider adding debug overlay showing elapsed time, or use `adb shell input tap` automation with delays.

5. **Color space differences**: Reference frames may be in sRGB, emulator screenshots in Display P3 or other. May cause minor color differences that can't be fixed. Document if found.

---

**Plan complete. Ready for implementation.**
