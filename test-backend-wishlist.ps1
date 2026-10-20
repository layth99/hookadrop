# Test Backend Wishlist Endpoints
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Testing HookaDrop Backend - Wishlist      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check if backend is running
$baseUrl = "http://localhost:8000"

Write-Host "🔍 Testing backend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/products" -Method Get -TimeoutSec 5
    Write-Host "✅ Backend is running!" -ForegroundColor Green
    Write-Host "   Products endpoint: OK ($($response.StatusCode))" -ForegroundColor Gray
} catch {
    Write-Host "❌ Backend not responding at $baseUrl" -ForegroundColor Red
    Write-Host ""
    Write-Host "⚠️  Please start the backend first:" -ForegroundColor Yellow
    Write-Host "   cd c:\Users\GAMING\Downloads\raaa\e-commerce-backend-main" -ForegroundColor White
    Write-Host "   npm start" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "📝 To test wishlist, you need:" -ForegroundColor Cyan
Write-Host "   1. A valid user ID (from MongoDB or sign-in response)" -ForegroundColor White
Write-Host "   2. Run these commands:" -ForegroundColor White
Write-Host ""

$userId = Read-Host "Enter your User ID (or press Enter to skip)"

if ($userId) {
    Write-Host ""
    Write-Host "🧪 Testing GET wishlist..." -ForegroundColor Yellow
    try {
        $getResponse = Invoke-WebRequest -Uri "$baseUrl/api/wishlist/$userId" -Method Get
        Write-Host "✅ GET wishlist: OK" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Gray
        Write-Host $getResponse.Content -ForegroundColor White
    } catch {
        Write-Host "❌ GET wishlist failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "🧪 Testing POST wishlist (add product p1)..." -ForegroundColor Yellow
    try {
        $body = @{ productId = "p1" } | ConvertTo-Json
        $postResponse = Invoke-WebRequest -Uri "$baseUrl/api/wishlist/$userId" -Method Post -Body $body -ContentType "application/json"
        Write-Host "✅ POST wishlist: OK" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Gray
        Write-Host $postResponse.Content -ForegroundColor White
    } catch {
        Write-Host "❌ POST wishlist failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "🧪 Testing GET wishlist again (should now have p1)..." -ForegroundColor Yellow
    try {
        $getResponse2 = Invoke-WebRequest -Uri "$baseUrl/api/wishlist/$userId" -Method Get
        Write-Host "✅ GET wishlist: OK" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Gray
        Write-Host $getResponse2.Content -ForegroundColor White
    } catch {
        Write-Host "❌ GET wishlist failed: $($_.Exception.Message)" -ForegroundColor Red
    }

    Write-Host ""
    Write-Host "🧪 Testing DELETE wishlist product..." -ForegroundColor Yellow
    try {
        $deleteResponse = Invoke-WebRequest -Uri "$baseUrl/api/wishlist/$userId/product/p1" -Method Delete
        Write-Host "✅ DELETE wishlist: OK" -ForegroundColor Green
        Write-Host "Response:" -ForegroundColor Gray
        Write-Host $deleteResponse.Content -ForegroundColor White
    } catch {
        Write-Host "❌ DELETE wishlist failed: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host ""
    Write-Host "ℹ️  Skipped wishlist tests (no user ID provided)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To get your user ID:" -ForegroundColor Cyan
    Write-Host "   1. Sign in to the app" -ForegroundColor White
    Write-Host "   2. Check logcat: adb logcat | Select-String 'userId'" -ForegroundColor White
    Write-Host "   3. Or check MongoDB users collection" -ForegroundColor White
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
