# HookahDrop Android App

## How to open in Android Studio

1. Open Android Studio → **File → Open** → select the `HookahDrop` folder.
2. Let Gradle sync finish (needs internet the first time).
3. Run on emulator or device (minSdk 24 / Android 7+).

---

## Add your real images

### Logo / Neon hookah icon
- Copy your logo PNG → rename it **`ic_hookah_neon.png`**
- Paste into `app/src/main/res/drawable/`
- **Delete** `ic_hookah_neon.xml` (the placeholder vector)

### Onboarding photos
| File name to create         | Use this source image               |
|-----------------------------|-------------------------------------|
| `hookah_photo_1.jpg`        | `pic design/alpha-hookah-x.jpg`     |
| `hookah_photo_2.jpg`        | `pic design/930420bf-…-a0d5.jpg`    |
| `hookah_photo_3.jpg`        | `pic design/a7f0cf4e-…bc47d.png`    |

- Paste the 3 files into `app/src/main/res/drawable/`
- **Delete** the placeholder `hookah_photo_1.xml`, `hookah_photo_2.xml`, `hookah_photo_3.xml`

### Launcher icon
- In Android Studio: right-click `res` → **New → Image Asset** → choose your `logo.png`
- This auto-generates all mipmap sizes.

---

## Screen flow & animations

```
SplashActivity
  ↓  fade (700 ms logo scale + overshoot, pulse glow loop)
OnboardingActivity
  ↓  staggered slide-in: watermark → left photo → right column → sparkles → text → button
SignInActivity       ←→  SignUpActivity
  ↓
ForgotPasswordActivity
  ↓
VerifyCodeActivity   (OTP boxes pop-in with overshoot, countdown timer)
  ↓
NewPasswordActivity  (shake animation on password mismatch)
```

Every transition uses a **slide + fade** pair:
- Forward: `slide_in_right` / `slide_out_left`
- Back:    `slide_in_left`  / `slide_out_right`
- Splash → Onboarding: `fade_in` / `fade_out`

---

## Screens implemented

- ✅ Splash Screen – neon logo, pulse glow
- ✅ Onboarding Screen – photo mosaic, CTA button
- ✅ Sign In
- ✅ Sign Up
- ✅ Forgot Password
- ✅ Verify Code (OTP)
- ✅ New Password

---

## Next steps (to be added later)
- Home / Shop screen
- Product Details
- Cart & Checkout
- Profile
- Order Tracking
