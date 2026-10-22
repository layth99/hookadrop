#!/usr/bin/env pwsh
# Script to clear a user's wishlist via the backend API

$baseUrl = "http://localhost:8000"
$userId = "6ac0a6e9e2c4c9581ca22d43"  # Get this from the logs

Write-Host "Clearing wishlist for user: $userId" -ForegroundColor Yellow

try {
    # DELETE the entire wishlist
    $response = Invoke-RestMethod -Uri "$baseUrl/api/wishlist/$userId" -Method Delete -ErrorAction Stop
    Write-Host "✅ Wishlist cleared successfully!" -ForegroundColor Green
    Write-Host ($response | ConvertTo-Json)
} catch {
    Write-Host "❌ Failed to clear wishlist" -ForegroundColor Red
    Write-Host $_.Exception.Message
    
    # Try alternative: PUT with empty array
    Write-Host "`nTrying alternative method (PUT with empty array)..." -ForegroundColor Yellow
    try {
        $body = @{ productId = @() } | ConvertTo-Json
        $response = Invoke-RestMethod -Uri "$baseUrl/api/wishlist/$userId" -Method Put -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "✅ Wishlist cleared via PUT!" -ForegroundColor Green
        Write-Host ($response | ConvertTo-Json)
    } catch {
        Write-Host "❌ PUT method also failed" -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}
