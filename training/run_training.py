#!/usr/bin/env python3
"""
Run the tornado model training pipeline
"""

import subprocess
import sys
import os

def install_requirements():
    """Install required packages"""
    print("Installing required packages...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

def run_training():
    """Run the training script"""
    print("Running tornado model training...")
    subprocess.check_call([sys.executable, "tornado_model_trainer.py"])

def main():
    """Main execution function"""
    print("=== Twisted Tornado Model Training Pipeline ===")
    
    # Check if requirements.txt exists
    if os.path.exists("requirements.txt"):
        install_requirements()
    else:
        print("requirements.txt not found, skipping package installation")
    
    # Run training
    run_training()
    
    print("Training pipeline completed!")

if __name__ == "__main__":
    main()
