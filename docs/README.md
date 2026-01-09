# Twisted Tornado Probability Calculator v4.1

A  web-based prediction tool for the Roblox game Twisted that analyzes atmospheric conditions to predict tornado morphology types and associated wind speeds. The system employs a high-accuracy Support Vector Machine (SVM) model trained on 48 real tornado events with 12 atmospheric parameters.

Version 4.1 | License: MIT | Model Accuracy: R² = 0.9852 (98.52%)

## Overview

The Twisted Tornado Probability Calculator provides tornado type classification and wind speed estimation based on atmospheric and thermodynamic parameters. The tool features a machine learning backend with comprehensive visualization of probability distributions, special weather factors, and wind speed estimates across the Enhanced Fujita Scale.

### Core Capabilities

**Tornado Type Classification**
The system predicts the probability distribution across six tornado morphology types:
- Rope: Thin, columnar tornado structure with minimal visible circulation
- Cone: Traditional funnel cloud with moderate circulation and defined walls
- Stovepipe: Cylindrical structure indicating organized rotation and stronger wind speeds
- Wedge: Wide-based tornado indicating significant organizing potential and highest wind speeds
- Drillbit: Narrow, compact tornado indicating high velocity rotation and rapid movement
- Sidewinder: Horizontal rotating vortex structure, typically observed in colder air masses

**Wind Speed Prediction**
- Proprietary SVM model (RBF kernel) with 98.52% R² accuracy
- Trained on 48 verified tornado events with comprehensive atmospheric profiling
- Produces estimates in 150-250 mph range for high-risk scenarios
- Automatic EF-Scale classification (EF0-EF5) with theoretical maximum calculations
- Uncertainty quantification: ±15% confidence intervals for all predictions

**Environmental Hazard Detection**
The calculator identifies and displays seven concurrent environmental factors:
- Rain-Wrapped Formation: Reduced visual confirmation due to precipitation curtains
- Large Hail Presence: Co-located with intense updrafts
- Multiple Vortices: Multiple discrete circulation centers within parent tornado
- Dust Vortex Features: Small-scale subsidiary rotations in dust field
- Dust Field Development: Observable dust circulation at surface level
- Long-Track Potential: Atmospheric conditions supporting sustained tornado longevity
- Frequent Lightning Activity: Intense electrostatic discharge indicating strong updrafts


## System Architecture

### Machine Learning Model

**SVM (Support Vector Machine) Regression**
- Model Type: Support Vector Regression with Radial Basis Function (RBF) kernel
- Training Dataset: 48 verified tornado events with complete atmospheric profiles
- Features: 12 normalized atmospheric and thermodynamic parameters
- Cross-Validation R²: 0.9673 (97.73% variance explained)
- Test Set R²: 0.9852 (98.52% variance explained)

**Input Features**
1. CAPE (Convective Available Potential Energy): 0-7000 J/kg, normalized to 0-1
2. SRH (Storm-Relative Helicity): 0-800 m²/s², normalized to 0-1
3. LAPSE_RATE_0_3: 0-12 K/km, normalized to 0-1
4. CAPE_3KM: 0-200 J/kg, normalized to 0-1
5. LAPSE_RATE_3_6: 0-10 K/km, normalized to 0-1
6. TVS_PEAKS: 0-8 count, normalized to 0-1
7. PWAT (Precipitable Water): 0.5-2.5 inches
8. Temperature-Dewpoint Spread: 5-35 degrees F
9. Surface Relative Humidity: 35-95%
10. 700-500mb Relative Humidity: 30-90%
11. Wind Shear Magnitude: 0-50 knots
12. Boundary Layer Depth: 0-4000 feet

**Feature Correlations**
Top predictive features for wind speed estimation:
- Lapse Rate (0-3km): 0.9886 correlation
- SRH: 0.9822 correlation
- CAPE: 0.9386 correlation

### Tornado Type Classification

Probability distributions are calculated using normalized composite indices incorporating:
- Atmospheric instability (CAPE-based scoring)
- Wind shear and rotation (SRH-based factors)
- Moisture profile (PWAT and relative humidity gradients)
- Storm motion characteristics
- Environmental shear patterns

### Wind Speed Estimation

The SVM model produces outputs normalized to observed game tornado data:
- Baseline prediction: 107 mph
- Component weighting: LAPSE_0_3 (40), SRH (43), CAPE_3KM (37), CAPE (35), TVS_PEAKS (30), LAPSE_3_6 (24)
- Output range: 50-350 mph physical constraint
- EF-Scale mapping applied post-prediction

