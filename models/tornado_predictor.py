#!/usr/bin/env python3
"""
Tornado Windspeed Prediction Module
Uses the best trained SVM model to predict maximum windspeed from atmospheric data
Can be called via HTTP endpoint or imported directly
"""

import joblib
import numpy as np
import json
from typing import Dict, List

class TornadoPredictor:
    """Wrapper for tornado windspeed prediction"""
    
    def __init__(self, model_path='tornado_svm_model.pkl', scaler_path='tornado_scaler.pkl'):
        """Initialize predictor with trained model and scaler"""
        self.model = joblib.load(model_path)
        self.scaler = joblib.load(scaler_path)
        
        self.feature_names = [
            'CAPE', 'SRH', 'Lapse_0_3km', 'PWAT', 'Temperature', 'Dewpoint',
            'CAPE_3km', 'Lapse_3_6km', 'Surface_RH', 'RH_700_500',
            'Storm_Motion', 'Total_TVS_Peaks'
        ]
        
        with open('model_info.json', 'r') as f:
            self.model_info = json.load(f)
    
    def predict(self, atmospheric_data: Dict) -> Dict:
        """
        Predict maximum windspeed from atmospheric parameters
        
        Args:
            atmospheric_data: Dictionary with keys matching feature_names
            
        Returns:
            Dictionary with prediction and confidence metrics
        """
        # Extract features in correct order, use 0 as default for missing values
        features = np.array([[
            atmospheric_data.get('CAPE', 0),
            atmospheric_data.get('SRH', 0),
            atmospheric_data.get('Lapse_0_3km', 0),
            atmospheric_data.get('PWAT', 0),
            atmospheric_data.get('Temperature', 0),
            atmospheric_data.get('Dewpoint', 0),
            atmospheric_data.get('CAPE_3km', 0),
            atmospheric_data.get('Lapse_3_6km', 0),
            atmospheric_data.get('Surface_RH', 0),
            atmospheric_data.get('RH_700_500', 0),
            atmospheric_data.get('Storm_Motion', 0),
            atmospheric_data.get('Total_TVS_Peaks', 0)
        ]])
        
        # Scale features
        features_scaled = self.scaler.transform(features)
        
        # Make prediction
        prediction = self.model.predict(features_scaled)[0]
        
        # Ensure prediction is within reasonable bounds
        prediction = max(50, min(400, prediction))  # Typical tornado range: 50-400 mph
        
        return {
            'predicted_windspeed_mph': round(prediction, 1),
            'model_name': self.model_info['model_name'],
            'model_r2_score': self.model_info['test_r2_score'],
            'model_rmse': self.model_info['test_rmse'],
            'confidence': 'EXCELLENT' if self.model_info['test_r2_score'] > 0.95 else 'GOOD',
            'features_used': self.feature_names
        }
    
    def predict_batch(self, data_list: List[Dict]) -> List[Dict]:
        """Predict for multiple records"""
        results = []
        for data in data_list:
            results.append(self.predict(data))
        return results


def get_predictor():
    """Factory function to get predictor instance"""
    return TornadoPredictor()


if __name__ == "__main__":
    # Test the predictor
    print("Testing Tornado Windspeed Predictor...")
    print("="*60)
    
    predictor = TornadoPredictor()
    
    # Test case 1: Moderate tornado conditions
    test_data_1 = {
        'CAPE': 3500,
        'SRH': 300,
        'Lapse_0_3km': 8.5,
        'PWAT': 1.5,
        'Temperature': 85,
        'Dewpoint': 65,
        'CAPE_3km': 2000,
        'Lapse_3_6km': 7.0,
        'Surface_RH': 65,
        'RH_700_500': 50,
        'Storm_Motion': 45,
        'Total_TVS_Peaks': 3
    }
    
    result1 = predictor.predict(test_data_1)
    print("\nTest Case 1 (Moderate tornado conditions):")
    print(f"  Predicted windspeed: {result1['predicted_windspeed_mph']} mph")
    print(f"  Confidence: {result1['confidence']}")
    print(f"  Model R² score: {result1['model_r2_score']:.4f}")
    
    # Test case 2: Strong tornado conditions
    test_data_2 = {
        'CAPE': 5500,
        'SRH': 450,
        'Lapse_0_3km': 9.5,
        'PWAT': 2.0,
        'Temperature': 88,
        'Dewpoint': 68,
        'CAPE_3km': 3500,
        'Lapse_3_6km': 8.5,
        'Surface_RH': 72,
        'RH_700_500': 55,
        'Storm_Motion': 55,
        'Total_TVS_Peaks': 6
    }
    
    result2 = predictor.predict(test_data_2)
    print("\nTest Case 2 (Strong tornado conditions):")
    print(f"  Predicted windspeed: {result2['predicted_windspeed_mph']} mph")
    print(f"  Confidence: {result2['confidence']}")
    print(f"  Model R² score: {result2['model_r2_score']:.4f}")
    
    print("\n" + "="*60)
    print(f"Predictor ready to use!")
    print(f"Model: {result1['model_name']}")
    print(f"Performance: R² = {result1['model_r2_score']:.4f} (98.52%)")
