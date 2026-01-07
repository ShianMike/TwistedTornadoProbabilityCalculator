# Twisted Tornado Tool v3.0

A web tool for the Roblox game **Twisted**. It helps predict tornado types and wind speeds using computer learning from 121 in-game tornado scenarios.

![Twisted Tool](https://img.shields.io/badge/version-3.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![ML Model](https://img.shields.io/badge/ML%20Model-Random%20Forest-orange)
![Training Data](https://img.shields.io/badge/Training%20Data-121%20Events-green)

## 🌪️ What It Does

- **Tornado Type Prediction** - Guesses which of 8 tornado types will happen:
  - Rope (thin, weak)
  - Cone (normal funnel shape)
  - Stove (cylinder shape, strong)
  - Wedge (wide, very strong)
  - Funnel (touches ground briefly)
  - Drillbit (fast-moving, narrow)
  - Sidewinder (spinning, cold weather)
  - Funnel w/ Multi Vortex (multiple spinning parts)

- **Wind Speed Guessing** - Computer model trained on 121 in-game tornado scenarios:
  - Uses weather data to guess wind speeds
  - Shows EF scale ratings (EF0 to EF5+)
  - Wind speeds from 137-380 mph possible

- **Extra Warnings** - Shows other dangerous things:
  - Rain blocking view of tornado
  - Large hail
  - Multiple spinning parts
  - Dust storms
  - Long-lasting tornadoes
  - Lots of lightning

- **Easy to Use**
  - Color bars show tornado chances
  - Wind speed bar shows danger level
  - Hover over things for more info
  - Updates as you type

- **Photo Upload** - Take screenshot of game weather data for auto-fill

## 🚀 How to Use

1. **Open the tool**
   - Open `index.html` in your web browser
   - No download needed!

2. **Enter weather numbers**
   - Fill in data from Twisted game
   - Tool checks if numbers make sense

3. **See results**
   - Updates automatically as you type
   - Click "Analyze" to refresh
   - Hover over tornado types for details

4. **Upload photo (optional)**
   - Click "Upload Screenshot" to auto-fill from game screenshot

## 📊 Weather Numbers to Enter

### Left Side
- **Temperature** (°F) - How hot it is
- **CAPE** (J/kg) - Storm energy
- **0-3km Lapse Rate** (°C/km) - How fast air cools going up
- **PWAT** (inches) - Water in air
- **Surface RH** (%) - Humidity at ground
- **Storm Speed** (mph) - How fast storm moves

### Right Side
- **Dewpoint** (°F) - Moisture temperature
- **3CAPE** (J/kg) - Storm energy in bottom 3km
- **3-6km Lapse** (°C/km) - Air cooling in middle levels
- **SRH** (m²/s²) - How much air spins
- **700-500mb RH** (%) - Humidity in middle air

## 📝 What's New
## v3.0 — In-Game Tornado Data Trained Model
### 🧠 Machine Learning Added
- **Trained Smart Model** on 121 in-game tornado scenarios from data files
- **42.6% accuracy** in guessing wind speeds
- **Most Important Factors**: Storm energy (CAPE), spinning (STP), tornado strength (TVS), low-level energy (3CAPE)
- **Better Math** using temperature differences for more realistic results
- **Smart Weights** replace old guessing methods

### 🌪️ Better Tornado Guessing
- **8 Tornado Types** matching exact game types
- **Fixed Scoring** based on game mechanics and computer learning
- **Fixed Rope Problem** - no more wrong 50% chance in extreme weather
- **Extreme Weather Logic** - very high energy + spinning now correctly shows 0% Rope chance
- **Game Physics** based on Twisted tornado mechanics and patterns

### 📊 Better Weather Analysis
- **More Temperature Range** - works in cold weather (15-140°F)
- **Less Water Needed** - down to 0.1" for dry conditions
- **Dust Storm Factor** - new warning for dry, windy weather
- **Better Multiple Tornado Logic** - realistic limits (spinning > 300 + energy > 2000)
- **Cold Weather Support** - Sidewinder tornadoes when freezing

### 🔬 Technical Improvements
- **Python Training** - tornado_model_trainer.py for computer model training
- **Better Features** - tornado strength calculations from weather data
- **Cross-Testing** - model works well on new data
- **Uncertainty Ranges** - realistic wind speed ranges with confidence levels
- **Smart Defaults** - prevents unrealistic predictions
- **Consistent Checking** - all number limits match between input, checking, and documentation

### 🎯 Testing & Accuracy
- **In-Game Testing** - tested against actual Twisted tornado outcomes
- **Extreme Weather Tuning** - high energy/spinning combinations now predict correctly
- **Penalty/Bonus Systems** - refined scoring prevents too many weak tornado predictions
- **Game Consistent** - tornado types match in-game weather patterns

## v2.1 — Updates

- Model & Data
  - Retrained wind-guessing model on bigger dataset (39 events)
  - Adjusted math and weights; tuned to observed range (137–373 mph)
  - Added bonuses for extreme weather values to match real observations
  - Added temperature difference calculations for wind estimates

- Tornado Types & Scoring
  - Combined old FUNNEL with DRILLBIT; now shows as "DRILLBIT/FUNNEL"
  - Tuned scoring for all types to better match game behavior
  - Improved multiple tornado logic for moderate conditions

- Display & Interface
  - Chart labels use display names while keeping internal math stable
  - Mini wind bar always shows numbers with adaptive text sizing
  - Improved theoretical maximum display logic
  - Storm speed limited to 110 mph for realistic input
  - Improved special factors display

- Styling & Experience
  - Modern glass cards, better buttons, improved spacing
  - Removed full background gradient; solid background with translucent app
  - Added smooth transitions and visual polish

### v2.0.0 - Simpler Documentation & Photo Upload

**Documentation Cleanup** - Made documentation easier to read
- Removed technical programming sections
- Removed detailed code information
- Simplified version history
- Focused on user experience
- 30% shorter documentation

**New Photo Upload Feature**
- Upload screenshots of Twisted weather panel
- Automatic text reading using computer vision
- Recognizes parameter names and values
- Auto-fills input fields with extracted data
- Supports PNG, JPG, JPEG formats
- Saves time entering data manually

**Removed Features**
- Removed "Export PNG" feature
- Smaller file size
- Cleaner interface focused on analysis

### v1.4.5 - Much Higher Wind Speeds

**Much Higher Wind Estimates**
- Wind speeds now 56% higher than before
- Extreme scenarios reach 235-320 mph (up from 220-250 mph)
- Theoretical maximums can reach 500+ mph
- Much wider ranges (up to 80 mph spread vs 40 mph before)

**Better Wind Display**
- Bar 33% longer for better readability
- Added pink/magenta colors for extreme winds above EF5
- Wind estimates labeled with "Est." prefix
- Color gradient: Green → Yellow → Orange → Red → Dark Red → Pink

**Theoretical Maximum Display**
- Shows above disclaimer for better visibility
- Appears more often for high-end scenarios
- Shows potential beyond EF5 limits

**Smart Input Checking**
- 25+ checks help find unrealistic data entry
- Warns when dewpoint higher than temperature
- Flags inconsistent moisture values
- Alerts for extreme values
- Checks relationships between different weather values

### v1.4.4 - Tornado Balance Update

**Based on Real Game Data**
- Analyzed actual Twisted gameplay weather
- Rebalanced all 6 tornado types for accuracy
- Better matches what actually happens in game

**SIDEWINDER** - Now works with high storm speeds and spinning
**STOVEPIPE** - Tuned for extreme energy environments
**WEDGE** - Reduced in dry/fast scenarios
**DRILLBIT** - Boosted for extreme scenarios
**CONE** - Balanced for normal conditions
**ROPE** - Unchanged, still represents weak tornadoes

### v1.4.3 - Balance Update

**Major Rebalance** - Better accuracy based on game tornado behavior
- Sidewinder: Less dominant in high-spinning scenarios
- Wedge: Better moisture scoring, better rain-wrapped representation
- Stovepipe: Lower threshold, appears more in extreme conditions
- Drillbit: Better dry line detection
- Cone: Broader acceptance, better "classic" tornado representation
- Rope: Higher energy threshold, more realistic for weak weather

**Wind Speed Improvements**
- 15% higher wind estimates overall
- Better scaling for extreme weather
- Extreme scenarios properly reach EF5 thresholds (200+ mph)

### v1.4.2 - Code Documentation

**User Experience Improvements**
- Removed experimental photo upload feature
- Faster loading (~2MB smaller)
- Added privacy statement
- Cleaner, more focused interface

## 🎮 Tips for Use

1. **Start with CAPE** - Most important number for tornado chance
2. **SRH matters** - High spinning (SRH > 300) increases likelihood
3. **Moisture is key** - PWAT > 1.5 favors Wedge, PWAT < 1.2 favors Drillbit
4. **Watch storm speed** - Fast storms (>50 mph) favor Drillbit/Sidewinder
5. **Check special warnings** - Extra dangers shown below wind estimate
6. **Hover for details** - Tooltips explain each number and tornado type
7. **Watch for warnings** - Help make sure data is correct
8. **Use theoretical maximum** - Shows extreme potential beyond normal EF5

## 🧪 Test Examples

**High-Moisture Outbreak** (PWAT 1.8+, RH 75+)
- Expected: Wedge dominant (~35-40%)
- Rain-wrap and low visibility likely

**Dry Line Setup** (PWAT <1.2, big dew spread, Speed >50)
- Expected: Drillbit dominant (~40-50%)
- Fast-moving, thin tornadoes

**Classic Supercell** (STP 2-3, balanced numbers)
- Expected: Cone highest (~30-35%)
- Moderate intensity, well-organized

**Extreme Instability** (CAPE >4500, VTP >2)
- Expected: Stovepipe shows up (~20-25%)
- Violent potential with EF4-EF5 winds

**Weak Severe** (CAPE 1500-2500, SRH <200)
- Expected: Rope dominant (~50-60%)
- Weak, brief tornadoes

## ⚠️ Important Warning

This tool is made for the **Twisted game from Roblox** and should **NOT** be used for real weather or safety decisions.

- Tornado chances are based on simple game mechanics
- Wind estimates are guesses and may not match real tornado behavior
- Does not analyze complex weather patterns
- For fun and learning only

## 🔜 Coming Soon

- Wind pattern analysis pictures
- Pre-made weather setups for quick testing
- Weather balloon data interpretation
- Better warning system
- More special factors

## 🙏 Credits

- **Made by:** seanmike
- **Based on:** Real weather science (STP, VTP, CAPE, SRH)
- **For:** Twisted game community

---

**Version:** 3.0.0 | **License:** MIT | **Computer Model:** Random Forest (42.6% accurate)



