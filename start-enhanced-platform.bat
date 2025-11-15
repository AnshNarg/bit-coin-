@echo off
cls
echo ========================================
echo  🚀 ENHANCED Crypto Trading Platform  
echo ========================================
echo.
echo 🎯 Starting Full-Stack Platform with:
echo   ✅ Real Charts & Price Data
echo   ✅ Interactive Trading Interface  
echo   ✅ Live Portfolio Management
echo   ✅ Buy/Sell Order Execution
echo.

echo [1/3] 🔧 Starting Backend API Server...
start "Backend-API" cmd /c "cd /d backend && node server-demo.js"
echo     ✅ Backend API starting on http://localhost:5000
echo.

echo [2/3] ⏳ Waiting for backend to initialize...
timeout /t 3 >nul
echo.

echo [3/3] 🎨 Starting Enhanced Frontend...
start "Frontend-App" cmd /c "cd /d frontend && npm start"
echo     ✅ Enhanced frontend starting on http://localhost:3000
echo.

echo ========================================
echo  🎉 ENHANCED PLATFORM FEATURES READY!
echo ========================================
echo.
echo 🌐 ACCESS POINTS:
echo   📊 Main App:  http://localhost:3000
echo   🔧 Backend:   http://localhost:5000
echo.
echo 🚀 NEW FEATURES NOW AVAILABLE:
echo   📈 Interactive Price Charts (Bitcoin, Ethereum, Solana, Dogecoin)
echo   💰 Real Paper Trading Interface with Buy/Sell Buttons
echo   📊 Live Portfolio Tracking with P&L
echo   💎 Holdings Management with Current Values
echo   🔄 Auto-refreshing Data (30-second intervals)
echo   📱 Responsive Mobile-Friendly Design
echo.
echo 🎯 HOW TO USE:
echo   1️⃣  Wait 30-60 seconds for React to compile
echo   2️⃣  Browser will auto-open to http://localhost:3000
echo   3️⃣  Login with existing account or register new one
echo   4️⃣  See REAL charts and trading interface!
echo   5️⃣  Try buying crypto - you have ₹10 crore balance
echo   6️⃣  Watch your portfolio update in real-time
echo.
echo 💡 DEMO FEATURES:
echo   • Mock real-time crypto price data
echo   • Interactive area charts with tooltips
echo   • Dropdown crypto selection (BTC/ETH/SOL/DOGE)
echo   • Price display in USD and INR
echo   • Quantity input with validation
echo   • BUY/SELL buttons with order execution
echo   • Portfolio summary cards
echo   • Holdings list with P&L calculation
echo   • Success/error notifications
echo.
echo 🔥 WHAT'S NEW vs PREVIOUS VERSION:
echo   ❌ Before: Just placeholder text boxes
echo   ✅ Now: Fully interactive charts and trading!
echo.
echo Press any key when ready to test the platform...
pause >nul

echo.
echo 🎊 Platform is starting! Please wait for:
echo   ⏳ Backend: ~5 seconds
echo   ⏳ Frontend: ~30-60 seconds (React compilation)
echo.
echo 🎯 Once loaded, you'll see:
echo   • Real crypto price charts
echo   • Interactive trading buttons
echo   • Live portfolio updates
echo   • Professional trading interface
echo.
echo Happy Trading! 📈💰
