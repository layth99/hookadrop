# HookaDrop - Rebuild and Install Script
# Cleans, rebuilds, and installs the APK on connected Android device

Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       HookaDrop - Rebuild & Install Script          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if running in correct directory
if (!(Test-Path "gradlew.bat")) {
    Write-Host "❌ ERROR: Must run from HookahDrop directory!" -ForegroundColor Red
    Write-Host "Current directory: $PWD" -ForegroundColor Yellow
    Write-Host "Expected: .../HookahDrop" -ForegroundColor Yellow
    exit 1
}

# Step 1: Check Java
Write-Host "🔍 Checking Java installation..." -ForegroundColor Yellow
try {
    $javaVersion = java -version 2>&1 | Select-Object -First 1
    Write-Host "✅ Java found: $javaVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Java not found!" -ForegroundColor Red
    Write-Host "Please install Java first. See SETUP_JAVA_FOR_BUILD.md" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check ADB
Write-Host "🔍 Checking ADB and connected devices..." -ForegroundColor Yellow
try {
    $devices = adb devices | Select-String "device$"
    if ($devices.Count -eq 0) {
        Write-Host "⚠️  WARNING: No Android devices connected!" -ForegroundColor Yellow
        Write-Host "   Connect device via USB or start emulator" -ForegroundColor Gray
        $continue = Read-Host "Continue building anyway? (y/n)"
        if ($continue -ne "y") { exit 0 }
    } else {
        Write-Host "✅ Found $($devices.Count) connected device(s)" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  WARNING: ADB not found - cannot install automatically" -ForegroundColor Yellow
}

# Step 3: Clean previous build
Write-Host ""
Write-Host "🧹 Cleaning previous build..." -ForegroundColor Yellow
.\gradlew.bat clean
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Clean failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Clean complete" -ForegroundColor Green

# Step 4: Build debug APK
Write-Host ""
Write-Host "🔨 Building debug APK..." -ForegroundColor Yellow
Write-Host "   This may take 1-3 minutes..." -ForegroundColor Gray
$buildStart = Get-Date
.\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host "Check error messages above" -ForegroundColor Yellow
    exit 1
}
$buildDuration = (Get-Date) - $buildStart
Write-Host "✅ Build successful! ($([math]::Round($buildDuration.TotalSeconds, 1))s)" -ForegroundColor Green

# Step 5: Find APK
$apkPath = "app\build\outputs\apk\debug\app-debug.apk"
if (!(Test-Path $apkPath)) {
    Write-Host "❌ APK not found at: $apkPath" -ForegroundColor Red
    exit 1
}
$apkSize = (Get-Item $apkPath).Length / 1MB
Write-Host "📦 APK generated: $([math]::Round($apkSize, 2)) MB" -ForegroundColor Cyan

# Step 6: Install on device
Write-Host ""
Write-Host "📲 Installing on device..." -ForegroundColor Yellow
try {
    adb install -r $apkPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Installation successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Installation failed" -ForegroundColor Red
        Write-Host "Try manually: adb install -r $apkPath" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not install automatically" -ForegroundColor Yellow
    Write-Host "APK location: $PWD\$apkPath" -ForegroundColor Cyan
    Write-Host "Install manually on your device" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║                    COMPLETED                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Clean: Done" -ForegroundColor Green
Write-Host "✅ Build: Done ($([math]::Round($buildDuration.TotalSeconds, 1))s)" -ForegroundColor Green
Write-Host "✅ APK:   $apkPath" -ForegroundColor Green

Write-Host ""
Write-Host "🧪 Next steps:" -ForegroundColor Cyan
Write-Host "   1. Open the app on your device" -ForegroundColor White
Write-Host "   2. Sign in if not already signed in" -ForegroundColor White
Write-Host "   3. Tap heart icon on products" -ForegroundColor White
Write-Host "   4. Open Favorites page" -ForegroundColor White
Write-Host "   5. Verify products appear!" -ForegroundColor White

Write-Host ""
Write-Host "📊 To see debug logs:" -ForegroundColor Cyan
Write-Host "   adb logcat | Select-String 'FavoritesManager|FavoritesActivity'" -ForegroundColor Gray

Write-Host ""
