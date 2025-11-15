import pandas as pd
import numpy as np
import yfinance as yf
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import os
from datetime import datetime, timedelta
import json

class CryptoPredictionModel:
    def __init__(self, sequence_length=60):
        self.sequence_length = sequence_length
        self.scaler = MinMaxScaler(feature_range=(0, 1))
        self.model = None
        self.crypto_symbols = {
            'BTC-USD': 'Bitcoin',
            'ETH-USD': 'Ethereum', 
            'DOGE-USD': 'Dogecoin',
            'SOL-USD': 'Solana'
        }
        
    def fetch_crypto_data(self, symbol, period="3y"):
        """Fetch historical crypto data"""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period)
            return data
        except Exception as e:
            print(f"Error fetching data for {symbol}: {e}")
            return None
    
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
    
    def create_sequences(self, data, target_column='Close'):
        """Create sequences for LSTM training"""
        feature_columns = ['Open', 'High', 'Low', 'Close', 'Volume', 
                          'MA_7', 'MA_21', 'MA_50', 'RSI', 'BB_position', 
                          'Volatility', 'Volume_ratio', 'Price_change', 'High_low_ratio']
        
        # Scale the features
        scaled_data = self.scaler.fit_transform(data[feature_columns])
        
        X, y = [], []
        for i in range(self.sequence_length, len(scaled_data)):
            X.append(scaled_data[i-self.sequence_length:i])
            # Predict next day's closing price (index 3 is Close price)
            y.append(scaled_data[i, 3])
            
        return np.array(X), np.array(y)
    
    def build_model(self, input_shape):
        """Build LSTM model"""
        model = Sequential([
            LSTM(50, return_sequences=True, input_shape=input_shape),
            Dropout(0.2),
            LSTM(50, return_sequences=True),
            Dropout(0.2),
            LSTM(50, return_sequences=False),
            Dropout(0.2),
            Dense(25),
            Dense(1)
        ])
        
        model.compile(optimizer='adam', loss='mse', metrics=['mae'])
        return model
    
    def train_for_symbol(self, symbol):
        """Train model for a specific crypto symbol"""
        print(f"\n🚀 Training model for {self.crypto_symbols[symbol]}...")
        
        # Fetch data
        data = self.fetch_crypto_data(symbol)
        if data is None:
            return None
            
        # Prepare features
        data_with_features = self.prepare_features(data)
        
        # Create sequences
        X, y = self.create_sequences(data_with_features)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, shuffle=False
        )
        
        print(f"Training data shape: {X_train.shape}")
        print(f"Test data shape: {X_test.shape}")
        
        # Build and train model
        model = self.build_model((X_train.shape[1], X_train.shape[2]))
        
        # Training with early stopping
        early_stopping = tf.keras.callbacks.EarlyStopping(
            monitor='val_loss', patience=10, restore_best_weights=True
        )
        
        history = model.fit(
            X_train, y_train,
            epochs=50,
            batch_size=32,
            validation_data=(X_test, y_test),
            callbacks=[early_stopping],
            verbose=1
        )
        
        # Evaluate model
        train_pred = model.predict(X_train)
        test_pred = model.predict(X_test)
        
        # Inverse transform predictions (only for Close price column)
        # Create dummy array with same shape as original features
        dummy_train = np.zeros((len(train_pred), len(self.scaler.scale_)))
        dummy_test = np.zeros((len(test_pred), len(self.scaler.scale_)))
        
        dummy_train[:, 3] = train_pred.flatten()  # Close price is at index 3
        dummy_test[:, 3] = test_pred.flatten()
        
        dummy_train_actual = np.zeros((len(y_train), len(self.scaler.scale_)))
        dummy_test_actual = np.zeros((len(y_test), len(self.scaler.scale_)))
        
        dummy_train_actual[:, 3] = y_train
        dummy_test_actual[:, 3] = y_test
        
        train_pred_actual = self.scaler.inverse_transform(dummy_train)[:, 3]
        test_pred_actual = self.scaler.inverse_transform(dummy_test)[:, 3]
        
        train_actual = self.scaler.inverse_transform(dummy_train_actual)[:, 3]
        test_actual = self.scaler.inverse_transform(dummy_test_actual)[:, 3]
        
        # Calculate metrics
        train_rmse = np.sqrt(mean_squared_error(train_actual, train_pred_actual))
        test_rmse = np.sqrt(mean_squared_error(test_actual, test_pred_actual))
        train_mae = mean_absolute_error(train_actual, train_pred_actual)
        test_mae = mean_absolute_error(test_actual, test_pred_actual)
        
        print(f"\n📊 Model Performance for {symbol}:")
        print(f"Train RMSE: ${train_rmse:.2f}")
        print(f"Test RMSE: ${test_rmse:.2f}")
        print(f"Train MAE: ${train_mae:.2f}")
        print(f"Test MAE: ${test_mae:.2f}")
        
        # Save model and scaler
        model_dir = f"models/{symbol.replace('-', '_')}"
        os.makedirs(model_dir, exist_ok=True)
        
        model.save(f"{model_dir}/model.h5")
        joblib.dump(self.scaler, f"{model_dir}/scaler.pkl")
        
        # Save model metadata
        metadata = {
            'symbol': symbol,
            'crypto_name': self.crypto_symbols[symbol],
            'sequence_length': self.sequence_length,
            'train_rmse': float(train_rmse),
            'test_rmse': float(test_rmse),
            'train_mae': float(train_mae),
            'test_mae': float(test_mae),
            'training_date': datetime.now().isoformat(),
            'data_shape': data_with_features.shape
        }
        
        with open(f"{model_dir}/metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        return {
            'model': model,
            'scaler': self.scaler,
            'metadata': metadata,
            'history': history.history
        }
    
    def predict_next_days(self, symbol, days=10):
        """Predict prices for next N days"""
        # Load trained model and scaler
        model_dir = f"models/{symbol.replace('-', '_')}"
        
        try:
            model = tf.keras.models.load_model(f"{model_dir}/model.h5")
            scaler = joblib.load(f"{model_dir}/scaler.pkl")
        except:
            print(f"No trained model found for {symbol}. Please train first.")
            return None
        
        # Get recent data
        data = self.fetch_crypto_data(symbol, period="1y")
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
            
            # Update sequence (simplified - in reality, you'd need to update all features)
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
        
        return {
            'dates': pred_dates,
            'predictions': actual_predictions.tolist(),
            'current_price': float(data_with_features['Close'].iloc[-1])
        }

def main():
    """Main training function"""
    print("🔥 Crypto Price Prediction Model Training")
    print("=" * 50)
    
    # Create models directory
    os.makedirs("models", exist_ok=True)
    
    # Initialize model
    predictor = CryptoPredictionModel()
    
    # Train for all crypto symbols
    results = {}
    for symbol in predictor.crypto_symbols.keys():
        try:
            result = predictor.train_for_symbol(symbol)
            if result:
                results[symbol] = result
                print(f"✅ Successfully trained model for {symbol}")
            else:
                print(f"❌ Failed to train model for {symbol}")
        except Exception as e:
            print(f"❌ Error training {symbol}: {e}")
    
    # Generate sample predictions
    print("\n🔮 Generating sample predictions...")
    for symbol in results.keys():
        pred_result = predictor.predict_next_days(symbol, days=10)
        if pred_result:
            print(f"\n{predictor.crypto_symbols[symbol]} predictions:")
            print(f"Current price: ${pred_result['current_price']:.2f}")
            print(f"10-day predictions: {[f'${p:.2f}' for p in pred_result['predictions'][:3]]}...")
    
    print("\n🎉 Training completed!")
    print("Model files saved in 'models/' directory")

if __name__ == "__main__":
    main()