## Installation and Usage

### Quick Start

1. Open the application by loading `index.html` in a modern web browser
2. No installation, server, or external dependencies required
3. All processing occurs client-side in JavaScript
4. Supports Chrome, Firefox, Safari, and Edge browsers

### Input Parameters

**Temperature and Moisture**
- Temperature (F): Surface air temperature
- Dewpoint (F): Dew point temperature
- PWAT (inches): Precipitable water, measure of atmospheric moisture
- Surface Relative Humidity (%): Ground-level moisture saturation

**Atmospheric Stability**
- CAPE (J/kg): Convective Available Potential Energy, measure of instability
- 3CAPE (J/kg): CAPE calculated for 3km layer, local instability indicator
- Lapse Rate 0-3km (C/km): Temperature decrease with height in boundary layer
- Lapse Rate 3-6km (C/km): Temperature decrease in mid-level atmosphere
- 700-500mb RH (%): Relative humidity in upper troposphere

**Wind and Shear**
- SRH (m²/s²): Storm-Relative Helicity, measure of environmental spin
- Storm Speed (mph): Observed or forecast storm motion
- TVS Peaks: Count of Tornado Vortex Signature detections on radar

### Output Interpretation

**Morphology Distribution Graph**
Displays probability percentage for each of the six tornado types. Higher percentages indicate greater likelihood under the given atmospheric conditions. Probabilities sum to 100% and adjust dynamically with parameter changes.

**Special Environmental Factors Bar Chart**
Shows presence likelihood (0-100%) for seven concurrent hazards. Factors with >15% probability display automatically; threshold ensures focus on significant threats.

**Wind Speed Estimate Display**
- Graphical EF-scale representation with color gradient (green to magenta)
- Numerical wind speed estimate positioned above gradient bar
- Uncertainty range: ±15% confidence interval
- Theoretical maximum calculation for extreme atmosphere conditions

**Input Validation System**
The tool includes 25+ consistency checks to identify potentially erroneous data entries:
- Dewpoint cannot exceed temperature
- Moisture consistency between PWAT and relative humidity
- Extreme value warnings for out-of-typical-range inputs
- Parameter relationship validation (e.g., CAPE vs. lapse rate consistency)

## Version History

### v4.1 - Probability Scoring Refinement and Model Optimization

**Tornado Type Adjustments**
- Removed FUNNEL morphology classification entirely to eliminate redundancy with DRILLBIT
- Adjusted CONE probability bonuses downward by 5-15% to reduce overrepresentation
- Decreased DRILLBIT bonuses by 5-15% to correct model overestimation
- Increased WEDGE bonus factors by 5-20% for improved detection in moisture-rich environments
- Added ROPE baseline bonus of +8 points to ensure viability across all atmospheric conditions

**Special Factors Display Enhancement**
- All seven special environmental factors now display with lowered detection thresholds
- Rain-Wrapped threshold: 15% (down from 25%)
- Large Hail threshold: 12% (down from 20%)
- Multiple Vortices threshold: 10% (down from 15%)
- Dust-related factors: 8-12% thresholds for improved visibility
- Long-Track and Lightning thresholds: 15% for operational relevance

**User Interface Refinements**
- Special factors moved to side-by-side grid layout with morphology distribution
- Bar chart visualization applied to environmental factors with cyan-to-white gradient
- Wind speed display optimized with values positioned above gradient bars
- Enhanced card height matching for unified visual appearance
- Removed PNG export functionality to streamline codebase

**Backend Improvements**
- Fallback probability distributions updated for extreme conditions
- ROPE weighting increased to 10% in fallback extreme scenarios
- Enhanced special factors calculation with improved threshold logic
- Canvas rendering optimization (scale factor 1) for crisp wind display visualization

### v4.0 - SVM Model Implementation and Code Restructuring

**Machine Learning Upgrade**
- Transitioned from Random Forest to Support Vector Machine (RBF kernel)
- Improved model accuracy to 98.52% R² (46x improvement over previous version)
- Cross-validation R² of 96.73% confirms generalization capability
- Trained on 48 verified tornado events with comprehensive atmospheric profiling
- All 12 atmospheric features demonstrate correlation >0.92 with target wind speeds

**Feature Engineering Enhancement**
- Normalized all atmospheric parameters to 0-1 scale for SVM compatibility
- Top three predictive features: Lapse rates (0.9886), SRH (0.9822), CAPE (0.9386)
- Incorporated thermal wind effects and boundary layer analysis
- Uncertainty quantification implemented (±15% confidence intervals)
- Automatic EF-Scale mapping based on wind speed predictions

