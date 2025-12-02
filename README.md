# Twisted Tornado Probability Calculator
Twisted Weather Analyzer estimates tornado morphology probabilities and theoretical wind speeds using inputs like CAPE, lapse rates, SRH, RH, temperature, dewpoint, PWAT, STP, VTP, and storm speed. It provides a thermodynamic summary, EF-scale wind estimate, probability chart, and PNG export.
https://shianmike.github.io/TwistedTornadoProbabilityCalculator/

## Patch Notes

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


