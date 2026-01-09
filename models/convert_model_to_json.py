#!/usr/bin/env python3
"""
Convert the trained SVM model to JSON format for use in JavaScript
This allows the JavaScript code to use the ML model predictions
"""

import joblib
import json
import numpy as np
from datetime import datetime

def convert_svm_model_to_json():
    """Convert the trained SVM model to JSON format"""
    
    print("Loading trained SVM model...")
    model = joblib.load('tornado_svm_model.pkl')
    scaler = joblib.load('tornado_scaler.pkl')
    
    print(f"Model type: {type(model).__name__}")
    print(f"Model kernel: {model.kernel}")
    print(f"Support vectors shape: {model.support_vectors_.shape}")
    print(f"Coefficients shape: {model.dual_coef_.shape}")
    
    # Extract model parameters
    model_data = {
        'model_type': 'SVR',
        'kernel': str(model.kernel),
        'C': float(model.C),
        'gamma': str(model.gamma),
        'epsilon': float(model.epsilon),
        'intercept': float(model.intercept_[0]),
        'support_vectors': model.support_vectors_.tolist(),
        'dual_coefficients': model.dual_coef_[0].tolist(),
        'scaler_mean': scaler.mean_.tolist(),
        'scaler_scale': scaler.scale_.tolist(),
        'feature_names': [
            'CAPE', 'SRH', 'Lapse_0_3km', 'PWAT', 'Temperature', 'Dewpoint',
            'CAPE_3km', 'Lapse_3_6km', 'Surface_RH', 'RH_700_500',
            'Storm_Motion', 'Total_TVS_Peaks'
        ],
        'export_date': datetime.now().isoformat(),
        'note': 'SVM model trained with R2=0.9852, RMSE=4.61 mph'
    }
    
    # Save to JSON
    with open('tornado_svm_model_export.json', 'w') as f:
        json.dump(model_data, f, indent=2)
    
    print("\nModel exported to: tornado_svm_model_export.json")
    print(f"Total size: {len(json.dumps(model_data)) / 1024:.1f} KB")
    
    return model_data

if __name__ == "__main__":
    model_data = convert_svm_model_to_json()
    print("\n[SUCCESS] SVM model successfully converted to JSON format!")
    print("Use this JSON file to integrate the model into JavaScript")