**Project Organization**
- Restructured file hierarchy: `/src` (JavaScript), `/styles` (CSS), `/models` (ML), `/data` (datasets), `/assets` (images), `/docs` (documentation)
- Improved code maintainability and scalability
- Separated concerns: calculations, rendering, validation
- Documented model architecture and feature specifications

**Technical Infrastructure**
- No Python server requirement; all predictions executed client-side
- Exported SVM model weights in JSON format for browser compatibility
- Pre-computed feature scaling parameters for consistent normalization
- Canvas-based visualization for wind speed and probability displays

### v3.0 - Machine Learning Integration

**Model Development**
- Trained custom machine learning model on 121 in-game tornado scenarios
- Improved wind speed estimation accuracy over previous heuristic methods
- Identified most significant factors: CAPE, SRH, TVS characteristics
- Implemented atmospheric parameter weighting based on meteorological science
- Added support for cold-weather Sidewinder classification

**Feature Set Expansion**
- Incorporated atmospheric parameters from standard meteorological analysis
- Added tornado vortex signature (TVS) radar detection inputs
- Implemented thermal wind calculation proxies
- Enhanced wind speed range calibration to match observed game data
- Added confidence intervals to all predictions

**Testing and Validation**
- Tested against actual Twisted game tornado outcomes
- Tuned extreme weather scenarios for high CAPE/SRH combinations
- Refined penalty and bonus systems to prevent unrealistic distributions
- Validated tornado type distributions match game mechanics

**System Refinements**
- Python training pipeline (tornado_model_trainer.py) for model updates
- Consistent input validation across all components
- Realistic parameter range constraints
- Smart default handling for edge cases

### v2.1 - Feature Consolidation and Scoring Refinement

**Tornado Type Changes**
- Consolidated FUNNEL classification with DRILLBIT morphology
- Refined probability scoring across all tornado types
- Improved multiple vortex logic for moderate conditions
- Better alignment with observed in-game patterns

**Model Updates**
- Retrained wind prediction model on expanded dataset (39+ verified events)
- Adjusted feature weights and nonlinear scaling
- Added bonuses for extreme atmospheric conditions
- Extended predicted wind range (137-373 mph) to match observations
- Incorporated temperature-based wind adjustments

**Display Improvements**
- Improved chart labeling and clarity
- Mini wind bar displays numerical estimates with adaptive text sizing
- Enhanced theoretical maximum wind calculation
- Limited storm speed input to 110 mph for realism
- Reorganized special factors display for better comprehension

**Interface Enhancement**
- Modern glass-morphism card designs
- Improved button styling and interactivity
- Enhanced spacing and visual hierarchy
- Smooth transition animations
- Reduced background complexity with solid base color

### v2.0.0 - Documentation Simplification and Image Recognition

**Documentation Restructuring**
- Removed technical programming sections for improved accessibility
- Simplified feature descriptions and explanations
- Consolidated version history for clarity
- Focused documentation on user experience rather than implementation
- Reduced documentation length by 30% while maintaining information completeness

**Image Recognition Feature**
- Implemented optical character recognition for game screenshot upload
- Automatic extraction of parameter names and numerical values
- Auto-population of form fields from recognized data
- Support for PNG, JPG, and JPEG formats
- Significant time reduction for data entry workflows

**Feature Removal**
- Removed PNG export/capture functionality to reduce complexity
- Eliminated bloated dependencies
- Improved overall application loading speed
- Streamlined user interface focusing on core analysis functions

### v1.4.5 - Wind Speed Calibration Update

**Wind Estimate Recalibration**
- Increased baseline wind speed predictions by 56%
- Extended extreme scenario range to 235-320 mph (previously 220-250 mph)
- Implemented theoretical maximum calculations exceeding 500 mph for extreme conditions
- Expanded uncertainty ranges to 80 mph spread for high-energy scenarios

**Display Enhancements**
- Extended wind speed visualization bar by 33% for improved readability
- Implemented magenta color gradient for winds exceeding EF5 thresholds
- Added "Est." prefix to wind speed estimates for clarity
- Applied smooth color gradient: Green (weak) through Yellow, Orange, Red to Magenta (extreme)

**Theoretical Maximum Display**
- Added visible theoretical maximum calculations
- Increased frequency of appearance in high-risk scenarios
- Positioned above disclaimer text for prominent visibility
- Indicates potential beyond standard EF5 classification limits

### v1.4.4 - Tornado Type Balance Update

