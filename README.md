# Twisted Weather Analyzer v1.4.3

A web-based tornado analysis tool for the **Twisted** weather simulation game. Analyzes atmospheric parameters to predict tornado morphology types and estimate wind speeds.

![Twisted Weather Analyzer](https://img.shields.io/badge/version-1.4.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🌪️ Features

- **Tornado Morphology Prediction** - Calculates probability distribution for 6 tornado types:
  - Sidewinder (rotational, narrow)
  - Stovepipe (violent, tight core)
  - Wedge (wide, rain-wrapped)
  - Drillbit (thin, fast-moving)
  - Cone (classic, balanced)
  - Rope (weak, decaying)

- **Wind Speed Estimation** - Enhanced Fujita (EF) scale estimates based on:
  - CAPE (Convective Available Potential Energy)
  - SRH (Storm-Relative Helicity)
  - Lapse rates (0-3km and 3-6km)
  - Moisture parameters (PWAT, RH)

- **Special Factors Analysis** - Identifies additional hazards:
  - Rain-wrap probability
  - Large hail potential
  - Multiple vortices
  - Frequent lightning
  - Low visibility conditions

- **Interactive Visualizations**
  - Horizontal bar chart with color-coded probabilities
  - Mini wind speed range indicator
  - Hover tooltips with detailed descriptions
  - Auto-updating thermodynamics summary panel

- **Export Functionality** - Save analysis as PNG image

## 🚀 Quick Start

1. **Open the application**
   - Simply open `index.html` in a modern web browser
   - No installation or server required!

2. **Enter atmospheric parameters**
   - Fill in available data from the Twisted game
   - Values auto-validate and clamp to realistic ranges

3. **View results**
   - Analysis updates automatically as you type
   - Click "Analyze" to manually trigger calculations
   - Hover over tornado types for detailed descriptions

4. **Export results**
   - Click "Export PNG" to save your analysis

## 📊 Input Parameters

### Left Column
- **Temperature** (°F) - Surface air temperature
- **CAPE** (J/kg) - Convective Available Potential Energy
- **0-3km Lapse Rate** (°C/km) - Low-level temperature decrease
- **PWAT** (inches) - Precipitable Water
- **Surface RH** (%) - Surface Relative Humidity
- **Storm Speed** (mph) - Storm motion velocity

### Right Column
- **Dewpoint** (°F) - Dew point temperature
- **3CAPE** (J/kg) - CAPE for lowest 3km
- **3-6km Lapse** (°C/km) - Mid-level lapse rate
- **SRH** (m²/s²) - Storm-Relative Helicity
- **700-500mb RH** (%) - Mid-level relative humidity

## 🔧 Technical Details

### Built With
- **Vanilla JavaScript** - No frameworks required
- **Chart.js** v4.4.0 - Probability visualization
- **html2canvas** v1.4.1 - PNG export
- **Inter Font** - Clean, modern typography

### Browser Support
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

### File Structure

```
twisted-analyzer/
├── css/                   # Stylesheets
│   └── styles.css
├── img/                   # Image assets
│   └── logo.png
├── js/                    # JavaScript files
│   ├── app.js
│   ├── chart-setup.js
│   └── export.js
├── index.html             # Main HTML file
└── README.md              # Project documentation
```

## 📝 Version History

### v1.4.3 - Balance Update

**Major Rebalance** - Improved accuracy based on in-game tornado behavior

#### Tornado Probability Changes

**SIDEWINDER** (Rebalanced)
- Reduced excessive dominance in high-SRH scenarios
- Moisture penalties now only apply to very high PWAT (>1.8) and RH (>85%)
- Added bonus for ideal supercell conditions (SRH >350, Speed >40, CAPE >2500)
- Better balance with Wedge in moderate moisture environments

**WEDGE** (Buffed)
- Increased moisture scoring to match in-game rain-wrapped tornado frequency
- Added mid-level moisture (700-500mb RH) as significant factor
- Now properly favors slow-moving storms (penalty for speed >50 mph)
- Better represents broad circulation tornadoes in high-moisture environments

**STOVEPIPE** (Buffed)
- Lowered VTP threshold from 2.0 to 1.5 for more realistic occurrence
- Added moisture sweet spot (PWAT 1.0-1.6)
- Now appears more frequently in extreme instability scenarios
- Better represents violent, narrow-core tornadoes

**DRILLBIT** (Enhanced)
- Improved dry line scenario detection
- Added bonus for classic High Plains setup (fast + dry + high dew spread)
- Better scoring for very dry conditions (PWAT <0.9)
- More realistic representation of thin, fast-moving tornadoes

**CONE** (Buffed)
- Broader STP range (0.8-5 instead of 1-4)
- Wider CAPE acceptance (1500-4500)
- Added storm speed consideration (moderate speeds favored)
- Bonus for well-balanced environments
- Now properly represents "classic" tornado conditions

**ROPE** (Rebalanced)
- CAPE threshold raised to <3000 (previously <1500)
- Now appears in marginal severe weather (CAPE 1500-3000)
- Added scoring for weak instability + weak rotation combinations
- More meteorologically realistic for weak/brief tornadoes

#### Wind Speed Estimation

**Component Buffs (+10% across the board)**
- CAPE component: 30 → 32
- SRH component: 25 → 27
- Lapse rate component: 20 → 22
- Moisture bonus: 10 → 12
- Reduced low-moisture penalty: -5 → -3
- Added 3CAPE bonus: +8 when CAPE_3KM >80

**Range Consistency Improvements**
- Narrowed min/max spread for more realistic estimates
- Min multiplier: 0.8 → 0.88
- Max multiplier: 1.2 → 1.12
- Typical wind range: 15-30 mph spread (was 20-50 mph)
- Added constraints to prevent unrealistic gaps

**Results:**
- ~10% higher wind estimates overall
- More consistent min/max relationships
- Better correlation with atmospheric parameters
- Example: 94-141 mph → 120-145 mph (more realistic range)

#### Special Factors

**Long-Track** (Re-added)
- Triggers when SRH >300, Storm Speed >35, CAPE >2000
- Probability scales with rotation strength and storm motion
- Capped at 85% for extreme scenarios
- Reflects tornado potential for extended ground contact

#### Bug Fixes
- Fixed wind speed calculation overflow in extreme CAPE scenarios
- Improved probability normalization for edge cases
- Corrected 3CAPE bonus application in wind estimates

### v1.4.2 - Code Documentation

**Code Refactoring & Documentation**
- Added comprehensive comments across all JavaScript modules
- Removed experimental OCR/screenshot upload feature
- Removed Tesseract.js dependency (~2MB bundle size reduction)
- Added privacy statement to footer
- 400+ lines of documentation added

**Files Modified:**
- `script.js` - 200+ lines of documentation
- `tornado-calculations.js` - 100+ lines of documentation
- `chart-renderer.js` - 80+ lines of documentation
- `index.html` - Removed OCR scripts
- `style.css` - Removed OCR styles

## 🎮 Usage Tips

1. **Start with CAPE** - Most important parameter for tornado potential
2. **SRH matters** - High rotation (SRH > 300) increases likelihood
3. **Moisture is key** - PWAT > 1.5 favors Wedge, PWAT < 1.2 favors Drillbit
4. **Watch storm speed** - Fast storms (>50 mph) favor Drillbit/Sidewinder
5. **Check special factors** - Additional hazards shown below wind estimate
6. **Hover for details** - Tooltips explain each parameter and tornado type

## 🧪 Testing Scenarios

**High-Moisture Outbreak** (PWAT 1.8+, RH 75+)
- Expected: Wedge dominant (~35-40%)
- Rain-wrap and low visibility likely

**Dry Line Setup** (PWAT <1.2, DEW_SPREAD >15, Speed >50)
- Expected: Drillbit dominant (~40-50%)
- Fast-moving, thin tornadoes

**Classic Supercell** (STP 2-3, balanced parameters)
- Expected: Cone highest (~30-35%)
- Moderate intensity, well-organized

**Extreme Instability** (CAPE >4500, VTP >2)
- Expected: Stovepipe shows up (~20-25%)
- Violent potential with EF4-EF5 winds

**Marginal Severe** (CAPE 1500-2500, SRH <200)
- Expected: Rope dominant (~50-60%)
- Weak, brief tornadoes

## ⚠️ Disclaimer

This tool is designed for the **Twisted weather simulation game** and should **NOT** be used for real weather forecasting or safety decisions.

- Tornado probabilities are based on simplified game mechanics
- Wind estimates are theoretical and may not match actual tornado behavior
- Does not analyze hodographs, boundary layers, or storm-scale dynamics
- For educational and entertainment purposes only

## 🔜 Future Plans

- Continue refining calculations based on in-game testing
- Add hodograph analysis (planned for future release)
- Implement preset atmospheric profiles for quick testing
- Add environmental sounding interpretation
- Potential integration with game APIs (if available)

## 👨‍💻 Development

### Making Changes

1. **Modify calculations** - Edit `tornado-calculations.js`
2. **Update UI** - Edit `style.css` and `index.html`
3. **Change logic** - Edit `script.js`
4. **Test locally** - Open `index.html` in browser

### Contributing

Contributions are welcome! Please:
- Follow existing code style
- Add comments for new functions
- Test thoroughly before submitting
- Update documentation as needed

## 📄 License

MIT License - Feel free to modify and use for personal projects

## 🙏 Credits

- **Created by:** seanmike
- **Inspired by:** Real meteorological indices (STP, VTP, CAPE, SRH)
- **For:** Twisted weather simulation game community

---

**Version:** 1.4.3  


