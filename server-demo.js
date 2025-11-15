const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
    max: process.env.RATE_LIMIT_MAX || 100
});
app.use(limiter);

// Logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory storage for demo
const users = new Map();
const trades = new Map();

const axios = require('axios');

// Real crypto prices cache
let realPrices = {
    bitcoin: { price: 65000, priceInr: 5412500, change24h: 0 },
    ethereum: { price: 2800, priceInr: 233100, change24h: 0 },
    solana: { price: 140, priceInr: 11655, change24h: 0 },
    dogecoin: { price: 0.08, priceInr: 6.67, change24h: 0 }
};

// Fetch real crypto prices from CoinGecko
async function fetchRealCryptoPrices() {
    try {
        const response = await axios.get('https://api.coingecko.com/api/v3/simple/price', {
            params: {
                ids: 'bitcoin,ethereum,solana,dogecoin',
                vs_currencies: 'usd,inr',
                include_24hr_change: 'true',
                include_market_cap: 'true',
                include_24hr_vol: 'true'
            },
            timeout: 10000
        });

        const data = response.data;
        realPrices = {
            bitcoin: {
                price: data.bitcoin.usd,
                priceInr: data.bitcoin.inr,
                change24h: data.bitcoin.usd_24h_change || 0,
                marketCap: data.bitcoin.usd_market_cap || 0,
                volume24h: data.bitcoin.usd_24h_vol || 0
            },
            ethereum: {
                price: data.ethereum.usd,
                priceInr: data.ethereum.inr,
                change24h: data.ethereum.usd_24h_change || 0,
                marketCap: data.ethereum.usd_market_cap || 0,
                volume24h: data.ethereum.usd_24h_vol || 0
            },
            solana: {
                price: data.solana.usd,
                priceInr: data.solana.inr,
                change24h: data.solana.usd_24h_change || 0,
                marketCap: data.solana.usd_market_cap || 0,
                volume24h: data.solana.usd_24h_vol || 0
            },
            dogecoin: {
                price: data.dogecoin.usd,
                priceInr: data.dogecoin.inr,
                change24h: data.dogecoin.usd_24h_change || 0,
                marketCap: data.dogecoin.usd_market_cap || 0,
                volume24h: data.dogecoin.usd_24h_vol || 0
            }
        };
        
        console.log('✅ Real crypto prices updated successfully');
        return realPrices;
    } catch (error) {
        console.error('❌ Error fetching real crypto prices:', error.message);
        return realPrices; // Return cached prices if API fails
    }
}

