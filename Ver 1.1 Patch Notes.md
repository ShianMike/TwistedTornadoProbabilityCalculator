## Version History

### v1.1 (Current)
**Full Morphology Engine & Composite Wind Estimation**
- Six tornado types with meteorologically-inspired scoring
- Special Tornado Factors (Multivortex, Rainwrapped, Long-track)
- Composite wind estimator (VTP 60%, STP 15%, CAPE 12%, SRH 8%, Lapse 3%, Speed 2%)
- STP/VTP displayed in Thermodynamics panel
- Hover tooltips on all meteorological fields
- Input validation with realistic min/max bounds (STP: 0–64, VTP: 0–16)
- Game-only disclaimer footer
- Enhanced UI/UX with percentage overlays and EF-color scale
- New morphology scoring formulas

### v1.0 (Initial Release)
**Basic Framework & Early Features**
- Input form with 10 meteorological parameters (TEMP, DEWPOINT, CAPE, LAPSE_RATE_0_3, SURFACE_RH, PWAT, SRH, STP, VTP, STORM_SPEED)
- VTP-based wind speed estimation (EF0–EF5 ranges)
- Thermodynamics display panel with Temperature, CAPE, Lapse, PWAT, RH, Dewpoint, 3CAPE, 3–6 km Lapse
- Basic tornado probability chart (6 types: Wedge, Cone, Stovepipe, Drillbit, Rope, Sidewinder)
- Analyze, Reset, and Export PNG buttons
- Dark theme UI with glassmorphism styling
- Responsive design (desktop/mobile)
- Chart.js integration with basic horizontal bar chart
- Export functionality via html2canvas
- Wind Speed Range mini-canvas visualization
- Auto-analysis on input changes
- Special factors display section
- Accessibility features (ARIA labels, semantic HTML)

---
