# Twisted Weather Analyzer v1.4.2

A web-based tornado analysis tool for the **Twisted** weather simulation game. Analyzes atmospheric parameters to predict tornado morphology types and estimate wind speeds.

![Twisted Weather Analyzer](https://img.shields.io/badge/version-1.4.2-blue)
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

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Disclaimer**: This tool is for entertainment and educational purposes only. It provides approximate calculations based on user-entered data and should not be used for real-world tornado predictions or warnings. Always consult official weather services for accurate and timely information.