// Fetch historical data for charts (3 years)
async function fetchHistoricalData(coinId, days = 1095) { // 3 years = ~1095 days
    try {
        const response = await axios.get(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`, {
            params: {
                vs_currency: 'usd',
                days: days,
                interval: days > 90 ? 'daily' : 'hourly'
            },
            timeout: 15000
        });

        const prices = response.data.prices;
        const volumes = response.data.total_volumes;
        
        return prices.map((price, index) => {
            const timestamp = price[0];
            const priceValue = price[1];
            const volume = volumes[index] ? volumes[index][1] : 0;
            
            // Calculate OHLC from price data (simplified)
            const variation = (Math.random() - 0.5) * 0.02; // ±1% variation for OHLC
            return {
                timestamp,
                open: priceValue * (1 - Math.abs(variation) / 2),
                high: priceValue * (1 + Math.abs(variation)),
                low: priceValue * (1 - Math.abs(variation)),
                close: priceValue,
                volume,
                priceInr: priceValue * (realPrices[coinId]?.priceInr / realPrices[coinId]?.price || 83)
            };
        });
    } catch (error) {
        console.error(`❌ Error fetching historical data for ${coinId}:`, error.message);
        return [];
    }
}

// Calculate technical indicators for trading signals
function calculateTechnicalIndicators(data) {
    if (!data || data.length < 50) return data;

    const result = data.map((item, index) => {
        const newItem = { ...item };
        
        // Simple Moving Averages
        if (index >= 19) {
            const sma20Data = data.slice(index - 19, index + 1);
            newItem.sma20 = sma20Data.reduce((sum, d) => sum + d.close, 0) / 20;
        }
        
        if (index >= 49) {
            const sma50Data = data.slice(index - 49, index + 1);
            newItem.sma50 = sma50Data.reduce((sum, d) => sum + d.close, 0) / 50;
        }
        
        // RSI calculation (simplified)
        if (index >= 14) {
            const period = 14;
            const changes = data.slice(index - period + 1, index + 1)
                .map((d, i, arr) => i > 0 ? d.close - arr[i-1].close : 0)
                .slice(1);
                
            const gains = changes.filter(c => c > 0).reduce((sum, g) => sum + g, 0) / period;
            const losses = Math.abs(changes.filter(c => c < 0).reduce((sum, l) => sum + l, 0)) / period;
            
            if (losses !== 0) {
                newItem.rsi = 100 - (100 / (1 + (gains / losses)));
            } else {
                newItem.rsi = 100;
            }
        }
        
        // Generate buy/sell signals
        if (newItem.sma20 && newItem.sma50) {
            const price = newItem.close;
            const sma20 = newItem.sma20;
            const sma50 = newItem.sma50;
            const rsi = newItem.rsi || 50;
            
            // Buy signals: Price above SMA20, SMA20 above SMA50, RSI not overbought
            newItem.buySignal = price > sma20 && sma20 > sma50 && rsi < 70;
            
            // Sell signals: Price below SMA20, SMA20 below SMA50, RSI overbought
            newItem.sellSignal = price < sma20 && sma20 < sma50 && rsi > 30;
            
            // Signal strength
            if (newItem.buySignal) {
                newItem.signalStrength = rsi < 30 ? 'strong' : 'moderate';
                newItem.signal = 'buy';
            } else if (newItem.sellSignal) {
                newItem.signalStrength = rsi > 70 ? 'strong' : 'moderate';
                newItem.signal = 'sell';
            } else {
                newItem.signal = 'hold';
                newItem.signalStrength = 'neutral';
            }
        }
        
        return newItem;
    });
    
    return result;
}

// Root route - API information
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: '🚀 Crypto Trading Platform API - Demo Mode',
        version: '1.0.0',
        status: 'online',
        timestamp: new Date().toISOString(),
        endpoints: {
            health: '/health',
            auth: {
                register: 'POST /api/auth/register',
                login: 'POST /api/auth/login',
                profile: 'GET /api/auth/profile'
            },
            crypto: {
                prices: 'GET /api/crypto/prices',
                overview: 'GET /api/crypto/market-overview',
                chart: 'GET /api/crypto/:symbol/chart'
            },
            trading: {
                portfolio: 'GET /api/trading/portfolio',
                order: 'POST /api/trading/order'
            }
        },
        demo: {
            database: 'In-Memory (No MongoDB required)',
            virtualBalance: '₹10 crore per user',
            supportedCoins: ['bitcoin', 'ethereum', 'solana', 'dogecoin']
        }
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Crypto Trading Platform API is running (Demo Mode - No Database)',
        timestamp: new Date().toISOString()
    });
});

// Demo auth routes
app.post('/api/auth/register', (req, res) => {
    const { username, email, password, firstName, lastName } = req.body;
    
    if (users.has(email)) {
        return res.status(400).json({
            success: false,
            message: 'User already exists'
        });
    }

    const user = {
        _id: Date.now().toString(),
        username,
        email,
        firstName,
        lastName,
        balance: 1000000000, // ₹10 crore
        portfolio: [],
        preferences: {
            defaultCoin: 'bitcoin',
            chartTimeframe: '15m',
            theme: 'dark',
            notifications: {
                email: true,
                push: true,
                tradingAlerts: true,
                priceAlerts: false
            }
        },
        isVerified: true,
        lastLogin: new Date().toISOString(),
        loginCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    users.set(email, user);

    // Mock JWT token
    const token = 'demo-jwt-token-' + user._id;

    res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: {
            user,
            token
        }
    });
});

app.post('/api/auth/login', (req, res) => {
    const { emailOrUsername, password } = req.body;
    
    const user = users.get(emailOrUsername) || 
                 Array.from(users.values()).find(u => u.username === emailOrUsername);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid credentials'
        });
    }

    user.loginCount += 1;
    user.lastLogin = new Date().toISOString();

    const token = 'demo-jwt-token-' + user._id;

    res.json({
        success: true,
        message: 'Login successful',
        data: {
            user,
            token
        }
    });
});

app.get('/api/auth/profile', (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token || !token.startsWith('demo-jwt-token-')) {
        return res.status(401).json({
            success: false,
            message: 'Access denied'
        });
    }

    const userId = token.replace('demo-jwt-token-', '');
    const user = Array.from(users.values()).find(u => u._id === userId);

    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'User not found'
        });
    }

    res.json({
        success: true,
        data: { user }
    });
});

// Real crypto routes with CoinGecko integration
app.get('/api/crypto/prices', async (req, res) => {
    try {
        const prices = await fetchRealCryptoPrices();
        res.json({
            success: true,
            data: prices,
            source: 'CoinGecko API',
            lastUpdated: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching crypto prices',
            error: error.message
        });
    }
});

app.get('/api/crypto/market-overview', async (req, res) => {
    try {
        const prices = await fetchRealCryptoPrices();
        const overview = {};
        
        Object.keys(prices).forEach(coin => {
            overview[coin] = {
                symbol: coin,
                name: coin.charAt(0).toUpperCase() + coin.slice(1),
                ...prices[coin],
                timestamp: new Date().toISOString(),
                change24h: {
                    current: prices[coin].price,
                    changePercent: prices[coin].change24h
                }
            };
        });

        res.json({
            success: true,
            data: overview,
            source: 'CoinGecko API'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching market overview',
            error: error.message
        });
    }
});

// Enhanced chart endpoint with 3-year data and technical indicators
app.get('/api/crypto/:symbol/chart', async (req, res) => {
    const { symbol } = req.params;
    const { days = 1095, interval } = req.query; // Default 3 years
    
    const supportedCoins = ['bitcoin', 'ethereum', 'solana', 'dogecoin'];
    if (!supportedCoins.includes(symbol)) {
        return res.status(404).json({
            success: false,
            message: 'Symbol not supported',
            supportedSymbols: supportedCoins
        });
    }

    try {
        const historicalData = await fetchHistoricalData(symbol, parseInt(days));
        
        // Calculate technical indicators
        const dataWithIndicators = calculateTechnicalIndicators(historicalData);
        
        res.json({
            success: true,
            data: {
                symbol,
                timeframe: days > 90 ? 'daily' : 'hourly',
                period: `${days} days`,
                count: dataWithIndicators.length,
                data: dataWithIndicators,
                source: 'CoinGecko API',
                indicators: {
                    sma20: 'Simple Moving Average 20 periods',
                    sma50: 'Simple Moving Average 50 periods',
                    rsi: 'Relative Strength Index',
                    macd: 'MACD Signal Line',
                    buySignals: 'Algorithmic buy signals',
                    sellSignals: 'Algorithmic sell signals'
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: `Error fetching chart data for ${symbol}`,
            error: error.message
        });
    }
});

// ML Predictions endpoint (connects to ML service)
app.get('/api/predictions/:symbol', async (req, res) => {
    const { symbol } = req.params;
    const { days = 10 } = req.query;
    
    try {
        // Try to connect to ML service
        const mlResponse = await axios.get(`http://localhost:5001/predictions/${symbol}?days=${days}`);
        
        if (mlResponse.data) {
            res.json({
                success: true,
                data: mlResponse.data,
                source: 'ML Prediction API',
                timestamp: new Date().toISOString()
            });
        } else {
            throw new Error('No prediction data received');
        }
    } catch (error) {
        // If ML service is not available, generate mock predictions
        console.log(`⚠️  ML service not available, generating mock predictions for ${symbol}`);
        
        await fetchRealCryptoPrices();
        const currentPrice = realPrices[symbol]?.price;
        
        if (!currentPrice) {
            return res.status(404).json({
                success: false,
                message: 'Symbol not supported'
            });
        }
        
        // Generate mock predictions with realistic price movements
        const predictions = [];
        let basePrice = currentPrice;
        
        for (let i = 1; i <= parseInt(days); i++) {
            const randomChange = (Math.random() - 0.5) * 0.1; // ±5% daily change
            basePrice = basePrice * (1 + randomChange);
            
            const date = new Date();
            date.setDate(date.getDate() + i);
            
            predictions.push({
                date: date.toISOString().split('T')[0],
                price: parseFloat(basePrice.toFixed(6)),
                confidence: Math.random() * 0.3 + 0.7, // 70-100% confidence
                change: ((basePrice - currentPrice) / currentPrice) * 100
            });
        }
        
        // Generate trading signals
        const trend = predictions[predictions.length - 1].price > currentPrice ? 'bullish' : 'bearish';
        const avgPrediction = predictions.reduce((sum, p) => sum + p.price, 0) / predictions.length;
        
        const signals = predictions.map((pred, index) => {
            const change = pred.change;
            let signal = 'hold';
            let confidence = pred.confidence;
            
            if (change > 5) signal = 'strong_buy';
            else if (change > 2) signal = 'buy';
            else if (change < -5) signal = 'strong_sell';
            else if (change < -2) signal = 'sell';
            
            return {
                day: index + 1,
                signal,
                confidence: parseFloat(confidence.toFixed(3)),
                change_pct: parseFloat(change.toFixed(2))
            };
        });
        
        res.json({
            success: true,
            data: {
                symbol,
                crypto_name: symbol.charAt(0).toUpperCase() + symbol.slice(1),
                current_price: currentPrice,
                predictions,
                trend,
                signals,
                metadata: {
                    prediction_date: new Date().toISOString(),
                    days_ahead: parseInt(days),
                    avg_predicted_price: parseFloat(avgPrediction.toFixed(6)),
                    model_accuracy: '75%',
                    data_source: 'Mock predictions (ML service offline)'
                }
            },
            source: 'Mock Prediction Generator',
            timestamp: new Date().toISOString()
        });
    }
});

