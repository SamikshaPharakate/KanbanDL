import os
import pickle
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPClassifier
from sklearn.preprocessing import StandardScaler

PROD_MODEL_PATH = os.path.join(os.path.dirname(__file__), "prod_classifier.pkl")
BURN_MODEL_PATH = os.path.join(os.path.dirname(__file__), "burn_classifier.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "prod_scaler.pkl")

class ProductivityPredictor:
    def __init__(self):
        self.prod_model = None
        self.burn_model = None
        self.scaler = None
        self.load_models()
        
    def load_models(self):
        """Load the classifiers and scaler from disk, or train with defaults if not present."""
        if (os.path.exists(PROD_MODEL_PATH) and 
            os.path.exists(BURN_MODEL_PATH) and 
            os.path.exists(SCALER_PATH)):
            try:
                with open(PROD_MODEL_PATH, "rb") as f:
                    self.prod_model = pickle.load(f)
                with open(BURN_MODEL_PATH, "rb") as f:
                    self.burn_model = pickle.load(f)
                with open(SCALER_PATH, "rb") as f:
                    self.scaler = pickle.load(f)
                print("Productivity and burnout models loaded successfully.")
                return
            except Exception as e:
                print(f"Error loading models: {e}. Reinitializing...")
                
        self.train_default_models()

    def train_default_models(self):
        """Train default neural network classifiers on logical synthetic data."""
        print("Training default productivity & burnout classifiers...")
        
        np.random.seed(101)
        n_samples = 600
        
        # Features: [streak_length (days), focus_hours, tasks_completed, energy_level (1-5)]
        streak_length = np.random.randint(0, 30, n_samples)
        focus_hours = np.random.uniform(0.5, 12.0, n_samples)
        tasks_completed = np.random.randint(0, 15, n_samples)
        energy_level = np.random.randint(1, 6, n_samples) # 1=low, 5=high
        
        X = np.column_stack((streak_length, focus_hours, tasks_completed, energy_level))
        
        # Compute labels for productivity zone: 0=Low, 1=Normal, 2=Hyper-focused
        # High focus hours + completed tasks leads to Hyper-focused. Low focus = Low.
        y_prod = []
        for i in range(n_samples):
            score = (focus_hours[i] * 2.0) + (tasks_completed[i] * 1.5) + (energy_level[i] * 1.0)
            if score < 8.0:
                y_prod.append(0)  # Low
            elif score > 20.0:
                y_prod.append(2)  # Hyper-focused
            else:
                y_prod.append(1)  # Normal
        y_prod = np.array(y_prod)
        
        # Compute labels for burnout risk: 0=Low, 1=Moderate, 2=High
        # Very high focus hours, long streaks, low energy levels lead to High burnout risk.
        y_burn = []
        for i in range(n_samples):
            risk_score = (focus_hours[i] * 2.5) + (streak_length[i] * 0.5) - (energy_level[i] * 2.0)
            if risk_score < 5.0:
                y_burn.append(0)  # Low
            elif risk_score > 15.0:
                y_burn.append(2)  # High
            else:
                y_burn.append(1)  # Moderate
        y_burn = np.array(y_burn)
        
        # Scale features
        self.scaler = StandardScaler()
        X_scaled = self.scaler.fit_transform(X)
        
        # Train Productivity Neural Network Classifier
        self.prod_model = MLPClassifier(
            hidden_layer_sizes=(32, 16),
            activation="relu",
            solver="adam",
            max_iter=1000,
            random_state=101
        )
        self.prod_model.fit(X_scaled, y_prod)
        
        # Train Burnout Neural Network Classifier
        self.burn_model = MLPClassifier(
            hidden_layer_sizes=(32, 16),
            activation="relu",
            solver="adam",
            max_iter=1000,
            random_state=102
        )
        self.burn_model.fit(X_scaled, y_burn)
        
        self.save_models()
        print("Default productivity & burnout models trained and saved.")

    def save_models(self):
        """Save models and scaler to disk."""
        try:
            os.makedirs(os.path.dirname(PROD_MODEL_PATH), exist_ok=True)
            with open(PROD_MODEL_PATH, "wb") as f:
                pickle.dump(self.prod_model, f)
            with open(BURN_MODEL_PATH, "wb") as f:
                pickle.dump(self.burn_model, f)
            with open(SCALER_PATH, "wb") as f:
                pickle.dump(self.scaler, f)
        except Exception as e:
            print(f"Failed to save models: {e}")

    def predict(self, streak_length: int, focus_hours: float, tasks_completed: int, energy_level: int) -> dict:
        """Predict productivity level and burnout risk.
        
        Returns:
            dict: {
                'productivity_zone': 'Low' | 'Normal' | 'Hyper-focused',
                'burnout_risk': 'Low' | 'Moderate' | 'High'
            }
        """
        if self.prod_model is None or self.burn_model is None or self.scaler is None:
            self.load_models()
            
        features = np.array([[streak_length, focus_hours, tasks_completed, energy_level]])
        features_scaled = self.scaler.transform(features)
        
        prod_class = self.prod_model.predict(features_scaled)[0]
        burn_class = self.burn_model.predict(features_scaled)[0]
        
        prod_map = {0: "Low", 1: "Normal", 2: "Hyper-focused"}
        burn_map = {0: "Low", 1: "Moderate", 2: "High"}
        
        return {
            "productivity_zone": prod_map.get(prod_class, "Normal"),
            "burnout_risk": burn_map.get(burn_class, "Moderate")
        }

    def retrain(self, history_data: list):
        """Retrain models with user activity history.
        
        Each item structure:
        {
            'streak_length': int,
            'focus_hours': float,
            'tasks_completed': int,
            'energy_level': int,
            'productivity_class': int, (0, 1, 2)
            'burnout_class': int (0, 1, 2)
        }
        """
        if len(history_data) < 10:
            print("Insufficient retraining data for productivity model.")
            return False
            
        try:
            df = pd.DataFrame(history_data)
            X = df[['streak_length', 'focus_hours', 'tasks_completed', 'energy_level']].values
            y_prod = df['productivity_class'].values
            y_burn = df['burnout_class'].values
            
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)
            
            # Retrain productivity classifier
            self.prod_model = MLPClassifier(
                hidden_layer_sizes=(32, 16),
                activation="relu",
                solver="adam",
                max_iter=1200,
                random_state=101
            )
            self.prod_model.fit(X_scaled, y_prod)
            
            # Retrain burnout classifier
            self.burn_model = MLPClassifier(
                hidden_layer_sizes=(32, 16),
                activation="relu",
                solver="adam",
                max_iter=1200,
                random_state=102
            )
            self.burn_model.fit(X_scaled, y_burn)
            
            self.save_models()
            print("Productivity & burnout models retrained and saved successfully.")
            return True
        except Exception as e:
            print(f"Error retraining productivity models: {e}")
            return False

# Export instance
productivity_predictor = ProductivityPredictor()
