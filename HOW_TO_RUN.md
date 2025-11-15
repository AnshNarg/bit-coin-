# 🚀 Crypto Trading Platform - How to Run

## 📋 Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Windows PowerShell or Command Prompt

## 🛠️ Setup Instructions

### Method 1: Using Two Terminal Windows (Recommended)

#### Terminal 1 - Backend Server
```powershell
# Navigate to backend directory
cd "C:\Users\nitin\clean_project\crypto-trading-platform\backend"

# Install dependencies (first time only)
npm install

# Start the backend server
npm run demo
```

#### Terminal 2 - Frontend Server
```powershell
# Open a new terminal window
# Navigate to frontend directory
cd "C:\Users\nitin\clean_project\crypto-trading-platform\frontend"

# Install dependencies (first time only)
npm install

# Start the frontend development server
npm start
```

### Method 2: Using PowerShell Background Jobs

```powershell
# Navigate to project root
cd "C:\Users\nitin\clean_project\crypto-trading-platform"

# Start backend in background
Start-Job -ScriptBlock { cd "C:\Users\nitin\clean_project\crypto-trading-platform\backend"; npm run demo }

# Start frontend in background
Start-Job -ScriptBlock { cd "C:\Users\nitin\clean_project\crypto-trading-platform\frontend"; npm start }

# Check running jobs
Get-Job

# View job output
Receive-Job -Id 1  # Backend logs
Receive-Job -Id 2  # Frontend logs
```

### Method 3: Quick Start Script

```powershell
# Create and run this PowerShell script
$BackendPath = "C:\Users\nitin\clean_project\crypto-trading-platform\backend"
$FrontendPath = "C:\Users\nitin\clean_project\crypto-trading-platform\frontend"

Write-Host "🚀 Starting Crypto Trading Platform..." -ForegroundColor Green

# Start Backend
Write-Host "📡 Starting Backend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; npm run demo"

# Wait a moment for backend to initialize
Start-Sleep -Seconds 3

# Start Frontend
Write-Host "🌐 Starting Frontend Dashboard..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$FrontendPath'; npm start"

Write-Host "✅ Both servers are starting..." -ForegroundColor Green
Write-Host "🔗 Backend API: http://localhost:5000" -ForegroundColor White
Write-Host "📱 Frontend Dashboard: http://localhost:3000" -ForegroundColor White
```

## 🌐 Access URLs

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **API Documentation**: http://localhost:5000/api

## 🔐 Demo Login Credentials

The application uses a demo authentication system with these credentials:

- **Username**: `demo@trader.com`
- **Password**: `demo123`
- **Name**: Demo Trader

## 📊 Features Available

1. **Real-time Crypto Prices** (Bitcoin, Ethereum, Solana)
2. **Portfolio Management** (₹10 crore virtual balance)
3. **Buy/Sell Trading** with live P&L tracking
4. **AI Price Predictions** (Beta)
5. **Technical Indicators** (RSI, MACD, etc.)
6. **Advanced Charts** with multiple timeframes

## 🛠️ Troubleshooting

### Port Already in Use
```powershell
# Kill processes on ports 3000 and 5000
netstat -ano | findstr :3000
netstat -ano | findstr :5000
# Use the PID to kill: taskkill /PID <PID> /F
```

### Dependencies Issues
```powershell
# Clear npm cache and reinstall
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Backend Connection Issues
- Ensure backend starts before frontend
- Check that port 5000 is not blocked by firewall
- Verify MongoDB is not required (demo mode)

## 📱 Mobile Responsive
The dashboard is fully responsive and works on:
- Desktop (1920x1080+)
- Tablet (768px+)
- Mobile (320px+)

## 🎯 Demo Flow

1. Open http://localhost:3000
2. Login with demo credentials
3. Explore the dashboard features
4. Try buying/selling crypto
5. Monitor portfolio changes in real-time

---
**Note**: This is a demo trading platform with virtual money. No real cryptocurrency transactions occur.
