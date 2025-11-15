# 🚀 Crypto Trading Platform - Complete Demo Script
# Run this script to see the full application flow

Write-Host "🎬 =================================================" -ForegroundColor Green
Write-Host "   CRYPTO TRADING PLATFORM - LIVE DEMO" -ForegroundColor Green  
Write-Host "=================================================" -ForegroundColor Green

# Check if servers are running
Write-Host "`n🔍 Checking server status..." -ForegroundColor Yellow

$BackendRunning = $false
$FrontendRunning = $false

try {
    $backendCheck = Invoke-WebRequest -Uri "http://localhost:5000/api/crypto/prices" -TimeoutSec 3
    $BackendRunning = $true
    Write-Host "✅ Backend server is running (Port 5000)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend server is not running (Port 5000)" -ForegroundColor Red
}

try {
    $frontendCheck = Invoke-WebRequest -Uri "http://localhost:3000" -TimeoutSec 3
    $FrontendRunning = $true
    Write-Host "✅ Frontend server is running (Port 3000)" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend server is not running (Port 3000)" -ForegroundColor Red
}

if (-not $BackendRunning -or -not $FrontendRunning) {
    Write-Host "`n🚨 SERVERS NOT RUNNING - Starting them now..." -ForegroundColor Yellow
    
    if (-not $BackendRunning) {
        Write-Host "📡 Starting Backend Server..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\nitin\clean_project\crypto-trading-platform\backend'; Write-Host '🚀 Starting Backend Server...' -ForegroundColor Green; npm run demo"
    }
    
    Start-Sleep -Seconds 3
    
    if (-not $FrontendRunning) {
        Write-Host "🌐 Starting Frontend Server..." -ForegroundColor Cyan
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'C:\Users\nitin\clean_project\crypto-trading-platform\frontend'; Write-Host '📱 Starting Frontend Server...' -ForegroundColor Green; npm start"
    }
    
    Write-Host "`n⏰ Waiting for servers to initialize..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
}

# Demo the API
Write-Host "`n📊 === LIVE DATA DEMO ===" -ForegroundColor Blue

try {
    Write-Host "💰 Fetching live crypto prices..." -ForegroundColor Yellow
    $pricesResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/crypto/prices"
    $pricesData = $pricesResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ LIVE CRYPTO PRICES:" -ForegroundColor Green
    Write-Host "  🪙 Bitcoin (BTC): $($pricesData.data.bitcoin.price.ToString('C0'))" -ForegroundColor White
    Write-Host "  🪙 Ethereum (ETH): $($pricesData.data.ethereum.price.ToString('C0'))" -ForegroundColor White  
    Write-Host "  🪙 Solana (SOL): $($pricesData.data.solana.price.ToString('C0'))" -ForegroundColor White
} catch {
    Write-Host "❌ Could not fetch crypto prices" -ForegroundColor Red
}

try {
    Write-Host "`n🏦 Fetching portfolio status..." -ForegroundColor Yellow
    $portfolioResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/trading/portfolio"
    $portfolioData = $portfolioResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ PORTFOLIO STATUS:" -ForegroundColor Green
    Write-Host "  💰 Balance: ₹$($portfolioData.data.balance.ToString('N0'))" -ForegroundColor White
    Write-Host "  📈 Total Value: ₹$($portfolioData.data.totalPortfolioValue.ToString('N0'))" -ForegroundColor White
    Write-Host "  📊 P&L: $($portfolioData.data.totalPnL.ToString('C2'))" -ForegroundColor $(if($portfolioData.data.totalPnL -ge 0){"Green"}else{"Red"})
    
    if ($portfolioData.data.holdings.Count -gt 0) {
        Write-Host "  🪙 Holdings:" -ForegroundColor Cyan
        foreach ($holding in $portfolioData.data.holdings) {
            if ($holding.quantity -gt 0) {
                Write-Host "    - $($holding.symbol.ToUpper()): $($holding.quantity) @ $($holding.averagePrice.ToString('C0'))" -ForegroundColor Gray
            }
        }
    }
} catch {
    Write-Host "❌ Could not fetch portfolio data" -ForegroundColor Red
}

# Test login
Write-Host "`n🔐 === LOGIN TEST ===" -ForegroundColor Blue
Write-Host "Testing demo credentials..." -ForegroundColor Yellow

try {
    $headers = @{'Content-Type' = 'application/json'}
    $loginData = @{
        emailOrUsername = 'demo@trader.com'
        password = 'demo123'
    } | ConvertTo-Json
    
    $loginResponse = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method POST -Headers $headers -Body $loginData
    $loginResult = $loginResponse.Content | ConvertFrom-Json
    
    Write-Host "✅ LOGIN SUCCESSFUL!" -ForegroundColor Green
    Write-Host "  👤 User: $($loginResult.data.user.firstName) $($loginResult.data.user.lastName)" -ForegroundColor White
    Write-Host "  📧 Email: $($loginResult.data.user.email)" -ForegroundColor White
    Write-Host "  🔑 Authentication: Working" -ForegroundColor Green
} catch {
    Write-Host "❌ Login test failed" -ForegroundColor Red
}

# Open browsers
Write-Host "`n🌐 === OPENING APPLICATION ===" -ForegroundColor Magenta

Write-Host "📱 Opening Login Page..." -ForegroundColor Yellow
Start-Process "http://localhost:3000/login"

Start-Sleep -Seconds 2

Write-Host "📊 Opening Dashboard..." -ForegroundColor Yellow  
Start-Process "http://localhost:3000/dashboard"

# Demo instructions
Write-Host "`n🎯 === DEMO INSTRUCTIONS ===" -ForegroundColor Green
Write-Host ""
Write-Host "LOGIN PAGE DEMO:" -ForegroundColor Cyan
Write-Host "  🔑 Username: demo@trader.com" -ForegroundColor Yellow
Write-Host "  🔐 Password: demo123" -ForegroundColor Yellow
Write-Host "  ✨ Features: Animated logo, gradient background, form validation" -ForegroundColor Gray
Write-Host ""
Write-Host "DASHBOARD DEMO:" -ForegroundColor Cyan  
Write-Host "  💰 Portfolio: ₹10 crore virtual balance" -ForegroundColor Yellow
Write-Host "  📈 Live Prices: Real-time crypto data from CoinGecko" -ForegroundColor Yellow
Write-Host "  🤖 AI Predictions: Machine learning price forecasts" -ForegroundColor Yellow
Write-Host "  💹 Trading: Buy/sell with instant portfolio updates" -ForegroundColor Yellow
Write-Host "  📊 Analytics: Technical indicators and P&L tracking" -ForegroundColor Yellow
Write-Host ""
Write-Host "TRY THESE ACTIONS:" -ForegroundColor Green
Write-Host "  1. Login with demo credentials" -ForegroundColor White
Write-Host "  2. Buy 0.1 Bitcoin using the trading interface" -ForegroundColor White  
Write-Host "  3. Check portfolio updates in real-time" -ForegroundColor White
Write-Host "  4. View P&L changes and holdings table" -ForegroundColor White
Write-Host "  5. Explore different timeframes on charts" -ForegroundColor White
Write-Host ""
Write-Host "🎉 DEMO READY! Both browsers should now be open." -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Keep script open
Read-Host "`nPress Enter to close this demo script"
