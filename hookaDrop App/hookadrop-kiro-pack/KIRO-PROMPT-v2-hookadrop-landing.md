# KIRO TASK v2 — Rebuild the HookaDrop landing screen (Android) so it matches the reference EXACTLY

This file REPLACES the previous prompt. Ignore the previous one.

## 0. Why your first attempt failed (fix ALL of these)
Your first build was wrong in four ways. Do not repeat them:
1. **You redrew the hookah with primitive shapes** (big filled circle for the water, rectangles, a trapezoid). FORBIDDEN. The real artwork is supplied as PNG layers in `assets/`. Use them. Do not draw the hookah in code.
2. **The background glows are hard-edged flat circles.** They must be soft radial-gradient glows that fade to fully transparent at the edge (no visible outline, no flat fill, no blur filter needed). See section 5.
3. **The text block overflowed the screen**: the title was cut by the system bar and the services row + button were not visible at all. The layout must be a fixed-height column where the hookah shrinks to fit (section 3). Nothing may be clipped on a 360x740 dp phone or a 412x915 dp phone.
4. **Wrong overall look**: the screen must look like `reference_390x844_ice-blue.png` (and `reference_390x844_gold.png` 4 s later). Compare your result to these images and iterate until they match. Do not stop at "roughly similar".

## 1. Files you were given
```
assets/hk_back.png        hookah body without water (bowl, tray, stem, empty glass vase)   960x1680
assets/hk_front.png       parts drawn IN FRONT of the water (stem inside vase, glass highlights, gold rings, hose, mouthpiece)  960x1680
assets/hk_vase_mask.png   white silhouette of the vase = clip mask for the water            960x1680
assets/hk_wave_a.png      white wave band, 40% alpha, 1440x1680 (wider than the others)
assets/hk_wave_b.png      white wave band, 22% alpha, 1440x1680 (wider than the others)
assets/hk_coal.png        the 3 glowing coals                                              960x1680
assets/hk_glow.png        orange aura around the coals                                      960x1680
assets/hk_preview_full.png  all layers composed (for visual comparison only, do not ship)
assets/svg/*.svg          same layers as vector sources
hookadrop-landing-F-pro.html   the live reference (open it in Chrome, device toolbar 390x844)
reference_390x844_*.png        screenshots to match
```
Every 960x1680 layer shares the SAME canvas and origin (aspect ratio 240:420). Stack them at the same position/size and they line up perfectly. Android: put them in `res/drawable-nodpi/` (Flutter: `assets/` + pubspec). Keep the logo asset the project already has if there is one; the top wordmark is TEXT (below).

## 2. Hookah layer stack (bottom to top), all same size/position
Let `W` = rendered width of the hookah box, `k = W / 240` (px per design unit).
1. `hk_glow` — flickers (alpha .55 to 1, scale .94 to 1.1 around its center, 1.9 s ease-in-out alternate infinite)
2. `hk_back`
3. WATER (see below) clipped to `hk_vase_mask`
4. `hk_front`
5. `hk_coal` — brightness pulse .85 to 1.35, 1.4 s alternate infinite (use a ColorMatrix scale or an overlay with alpha pulse)
6. bubbles (drawn in code, inside the vase only)
7. smoke + sparks (canvas, section 6)

**Water** = `hk_wave_a` + `hk_wave_b`, both tinted with the current theme color (`SrcIn` color filter: keeps their alpha, replaces RGB), drawn inside an offscreen layer and then masked by `hk_vase_mask` with `BlendMode.DstIn`.
- The wave images are 360 design units wide and start at x = -80 units, so draw them at `left = -80*k`, width `360*k`, height `420*k`.
- Wave A: translateX from 0 to `-40*k`, 2600 ms, linear, infinite (seamless: the pattern repeats every 40 units).
- Wave B: translateX from `-40*k` to 0 (reverse), 3800 ms, linear, infinite.
- Water color transition: 1100 ms.

**Bubbles** (white 12% fill, white 70% stroke 0.7 unit): 5 circles starting near (120,358)/(118,360)/(123,358)/(120,360)/(121,359) in design units, radii 3/2/2.6/1.8/2.2, each rising 40 units while drifting x by -6/+8/-10/+5/+12 units, scale .5 to 1.15, alpha 0 to .9 (at 15%) to 0, durations 2.4/2.0/2.8/1.9/2.5 s, delays 0/.7/1.3/.3/1.8 s, ease-in, infinite.