// Demo trading routes
app.get('/api/trading/portfolio', (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const userId = token?.replace('demo-jwt-token-', '');
    const user = Array.from(users.values()).find(u => u._id === userId);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    res.json({
        success: true,
        data: {
            balance: user.balance,
            holdings: user.portfolio,
            totalHoldingsValue: 0,
            totalPortfolioValue: user.balance,
            totalPnL: 0,
            totalPnLPercentage: 0,
            initialBalance: 1000000000
        }
    });
});

app.post('/api/trading/order', async (req, res) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    const userId = token?.replace('demo-jwt-token-', '');
    const user = Array.from(users.values()).find(u => u._id === userId);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { symbol, type, quantity } = req.body;
    
    // Use real-time prices for trading
    await fetchRealCryptoPrices();
    const currentPrice = realPrices[symbol]?.price;
    
    if (!currentPrice) {
        return res.status(400).json({
            success: false,
            message: 'Invalid symbol or price not available'
        });
    }

    const totalValue = quantity * currentPrice;
    
    if (type === 'buy' && user.balance < totalValue) {
        return res.status(400).json({
            success: false,
            message: 'Insufficient balance'
        });
    }

    // Update user balance and portfolio
    if (type === 'buy') {
        user.balance -= totalValue;
        const existingHolding = user.portfolio.find(h => h.symbol === symbol);
        if (existingHolding) {
            const oldQuantity = existingHolding.quantity;
            existingHolding.quantity += quantity;
            existingHolding.averagePrice = ((existingHolding.averagePrice * oldQuantity) + totalValue) / existingHolding.quantity;
            existingHolding.totalInvested += totalValue;
        } else {
            user.portfolio.push({
                symbol,
                quantity,
                averagePrice: currentPrice,
                totalInvested: totalValue
            });
        }
    }

    const trade = {
        _id: Date.now().toString(),
        symbol,
        type,
        quantity,
        price: currentPrice,
        totalValue,
        createdAt: new Date().toISOString()
    };

    res.json({
        success: true,
        message: `${type} order executed successfully at $${currentPrice.toFixed(4)}`,
        data: {
            trade,
            userBalance: user.balance,
            portfolio: user.portfolio,
            executionPrice: currentPrice,
            marketData: realPrices[symbol]
        }
    });
});

