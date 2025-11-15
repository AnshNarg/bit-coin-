from flask import Flask, jsonify, request
from flask_cors import CORS
import tensorflow as tf
import joblib
import numpy as np
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import json
import os

app = Flask(__name__)
CORS(app)

class PredictionService:
    def __init__(self):
        self.crypto_symbols = {
            'BTC-USD': 'Bitcoin',
            'ETH-USD': 'Ethereum', 
            'DOGE-USD': 'Dogecoin',
            'SOL-USD': 'Solana'
        }
        self.models = {}
        self.scalers = {}
        self.sequence_length = 60
        self.load_models()
    
    def load_models(self):
        """Load all trained models and scalers"""
        for symbol in self.crypto_symbols.keys():
            model_dir = f"models/{symbol.replace('-', '_')}"
            try:
                if os.path.exists(f"{model_dir}/model.h5"):
                    self.models[symbol] = tf.keras.models.load_model(f"{model_dir}/model.h5")
                    self.scalers[symbol] = joblib.load(f"{model_dir}/scaler.pkl")
                    print(f"✅ Loaded model for {symbol}")
                else:
                    print(f"⚠️  No model found for {symbol}")
            except Exception as e:
                print(f"❌ Error loading model for {symbol}: {e}")
    
    def prepare_features(self, data):
        """Add technical indicators as features"""
        df = data.copy()
        
        # Moving averages
        df['MA_7'] = df['Close'].rolling(window=7).mean()
        df['MA_21'] = df['Close'].rolling(window=21).mean()
        df['MA_50'] = df['Close'].rolling(window=50).mean()
        
        # RSI
        delta = df['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df['RSI'] = 100 - (100 / (1 + rs))
        
        # Bollinger Bands
        df['BB_middle'] = df['Close'].rolling(window=20).mean()
        bb_std = df['Close'].rolling(window=20).std()
        df['BB_upper'] = df['BB_middle'] + (bb_std * 2)
        df['BB_lower'] = df['BB_middle'] - (bb_std * 2)
        df['BB_position'] = (df['Close'] - df['BB_lower']) / (df['BB_upper'] - df['BB_lower'])
        
        # Volatility
        df['Volatility'] = df['Close'].rolling(window=10).std()
        
        # Volume indicators
        df['Volume_MA'] = df['Volume'].rolling(window=10).mean()
        df['Volume_ratio'] = df['Volume'] / df['Volume_MA']
        
        # Price change indicators
        df['Price_change'] = df['Close'].pct_change()
        df['High_low_ratio'] = df['High'] / df['Low']
        
        # Drop rows with NaN values
        df = df.dropna()
        
        return df
    
    def fetch_crypto_data(self, symbol, period="1y"):
        """Fetch historical crypto data"""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period)
            return data
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return None
    
    def predict_prices(self, symbol, days=10):
        """Predict prices for next N days"""
        if symbol not in self.models:
            return None
        
        model = self.models[symbol]
        scaler = self.scalers[symbol]
        
        # Get recent data
        data = self.fetch_crypto_data(symbol, period="1y")
        if data is None:
            return None
            
        data_with_features = self.prepare_features(data)
        
        # Get last sequence
        feature_columns = ['Open', 'High', 'Low', 'Close', 'Volume', 
                          'MA_7', 'MA_21', 'MA_50', 'RSI', 'BB_position', 
                          'Volatility', 'Volume_ratio', 'Price_change', 'High_low_ratio']
        
        scaled_data = scaler.transform(data_with_features[feature_columns])
        last_sequence = scaled_data[-self.sequence_length:].reshape(1, self.sequence_length, -1)
        
        # Predict next days
        predictions = []
        current_sequence = last_sequence.copy()
        
        for _ in range(days):
            pred = model.predict(current_sequence, verbose=0)
            predictions.append(pred[0, 0])
            
            # Update sequence (simplified)
            new_row = current_sequence[0, -1, :].copy()
            new_row[3] = pred[0, 0]  # Update close price
            
            current_sequence = np.roll(current_sequence, -1, axis=1)
            current_sequence[0, -1, :] = new_row
        
        # Inverse transform predictions
        dummy_pred = np.zeros((len(predictions), len(scaler.scale_)))
        for i, pred in enumerate(predictions):
            dummy_pred[i, 3] = pred
        
        actual_predictions = scaler.inverse_transform(dummy_pred)[:, 3]
        
        # Create prediction dates
        last_date = data_with_features.index[-1]
        pred_dates = [last_date + timedelta(days=i+1) for i in range(days)]
        
        # Calculate trend and confidence
        current_price = float(data_with_features['Close'].iloc[-1])
        avg_prediction = float(np.mean(actual_predictions))
        trend = "bullish" if avg_prediction > current_price else "bearish"
        
        # Generate trading signals
        signals = self.generate_trading_signals(symbol, actual_predictions, current_price)
        
        return {
            'symbol': symbol,
            'crypto_name': self.crypto_symbols[symbol],
            'current_price': current_price,
            'predictions': [
                {
                    'date': date.strftime('%Y-%m-%d'),
                    'price': float(price)
                }
                for date, price in zip(pred_dates, actual_predictions)
            ],
            'trend': trend,
            'signals': signals,
            'metadata': {
                'prediction_date': datetime.now().isoformat(),
                'days_ahead': days,
                'avg_predicted_price': avg_prediction
            }
        }
    
    def generate_trading_signals(self, symbol, predictions, current_price):
        """Generate buy/sell signals based on predictions"""
        signals = []
        
        # Simple signal generation logic
        for i, price in enumerate(predictions):
            if i == 0:
                change_pct = ((price - current_price) / current_price) * 100
            else:
                change_pct = ((price - predictions[i-1]) / predictions[i-1]) * 100
            
            if change_pct > 5:
                signal = "strong_buy"
            elif change_pct > 2:
                signal = "buy"
            elif change_pct < -5:
                signal = "strong_sell"
            elif change_pct < -2:
                signal = "sell"
            else:
                signal = "hold"
            
            signals.append({
                'day': i + 1,
                'signal': signal,
                'confidence': min(abs(change_pct) / 10, 1.0),  # Normalize confidence
                'change_pct': round(change_pct, 2)
            })
        
        return signals