### Compose sketch (adapt if the project uses XML Views / Flutter / RN)
```kotlin
@Composable fun Hookah(theme: Color, modifier: Modifier) {
  val t = rememberInfiniteTransition()
  val a by t.animateFloat(0f, -40f, infiniteRepeatable(tween(2600, easing = LinearEasing)))
  val b by t.animateFloat(-40f, 0f, infiniteRepeatable(tween(3800, easing = LinearEasing)))
  val glowA by t.animateFloat(.55f, 1f, infiniteRepeatable(tween(1900), RepeatMode.Reverse))
  BoxWithConstraints(modifier.aspectRatio(240f/420f)) {
    val k = constraints.maxWidth / 240f   // px per unit
    Image(painterResource(R.drawable.hk_glow), null, Modifier.fillMaxSize().alpha(glowA))
    Image(painterResource(R.drawable.hk_back), null, Modifier.fillMaxSize())
    Canvas(Modifier.fillMaxSize().graphicsLayer(compositingStrategy = CompositingStrategy.Offscreen)) {
      drawWave(waveA, -80*k + a*k, theme); drawWave(waveB, -80*k + b*k, theme)   // ColorFilter.tint(theme, BlendMode.SrcIn)
      drawImage(vaseMask, blendMode = BlendMode.DstIn)
    }
    Image(painterResource(R.drawable.hk_front), null, Modifier.fillMaxSize())
    Image(painterResource(R.drawable.hk_coal), null, Modifier.fillMaxSize()) // + brightness pulse
  }
}
```
Use `ContentScale.FillBounds` and decode once (`ImageBitmap`) so scrolling/animation stays at 60 fps. The same idea works in Flutter with `ShaderMask(blendMode: BlendMode.dstIn)` or a `CustomPainter` with `saveLayer`.

## 3. Screen layout (this is what prevents the overflow)
Root: `Box`, background `#111111`, edge-to-edge, content padding = status bar inset (top) + nav bar inset (bottom) + 20 dp. Children:
```
Column(fillMaxSize, horizontalAlignment = CenterHorizontally) {
  Wordmark                       // wrap content, ~44 dp tall incl. padding
  Box(Modifier.weight(1f))       // HOOKAH AREA: takes ALL leftover height
     { Hookah(...) height = fillMaxHeight, keep aspect 240:420, centered, aligned to top }
  TextBlock                      // wrap content, ALWAYS fully visible
}
```
- The hookah area uses `weight(1f)`; the hookah scales DOWN to fit (it may overlap the text block by at most 8 dp at the bottom, with the scrim covering that overlap). It is never allowed to push the text block off screen.
- TextBlock (centered, horizontal padding 24 dp): eyebrow, title, lead, services row, CTA, in that order, bottom padding 20 dp + nav inset.
- If `screenHeightDp < 760`: hide eyebrow, title 25 sp. `< 680`: hide lead and service subtitles, icon circles 44 dp, title 23 sp, CTA 52 dp. `< 600`: hide the services row.
- Test on 360x640, 360x740, 393x851, 412x915. In every case: wordmark, title, services, button fully visible, hookah visible and large.

## 4. Typography and content (exact)
Font Manrope (add via Google Fonts / downloadable fonts; fallback Inter, then system sans).
- **Wordmark**: `HOOKADROP`, 14 sp, weight 800, letter-spacing 0.26 em, centered, NO ICON. `HOOKA` white, `DROP` = theme color (animated 1 s).
- **Eyebrow**: `PREMIUM HOOKAH EXPERIENCE`, 10 sp, uppercase, letter-spacing 0.26 em, color `#9AA1A9`, a 34 dp fading hairline on each side (gradient transparent to white 35%, mirrored on the right).
- **Title**: 27 sp, weight 800, line-height 1.12, letter-spacing -0.02 em, centered, white, exactly: `The experience you've` / `been waiting` (theme color, animated) `for`.
- **Lead**: 13 sp, line-height 1.5, color `#9AA1A9`, max width 300 dp, centered: `Buy or rent your favorite hookah with fast home delivery.`
- **Services row**: 3 equal columns, thin vertical divider between them (1 dp, gradient transparent to white 16% to transparent, 8 dp inset top/bottom). Each column: circle 52 dp (1 dp border = theme at 45% alpha, fill = theme at 12% alpha, glow shadow theme 18%), icon 24 dp stroke 1.7 round caps in theme color, then bold white title 12 sp (single line), then subtitle 10.5 sp `#9AA1A9`.
  - Fast Delivery / To your door (truck)
  - Premium Products / 100% Authentic (diamond)
  - 24/7 Support / Always here for you (headset)
  The icon paths are in the reference HTML (24x24 viewBox) — convert them to VectorDrawables.
- **CTA**: full width, 56 dp high, fully rounded, white `#FFFFFF`, text `Let's Get Started` 15 sp weight 800 color `#111111` + arrow icon (18 dp), gap 10 dp. Shadow = theme at 25%, blur 30, y 10.