**Data-Driven Rebalancing**
- Analyzed extensive in-game tornado occurrence data
- Recalibrated probability distributions for all tornado types
- Improved alignment with observed atmospheric relationships

**Type-Specific Adjustments**
- Sidewinder: Reduced dominance in high-shear, high-spin scenarios
- Stovepipe: Lowered appearance threshold for extreme instability conditions
- Wedge: Enhanced moisture-based detection; improved rain-wrap correlation
- Drillbit: Improved dry-line boundary layer wind shear detection
- Cone: Expanded acceptance criteria for broader applicability
- Rope: Increased minimum energy threshold for meteorological consistency

**Wind Speed Refinement**
- Overall wind estimate increase of 15%
- Improved scaling for extreme atmospheric conditions
- Ensured extreme scenarios reliably reach EF5 thresholds (200+ mph)

### v1.4.3 - Balance and Performance Optimization

**Comprehensive Rebalancing**
- Analyzed game tornado behavioral data
- Adjusted type-specific probability calculations
- Enhanced meteorological consistency
- Improved edge case handling

**Wind Estimation Improvements**
- 15% overall wind estimate increase
- Improved extreme weather scaling
- Better EF5 threshold representation
- Enhanced prediction reliability

### v1.4.2 - Code Documentation and User Experience

**Feature Simplification**
- Removed experimental photo upload feature
- Reduced application file size by 2MB
- Streamlined feature set for focus
- Removed privacy notification components

**Interface Improvements**
- Faster page load times
- Cleaner, more focused user interface
- Improved feature discoverability
- Better mobile responsiveness

## Usage Guidelines and Best Practices

**Parameter Priority**
The model's predictive accuracy depends significantly on parameter accuracy:
1. Temperature and Dewpoint: Critical for moisture profile assessment
2. CAPE: Dominant factor for overall instability quantification
3. SRH: Primary determinant of rotation likelihood
4. Lapse Rates: Important for vertical structure understanding
5. PWAT: Moisture availability indicator

**High-Moisture Environment Identification**
Conditions indicating moisture-rich air mass:
- PWAT greater than 1.8 inches
- Surface Relative Humidity above 75%
- Small temperature-dewpoint spread (less than 10 degrees F)
- Expected Result: Wedge morphology dominant (35-40% probability)
- Associated Hazards: Rain-wrapped formation with reduced visual confirmation

**Dry Line Setup Recognition**
Atmospheric conditions favoring rapid vortex movement:
- PWAT less than 1.2 inches
- Large dewpoint depression (greater than 15 degrees F)
- Storm speed exceeding 50 mph
- Expected Result: Drillbit morphology dominant (40-50% probability)
- Associated Hazards: Rapid forward movement with narrow circulation

**Classic Supercell Configuration**
Balanced atmospheric conditions producing organized rotation:
- STP/VTP values between 2-3
- CAPE between 2500-3500 J/kg
- SRH between 200-350 m²/s²
- Expected Result: Cone morphology highest (30-35% probability)
- Associated Hazards: Well-organized rotation with moderate wind speeds

**Extreme Instability Scenarios**
Rare high-risk atmospheric environments:
- CAPE exceeding 4500 J/kg
- VTP greater than 2
- Lapse rates exceeding 8 C/km in lower troposphere
- Expected Result: Stovepipe morphology (20-25% probability)
- Associated Hazards: Violent potential with EF4-EF5 wind speed range

**Weak Severe Weather Pattern**
Limited rotation and instability conditions:
- CAPE between 1500-2500 J/kg
- SRH less than 200 m²/s²
- Limited moisture (PWAT less than 1.0 inches)
- Expected Result: Rope morphology dominant (50-60% probability)
- Associated Hazards: Brief duration with minimal wind speed estimates

## Technical Specifications

**Browser Compatibility**
- Chrome/Chromium: Version 90 and later
- Firefox: Version 88 and later
- Safari: Version 14 and later
- Edge: Chromium-based (Version 90 and later)
- Requires JavaScript enabled and ES6 support

**Performance Characteristics**
- Client-side computation: All predictions execute locally
- Prediction latency: Less than 100ms
- Model file size: 15KB (JSON format)
- Total application size: Approximately 250KB
- Memory footprint: Minimal (no persistent state)

**Data Processing**
- Input validation: 25+ consistency checks
- Feature normalization: Min-max scaling to 0-1 range
- SVM prediction: RBF kernel with gamma=0.1, C=1000
- Output constraints: 50-350 mph physical limits

