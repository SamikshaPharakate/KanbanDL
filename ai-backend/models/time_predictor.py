import os
import pickle
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler

MODEL_PATH = os.path.join(os.path.dirname(__file__), "time_predictor.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "time_scaler.pkl")

class TimePredictor:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.load_model()
        
    def load_model(self):
        """Load the model and scaler from disk if they exist, otherwise initialize and train with synthetic data."""
        if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    self.model = pickle.load(f)
                with open(SCALER_PATH, "rb") as f:
                    self.scaler = pickle.load(f)
                print("Time predictor loaded successfully from disk.")
                return
            except Exception as e:
                print(f"Error loading model from disk: {e}. Reinitializing...")
        
        self.train_default_model()

    def train_default_model(self):
        """Train a default Multi-Layer Perceptron (Deep Learning) model on synthetic baseline data."""
        print("Training default completion time predictor model...")
        
        # Synthetic Data Generation
        # Features: [priority (1-3), num_subtasks, text_length, avg_user_completion_time (hours), energy_required (1-5)]
        np.random.seed(42)
        n_samples = 500
        
        priority = np.random.randint(1, 4, n_samples)  # 1=Low, 2=Medium, 3=High
        num_subtasks = np.random.randint(0, 10, n_samples)
        text_length = np.random.randint(10, 300, n_samples)
        avg_user_completion_time = np.random.uniform(1.0, 40.0, n_samples)
        energy_required = np.random.randint(1, 6, n_samples)
        
        X = np.column_stack((priority, num_subtasks, text_length, avg_user_completion_time, energy_required))
        
        # Ground truth completion time calculation (with noise)
        # Higher priority tasks take a bit longer but get rushed, subtasks add linear time,
        # text_length indicates complexity, user's average sets the base, energy required adds time.
        y = (priority * 1.5) + (num_subtasks * 2.0) + (text_length * 0.02) + (avg_user_completion_time * 0.8) + (energy_required * 1.2)
        y += np.random.normal(0, 2.0, n_samples)  # add noise
        y = np.clip(y, 0.5, 120.0)  # clip values to logical bounds (30 mins to 120 hours)
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # MLP Regressor (Neural Network)
        # 2 hidden layers (64 nodes and 32 nodes), relu activation, adam optimizer
        self.model = MLPRegressor(
            hidden_layer_sizes=(64, 32),
            activation="relu",
            solver="adam",
            max_iter=1000,
            random_state=42
        )
        
        self.model.fit(X_scaled, y)
        self.save_model()
        print("Default completion time predictor model trained and saved successfully.")

    def save_model(self):
        """Save current model state and scaler to files."""
        try:
            os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
            with open(MODEL_PATH, "wb") as f:
                pickle.dump(self.model, f)
            with open(SCALER_PATH, "wb") as f:
                pickle.dump(self.scaler, f)
        except Exception as e:
            print(f"Failed to save model: {e}")

    def predict(self, priority: int, num_subtasks: int, text_length: int, avg_user_completion_time: float, energy_required: int) -> float:
        """Predict the task completion time in hours based on input features."""
        if self.model is None or self.scaler is None:
            self.load_model()
            
        features = np.array([[priority, num_subtasks, text_length, avg_user_completion_time, energy_required]])
        features_scaled = self.scaler.transform(features)
        
        prediction = self.model.predict(features_scaled)[0]
        # Return logical minimum of 0.5 hours
        return float(max(0.5, round(prediction, 1)))

    def retrain(self, history_data: list):
        """Retrain the model dynamically using real task history from MongoDB.
        
        history_data elements structure:
        {
            'priority': int, (1, 2, 3)
            'num_subtasks': int,
            'text_length': int,
            'avg_user_completion_time': float,
            'energy_required': int,
            'actual_time': float
        }
        """
        if len(history_data) < 10:
            print("Insufficient retraining data. Need at least 10 items.")
            return False
            
        try:
            df = pd.DataFrame(history_data)
            X = df[['priority', 'num_subtasks', 'text_length', 'avg_user_completion_time', 'energy_required']].values
            y = df['actual_time'].values
            
            # Re-scale
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Re-initialize and fit MLP
            self.model = MLPRegressor(
                hidden_layer_sizes=(64, 32),
                activation="relu",
                solver="adam",
                max_iter=1500,
                random_state=42
            )
            self.model.fit(X_scaled, y)
            self.save_model()
            print("Model retrained successfully with user history data.")
            return True
        except Exception as e:
            print(f"Error during model retraining: {e}")
            return False

# Export instance
time_predictor = TimePredictor()