## 5. Background (soft glows, NOT circles)
Layers behind the hookah, all full-screen, no hit testing:
- **Aura**: a radial gradient (`Brush.radialGradient`) centered at 50% x / 40% y, radius ≈ 48% of the screen width horizontally and 26% of height vertically (use a scaled/elliptical draw), theme color alpha .28 at the center fading to 0 at the edge. Brightness breathing .8 to 1.35, 6 s ease-in-out alternate infinite. Color transition 1.1 s.
- **3 orbs**: each is a radial gradient from theme color (alpha .30 / .22 / .18 at center) to fully transparent at the edge, so there is NO visible edge. Diameters ≈ 260 / 220 / 300 dp at (left -70 dp, top 6%), (right -80 dp, top 30%), (left 25%, bottom -120 dp). They drift slowly with translate + scale, alternate infinite: orb1 to (+90,+120) dp scale 1.25 in 13 s; orb2 to (-110,-90) dp scale .85 in 17 s; orb3 to (-80,-70) dp scale 1.2 in 15 s. Color transition 1.6 s.
- **Bottom scrim**: vertical gradient over the lower 56% of the screen: transparent to `rgba(7,7,8,.82)` at 38% to `rgba(5,5,6,.96)`.
- **Hookah drop shadow**: soft black shadow under the whole hookah (`0 18 24 rgba(0,0,0,.6)` equivalent).

## 6. Smoke and sparks (port the JS literally)
Port the block commented `/* smoke canvas */` in the reference HTML to a Compose `Canvas` / Flutter `CustomPainter` driven by a frame clock. Keep the numbers: max 110 smoke particles; emission from the coal bowl at design point (120,34) and a wisp from the mouthpiece at (200,404); sparks (1.1 px orange dots `#FF9A3C`, additive) from (105..135, 40); particle sprite = radial gradient tinted halfway between the theme color and a pale blue `(205,222,244)`; smoke drawn with `BlendMode.Screen`, sparks with `BlendMode.Plus`; particle alpha = sin(pi * life) * a. Render at half resolution if needed for performance. Pause when the app is paused. Convert the JS px values to dp.

## 7. Theme color auto-cycle (there is NO flavor selector)
`COLOR_DELAY = 4000` ms (single constant). Colors in order, looping: `#28AAE6`, `#C9A227`, `#E85C70`, `#4E7CE8`, `#A8D654`. First change after 4 s. Every themed element animates to the next color with its own duration (wordmark DROP and title word 1 s, water/aura 1.1 s, orbs 1.6 s, service icons 1 s, smoke lerps 5% per frame). Themed elements: DROP, "been waiting", water, aura, orbs, service icons and circles, CTA shadow, ripple, smoke tint. If the OS "remove animations" setting is on: no cycling, no loops, first color only.

## 8. Entrance + interactions
Entrance (fade + translateY 22 dp to 0, 850 ms, `CubicBezier(.22,1,.36,1)`): wordmark 0.3 s, hookah 0.55 s (1.4 s duration, from translateY 34 dp, scale .96), eyebrow 1.65 s, title 1.72 s, lead 1.8 s, services 1.88 s, CTA 1.96 s. A light sweep crosses the CTA twice from 2.8 s.
- **CTA press**: scale .96; theme-colored circular ripple from the touch point (0.7 s, fades out); light haptic; 40 smoke puffs from the bowl; then leave transition. Idle: the arrow nudges 4 dp every 1.8 s starting at 3.5 s.
- **Leave transition (900 ms)**: text block fades out and slides down 26 dp (0.5 s); hookah scales to 1.16, moves up 12 dp and fades (0.8 s); black veil fades in; then navigate to the existing Home screen. Replace the landing in the back stack (back must NOT return to it).
- **Service tap**: icon circle pops (scale 1.22 and back, 450 ms), a ring expands and fades (scale 1 to 1.9, 700 ms), 8 smoke puffs, light haptic. On devices with a pointer/hover: circle lifts 4 dp + scale 1.12.
- **Hookah tap**: 12 smoke puffs from the bowl + light haptic.

## 9. Rules
- Touch ONLY this screen, its assets, and shared constants/theme if needed. Do not change navigation elsewhere.
- No third-party animation library unless the project already uses one.
- Performance: no allocations inside draw loops, decode bitmaps once, target 60 fps on a mid-range phone.
- Accessibility: hookah `contentDescription = "Premium hookah"`, services are buttons with visible focus, text contrast kept.

## 10. Verification (you must do this before saying "done")
1. Build and run on an emulator (Pixel 6, 393x851) AND a small one (360x640).
2. Take a screenshot at t = 3.5 s and at t = 7.5 s and compare with `reference_390x844_ice-blue.png` and `reference_390x844_gold.png`. List every visible difference, then fix them. Repeat until the only differences are font anti-aliasing.
3. Checklist (all must be true): hookah is the real artwork (not shapes) | no hard-edged circles in the background | wordmark centered with no icon, DROP follows the theme | title, 3 services and the button are fully visible and nothing is clipped | water shows two moving waves inside the glass only | smoke rises from the coals | colors cycle every 4 s | CTA ripple + leave transition open Home and back does not return.
4. Final message: list files changed, the color delay constant, and any difference you could not remove (with the reason).
