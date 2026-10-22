# KIRO TASK — Replace the HookaDrop SPLASH screen (Android) with the new animated splash

Read this whole file before writing code. Follow it literally. When something is unclear, open `hookadrop-splash-preview.html` in Chrome (device toolbar 390x844, click "Replay" to rerun) — it is the working reference. Ignore the "Replay" button itself, it is only for the preview.

## 0. Files in this pack
```
hookadrop-splash-kiro-pack/
  KIRO-PROMPT-splash.md              this specification
  hookadrop-splash-preview.html      live reference (all animations)
  frames/splash_t00.7s.png ... splash_t10.8s.png   screenshots of the reference at 0.7, 1.5, 2.6, 4.0, 6.0, 8.0, 9.6, 10.8 s
  assets/logo_hookadrop.png          the real logo, transparent background (721x950)
  assets/bg_smoke.png                the smoke image (1024x1536, opaque black background, blue/white smoke on the edges)
```
Copy `logo_hookadrop.png` and `bg_smoke.png` unchanged to `res/drawable-nodpi/` (lowercase names). If the project already contains the same logo, use the file from this pack anyway. Decode each bitmap ONCE (downsample the smoke to about the screen width).

## 1. Step 0 — inspect the project
Find the current splash screen/activity, the stack (Jetpack Compose / XML Views / Flutter / React Native), the navigation to the Landing screen, and any existing components made for the new Landing page (a `SmokeBackground` composable, a theme color cycle, color constants). Reuse them when they exist, otherwise create them. Do not add a new framework or animation library. Do not touch other screens.

## 2. What the splash must do (overview)
Total duration about 10.6 s: the app content loads while the splash plays. Dark background `#111111`, edge-to-edge. A tinted animated smoke background, soft glows, the logo appears from blur, a tagline, a hookah-hose loading bar with a big percentage and a changing status text, then a graceful exit into the Landing screen. The theme color slowly changes over time and ends on ice blue — the same first color as the Landing page, so both screens connect.

IMPORTANT — things that must NOT exist (they were removed on purpose, do not build them): any ring/arc/circle drawn around the logo, orbiting dot, dashed rotating ring, shockwave circles, glowing expanding ball, geometric rosette/star pattern, light rays, water bubbles, smoke rings, separate "HOOKADROP" text under the logo (the logo already contains the name).

## 3. Layers, bottom to top
1. Background `#111111`.
2. **Smoke background** (screen blend, tinted, faded at the bottom).
3. **Orbs** (3 soft radial glows) and **aura** (radial glow behind the logo).
4. **Bottom scrim** (readability for the loader).
5. **Particle canvas** (smoke wisps, plumes, embers, gold dust, a few sparks).
6. **Logo** with float + light sweep.
7. **Tagline**.
8. **Loader** (status text, percentage, hose bar).
9. **Exit veil** (`#111111`).

## 4. Theme color cycle (single source of truth)
Colors in order (RGB): gold `[201,162,39]`, rose `[232,92,112]`, lime `[168,214,84]`, royal blue `[78,124,232]`, ice blue `[40,170,230]`.
- t < 0.9 s: gold. Then the TARGET color changes at t = 0.9 s (rose), 2.9 s (lime), 4.9 s (royal), 6.9 s (ice blue), and stays ice blue until the end (`STEP = 2000 ms`, `FIRST = 900 ms`).
- The current color moves toward the target with exponential smoothing: every 60 fps frame `col += (target - col) * 0.018` (frame-rate independent: `1 - (1 - 0.018)^(dt/16.67)`). This makes every transition slow (about 3 s) and soft. Keep these two numbers as constants (`COLOR_STEP_MS = 2000`, `COLOR_SMOOTH = 0.018`).
- Every themed element reads the SAME animated color: smoke tint, orbs, aura, logo glow, loader hose flow and percentage glow, canvas particles.
- At the end of the splash, expose the final ice-blue color so the Landing starts with it.