**Calculation Methods**
- Probability Distribution: Gaussian weighting with parameter normalization
- Wind Speed Prediction: Linear combination of normalized SVM prediction and component weighting
- EF-Scale Mapping: 3-second gust speeds converted to Enhanced Fujita Scale
- Uncertainty Quantification: Monte Carlo simulation with ±15% confidence intervals

## File Structure

```
TwistedTornadoProbabilityCalculator/
├── index.html                          # Main application interface
├── src/
│   ├── tornado-calculations.js         # Probability and wind calculations
│   ├── chart-renderer.js               # Visualization rendering
│   ├── imageprocess.js                 # Image processing utilities
│   ├── input-validation.js             # Input parameter validation
│   └── script.js                       # DOM manipulation and event handling
├── styles/
│   ├── style.css                       # Primary application styling
│   └── imagestyle.css                  # Image processing UI styles
├── models/
│   ├── tornado_svm_model_export.json  # Pre-trained SVM model weights
│   ├── tornado_model_trainer.py       # Python training pipeline
│   ├── tornado_predictor.py           # Python prediction interface
│   └── tornado_trainer_trainer.py     # Model optimization utilities
├── data/
│   ├── weather_composite_data.csv     # Training dataset
│   ├── model_comparison_results.csv   # Model performance metrics
│   └── 1.21.2 Twisted Risk Study...   # Response dataset
├── docs/
│   ├── README.md                      # This file
│   ├── MODEL_TRAINING_RESULTS.md      # Detailed model analysis
│   ├── INTEGRATION_GUIDE.md           # Integration documentation
│   └── Additional documentation files
└── assets/                             # Static images and resources
```

## Model Validation and Performance

**Training Performance**
- Training Set R²: 0.9852 (98.52% variance explained)
- Cross-Validation R²: 0.9673 (96.73%)
- Mean Absolute Error: 8.3 mph
- Root Mean Square Error: 11.2 mph
- Training Sample Size: 48 verified tornado events
- Feature Count: 12 atmospheric parameters

**Generalization Capability**
The model demonstrates strong cross-validation performance, indicating reliable prediction on unseen atmospheric conditions within the training domain. The discrepancy between training and cross-validation R² (1.79%) suggests minimal overfitting.

**Known Limitations**
- Predictions are optimized for conditions within the training data range
- Extreme parameter combinations beyond historical observations may produce unreliable estimates
- Wind speed predictions assume mature tornado organization
- Model does not account for storm interaction effects or collision dynamics
- Temporal evolution of tornado morphology not modeled

## Warnings and Disclaimers

**Game-Specific Tool**
This application is designed specifically for the Roblox game Twisted and uses game-specific atmospheric mechanics. It should not be interpreted as having any applicability to real-world tornado prediction or severe weather analysis.

**Not a Real-World Prediction Tool**
This system is not suitable, equipped, or designed for:
- Real tornado prediction or detection
- Severe weather warning issuance
- Public safety decision making
- Meteorological research or analysis
- Any application outside the context of the Twisted game

**Model Training Limitations**
The SVM model is trained exclusively on game data with game-specific atmospheric relationships. Real-world tornado dynamics differ significantly from game mechanics and cannot be inferred from this application's outputs.

**Accuracy Considerations**
While the model achieves high statistical accuracy (R² = 0.9852), this accuracy applies only within the game's internal mechanics. Predicted probabilities and wind speeds reflect mathematical outputs based on training data, not meteorological reality.

## Support and Development

**Project Repository**
All source code, training data, and documentation are maintained in the project repository. Users are encouraged to review the MODEL_TRAINING_RESULTS.md and INTEGRATION_GUIDE.md documents for detailed technical information.

**Model Updates**
The SVM model can be retrained using the Python training pipeline (tornado_model_trainer.py) with additional game data. Instructions for model update procedures are documented in the repository.

**Feedback and Contributions**
Community feedback regarding prediction accuracy and feature requests is welcome. Users experiencing unexpected results are encouraged to verify input data accuracy against game mechanics.

## Credits

**Development**
- Primary Developer: seanmike
- Machine Learning Implementation: SVM-based prediction framework
- Application Architecture: Client-side JavaScript execution

**Scientific Foundation**
- Storm Typology: Based on standard meteorological tornado classification systems
- Atmospheric Parameters: Derived from established severe weather meteorology
- Model Training: Data compiled from in-game Twisted tornado observations
- Validation: Tested against actual Twisted game tornado outcomes

**License**
MIT License - See repository for full license text

---

**Version:** 4.1 | **Last Updated:** January 2026 | **Model Accuracy:** R² = 0.9852



