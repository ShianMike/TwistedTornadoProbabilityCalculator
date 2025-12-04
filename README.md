# Twisted Weather Analyzer v1.4.5

A web-based tornado analysis tool for the Roblox Game **Twisted**. Analyzes atmospheric parameters to predict tornado morphology types and estimate wind speeds.

![Twisted Weather Analyzer](https://img.shields.io/badge/version-1.4.5-blue)
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

- **OCR Auto-Fill** - Paste screenshot of the theromodynamics interface to auto-fill input fields (Ctrl+V)

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

### v1.4.5 - Extreme Wind Update

**Major Wind Speed Overhaul** - Significantly increased wind estimates and expanded visualization for extreme scenarios

#### Wind Speed Changes

**Greatly Increased Wind Estimates**
- Wind speeds now ~56% higher than v1.4.3
- Extreme scenarios regularly reach **235-320 mph** (up from 220-250 mph cap)
- Theoretical maximums can now reach **500+ mph** for unprecedented conditions
- Much wider estimate ranges (up to 80 mph spread vs 40 mph previously)
- Example: v1.4.3's 185-218 mph → v1.4.5's **170-305 mph**

**Improved Wind Speed Bar Visualization**
- Bar is now 33% longer (400px) for better readability
- Added **pink/magenta gradient** for extreme winds above EF5 territory
- White estimate bar extends much further (starts ~50% lower)
- Wind estimates labeled with "**Est.**" prefix for clarity
- Color gradient includes: Green → Yellow → Orange → Red → Dark Red → Pink

**Theoretical Maximum Display**
- Now appears **above** the disclaimer note for better visibility
- Triggers more frequently for high-end scenarios
- Shows potential winds beyond measured EF5 thresholds
- Displays "500+" when calculations exceed the scale

#### Input Validation System

**25+ Validation Checks** - Helps identify unrealistic or incorrect data entry
- Warns when dewpoint exceeds temperature
- Flags inconsistent moisture parameters
- Alerts for extreme values (SRH >800, Storm Speed >100, etc.)
- Checks CAPE vs temperature relationships
- Validates lapse rate profiles
- Detects mid-level vs surface RH inversions
- Plain text warnings (no emoji) with INFO/WARNING prefixes

#### User Interface Improvements

**Better Organization**
- Theoretical maximum moved above disclaimer for prominence
- Updated disclaimer text for clearer interpretation guidance
- Auto-analysis works more reliably with all modules
- Empty input fields no longer auto-fill with zeros

**Display Order:**
1. Wind speed estimate bar
2. Theoretical maximum (when triggered)
3. Wind estimate disclaimer
4. Special tornado factors

#### Bug Fixes
- Fixed summary panel showing "0" for empty fields (now shows "—")
- Corrected auto-analysis initialization timing
- Fixed wind bar visualization range display
- Improved module loading reliability

### v1.4.4 - Tornado Probability Rebalance

**Based on In-Game Thermodynamics Analysis**

Data collected from actual Twisted gameplay scenarios showing:
- Scenario 1: TEMP 76°F, CAPE 4534, Lapse 10.1, PWAT 1.3, Storm Speed 90mph
- Scenario 2: TEMP 77°F, CAPE 4858, 3CAPE 140, Lapse 9.7, PWAT 1.1, SRH 494, Storm Speed 63mph

**SIDEWINDER** (Rebalanced for High-Speed Scenarios)
- Now properly triggers with SRH >400 (was >400 but scored less)
- Increased scoring for very high storm speeds (>70, >85 mph)
- Sweet spot: CAPE 3500-6000 (broadened from 2000-5000)
- Better moisture range: PWAT 1.0-1.5
- Bonus for extreme conditions: +20 when Speed >70 AND SRH >400

**STOVEPIPE** (Tuned for Extreme CAPE)
- VTP threshold lowered: 2.0 → **1.2** (triggers earlier)
- High CAPE scoring increased: +22 at >4000, +20 at >5000
- Lapse rate emphasis: +18 at >9.5, +12 at >10
- Moisture preference: moderate moisture (1.0-1.5 PWAT)
- Added 3CAPE consideration: +10 when >120

**WEDGE** (Reduced in Dry/Fast Scenarios)
- Now requires PWAT >1.6 for significant scoring
- Heavy penalty for fast motion: -15 when speed >60
- Requires high surface RH (>80) for full scoring
- Reduced scoring in moderate moisture (1.3-1.6 PWAT): -10 penalty

**DRILLBIT** (Buffed for Extreme Scenarios)
- Major buff for very high storm speeds: +30 at >55, +25 at >75, +20 at >90
- High CAPE bonus increased: +22 at >4000, +18 at >5000
- Dry conditions emphasis: +20 at PWAT <1.4, +15 at <1.1
- Massive bonus for extreme setup: +25 when Speed >70 + PWAT <1.3 + CAPE >4500

**CONE** (Moderate Scenarios)
- Balanced environment emphasis maintained
- Penalty for extreme conditions: -10 when CAPE >5000 OR Speed >80
- Better STP range: 1.0-4.0

**ROPE** (Low CAPE Only)
- Unchanged from v1.4.3

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

**Component Buffs (+15% across the board)**
- CAPE component: 30 → 35
- SRH component: 25 → 29
- Lapse rate component: 20 → 23
- Moisture bonus: 10 → 12
- Reduced low-moisture penalty: -5 → -3
- Added 3CAPE bonus: +10 when CAPE_3KM >100
- Added extreme instability bonus: +8 when CAPE >5000 AND SRH >400

**Range Consistency Improvements**
- Adjusted min multiplier: 0.88 → 0.85
- Adjusted max multiplier: 1.12 → 1.25 (better extreme parameter scaling)
- Typical wind range: 15-35 mph spread
- Raised caps: 200 → 220 (min), 200 → 250 (max)
- Extreme scenarios now properly reach EF5 thresholds (200+ mph)

**Results:**
- ~15% higher wind estimates overall
- Better scaling for extreme atmospheric parameters (CAPE >5000, SRH >400)
- More realistic ranges for violent tornado potential
- Example: Previous 168-200 mph → New ~185-218 mph (extreme scenario)

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

**Version:** 1.4.5


