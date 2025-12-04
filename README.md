# Twisted Thermos Analyzer v2.0.0

A web-based tornado analysis tool for the Roblox Game **Twisted**. Analyzes atmospheric parameters to predict tornado morphology types and estimate wind speeds.

![Twisted Thermos Analyzer](https://img.shields.io/badge/version-2.0.0-blue)
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

- **OCR Screenshot Analysis** - Upload thermodynamics screenshots for automatic data extraction

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

4. **Upload screenshot (optional)**
   - Click "Upload Screenshot" to use OCR for automatic data extraction
   - Supports thermodynamics screenshots from Twisted game

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

## 📝 What's New

### v2.0.0 - Documentation Overhaul & OCR Feature

**README Restructuring** - Streamlined documentation for better user experience

**Removed Technical Sections**
- Removed "Technical Details" section (Built With, Browser Support, File Structure)
- Removed "Development" section (Making Changes, Contributing guidelines)
- Removed technical implementation details and code-focused content
- Removed 400+ lines of code documentation notes

**Simplified Version History**
- Condensed version entries to focus on user-facing changes only
- Removed detailed technical implementation notes
- Removed specific code file references and line counts
- Kept only user experience improvements and feature changes

**Enhanced User Focus**
- "Coming Soon" replaces "Future Plans" with simpler feature list
- Credits section simplified
- Version/License info condensed to single line footer
- Overall 30% reduction in documentation length

**New OCR Feature**
- Upload screenshots of Twisted thermodynamics panel
- Automatic text extraction using Tesseract.js OCR engine
- Recognizes parameter names and values
- Auto-populates input fields with extracted data
- Supports common screenshot formats (PNG, JPG, JPEG)
- Saves time entering data manually

**Removed PNG Export Feature**
- Removed "Export PNG" functionality
- Reduced bundle size by removing html2canvas dependency
- Streamlined interface with focus on analysis tools

**What Remains:**
- All feature descriptions and capabilities
- Complete "What's New" user experience notes
- Quick Start guide and Input Parameters
- Usage Tips and Testing Scenarios
- Disclaimer and Credits

### v1.4.5 - Extreme Wind Update

**Dramatically Increased Wind Estimates**
- Wind speeds now ~56% higher than v1.4.3
- Extreme scenarios regularly reach **235-320 mph** (up from 220-250 mph cap)
- Theoretical maximums can now reach **500+ mph** for unprecedented conditions
- Much wider estimate ranges (up to 80 mph spread vs 40 mph previously)
- Example: v1.4.3's 185-218 mph → v1.4.5's **170-305 mph**

**Improved Wind Speed Visualization**
- Bar is now 33% longer (400px) for better readability
- Added **pink/magenta gradient** for extreme winds above EF5 territory
- Wind estimates labeled with "**Est.**" prefix for clarity
- Color gradient: Green → Yellow → Orange → Red → Dark Red → Pink
- White estimate bar extends much further for extreme scenarios

**Theoretical Maximum Display**
- Now appears **above** the disclaimer note for better visibility
- Triggers more frequently for high-end scenarios
- Shows potential winds beyond measured EF5 thresholds
- Displays "500+" when calculations exceed the scale

**Smart Input Validation System**
- 25+ validation checks help identify unrealistic data entry
- Warns when dewpoint exceeds temperature
- Flags inconsistent moisture parameters
- Alerts for extreme values (SRH >800, Storm Speed >100, etc.)
- Checks CAPE vs temperature relationships
- Validates lapse rate profiles
- Plain text warnings with INFO/WARNING prefixes

**User Interface Improvements**
- Theoretical maximum moved above disclaimer for prominence
- Updated disclaimer text for clearer interpretation guidance
- Auto-analysis works more reliably
- Empty input fields no longer auto-fill with zeros
- Summary panel shows "—" instead of "0" for empty fields

### v1.4.4 - Tornado Probability Rebalance

**Based on Real In-Game Scenarios**
- Analyzed actual Twisted gameplay thermodynamics
- Rebalanced all 6 tornado types for accuracy
- Better matches observed tornado behavior in game

**SIDEWINDER** - Now properly triggers with high storm speeds and SRH
- Sweet spot: CAPE 3500-6000, Storm Speed >70 mph
- Bonus for extreme rotation scenarios

**STOVEPIPE** - Tuned for extreme CAPE environments
- Triggers earlier with lower VTP threshold (2.0 → 1.2)
- Better represents violent, tight-core tornadoes

**WEDGE** - Reduced in dry/fast scenarios
- Now requires PWAT >1.6 for significant probability
- Heavy penalty for fast-moving storms
- Better represents rain-wrapped tornadoes

**DRILLBIT** - Buffed for extreme scenarios
- Major boost for very high storm speeds (>55 mph)
- Dry conditions emphasis (PWAT <1.4)
- Better represents thin, fast-moving tornadoes

**CONE** - Balanced for moderate conditions
- Penalty for extreme setups
- Better represents "classic" tornado scenarios

**ROPE** - Unchanged, still represents weak tornadoes

### v1.4.3 - Balance Update

**Major Rebalance** - Improved accuracy based on in-game tornado behavior

**Tornado Probability Changes**
- Sidewinder: Reduced excessive dominance in high-SRH scenarios
- Wedge: Buffed moisture scoring, better rain-wrapped tornado representation
- Stovepipe: Lowered VTP threshold, appears more in extreme instability
- Drillbit: Enhanced dry line detection
- Cone: Broader parameter acceptance, better "classic" tornado representation
- Rope: Raised CAPE threshold, more realistic for marginal severe weather

**Wind Speed Improvements**
- ~15% higher wind estimates overall
- Better scaling for extreme atmospheric parameters
- Typical range: 15-35 mph spread
- Extreme scenarios now properly reach EF5 thresholds (200+ mph)
- Raised caps: 220 mph (min) / 250 mph (max)

**Special Factors**
- Re-added "Long-Track" tornado indicator
- Triggers when SRH >300, Storm Speed >35, CAPE >2000

### v1.4.2 - Code Documentation

**User Experience Improvements**
- Removed experimental OCR/screenshot upload feature
- Faster load times (~2MB smaller file size)
- Added privacy statement to footer
- Cleaner, more focused interface

## 🎮 Usage Tips

1. **Start with CAPE** - Most important parameter for tornado potential
2. **SRH matters** - High rotation (SRH > 300) increases likelihood
3. **Moisture is key** - PWAT > 1.5 favors Wedge, PWAT < 1.2 favors Drillbit
4. **Watch storm speed** - Fast storms (>50 mph) favor Drillbit/Sidewinder
5. **Check special factors** - Additional hazards shown below wind estimate
6. **Hover for details** - Tooltips explain each parameter and tornado type
7. **Watch for validation warnings** - Help ensure accurate data entry
8. **Use theoretical maximum** - Shows extreme potential beyond typical EF5

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

## 🔜 Coming Soon

- Hodograph analysis visualization
- Preset atmospheric profiles for quick testing
- Environmental sounding interpretation
- More refined validation warnings
- Additional special factors

## 🙏 Credits

- **Created by:** seanmike
- **Inspired by:** Real meteorological indices (STP, VTP, CAPE, SRH)
- **For:** Twisted weather simulation game community

---

**Version:** 2.0.0 | **License:** MIT


