#!/usr/bin/env python3
import sys
import os

# Add current directory to path
sys.path.insert(0, os.getcwd())

try:
    print("Starting model training...")
    from tornado_model_trainer import main
    model, scaler, results, importance, correlations = main()
    print("\n[SUCCESS] Training completed successfully!")
except Exception as e:
    print(f"\n[ERROR] Error during training: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
