# OnboardingActivity Crash Fix - Diagnostic Mode

**Date**: October 22, 2026  
**Issue**: App crashes when clicking "Let's Get Started" button on landing page

## Changes Made

### 1. Added Comprehensive Logging to `navigateToHome()`
```kotlin
// Added try-catch with detailed logging at each step:
- SessionManager creation
- isLoggedIn check
- Destination class determination
- Intent creation with flags
- startActivity call
- Transition animation
- finish() call
```

### 2. Added Error Recovery in `navigateToHome()`
- Primary navigation in try-catch
- Fallback to SignInActivity if main navigation fails
- Last resort: just finish() the activity
- All errors logged with full stack trace

### 3. Protected `onDestroy()` Lifecycle
```kotlin
- Wrapped animator cancellation in try-catch
- Added smoke view pause calls
- Added logging at each step
- Ensures super.onDestroy() always called
```

### 4. Protected `doLeaveTransition()`
```kotlin
- Wrapped all animations in try-catch
- Fallback: immediate navigation if animations fail
- Logging added
```

## How to Diagnose the Crash

### Step 1: Build and Install
```powershell
cd "c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop"
.\gradlew clean assembleDebug
# or use: .\gradlew installDebug
```

### Step 2: Run the App
1. Open Android Studio
2. Open Logcat window (View → Tool Windows → Logcat)
3. Filter by "OnboardingActivity"
4. Run the app on emulator
5. Navigate to landing page
6. Click "Let's Get Started" button

### Step 3: Check Logs
Look for these log sequences:

**Expected successful sequence:**
```
D/OnboardingActivity: === doLeaveTransition START ===
D/OnboardingActivity: doLeaveTransition animations started
D/OnboardingActivity: === navigateToHome START ===
D/OnboardingActivity: SessionManager created
D/OnboardingActivity: isLoggedIn: false (or true)
D/OnboardingActivity: Destination: SignInActivity (or HomeActivity)
D/OnboardingActivity: Intent created with flags
D/OnboardingActivity: startActivity called
D/OnboardingActivity: Transition animation set
D/OnboardingActivity: finish() called
D/OnboardingActivity: === onDestroy START ===
D/OnboardingActivity: Animators cancelled
D/OnboardingActivity: Handler callbacks cleared
D/OnboardingActivity: Smoke animations paused
D/OnboardingActivity: === onDestroy COMPLETE ===
```

**If crash occurs:**
Look for error logs:
```
E/OnboardingActivity: Error in doLeaveTransition
E/OnboardingActivity: === CRASH in navigateToHome ===
E/OnboardingActivity: Error: [error message]
E/OnboardingActivity: Stack trace: [full trace]
```

### Step 4: Alternative - Use ADB Command Line
If Android Studio not available:
```powershell
# Clear old logs
adb logcat -c

# Start monitoring (filter for our app)
adb logcat | Select-String -Pattern "OnboardingActivity|hookahdrop|AndroidRuntime"

# In another terminal, trigger the crash by clicking button
# Watch the logs appear
```

## Possible Root Causes

### Theory 1: HomeActivity/SignInActivity Init Failure
- **Symptom**: Crash after "startActivity called" log
- **Cause**: Target activity onCreate() throws exception
- **Fix**: Need to check HomeActivity.kt or SignInActivity.kt logs

### Theory 2: View Animation Failure
- **Symptom**: Crash in doLeaveTransition with animation error
- **Cause**: One of the views (auraView, hookahView, etc.) is null or not initialized
- **Fix**: Already protected with try-catch, will log and skip to navigation

### Theory 3: Handler/Animator Memory Leak
- **Symptom**: Crash in onDestroy with "can't access destroyed view"
- **Cause**: Animations or handlers trying to access views after activity destroyed
- **Fix**: Already protected, clears everything in try-catch

### Theory 4: Smoke/Aura View Issue
- **Symptom**: Crash when pausing smoke animations
- **Cause**: SmokeBackgroundView or AuraView not properly initialized
- **Fix**: Already protected with ::b.isInitialized check

## Next Steps

1. **Run with logging** - The app now has comprehensive logging
2. **Identify exact crash point** - Look at logs to see where it stops
3. **Report back** with:
   - Last successful log message
   - Error message if any
   - Full stack trace from logcat

## Quick Test Commands

```powershell
# Build only
.\gradlew assembleDebug

# Build + Install
.\gradlew installDebug

# Check if app is installed
adb shell pm list packages | Select-String "hookahdrop"

# Uninstall (if needed)
adb uninstall com.hookahdrop.app

# Fresh install
.\gradlew uninstallAll installDebug
```

## Emergency Fallback

If crash still occurs with all protections:

**Option A: Skip transition, go direct**
```kotlin
private fun doLeaveTransition() {
    // Skip all animations
    navigateToHome()
}
```

**Option B: Force destination**
```kotlin
private fun navigateToHome() {
    // Always go to SignInActivity for now
    val intent = Intent(this, SignInActivity::class.java)
    intent.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
    startActivity(intent)
    finish()
}
```

---

**Status**: Diagnostic mode active. Ready for testing.
