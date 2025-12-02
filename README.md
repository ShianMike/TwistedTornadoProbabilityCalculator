# Twisted Tornado Probability Calculator
Twisted Weather Analyzer estimates tornado morphology probabilities and theoretical wind speeds using inputs like CAPE, lapse rates, SRH, RH, temperature, dewpoint, PWAT, and storm speed. It provides a thermodynamic summary, EF-scale wind estimate, probability chart, and PNG export.
https://shianmike.github.io/TwistedTornadoProbabilityCalculator/

## Patch Notes

### v1.3
- **Auto-Calculated STP & VTP**: STP (Significant Tornado Parameter) and VTP (Violent Tornado Parameter) are now automatically calculated from atmospheric inputs rather than user-entered. This prevents unrealistic troll values and ensures parameters are meteorologically consistent.
  - STP formula: Based on CAPE, SRH, lapse rate, and dewpoint depression (LCL proxy)
  - VTP formula: Based on extreme thresholds of CAPE, SRH, lapse rate, 3CAPE, and moisture
- **Input Validation System**: Added comprehensive validation warnings to detect and alert users about unrealistic parameter combinations:
  - Detects "perfect storm" scenarios (multiple maxed parameters)
  - Detects "dead atmosphere" scenarios (multiple zero parameters)
  - Warns about physically impossible combinations (dewpoint > temperature)
  - Identifies unrealistic relationships (high CAPE with extreme cold, etc.)
  - Auto-corrects invalid dewpoint values
- **Further STOVEPIPE Rebalancing**: Additional refinements to make STOVEPIPE truly rare:
  - Reduced VTP multiplier and added threshold (now requires VTP > 8)
  - Increased penalties for weak lapse rates
  - Added penalties when moisture/rotation favor other tornado types
  - Now requires extreme convergence of multiple factors to be competitive
- **Removed Manual STP/VTP Inputs**: Input fields removed from UI; values now display as calculated composite parameters in thermodynamics panel.

### v1.2
- **Enhanced Wind Speed Estimation**: Significantly improved wind speed calculations with more aggressive scaling for VTP, STP, and other parameters. Estimates now produce stronger, more realistic wind speeds aligned with tornado intensity expectations.
- **Rebalanced Tornado Type Scoring**: Fixed probability distributions for all 6 tornado types (WEDGE, STOVEPIPE, SIDEWINDER, DRILLBIT, CONE, ROPE) with better thresholds and penalties. STOVEPIPE is now properly rare, ROPE is competitive in weak environments, and all types have realistic factor weights.
- **Added 3 New Input Parameters**: 
  - 3CAPE (0-3km CAPE) for low-level buoyancy
  - 3-6km Lapse Rate for mid-level instability
  - 700-500mb RH for mid-level moisture
- **Improved Input Layout**: Reorganized input fields into 2-column card layout matching the thermodynamics display for better UX consistency.
- **Interactive Tornado Type Tooltips**: Added hover descriptions for tornado types in the probability chart with detailed explanations of each morphology.
- **Fixed Tooltip System**: Tooltips now use global fixed positioning and work correctly for both thermodynamics fields and chart hover areas without conflicts.
- **Special Tornado Factors**: Added display for Multivortex, Rainwrapped, and Long-track chances based on environmental parameters.

### v1.1
- Added new analysis features
- Improved probability layout
- Fixed alignment issues
- Updated hodograph system