## 5. Smoke background (reuse the Landing's SmokeBackground if it exists, extended with these parameters)
- Two copies of `bg_smoke.png`, both drawn with `BlendMode.Screen` inside an offscreen layer, so the black of the image vanishes and only the smoke shows.
  - Layer A: alpha .60, size 120% of the screen (offset -10%, -10%). Infinite alternate ease-in-out, 22 s: translateY +4% to -4% of the screen height, scale 1.10 to 1.24, rotation -2 deg to +2 deg.
  - Layer B: mirrored horizontally, alpha .42, same size. Infinite alternate ease-in-out, 31 s: translate (-2%,-3%) to (+2%,+3%) of the screen, scale 1.22 to 1.08, rotation +2 deg to -2 deg.
- **Tint:** over both layers, fill the screen with the current theme color using `BlendMode.Color` at alpha .75 (black stays black, smoke takes the theme color).
- **Bottom fade:** vertical mask on the whole smoke group: fully opaque down to 40% of the screen height, then fading to alpha .18 at the very bottom (`DstIn` with a vertical gradient).
- The whole group fades in from 0 to 1 over 1.4 s at the start.

## 6. Orbs and aura (soft radial gradients, NO visible edges, no flat circles, no blur filter)
- Orbs: radial gradient from theme color alpha .34 at the center to alpha 0 at 68% of the radius. Fade in 1.6 s starting at 0.2 s.
  - Orb 1: 340 dp, left -120 dp, top 4% of the screen height; drifts by (+90, +120) dp and scale 1.25 over 13 s, alternate infinite.
  - Orb 2: 300 dp, right -130 dp, top 34%; drifts (-110, -90) dp, scale .85, 17 s, alternate infinite.
  - Orb 3: 380 dp, left 18%, bottom -170 dp; drifts (-80, -70) dp, scale 1.2, 15 s, alternate infinite.
- Aura: 380 dp, centered at 50% width / 40% height. Radial gradient: theme alpha .34 at center, .12 at 42% radius, 0 at 70% radius. Entrance: from alpha 0 + scale .4 to alpha 1 + scale 1, 1.6 s starting at 0.6 s (cubic-bezier(.22,1,.36,1)). Then it breathes forever: brightness .8 to 1.4 (alpha multiplier), 5 s ease-in-out alternate, starting at 2.2 s.
- Bottom scrim: vertical gradient transparent from 0% to 55% of the height, then to `rgba(5,5,6,.85)` at the bottom.

## 7. Logo
- Center point = 50% width / 40% height. The logo image is drawn at 232 x 252 dp (aspect kept, centered on that point).
- Entrance: starts at 0.8 s, duration 1.3 s, `cubic-bezier(.22,1,.36,1)`: alpha 0 to 1, scale .70 to 1, blur 14 dp to 0 (use `RenderEffect.createBlurEffect` on API 31+, otherwise fade+scale only).
- Float: from 2.2 s forever, translateY 0 to -5 dp, 4.2 s ease-in-out alternate.
- Glow: a soft shadow/glow behind the logo tinted with the theme color, alpha .35, radius 18 dp.
- **Light sweep:** every 5 s, first one at 2.4 s: a diagonal white band (about 45% of the logo width, gradient transparent -> white alpha .9 -> transparent, tilted 105 deg) moves from left of the logo to the right edge in 1.4 s (the band is only visible ON the logo pixels: draw the logo into an offscreen layer then draw the band with `BlendMode.SrcAtop`), then rests until the next cycle.

## 8. Tagline
Text `PREMIUM HOOKAH EXPERIENCE`, 10 sp, uppercase, letter-spacing 0.26 em, color `#9AA1A9`, centered at 40% height + 156 dp. Hairlines on both sides (34 dp wide, 1 dp, gradient from transparent to white alpha .4, mirrored on the right), placed OUTSIDE the text with a 12 dp gap so they never overlap the letters. Text fades in over 0.9 s starting at 2.4 s; the hairlines grow from the text outward (scaleX 0 to 1) over 0.9 s starting at 2.5 s.

