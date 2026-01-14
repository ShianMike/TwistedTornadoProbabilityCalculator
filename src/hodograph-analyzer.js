/**
 * Hodograph Analyzer Module v2.0
 * 
 * Uses Google Gemini Vision API to EXTRACT geometry from hodograph images,
 * then computes DETERMINISTIC shape metrics for tornado prediction integration.
 * 
 * OUTPUT:
 * - metrics: { curvatureIndex, turningDeg, kinkMaxDeg, extensionNorm, compactness }
 * - labels: { shapeType, lowLevelCurvature, stormModeHint }
 * - qc: { confidence, warnings[] }
 * 
 * INTEGRATION:
 * - Sets window.HODOGRAPH_DATA which tornado-calculations.js reads
 * - Metrics affect tornado morphology probabilities when confidence >= 0.6
 */

(function() {
  'use strict';

  // ========================================================================
  // CONFIGURATION
  // ========================================================================
  const CONFIG = {
    serverEndpoint: '/api/analyze-hodograph',
    apiKey: '',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
    maxTokens: 8000,  // Increased to prevent truncated responses
    useServer: true   // PRODUCTION MODE - uses server endpoint with env variable
  };

  // Load API key from config.js if available
  if (typeof API_CONFIG !== 'undefined' && API_CONFIG.GEMINI_API_KEY) {
    CONFIG.apiKey = API_CONFIG.GEMINI_API_KEY;
    console.log('Gemini API key loaded from config');
  }

  // ========================================================================
  // STATE
  // ========================================================================
  let currentHodographImage = null;
  let analysisResults = null;
  let extractedMetrics = null;

  // Rate limiting: max 10 requests per minute
  const RATE_LIMIT = {
    maxRequests: 10,
    windowMs: 60000, // 1 minute
    requests: [],
    
    canMakeRequest() {
      const now = Date.now();
      // Remove requests older than the window
      this.requests = this.requests.filter(t => now - t < this.windowMs);
      return this.requests.length < this.maxRequests;
    },
    
    recordRequest() {
      this.requests.push(Date.now());
    },
    
    getWaitTime() {
      if (this.requests.length === 0) return 0;
      const oldest = this.requests[0];
      const waitMs = this.windowMs - (Date.now() - oldest);
      return Math.max(0, Math.ceil(waitMs / 1000));
    }
  };

  // ========================================================================
  // GEOMETRY EXTRACTION PROMPT
  // ========================================================================
  const GEOMETRY_EXTRACTION_PROMPT = `Analyze this hodograph image and extract the colored wind trace.

WHAT TO EXTRACT:
The hodograph shows a colored polyline representing wind at different heights. The line changes colors (typically magenta→red→yellow→green→cyan→blue) from surface to upper levels.

REQUIRED OUTPUT - JSON only:
{
  "polylinePoints": [{"x": 0.3, "y": 0.6}, {"x": 0.35, "y": 0.55}, ...],
  "origin": {"x": 0.25, "y": 0.7},
  "stormMotion": {"direction": 250, "speed": 35},
  "confidence": 0.8,
  "warnings": []
}

EXTRACTION RULES:
1. polylinePoints: Trace the colored line from start to end
   - Use normalized coordinates (0-1 for both x and y)
   - x=0 is left edge, x=1 is right edge
   - y=0 is TOP of image, y=1 is BOTTOM
   - Include 10-30 points along the curve
   - Start from the beginning of the curve (usually magenta/purple)
   - End at the end of the curve (usually cyan/blue)

2. origin: Where the axes cross (center of the plot)
   - Usually where the white lines intersect

3. stormMotion: If there's an arrow or text showing storm motion
   - direction: degrees (meteorological: 0=North, 90=East)
   - speed: in knots or mph if shown

4. confidence: Your confidence 0.0-1.0 based on image clarity

IMPORTANT:
- Trace the ENTIRE colored polyline carefully
- The line may have sharp turns (kinks) - include those points
- Output ONLY valid JSON, no other text`;

  // Debug mode for development
  const DEBUG = true;

  // ========================================================================
  // DETERMINISTIC METRIC CALCULATIONS
  // ========================================================================

  function distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
  }

  function heading(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI);
    return (angle + 360) % 360;
  }

  function headingChange(angle1, angle2) {
    let diff = angle2 - angle1;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return Math.abs(diff);
  }

  function arcLength(points) {
    let length = 0;
    for (let i = 1; i < points.length; i++) {
      length += distance(points[i - 1], points[i]);
    }
    return length;
  }

  function chordLength(points) {
    if (points.length < 2) return 0;
    return distance(points[0], points[points.length - 1]);
  }

  /**
   * Curvature index = arc length / chord length
   * 1.0 = perfectly straight, >1.25 = significantly curved
   */
  function calculateCurvatureIndex(points) {
    const arc = arcLength(points);
    const chord = chordLength(points);
    if (chord === 0) return 1.0;
    return arc / chord;
  }

  /**
   * Total turning = sum of all heading changes along polyline
   */
  function calculateTurningDeg(points) {
    if (points.length < 3) return 0;
    let totalTurning = 0;
    for (let i = 2; i < points.length; i++) {
      const h1 = heading(points[i - 2], points[i - 1]);
      const h2 = heading(points[i - 1], points[i]);
      totalTurning += headingChange(h1, h2);
    }
    return totalTurning;
  }

  /**
   * Max kink = single largest heading change (shear discontinuity indicator)
   */
  function calculateKinkMaxDeg(points) {
    if (points.length < 3) return 0;
    let maxKink = 0;
    for (let i = 2; i < points.length; i++) {
      const h1 = heading(points[i - 2], points[i - 1]);
      const h2 = heading(points[i - 1], points[i]);
      const kink = headingChange(h1, h2);
      if (kink > maxKink) maxKink = kink;
    }
    return maxKink;
  }

  /**
   * Extension norm = max distance from origin normalized by plot size
   */
  function calculateExtensionNorm(points, origin, plotBbox) {
    if (!origin || points.length === 0) return 0;
    const plotSize = Math.max(
      (plotBbox?.xMax || 1) - (plotBbox?.xMin || 0),
      (plotBbox?.yMax || 1) - (plotBbox?.yMin || 0)
    );
    let maxDist = 0;
    for (const p of points) {
      const d = distance(p, origin);
      if (d > maxDist) maxDist = d;
    }
    return plotSize > 0 ? maxDist / plotSize : maxDist;
  }

  /**
   * Compactness = mean radius / max radius
   */
  function calculateCompactness(points, origin) {
    if (!origin || points.length === 0) return 1.0;
    let totalDist = 0, maxDist = 0;
    for (const p of points) {
      const d = distance(p, origin);
      totalDist += d;
      if (d > maxDist) maxDist = d;
    }
    const meanDist = totalDist / points.length;
    return maxDist > 0 ? meanDist / maxDist : 1.0;
  }

  /**
   * Compute all metrics from extracted geometry
   */
  function computeMetrics(geometry) {
    const points = geometry.polylinePoints || [];
    const origin = geometry.origin || { x: 0.5, y: 0.5 };
    const plotBbox = geometry.plotBbox;

    if (points.length < 2) {
      return {
        metrics: { curvatureIndex: 1.0, turningDeg: 0, kinkMaxDeg: 0, extensionNorm: 0, compactness: 1.0 },
        labels: { shapeType: 'UNKNOWN', lowLevelCurvature: 'UNKNOWN', stormModeHint: 'UNKNOWN' },
        qc: { confidence: 0, warnings: ['Insufficient points extracted'] }
      };
    }

    const curvatureIndex = calculateCurvatureIndex(points);
    const turningDeg = calculateTurningDeg(points);
    const kinkMaxDeg = calculateKinkMaxDeg(points);
    const extensionNorm = calculateExtensionNorm(points, origin, plotBbox);
    const compactness = calculateCompactness(points, origin);

    // Derive labels from metrics
    let shapeType = 'CURVED';
    if (curvatureIndex < 1.10) shapeType = 'STRAIGHT';
    else if (curvatureIndex > 1.50) shapeType = 'LOOPED';
    else if (curvatureIndex > 1.25) shapeType = 'STRONGLY_CURVED';

    let lowLevelCurvature = 'MODERATE';
    const lowLevelPoints = points.slice(0, Math.max(2, Math.floor(points.length * 0.25)));
    const llTurning = calculateTurningDeg(lowLevelPoints);
    if (llTurning > 60) lowLevelCurvature = 'STRONG';
    else if (llTurning < 20) lowLevelCurvature = 'WEAK';

    let stormModeHint = 'SUPERCELL';
    if (curvatureIndex < 1.10 && extensionNorm > 0.6) stormModeHint = 'LINEAR';
    else if (curvatureIndex > 1.40 && turningDeg > 90) stormModeHint = 'STRONG_SUPERCELL';
    else if (compactness > 0.8) stormModeHint = 'WEAK_CONVECTIVE';

    return {
      metrics: {
        curvatureIndex: Math.round(curvatureIndex * 100) / 100,
        turningDeg: Math.round(turningDeg),
        kinkMaxDeg: Math.round(kinkMaxDeg),
        extensionNorm: Math.round(extensionNorm * 100) / 100,
        compactness: Math.round(compactness * 100) / 100
      },
      labels: { shapeType, lowLevelCurvature, stormModeHint },
      qc: { confidence: geometry.confidence || 0.5, warnings: geometry.warnings || [] }
    };
  }

  // ========================================================================
  // MAIN ANALYSIS FUNCTION
  // ========================================================================

  /**
   * Analyze hodograph image and return metrics
   * @param {string|File} fileOrBase64 - Image file or base64 data URL
   * @returns {Promise<{metrics, labels, qc, rawGeometry}>}
   */
  async function analyzeHodographImage(fileOrBase64) {
    let base64Image;
    if (typeof fileOrBase64 === 'string') {
      base64Image = fileOrBase64;
    } else {
      base64Image = await fileToBase64(fileOrBase64);
    }

    const geometry = await extractGeometryFromImage(base64Image);
    const result = computeMetrics(geometry);
    result.rawGeometry = geometry;
    return result;
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Extract geometry from image using Gemini Vision API
   */
  async function extractGeometryFromImage(base64Image) {
    // Check client-side rate limit first
    if (!RATE_LIMIT.canMakeRequest()) {
      const waitTime = RATE_LIMIT.getWaitTime();
      throw new Error(`Rate limit: Wait ${waitTime}s before next request (max 10/min)`);
    }
    
    try {
      let responseData;

      if (CONFIG.useServer) {
        RATE_LIMIT.recordRequest();
        console.log('[Hodograph] Calling server endpoint...');
        const response = await fetch(CONFIG.serverEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image, extractGeometry: true })
        });

        console.log('[Hodograph] Server response status:', response.status);

        if (response.status === 429) {
          const errorData = await response.json();
          throw new Error(`Rate limit reached. Try again in ${Math.ceil((errorData.retryAfter || 3600) / 60)} minutes.`);
        }

        if (!response.ok) {
          const errorData = await response.json();
          console.error('[Hodograph] Server error:', errorData);
          throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        responseData = await response.json();
        console.log('[Hodograph] Server response:', responseData);
        
        if (responseData.geometry) {
          console.log('[Hodograph] Geometry received with', responseData.geometry.polylinePoints?.length || 0, 'points');
          return responseData.geometry;
        }
        return parseGeometryFromText(responseData.analysis);

      } else {
        if (!CONFIG.apiKey) throw new Error('No API key configured');

        const base64Data = base64Image.split(',')[1];
        const mimeType = base64Image.split(';')[0].split(':')[1] || 'image/png';

        RATE_LIMIT.recordRequest();
        const response = await fetch(`${CONFIG.apiEndpoint}?key=${CONFIG.apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: GEOMETRY_EXTRACTION_PROMPT },
                { inline_data: { mime_type: mimeType, data: base64Data } }
              ]
            }],
            generationConfig: { maxOutputTokens: CONFIG.maxTokens, temperature: 0.1 }
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          const errorMsg = errorData.error?.message || `API error: ${response.status}`;
          
          // Check for rate limit error
          if (response.status === 429 || errorMsg.includes('quota') || errorMsg.includes('rate')) {
            throw new Error('Rate limit exceeded. Wait a minute and try again.');
          }
          throw new Error(errorMsg);
        }

        const data = await response.json();
        if (DEBUG) console.log('Full Gemini response:', JSON.stringify(data, null, 2));
        
        if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
          console.error('Unexpected response structure:', data);
          return { polylinePoints: [], origin: { x: 0.5, y: 0.5 }, confidence: 0, warnings: ['Invalid API response structure'] };
        }
        
        const responseText = data.candidates[0].content.parts[0].text;
        if (DEBUG) console.log('Gemini raw response:', responseText);
        return parseGeometryFromText(responseText);
      }
    } catch (error) {
      console.error('Geometry extraction error:', error);
      return { polylinePoints: [], origin: { x: 0.5, y: 0.5 }, confidence: 0, warnings: [`Extraction failed: ${error.message}`] };
    }
  }

  function parseGeometryFromText(text) {
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const geometry = JSON.parse(jsonMatch[0]);
        if (DEBUG) console.log('Parsed geometry:', geometry);
        if (!geometry.polylinePoints || geometry.polylinePoints.length === 0) {
          geometry.polylinePoints = [];
          geometry.warnings = geometry.warnings || [];
          geometry.warnings.push('No polyline points found in response');
        }
        return geometry;
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('Parse error:', error, 'Text:', text);
      return { polylinePoints: [], origin: { x: 0.5, y: 0.5 }, confidence: 0, warnings: [`Parse error: ${error.message}`] };
    }
  }

  // ========================================================================
  // UI INTEGRATION
  // ========================================================================

  function initializeHodographAnalyzer() {
    const fileInput = document.getElementById('hodographInput');
    const apiKeyInput = document.getElementById('openaiApiKey');
    const apiKeySection = document.getElementById('apiKeySection');
    const pasteButton = document.getElementById('pasteHodograph');

    // Show API key section only in local testing mode
    if (!CONFIG.useServer && apiKeySection) {
      apiKeySection.style.display = 'block';
    }

    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey && apiKeyInput) {
      apiKeyInput.value = savedApiKey;
      CONFIG.apiKey = savedApiKey;
    }

    if (apiKeyInput) {
      apiKeyInput.addEventListener('change', function(e) {
        CONFIG.apiKey = e.target.value.trim();
        localStorage.setItem('gemini_api_key', CONFIG.apiKey);
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', function(e) {
        if (e.target.files[0]) loadHodographImage(e.target.files[0]);
      });
    }

    if (pasteButton) {
      pasteButton.addEventListener('click', async function() {
        // Set focus to hodograph area and try to read clipboard
        hodographFocused = true;
        await pasteHodographFromClipboard();
      });
    }

    // Analyze button click handler
    const analyzeButton = document.getElementById('analyzeHodograph');
    if (analyzeButton) {
      analyzeButton.addEventListener('click', async function() {
        if (currentHodographImage) {
          await runFullAnalysis();
        } else {
          showHodographStatus('Please load or paste an image first.', 'error');
        }
      });
    }

    // Only capture paste when user is focused on hodograph section
    // Check if click was in hodograph card area
    let hodographFocused = false;
    const hodographCard = document.querySelector('.hodograph-card, #hodographAnalyzer, [data-section="hodograph"]');
    
    document.addEventListener('click', function(e) {
      // Check if click was inside hodograph section
      const hodoSection = e.target.closest('.hodograph-card, #hodographAnalyzer, [data-section="hodograph"]');
      const inputSection = e.target.closest('#imageInput, .image-input-area, #weatherInputs, .weather-inputs');
      
      if (hodoSection && !inputSection) {
        hodographFocused = true;
      } else if (inputSection) {
        hodographFocused = false;
      }
    });
    
    document.addEventListener('paste', async function(e) {
      // Skip if pasting into input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      // Skip if user was last focused on weather input section (not hodograph)
      const inputSection = document.querySelector('#imageInput, .image-input-area');
      if (inputSection && inputSection.contains(document.activeElement)) return;
      
      // Only capture if hodograph section was clicked/focused
      if (!hodographFocused) return;
      
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          loadHodographImage(items[i].getAsFile());
          break;
        }
      }
    });

    console.log('Hodograph analyzer v2.0 initialized (with tornado integration)');
  }

  function loadHodographImage(file) {
    const reader = new FileReader();
    const preview = document.getElementById('hodographPreview');
    const analyzeBtn = document.getElementById('analyzeHodograph');
    showHodographStatus('Loading image...', 'info');

    reader.onload = async function(e) {
      currentHodographImage = e.target.result;
      if (preview) {
        preview.innerHTML = `<img src="${currentHodographImage}" alt="Hodograph" class="hodograph-preview-image">`;
        preview.style.display = 'block';
      }
      
      // Show analyze button
      if (analyzeBtn) {
        analyzeBtn.style.display = 'block';
      }
      
      // Auto-analyze after loading if API key is available
      if (CONFIG.useServer || CONFIG.apiKey) {
        await runFullAnalysis();
      } else {
        showHodographStatus('Image loaded. Enter API key and click Analyze.', 'info');
      }
    };
    reader.onerror = () => showHodographStatus('Error loading image', 'error');
    reader.readAsDataURL(file);
  }

  async function pasteHodographFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith('image/')) {
            loadHodographImage(await item.getType(type));
            return;
          }
        }
      }
      showHodographStatus('No image found in clipboard', 'error');
    } catch (err) {
      // Fallback message - clipboard API may need permission
      showHodographStatus('Click in hodograph area and press Ctrl+V to paste.', 'info');
    }
  }

  async function runFullAnalysis() {
    showHodographStatus('Extracting hodograph geometry...', 'loading');

    try {
      const result = await analyzeHodographImage(currentHodographImage);
      extractedMetrics = result;
      analysisResults = result;
      
      displayMetricsResults(result);
      integrateWithTornadoCalculations(result);
      
      const confPct = Math.round((result.qc.confidence || 0) * 100);
      let statusMsg = `Analysis complete! Confidence: ${confPct}%`;
      if (result.qc.warnings.length > 0) statusMsg += ` (${result.qc.warnings.length} warnings)`;
      showHodographStatus(statusMsg, 'success');

    } catch (error) {
      console.error('Hodograph analysis error:', error);
      showHodographStatus(`Analysis failed: ${error.message}`, 'error');
    }
  }

  function displayMetricsResults(result) {
    const resultsDiv = document.getElementById('hodographResults');
    if (!resultsDiv) return;

    const { metrics, labels, qc } = result;

    resultsDiv.innerHTML = `
      <div class="analysis-content" style="font-size: 12px;">
        <h4 style="margin: 0 0 10px 0; color: #00c8ff; border-bottom: 1px solid #333; padding-bottom: 5px;">SHAPE METRICS</h4>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 4px 0; color: #888;">Curvature Index</td>
            <td style="padding: 4px 0; text-align: right; color: #fff; font-weight: bold;">${metrics.curvatureIndex.toFixed(2)}</td>
            <td style="padding: 4px 0 4px 8px; color: ${metrics.curvatureIndex >= 1.25 ? '#00ff88' : metrics.curvatureIndex <= 1.10 ? '#ffaa00' : '#888'}; font-size: 11px;">${metrics.curvatureIndex >= 1.25 ? 'Strong curve' : metrics.curvatureIndex <= 1.10 ? 'Straight' : 'Moderate'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 4px 0; color: #888;">Total Turning</td>
            <td style="padding: 4px 0; text-align: right; color: #fff; font-weight: bold;">${metrics.turningDeg}°</td>
            <td style="padding: 4px 0 4px 8px; color: ${metrics.turningDeg >= 90 ? '#00ff88' : '#888'}; font-size: 11px;">${metrics.turningDeg >= 90 ? 'High rotation' : metrics.turningDeg >= 45 ? 'Moderate' : 'Low'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 4px 0; color: #888;">Max Kink</td>
            <td style="padding: 4px 0; text-align: right; color: #fff; font-weight: bold;">${metrics.kinkMaxDeg}°</td>
            <td style="padding: 4px 0 4px 8px; color: ${metrics.kinkMaxDeg >= 45 ? '#ff6600' : '#888'}; font-size: 11px;">${metrics.kinkMaxDeg >= 45 ? 'Shear discontinuity' : 'Smooth'}</td>
          </tr>
          <tr style="border-bottom: 1px solid #333;">
            <td style="padding: 4px 0; color: #888;">Extension</td>
            <td style="padding: 4px 0; text-align: right; color: #fff; font-weight: bold;">${metrics.extensionNorm.toFixed(2)}</td>
            <td style="padding: 4px 0 4px 8px; color: ${metrics.extensionNorm >= 0.6 ? '#00ff88' : '#888'}; font-size: 11px;">${metrics.extensionNorm >= 0.6 ? 'Strong shear' : 'Moderate'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #888;">Compactness</td>
            <td style="padding: 4px 0; text-align: right; color: #fff; font-weight: bold;">${metrics.compactness.toFixed(2)}</td>
            <td style="padding: 4px 0 4px 8px; color: #888; font-size: 11px;"></td>
          </tr>
        </table>

        <h4 style="margin: 0 0 8px 0; color: #00c8ff; border-bottom: 1px solid #333; padding-bottom: 5px;">CLASSIFICATION</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
          <tr><td style="padding: 3px 0; color: #888;">Shape</td><td style="padding: 3px 0; text-align: right; color: #fff;">${labels.shapeType}</td></tr>
          <tr><td style="padding: 3px 0; color: #888;">Low-Level Curvature</td><td style="padding: 3px 0; text-align: right; color: #fff;">${labels.lowLevelCurvature}</td></tr>
          <tr><td style="padding: 3px 0; color: #888;">Storm Mode</td><td style="padding: 3px 0; text-align: right; color: #fff;">${labels.stormModeHint}</td></tr>
        </table>

        <div style="background: ${qc.confidence >= 0.6 ? 'rgba(0,255,136,0.1)' : 'rgba(255,100,0,0.1)'}; border: 1px solid ${qc.confidence >= 0.6 ? 'rgba(0,255,136,0.3)' : 'rgba(255,100,0,0.3)'}; border-radius: 4px; padding: 8px; margin-top: 8px;">
          <div style="color: ${qc.confidence >= 0.6 ? '#00ff88' : '#ff6600'}; font-weight: bold;">
            Confidence: ${Math.round(qc.confidence * 100)}%
          </div>
          <div style="color: #888; font-size: 11px; margin-top: 2px;">
            ${qc.confidence >= 0.6 ? 'Metrics will affect tornado predictions' : 'Too low for predictions'}
          </div>
          ${qc.warnings.length > 0 ? `<div style="color: #ff6600; font-size: 11px; margin-top: 4px;">Warnings: ${qc.warnings.join(', ')}</div>` : ''}
        </div>
      </div>
    `;
    resultsDiv.style.display = 'block';
  }

  /**
   * Integrate metrics with TornadoCalculations via window.HODOGRAPH_DATA
   */
  function integrateWithTornadoCalculations(result) {
    const { metrics, qc } = result;
    
    window.HODOGRAPH_DATA = {
      HODO_CURVATURE: metrics.curvatureIndex,
      HODO_TURNING: metrics.turningDeg,
      HODO_KINK: metrics.kinkMaxDeg,
      HODO_EXTENSION: metrics.extensionNorm,
      HODO_COMPACTNESS: metrics.compactness,
      HODO_CONF: qc.confidence
    };

    console.log('Hodograph data integrated:', window.HODOGRAPH_DATA);
    
    if (qc.confidence >= 0.6) {
      console.log('✅ Confidence >= 0.6: Metrics WILL affect tornado morphology predictions');
      console.log('💡 Change any weather input value to trigger recalculation with hodograph data');
    } else {
      console.log('⚠️ Confidence < 0.6: Metrics will NOT affect predictions');
    }
  }

  function showHodographStatus(message, type = 'info') {
    const statusDiv = document.getElementById('hodographStatus');
    if (!statusDiv) return;
    statusDiv.textContent = message;
    statusDiv.className = `status-message status-${type}`;
    statusDiv.style.display = 'block';
    if (type === 'info' || type === 'success') {
      setTimeout(() => { statusDiv.style.display = 'none'; }, 5000);
    }
  }

  // ========================================================================
  // EXPORTS
  // ========================================================================
  
  window.analyzeHodographImage = analyzeHodographImage;
  
  window.hodographAnalyzer = {
    initialize: initializeHodographAnalyzer,
    analyze: runFullAnalysis,
    getResults: () => analysisResults,
    getMetrics: () => extractedMetrics,
    computeMetrics: computeMetrics
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeHodographAnalyzer);
  } else {
    initializeHodographAnalyzer();
  }

})();
