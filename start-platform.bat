@echo off
echo ========================================
echo  Crypto Trading Platform - Full Stack
echo ========================================
echo.

echo [1/4] Starting Backend Demo Server...
start "Backend Server" cmd /c "cd /d backend && node server-demo.js"
echo     ✅ Backend server starting on http://localhost:5000
echo.

echo [2/4] Waiting for backend to initialize...
timeout /t 3 >nul
echo.

echo [3/4] Starting Frontend Development Server...
start "Frontend Server" cmd /c "cd /d frontend && npm start"
echo     ✅ Frontend server starting on http://localhost:3000
echo.

echo [4/4] Optional: Starting ML Prediction API...
echo     To start ML API: cd ml-model && python predict_api.py
echo     ML API will be available on http://localhost:5001
echo.

echo ========================================
echo  Platform is starting up!
echo ========================================
echo.
echo 🚀 Backend:  http://localhost:5000
echo 🎨 Frontend: http://localhost:3000  
echo 🤖 ML API:   http://localhost:5001 (manual start)
echo.
echo 📋 What to do next:
echo   1. Wait for both servers to start (60 seconds)
echo   2. Open http://localhost:3000 in your browser
echo   3. Register a new account to get started
echo   4. Start trading with ₹10 crore virtual balance!
echo.
echo 💡 Tips:
echo   • Demo mode - no database required
echo   • All data resets when servers restart
echo   • Perfect for testing and development
echo.
echo Press any key to continue or Ctrl+C to exit...
pause >nul
