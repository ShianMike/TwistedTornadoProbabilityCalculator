# Twisted Tornado Probability Calculator

A web-based prediction tool for the Roblox game **Twisted** that analyzes atmospheric conditions to predict tornado morphology types and wind speeds.

## Features

### 🌪️ Tornado Type Classification
Predicts probability distribution across six tornado morphology types:
- **Rope** - Thin, columnar structure
- **Cone** - Traditional funnel cloud
- **Stovepipe** - Cylindrical, organized rotation
- **Wedge** - Wide-based, highest wind speeds
- **Drillbit** - Narrow, high velocity rotation
- **Sidewinder** - Horizontal rotating vortex

### 📊 Wind Speed Prediction
- SVM model with 98.52% accuracy
- EF-Scale classification (EF0-EF5)
- Theoretical maximum calculations

### 🔍 AI Hodograph Analyzer (NEW!)
- Upload or paste hodograph images
- Gemini AI extracts wind profile geometry
- 50/50 blend with thermodynamic data for improved predictions
- Metrics: curvature, turning, kink detection, extension
- **Hazard Analysis**: Large hail and straight-line wind potential assessment

### ⚡ Special Factors Detection
- Rain-Wrapped Formation
- Large Hail Presence
- Multiple Vortices
- Long-Track Potential
- Frequent Lightning Activity

## Usage

### Quick Start
1. Open `index.html` in a modern browser
2. Enter atmospheric parameters OR paste a screenshot from Twisted
3. (Optional) Paste a hodograph image for enhanced prediction
4. Click **Analyze** to see results

### Input Methods
- **Manual Entry**: Type values into input fields
- **OCR Import**: Paste a screenshot and values are auto-extracted
- **Hodograph Analysis**: Paste hodograph for wind shear analysis

### Input Parameters
| Parameter | Range | Description |
|-----------|-------|-------------|
| Temperature | 15-140°F | Surface temperature |
| Dewpoint | 15-90°F | Surface dewpoint |
| CAPE | 0-10000 J/kg | Convective energy |
| 3CAPE | 0-500 J/kg | 0-3km CAPE |
| 0-3km Lapse | 0-12 C/km | Low-level lapse rate |
| 3-6km Lapse | 0-10 C/km | Mid-level lapse rate |
| PWAT | 0-3 in | Precipitable water |
| SRH | 0-800 m²/s² | Storm-relative helicity |
| Surface RH | 0-100% | Surface humidity |
| 700-500mb RH | 0-100% | Mid-level humidity |
| STP | 0-20 | Significant tornado parameter |
| VTP | 0-10 | Violent tornado parameter |
| Storm Motion | 0-100 mph | Storm movement speed |

## Technology

- **Frontend**: Vanilla JavaScript, Chart.js
- **OCR**: Tesseract.js for image text extraction
- **AI**: Google Gemini 2.5 Flash for hodograph analysis
- **ML Model**: Support Vector Machine (SVM) with RBF kernel
- **Hosting**: Vercel (static + serverless functions)

## Development

### Local Testing
```bash
# Serve with any static server
npx http-server .
```

For hodograph analysis, set `useServer: false` in `src/hodograph-analyzer.js` and add your Gemini API key.

### Production Deployment
1. Push to GitHub
2. Connect to Vercel
3. Add environment variable: `GEMINI_API_KEY`

## Rate Limits

- **Hodograph Analysis**: 10 requests/minute (client-side limit)
- **Gemini API**: 20 requests/day (free tier)

## Credits

Created by **seanmike**

## Disclaimer

This is a game/simulation tool for Twisted from Roblox. Predictions are based on simplified formulas inspired by real meteorological indices but are **not accurate for real weather prediction**. The hodograph analyzer uses AI which may produce varying results.

## Version History

### v2.1.0 - Hazard Analysis
- Added large hail potential assessment from hodograph
- Added straight-line wind potential assessment
- Hazard reasoning displayed below wind speed guide
- Improved scrollbar in hodograph section
- Fixed paste propagation to input section

### v2.0.0 - Hodograph Integration
- Added AI-powered hodograph analyzer using Gemini 2.5 Flash
- 50/50 blend scoring with thermodynamic and hodograph metrics
- Auto-analyze on image load/paste
- Rate limiting (10 requests/minute)
- New 5-row UI layout

### v1.5.0 - Enhanced Analysis
- Added morphology confidence scoring
- Special factors detection improvements
- Updated disclaimer with model limitations

### v1.4.0 - OCR Improvements
- Better image text extraction
- Support for pasting screenshots directly
- Improved number parsing

### v1.3.0 - Model Updates
- SVM model with 98.52% accuracy
- Random Forest comparison results
- Enhanced wind speed predictions

### v1.2.0 - UI Refresh
- New card-based layout
- Chart.js visualizations
- Responsive design

### v1.1.0 - Core Features
- Tornado type classification
- EF-Scale predictions
- Special factors analysis

### v1.0.0 - Initial Release
- Basic probability calculator
- Input validation
- Simple predictions

## License

MIT License