# Initialize prediction service
prediction_service = PredictionService()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ML Prediction API',
        'timestamp': datetime.now().isoformat(),
        'available_models': list(prediction_service.models.keys())
    })

@app.route('/predictions/<symbol>', methods=['GET'])
def get_predictions(symbol):
    """Get predictions for a specific crypto symbol"""
    # Validate symbol
    if symbol.upper() not in [s.replace('-USD', '').upper() for s in prediction_service.crypto_symbols.keys()]:
        return jsonify({
            'error': 'Invalid symbol',
            'available_symbols': list(prediction_service.crypto_symbols.keys())
        }), 400
    
    # Convert to Yahoo Finance format
    yf_symbol = f"{symbol.upper()}-USD"
    
    # Get number of days from query params (default: 10)
    days = request.args.get('days', default=10, type=int)
    days = min(max(days, 1), 30)  # Limit between 1 and 30 days
    
    try:
        result = prediction_service.predict_prices(yf_symbol, days)
        
        if result is None:
            return jsonify({
                'error': 'Failed to generate predictions',
                'message': 'Model not available or data fetch failed'
            }), 500
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            'error': 'Internal server error',
            'message': str(e)
        }), 500

@app.route('/predictions/batch', methods=['POST'])
def get_batch_predictions():
    """Get predictions for multiple crypto symbols"""
    data = request.get_json()
    
    if not data or 'symbols' not in data:
        return jsonify({
            'error': 'Invalid request',
            'message': 'Please provide "symbols" array in request body'
        }), 400
    
    symbols = data['symbols']
    days = data.get('days', 10)
    days = min(max(days, 1), 30)
    
    results = {}
    
    for symbol in symbols:
        if symbol.upper() in [s.replace('-USD', '').upper() for s in prediction_service.crypto_symbols.keys()]:
            yf_symbol = f"{symbol.upper()}-USD"
            try:
                result = prediction_service.predict_prices(yf_symbol, days)
                if result:
                    results[symbol] = result
            except Exception as e:
                results[symbol] = {'error': str(e)}
    
    return jsonify({
        'batch_predictions': results,
        'request_timestamp': datetime.now().isoformat()
    })

@app.route('/available-symbols', methods=['GET'])
def get_available_symbols():
    """Get list of available crypto symbols"""
    return jsonify({
        'symbols': [
            {
                'symbol': symbol.replace('-USD', ''),
                'name': name,
                'yf_symbol': symbol,
                'has_model': symbol in prediction_service.models
            }
            for symbol, name in prediction_service.crypto_symbols.items()
        ]
    })

@app.route('/model-info/<symbol>', methods=['GET'])
def get_model_info(symbol):
    """Get model information and metadata"""
    yf_symbol = f"{symbol.upper()}-USD"
    
    if yf_symbol not in prediction_service.crypto_symbols:
        return jsonify({'error': 'Invalid symbol'}), 400
    
    model_dir = f"models/{yf_symbol.replace('-', '_')}"
    metadata_file = f"{model_dir}/metadata.json"
    
    try:
        if os.path.exists(metadata_file):
            with open(metadata_file, 'r') as f:
                metadata = json.load(f)
            return jsonify(metadata)
        else:
            return jsonify({'error': 'Model metadata not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("🤖 Starting ML Prediction API Server...")
    print("Available endpoints:")
    print("  GET  /health")
    print("  GET  /predictions/<symbol>?days=10")
    print("  POST /predictions/batch")
    print("  GET  /available-symbols")
    print("  GET  /model-info/<symbol>")
    
    app.run(host='0.0.0.0', port=5001, debug=True)
