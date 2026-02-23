import joblib
import json
import numpy as np

# Load the trained Random Forest model
model = joblib.load('tornado_random_forest_model.pkl')
scaler = joblib.load('tornado_scaler.pkl')

# Extract model parameters for JavaScript
def extract_random_forest_model(model, scaler):
    """Extract Random Forest model data for JavaScript usage"""
    
    # Get feature importance
    feature_importance = dict(zip(
        ['CAPE', 'SRH', 'Lapse_0_3km', 'PWAT', 'Temperature', 'Dewpoint',
         'CAPE_3km', 'Lapse_3_6km', 'Surface_RH', 'RH_700_500', 'Storm_Motion', 'Total_TVS_Peaks'],
        model.feature_importances_
    ))
    
    # Get scaler parameters
    scaler_mean = scaler.mean_.tolist()
    scaler_scale = scaler.scale_.tolist()
    
    # Extract tree information
    trees_data = []
    for tree_idx, tree in enumerate(model.estimators_):
        tree_data = {
            'feature': tree.tree_.feature.tolist(),
            'threshold': tree.tree_.threshold.tolist(),
            'value': tree.tree_.value.flatten().tolist(),
            'children_left': tree.tree_.children_left.tolist(),
            'children_right': tree.tree_.children_right.tolist(),
        }
        trees_data.append(tree_data)
    
    model_data = {
        'model_type': 'RandomForestRegressor',
        'model_name': 'Random Forest',
        'n_trees': len(model.estimators_),
        'n_features': model.n_features_in_,
        'feature_names': ['CAPE', 'SRH', 'Lapse_0_3km', 'PWAT', 'Temperature', 'Dewpoint',
                         'CAPE_3km', 'Lapse_3_6km', 'Surface_RH', 'RH_700_500', 'Storm_Motion', 'Total_TVS_Peaks'],
        'feature_importance': feature_importance,
        'scaler_mean': scaler_mean,
        'scaler_scale': scaler_scale,
        'trees': trees_data,
        'test_r2_score': 0.9016,
        'test_rmse': 11.06,
        'test_mae': 9.07,
        'model_version': '4.0'
    }
    
    return model_data

# Extract and save
model_export = extract_random_forest_model(model, scaler)

# Save to JSON
with open('tornado_random_forest_export.json', 'w') as f:
    json.dump(model_export, f, indent=2)

print("✓ Random Forest model exported to tornado_random_forest_export.json")
print(f"✓ Model contains {len(model_export['trees'])} decision trees")
print(f"✓ R² Score: 0.9016")
print(f"✓ RMSE: 11.06 mph")