## 9. Loader (hose bar) — bottom of the screen
Container: width = min(320 dp, 84% of screen width), centered, bottom edge at 9% of the screen height + 8 dp (respect the navigation-bar inset). Fades in over 0.8 s starting at 0.5 s.
- **Top row:** left = status text (11 sp, uppercase, letter-spacing .2 em, color `#D3D8DE`); right = percentage (28 sp, weight 800, white, tabular figures, text glow = theme color at alpha .75, radius 18).
- Status text by progress `p` (0..1): `p < .28` "Lighting the coals"; `p < .55` "Filling the water"; `p < .82` "Choosing your flavor"; else "Almost ready". Cross-fade (150 ms) when it changes.
- **Hose drawing:** canvas 320 x 56 design units scaled to the container width. One path, drawn 4 times with round caps (path data, SVG syntax, parse it with `androidx.compose.ui.graphics.vector.PathParser` or equivalent):
  `M12 40C50 40 62 14 104 16S168 46 214 38S268 12 292 22`
  1. Gold rim: stroke `#C9A227`, width 14, alpha .75.
  2. Hose body: stroke `#0A0A0A`, width 10.
  3. Ribs: stroke white alpha .14, width 10, dashed `[1.5, 5]` butt cap.
  4. **Progress flow:** stroke = current theme color, width 4, round cap, drawn only from 0 to `p * pathLength` (use `PathMeasure.getSegment`), with a glow: same stroke redrawn 2 times underneath with width 8 alpha .5 and width 14 alpha .25 (soft glow).
  - Head: a white dot, radius 4.5, with a theme-color glow, centered at `PathMeasure.getPosition(p * pathLength)`.
  - Mouthpiece (static): a 26 x 11 rounded rect (corner 4, fill `#0A0A0A`, 1.4 stroke `#C9A227`) with a 3.5 wide gold band at x=15, positioned at (288,15) rotated -28 deg. Coupling at the start (static): gold rounded rect 9 x 14 (corner 3) at (4,33).
- **Progress `p(t)`** (t in seconds since the splash started; this is a designed curve, not the real loading): `x = clamp((t - 0.6) / 8.3, 0, 1)`; `p = x < .30 ? x/.30*.34 : x < .55 ? .34 + (x-.30)/.25*.22 : .56 + (x-.55)/.45*.44`. If the real app loading takes longer than the animation, hold at 99% until ready; if it finishes earlier, still play the full animation (minimum splash duration 10.6 s).

## 10. Particles (one canvas/overlay, 60 fps, stop emitting at the exit)
Port the logic of the `<script>` of the reference HTML. Design-space values below are in dp per 60 fps frame. Hard cap: 340 live particles. Emission runs from t = 0.5 s until t = 9.2 s (reduce the rates by half on screens smaller than 360 dp wide).
- **Logo smoke wisps** (t from 0.9 s, 40% chance per frame): spawn at x = center ± 25 dp, y = logo center - 30 dp; velocity x ±0.125, y -(0.3 to 0.7); radius 26 to 48 growing +0.12 per frame; peak alpha .16; life 170 to 260 frames. Alpha over life = sin(pi * life/maxLife). Radial-gradient sprite, `BlendMode.Screen`, color = average of the theme color and `(205,222,244)`. Velocity damping x0.99 per frame and a lateral swirl `vx += sin(life*.05 + y*.02) * .012`.
- **Bottom plumes** (20% chance per frame): spawn at random x, y = screen bottom + 30; vx ±0.15, vy -(0.5 to 1.0); radius 50 to 90; peak alpha **.045** (very light); life 420 to 620 frames; same smoke behavior and swirl.
- **Embers** (10% per frame x 35%): orange dots `rgba(255,140,50)`, radius 1.4 to 2.4, spawn at random x at the bottom, vy -(0.6 to 1.4), sway `x += sin(life*.04 + phase) * .25`, flicker alpha `sin(pi*u) * (0.5 + 0.5*sin(life*.15+phase))`, life = screenHeight/0.9 frames, `BlendMode.Plus`.
- **Gold dust** (10% per frame x 65%): `rgba(255,215,120)`, radius .8 to 2, anywhere on screen, vy -(0.1 to 0.25), same sway/flicker (alpha x .8), life 200 to 400 frames, `BlendMode.Plus`.
- **Sparks around the logo:** at t = 0.2 s: 10 sparks; at t = 0.8 s (logo reveal): 46 sparks + 12 smoke puffs (radius 30 to 60, alpha .2, outward velocity .9, life 90 to 140); at the exit (t = 9.2 s): 60 sparks + 16 puffs. Sparks: radius 1.2 to 2.4, start at the logo center, random direction, speed `base * (0.4 to 1.4)` with base 1.2 / 3.6 / 4.6, light gravity +0.003 per frame, damping x0.99, life 50 to 110 frames, color = theme color mixed 60% with white, `BlendMode.Plus`.
- Performance: pre-render one soft white radial-gradient sprite and draw it tinted instead of creating gradients per frame; no allocations in the draw loop; use a frame clock (`withFrameNanos`) with delta-time. Pause everything when the app goes to background.

