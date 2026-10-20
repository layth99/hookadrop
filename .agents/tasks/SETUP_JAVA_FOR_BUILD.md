# Setup Java/JDK for Android Build

## Problem
The build fails with: `ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH`

## Solution - Install and Configure JDK

### Option 1: Quick Install via Chocolatey (Recommended)

1. **Install Chocolatey** (if not already installed):
   - Open PowerShell as Administrator
   - Run:
   ```powershell
   Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
   ```

2. **Install OpenJDK 17**:
   ```powershell
   choco install microsoft-openjdk17 -y
   ```

3. **Verify installation**:
   ```powershell
   java -version
   ```

4. **Set JAVA_HOME** (if not set automatically):
   ```powershell
   # Find Java installation
   Get-ChildItem "C:\Program Files" -Recurse -Include java.exe -ErrorAction SilentlyContinue | Select-Object -First 1 | Split-Path -Parent | Split-Path -Parent

   # Set JAVA_HOME permanently (replace path if different)
   [Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Microsoft\jdk-17.0.10.7-hotspot", "Machine")
   
   # Add to PATH
   $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
   [Environment]::SetEnvironmentVariable("Path", "$currentPath;$env:JAVA_HOME\bin", "Machine")
   ```

5. **Close and reopen PowerShell**, then verify:
   ```powershell
   $env:JAVA_HOME
   java -version
   ```

### Option 2: Manual Install

1. **Download OpenJDK 17**:
   - Go to: https://learn.microsoft.com/en-us/java/openjdk/download
   - Download: Microsoft Build of OpenJDK 17 (Windows x64 MSI)

2. **Install**:
   - Run the MSI installer
   - Default installation path: `C:\Program Files\Microsoft\jdk-17.0.10.7-hotspot`

3. **Set Environment Variables**:
   - Press `Win + X` → Select "System"
   - Click "Advanced system settings"
   - Click "Environment Variables"
   
   **Add JAVA_HOME**:
   - Under "System variables", click "New"
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Microsoft\jdk-17.0.10.7-hotspot` (your Java path)
   
   **Update PATH**:
   - Find "Path" in System variables
   - Click "Edit"
   - Click "New"
   - Add: `%JAVA_HOME%\bin`

4. **Verify** (open new PowerShell):
   ```powershell
   java -version
   ```

### Option 3: Use Android Studio's Embedded JDK

If you have Android Studio installed:

1. **Find Android Studio's JDK**:
   ```powershell
   Get-ChildItem "C:\Program Files\Android" -Recurse -Include java.exe -ErrorAction SilentlyContinue | Select-Object -First 1
   ```
   
   Typical path: `C:\Program Files\Android\Android Studio\jbr`

2. **Set JAVA_HOME**:
   ```powershell
   [Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Android\Android Studio\jbr", "User")
   ```

3. **Close and reopen PowerShell**, verify:
   ```powershell
   java -version
   ```

## After Java is Installed

### Build the App

Navigate to the project directory and run:

```powershell
cd "c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop"
.\gradlew.bat assembleDebug
```

Expected output:
```
BUILD SUCCESSFUL in 1m 30s
```

### Find the APK

The built APK will be at:
```
c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop\app\build\outputs\apk\debug\app-debug.apk
```

### Install on Device

**Via USB**:
```powershell
adb install -r "app\build\outputs\apk\debug\app-debug.apk"
```

**Or copy to device and install manually**

## Troubleshooting

### "java -version" shows wrong version
- Close ALL PowerShell/Command Prompt windows
- Open new window
- Run: `java -version` again

### JAVA_HOME not recognized
```powershell
# Check if set
$env:JAVA_HOME

# If empty, set for current session only (temporary):
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.10.7-hotspot"
$env:Path += ";$env:JAVA_HOME\bin"
```

### Gradle still fails
```powershell
# Clear Gradle cache
cd "c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop"
.\gradlew.bat clean
.\gradlew.bat assembleDebug
```

## Quick Commands Reference

```powershell
# Check Java version
java -version

# Check JAVA_HOME
$env:JAVA_HOME

# Find Java installations
Get-ChildItem "C:\Program Files" -Recurse -Include java.exe -ErrorAction SilentlyContinue

# Build app
cd "c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main\hookaDrop App\HookahDrop"
.\gradlew.bat assembleDebug

# Clean build
.\gradlew.bat clean

# Install on device
adb devices
adb install -r "app\build\outputs\apk\debug\app-debug.apk"
```

## What's Next?

Once Java is configured and the build succeeds:

1. ✅ APK will be generated
2. ✅ Install on your Android device
3. ✅ Test the favorites system:
   - Tap heart icons on products
   - Open Favorites page
   - Verify products appear
   - Close app and reopen
   - Verify favorites persist
   - Sign out and sign back in
   - Verify cross-device sync

## Support

If you continue to have issues:
1. Check Java version: Should be JDK 17 or higher
2. Verify JAVA_HOME points to JDK directory (not JRE)
3. Restart computer after setting environment variables
4. Try running PowerShell as Administrator
