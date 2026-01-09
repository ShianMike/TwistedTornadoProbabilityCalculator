#!/usr/bin/env python3
"""
Tornado Model Trainer for Twisted Game
Trains machine learning models on tornado data to predict wind speeds and characteristics
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt
import seaborn as sns
import joblib
import warnings
warnings.filterwarnings('ignore')

def load_and_prepare_data():
    """Load and prepare tornado data for training"""
    # Load the CSV data with correct column names
    df = pd.read_csv('1.21.2 Twisted Risk Study (Responses) - Form Responses 1.csv')
    
    # Print column names for debugging
    print("Available columns:", df.columns.tolist())
    
    # Map the actual column names from the CSV
    column_mapping = {
        'Timestamp': 'Timestamp',
        'What was your CAPE?': 'CAPE',
        'What was your SRH?': 'SRH',
        'What was your 0-3km Lapse Rate?': 'Lapse_0_3km',
        'What was your Precipitable Water?': 'PWAT',
        'What was your temperature?': 'Temperature',
        'What was your dewpoint?': 'Dewpoint',
        'What was your 3km CAPE?': 'CAPE_3km',
        'What was your 3-6km Lapse Rate?': 'Lapse_3_6km',
        'What was your Surface RH?': 'Surface_RH',
        'What was your 700-500mb RH?': 'RH_700_500',
        'What was your storm motion?': 'Storm_Motion',
        'How many TVS peaks did you see? (This includes brief/weak TVS signatures)': 'Total_TVS_Peaks',
        'What was the max windspeed you recorded?': 'Max_Windspeed'
    }
    
    # Rename columns
    df_renamed = df.rename(columns=column_mapping)
    
    # Select relevant features for training
    features = ['CAPE', 'SRH', 'Lapse_0_3km', 'PWAT', 'Temperature', 'Dewpoint', 
                'CAPE_3km', 'Lapse_3_6km', 'Surface_RH', 'RH_700_500', 
                'Storm_Motion', 'Total_TVS_Peaks']
    
    target = 'Max_Windspeed'
    
    # Create training dataset
    data = df_renamed[features + [target]].copy()
    
    # Handle missing values and convert to numeric
    for col in features + [target]:
        data[col] = pd.to_numeric(data[col], errors='coerce')
    
    # Remove rows with missing target values
    data = data.dropna(subset=[target])
    
    # Fill missing feature values with median
    for col in features:
        if data[col].isna().any():
            median_val = data[col].median()
            data[col].fillna(median_val, inplace=True)
            print(f"Filled {data[col].isna().sum()} missing values in {col} with median: {median_val:.2f}")
    
    return data, features, target

def train_random_forest_model(X, y):
    """Train Random Forest model with cross-validation"""
    print("\n=== TRAINING RANDOM FOREST MODEL ===")
    
    # Split the data
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Create and train Random Forest model
    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42
    )
    
    rf_model.fit(X_train, y_train)
    
    # Make predictions
    y_pred_train = rf_model.predict(X_train)
    y_pred_test = rf_model.predict(X_test)
    
    # Calculate metrics
    train_r2 = r2_score(y_train, y_pred_train)
    test_r2 = r2_score(y_test, y_pred_test)
    train_rmse = np.sqrt(mean_squared_error(y_train, y_pred_train))
    test_rmse = np.sqrt(mean_squared_error(y_test, y_pred_test))
    
    print(f"Training R²: {train_r2:.4f}")
    print(f"Test R²: {test_r2:.4f}")
    print(f"Training RMSE: {train_rmse:.2f} mph")
    print(f"Test RMSE: {test_rmse:.2f} mph")
    
    # Cross-validation
    cv_scores = cross_val_score(rf_model, X, y, cv=5, scoring='r2')
    print(f"Cross-validation R²: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    return rf_model, test_r2

def analyze_feature_importance(model, feature_names):
    """Analyze and plot feature importance"""
    print("\n=== FEATURE IMPORTANCE ANALYSIS ===")
    
    importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\nFeature Importances:")
    for idx, row in importance_df.iterrows():
        print(f"{row['feature']}: {row['importance']:.4f}")
    
    # Plot feature importance
    plt.figure(figsize=(10, 8))
    sns.barplot(data=importance_df, y='feature', x='importance')
    plt.title('Random Forest Feature Importance')
    plt.xlabel('Importance Score')
    plt.tight_layout()
    plt.savefig('feature_importance.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return importance_df

def create_correlation_analysis(data, features):
    """Create correlation matrix and analysis"""
    print("\n=== CORRELATION ANALYSIS ===")
    
    # Calculate correlation matrix
    corr_matrix = data[features + ['Max_Windspeed']].corr()
    
    # Plot correlation matrix
    plt.figure(figsize=(12, 10))
    mask = np.triu(np.ones_like(corr_matrix, dtype=bool))
    sns.heatmap(corr_matrix, mask=mask, annot=True, cmap='coolwarm', center=0,
                square=True, linewidths=0.5)
    plt.title('Feature Correlation Matrix')
    plt.tight_layout()
    plt.savefig('correlation_matrix.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    # Feature correlations with target
    target_corr = corr_matrix['Max_Windspeed'].abs().sort_values(ascending=False)
    print("\nCorrelations with Max Windspeed:")
    for feature, corr in target_corr.items():
        if feature != 'Max_Windspeed':
            print(f"{feature}: {corr:.4f}")
    
    # Plot feature correlations with target
    plt.figure(figsize=(10, 8))
    target_corr_plot = target_corr[target_corr.index != 'Max_Windspeed']
    sns.barplot(x=target_corr_plot.values, y=target_corr_plot.index)
    plt.title('Feature Correlations with Max Windspeed')
    plt.xlabel('Absolute Correlation')
    plt.tight_layout()
    plt.savefig('feature_correlations.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return corr_matrix

def analyze_windspeed_by_conditions(data):
    """Analyze windspeed patterns by atmospheric conditions"""
    print("\n=== WINDSPEED ANALYSIS BY CONDITIONS ===")
    
    # Create risk categories based on conditions
    data['Risk_Category'] = 'Low'
    data.loc[(data['CAPE'] > 2500) & (data['SRH'] > 200), 'Risk_Category'] = 'Moderate'
    data.loc[(data['CAPE'] > 4000) & (data['SRH'] > 400), 'Risk_Category'] = 'High'
    data.loc[(data['CAPE'] > 6000) & (data['SRH'] > 600), 'Risk_Category'] = 'Extreme'
    
    # Analyze by risk category
    risk_analysis = data.groupby('Risk_Category')['Max_Windspeed'].agg(['mean', 'std', 'count'])
    print("\nWindspeed by Risk Category:")
    print(risk_analysis)
    
    # Plot windspeed distribution by risk category
    plt.figure(figsize=(12, 8))
    sns.boxplot(data=data, x='Risk_Category', y='Max_Windspeed', 
                order=['Low', 'Moderate', 'High', 'Extreme'])
    plt.title('Windspeed Distribution by Risk Category')
    plt.ylabel('Max Windspeed (mph)')
    plt.xticks(rotation=45)
    plt.tight_layout()
    plt.savefig('windspeed_by_risk.png', dpi=300, bbox_inches='tight')
    plt.show()
    
    return risk_analysis

def save_model_artifacts(model, scaler, feature_names, model_metrics):
    """Save trained model and associated artifacts"""
    print("\n=== SAVING MODEL ARTIFACTS ===")
    
    # Save model
    joblib.dump(model, 'tornado_rf_model.pkl')
    print("Saved Random Forest model to: tornado_rf_model.pkl")
    
    # Save scaler
    joblib.dump(scaler, 'tornado_scaler.pkl')
    print("Saved scaler to: tornado_scaler.pkl")
    
    # Save model metadata
    model_info = {
        'model_type': 'RandomForestRegressor',
        'feature_names': feature_names,
        'test_r2_score': model_metrics['test_r2'],
        'feature_importance': dict(zip(feature_names, model.feature_importances_)),
        'training_date': pd.Timestamp.now().isoformat(),
        'model_version': '3.0'
    }
    
    import json
    with open('model_info.json', 'w') as f:
        json.dump(model_info, f, indent=2)
    print("Saved model metadata to: model_info.json")

def main():
    """Main training pipeline"""
    print("=== TWISTED TORNADO MODEL TRAINER v3.0 ===")
    print("Training machine learning models on tornado data...")
    
    # Load and prepare data
    data, features, target = load_and_prepare_data()
    print(f"\nLoaded {len(data)} tornado events with {len(features)} features")
    
    # Prepare features and target
    X = data[features]
    y = data[target]
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    X_scaled = pd.DataFrame(X_scaled, columns=features)
    
    print(f"\nData shape: {X.shape}")
    print(f"Target range: {y.min():.1f} - {y.max():.1f} mph")
    print(f"Target mean: {y.mean():.1f} mph")
    
    # Train Random Forest model
    rf_model, test_r2 = train_random_forest_model(X_scaled, y)
    
    # Analyze feature importance
    importance_df = analyze_feature_importance(rf_model, features)
    
    # Create correlation analysis
    corr_matrix = create_correlation_analysis(data, features)
    
    # Analyze windspeed patterns
    risk_analysis = analyze_windspeed_by_conditions(data)
    
    # Save model artifacts
    model_metrics = {'test_r2': test_r2}
    save_model_artifacts(rf_model, scaler, features, model_metrics)
    
    print(f"\n=== TRAINING COMPLETE ===")
    print(f"Model Performance: R² = {test_r2:.4f}")
    print(f"Top 3 Features:")
    for i, row in importance_df.head(3).iterrows():
        print(f"  {row['feature']}: {row['importance']:.4f}")
    
    return rf_model, scaler, importance_df, corr_matrix

if __name__ == "__main__":
    model, scaler, importance, correlations = main()