## 11. Timeline summary
| t (s) | event |
|---|---|
| 0.0 | black `#111111`; smoke group starts fading in (1.4 s) |
| 0.2 | 10 sparks; orbs start fading in |
| 0.5 | loader fades in; particle emission starts |
| 0.6 | aura grows in; loader progress starts |
| 0.8 | logo reveal (blur to sharp), spark burst |
| 0.9 | color target = rose; logo smoke wisps start |
| 2.2 | aura breathing and logo float start |
| 2.4 | tagline fades in; first logo light sweep |
| 2.9 / 4.9 / 6.9 | color targets: lime / royal / ice blue |
| 9.2 | EXIT starts |
| 9.2-10.1 | logo+tagline scale 1.18, blur 10, fade out (0.9 s, accelerating ease); loader fades and slides down 12 dp (0.4 s); spark burst; veil `#111111` fades in over 0.7 s starting at 9.7 s |
| 10.6 | navigate to the Landing screen (replace, no back to splash) |

## 12. Android integration rules
- Use the AndroidX SplashScreen API only to avoid a white flash: dark background `#111111`, no icon animation, dismiss as soon as the first frame of the custom splash is ready (so the system splash never competes with this one).
- Edge-to-edge, transparent system bars with light icons; respect insets for the loader.
- Navigation: after the exit, `navigate(Landing) { popUpTo(Splash) { inclusive = true } }` (or the stack's equivalent). Back from Landing must NOT return to the splash.
- If the OS animation scale is 0 / "remove animations": skip the particles, loops and cycling; show the logo, the tagline and the loader with the real progress, then navigate when ready (short fade only).
- Keep the stack's idioms (Compose: `rememberInfiniteTransition`, `Animatable`, `Canvas`, `graphicsLayer`, `BlendMode.Screen/Color/SrcAtop/Plus`; Flutter: `AnimationController` + `CustomPainter`; XML: custom `View` with `onDraw`).
- Do not touch any other screen or the Landing logic, except exposing the final color if the Landing needs it.

## 13. Acceptance checklist
- [ ] No circles/rings/shockwaves/bubbles/rosette/rays anywhere; no extra text under the logo.
- [ ] Smoke visible on the sides, tinted by the theme color, fading toward the bottom; no visible rectangle or black box.
- [ ] Color change between two colors takes about 3 s and the final color is ice blue.
- [ ] Logo uses the real PNG, reveals from blur, floats, light sweep every 5 s.
- [ ] The tagline hairlines do not overlap the text.
- [ ] The hose loader is visible and big enough: percentage 28 sp on the right, status text on the left, flow + glowing head moving along the hose and reaching the mouthpiece at 100%.
- [ ] Particle load stays smooth (60 fps on a mid-range phone, <= 340 particles).
- [ ] Exit transition at 9.2 s then Landing opens; Back does not return to the splash.
- [ ] Works on 360x640, 393x851 and 412x915 dp; nothing clipped, loader above the navigation bar.

## 14. Verification (mandatory before saying "done")
1. Build and run on an emulator (Pixel 6, then a 360x640).
2. Take screenshots at 0.7, 1.5, 2.6, 4.0, 6.0, 8.0, 9.6 and 10.8 s and compare each with the matching file in `frames/`. List every difference (position, size, color, density of particles), fix them, repeat. Only anti-aliasing and font differences may remain.
3. Use Android Studio Profiler (or `adb shell dumpsys gfxinfo`) once during the splash and report jank percentage and the particle count.
4. Final message: files created/changed, constants (`COLOR_STEP_MS`, `COLOR_SMOOTH`, total duration), checklist with check/cross, and any difference you could not remove with the reason.