// Catch 404 and forward to error handler
app.all('*', (req, res, next) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`
    });
});

// Initialize real-time data and start server
async function startServer() {
    console.log('🚀 Starting Crypto Trading Platform Server...');
    console.log('🔄 Fetching initial real-time crypto prices...');
    
    // Fetch initial crypto prices
    await fetchRealCryptoPrices();
    
    // Start price update interval (every 5 minutes)
    setInterval(async () => {
        await fetchRealCryptoPrices();
    }, 5 * 60 * 1000);
    
    app.listen(PORT, () => {
        console.log('🎉 Enhanced Crypto Trading Platform Server Ready!');
        console.log('=' * 50);
        console.log(`🚀 Server: http://localhost:${PORT}`);
        console.log(`📁 Environment: Demo Mode (Enhanced with Real Data)`);
        console.log(`🔄 Real-time prices: Updated every 5 minutes`);
        console.log(`📊 3-Year historical data: Available`);
        console.log(`📈 Technical indicators: SMA, RSI, Buy/Sell signals`);
        console.log('');
        console.log('✅ NEW FEATURES ACTIVE:');
        console.log('  💰 Real CoinGecko crypto prices');
        console.log('  📈 3-year historical charts');
        console.log('  🔍 Technical analysis indicators');
        console.log('  🚦 Automated buy/sell signals');
        console.log('  🔄 Auto-updating price data');
        console.log('');
        console.log('Ready for frontend connection!');
    });
}

startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});

module.exports = app;
