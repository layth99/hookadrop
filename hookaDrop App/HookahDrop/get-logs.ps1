# Get Favorites Debug Logs
Write-Host "Capturing logs for Favorites debugging..." -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Instructions:" -ForegroundColor Yellow
Write-Host "   1. Keep this window open" -ForegroundColor White
Write-Host "   2. Open your app on the phone" -ForegroundColor White
Write-Host "   3. Tap a heart icon to add favorite" -ForegroundColor White
Write-Host "   4. Open Favorites page" -ForegroundColor White
Write-Host "   5. Press Ctrl+C here to stop" -ForegroundColor White
Write-Host ""
Write-Host "Watching logs..." -ForegroundColor Green
Write-Host "=" * 60

adb logcat -c  # Clear previous logs
adb logcat | Select-String "FavoritesManager|FavoritesActivity|RemoteDataProvider.*wishlist" | ForEach-Object {
    $line = $_.Line
    if ($line -match "❌|ERROR|Failed") {
        Write-Host $line -ForegroundColor Red
    } elseif ($line -match "✅|successful") {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -match "WARNING|WARN") {
        Write-Host $line -ForegroundColor Yellow
    } else {
        Write-Host $line -ForegroundColor White
    }
}
