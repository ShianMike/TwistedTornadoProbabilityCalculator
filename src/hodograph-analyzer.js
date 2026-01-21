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
    // Use full Vercel URL for GitHub Pages, relative path for Vercel itself
    serverEndpoint: window.location.hostname.includes('vercel.app') 
      ? '/api/analyze-hodograph' 
      : 'https://twisted-tornado-probability-calculator-shians-projects-7aecca1a.vercel.app/api/analyze-hodograph',
    apiKey: '',
    apiEndpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent',
    model: 'gemini-2.5-pro',
    maxTokens: 8000,
    useServer: true  // Always use server (Vercel API)
  };

  // Load API key from config.js if available (for local testing only)
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
  const GEOMETRY_EXTRACTION_PROMPT = `
You are extracting geometry from a hodograph image.

TASK
Extract ONLY the colored hodograph wind-trace polyline (the multicolor line) and key reference points.

OUTPUT FORMAT
Return ONLY valid JSON that matches EXACTLY this schema:
{
  "polylinePoints": [{"x": 0.0, "y": 0.0}, ...],
  "origin": {"x": 0.0, "y": 0.0},
  "stormMotion": {"direction": null, "speed": null, "units": null},
  "confidence": 0.0,
  "warnings": []
}

COORDINATE SYSTEM (NORMALIZED)
- x and y are normalized to the FULL IMAGE you are given:
  x=0 is left edge, x=1 is right edge
  y=0 is TOP edge, y=1 is BOTTOM edge

WHAT TO TRACE (IMPORTANT)
- Trace ONLY the colored hodograph line showing wind with height.
- The trace is typically color-graded (magenta/purple -> red -> yellow/green -> cyan/blue).
- DO NOT include:
  - white axes lines
  - dotted range rings / grid points
  - tick marks
  - storm-motion arrow graphic (unless extracting stormMotion separately)
  - text labels (e.g., "63°", "70mph")

POLYLINE POINTS REQUIREMENTS
- Provide 12–25 points total.
- Points MUST follow the line in height order:
  start at the FIRST/LOWEST-LEVEL end (usually magenta/purple)
  end at the LAST/HIGHEST-LEVEL end (usually green/cyan/blue)
- Include ALL major vertices:
  - If the line has a sharp corner/kink, include points just before, at, and just after the corner.
  - Do not "smooth out" corners.
- Place points ON the CENTER of the colored stroke, not its outer edge.
- If parts of the line are faint/occluded, estimate conservatively and add a warning.

ORIGIN (AXES INTERSECTION)
- Identify the thick white vertical and horizontal axes in the hodograph panel.
- origin is the intersection of these axes.
- If one axis is truncated/cropped, infer the intersection by extending the visible axis segments.
- If origin cannot be located confidently, set origin to null and add a warning.

STORM MOTION (OPTIONAL)
- If the image contains a storm-motion arrow AND numeric direction/speed text:
  - direction is the direction the storm is MOVING TOWARD, in degrees (0=N, 90=E, 180=S, 270=W).
  - speed is the numeric speed.
  - units must be one of: "kt", "mph", or null if unknown.
- If not clearly present, set direction/speed/units to null.

CONFIDENCE + WARNINGS
- confidence: 0.0–1.0 reflecting clarity of the trace AND origin.
- warnings: array of strings describing any uncertainty (e.g., "trace partially occluded", "origin inferred", "units unclear").

RETURN JSON ONLY. No extra text.
`;

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

  function headingDeltaSigned(angle1, angle2) {
    let diff = angle2 - angle1;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return diff; // signed in [-180, 180]
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

  // ========================================================================
  // PREPROCESSING: Remove jitter and resample for consistent metrics
  // ========================================================================

  /**
   * Remove points that are too close together (denoising)
   */
  function simplifyByMinStep(points, minStep) {
    if (!points || points.length === 0) return [];
    const out = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (distance(out[out.length - 1], points[i]) >= minStep) out.push(points[i]);
    }
    // Ensure last point kept
    if (out.length === 1 && points.length > 1) out.push(points[points.length - 1]);
    return out;
  }

  /**
   * Resample polyline to uniform arc-length spacing
   */
  function resampleByArcLength(points, targetCount) {
    if (!points || points.length < 2) return points || [];

    const total = arcLength(points);
    if (total === 0) return [points[0]];

    const step = total / (targetCount - 1);
    const out = [points[0]];

    let segStartIdx = 0;
    let distAccum = 0;

    for (let k = 1; k < targetCount - 1; k++) {
      const targetDist = k * step;

      while (segStartIdx < points.length - 1) {
        const a = points[segStartIdx];
        const b = points[segStartIdx + 1];
        const segLen = distance(a, b);

        if (distAccum + segLen >= targetDist) {
          const t = (targetDist - distAccum) / (segLen || 1e-9);
          out.push({ x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
          break;
        } else {
          distAccum += segLen;
          segStartIdx++;
        }
      }
    }

    out.push(points[points.length - 1]);
    return out;
  }

  // ========================================================================
  // METRIC CALCULATIONS
  // ========================================================================

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
   * Calculate both absolute and net turning
   * absolute = total bending, net = signed rotation (CW vs CCW)
   */
  function calculateTurning(points) {
    if (points.length < 3) return { absolute: 0, net: 0 };

    let absSum = 0;
    let netSum = 0;

    for (let i = 2; i < points.length; i++) {
      const h1 = heading(points[i - 2], points[i - 1]);
      const h2 = heading(points[i - 1], points[i]);
      const d = headingDeltaSigned(h1, h2);
      absSum += Math.abs(d);
      netSum += d;
    }

    return { absolute: absSum, net: netSum };
  }

  /**
   * Max kink = single largest heading change using 2-step window
   * Uses wider chord to reduce jitter sensitivity
   */
  function calculateKinkMaxDeg(points) {
    if (points.length < 5) return 0;

    let maxKink = 0;
    for (let i = 2; i < points.length - 2; i++) {
      // Use a 2-step chord on each side to reduce jitter sensitivity
      const h1 = heading(points[i - 2], points[i]);
      const h2 = heading(points[i], points[i + 2]);
      const kink = Math.abs(headingDeltaSigned(h1, h2));
      if (kink > maxKink) maxKink = kink;
    }
    return maxKink;
  }

  // ========================================================================
  // LOOP DETECTION
  // ========================================================================

  /**
   * Check if two line segments intersect
   */
  function segmentsIntersect(a, b, c, d) {
    function ccw(p1, p2, p3) {
      return (p3.y - p1.y) * (p2.x - p1.x) > (p2.y - p1.y) * (p3.x - p1.x);
    }
    return (ccw(a, c, d) !== ccw(b, c, d)) && (ccw(a, b, c) !== ccw(a, b, d));
  }

  /**
   * Detect if polyline crosses itself
   */
  function hasSelfIntersection(points) {
    for (let i = 0; i < points.length - 3; i++) {
      for (let j = i + 2; j < points.length - 1; j++) {
        // Skip adjacent segments sharing a point
        if (j === i + 1) continue;
        if (segmentsIntersect(points[i], points[i + 1], points[j], points[j + 1])) return true;
      }
    }
    return false;
  }

  /**
   * Calculate polar angle of point relative to origin
   */
  function polarAngle(p, origin) {
    return Math.atan2(p.y - origin.y, p.x - origin.x) * (180 / Math.PI);
  }

  /**
   * Calculate winding angle around origin (signed degrees)
   * >220° indicates a loop wrap
   */
  function windingDeg(points, origin) {
    if (!origin || points.length < 2) return 0;
    let sum = 0;
    for (let i = 1; i < points.length; i++) {
      const a1 = polarAngle(points[i - 1], origin);
      const a2 = polarAngle(points[i], origin);
      let d = a2 - a1;
      while (d > 180) d -= 360;
      while (d < -180) d += 360;
      sum += d;
    }
    return sum; // signed
  }

  // ========================================================================
  // EXTENSION AND COMPACTNESS
  // ========================================================================

  /**
   * Normalize radius by max possible distance to image edge
   */
  function normalizeRadius(r, origin) {
    const maxX = Math.max(origin.x, 1 - origin.x);
    const maxY = Math.max(origin.y, 1 - origin.y);
    const maxR = Math.sqrt(maxX * maxX + maxY * maxY);
    return maxR > 0 ? r / maxR : 0;
  }

  /**
   * Extension norm = max distance from origin, normalized to [0,1]
   */
  function calculateExtensionNorm(points, origin) {
    if (!origin || points.length === 0) return 0;
    let maxDist = 0;
    for (const p of points) {
      maxDist = Math.max(maxDist, distance(p, origin));
    }
    return normalizeRadius(maxDist, origin);
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
      maxDist = Math.max(maxDist, d);
    }
    const meanDist = totalDist / points.length;
    return maxDist > 0 ? meanDist / maxDist : 1.0;
  }

  /**
   * Compute all metrics from extracted geometry
   */
  function computeMetrics(geometry) {
    let points = geometry.polylinePoints || [];
    const origin = geometry.origin || { x: 0.5, y: 0.5 };

    if (points.length < 2) {
      return {
        metrics: { curvatureIndex: 1.0, turningDeg: 0, netTurningDeg: 0, kinkMaxDeg: 0, extensionNorm: 0, compactness: 1.0 },
        labels: { shapeType: 'UNKNOWN', lowLevelCurvature: 'UNKNOWN', stormModeHint: 'UNKNOWN' },
        qc: { confidence: 0, warnings: ['Insufficient points extracted'] }
      };
    }

    // 1) Remove jitter: min segment length scaled to polyline length (self-tuning)
    const L = arcLength(points);
    const minStep = Math.max(0.003, Math.min(0.01, L / 250));
    points = simplifyByMinStep(points, minStep);

    // 2) Uniformize sampling (important for angle metrics)
    points = resampleByArcLength(points, Math.min(21, Math.max(12, points.length)));

    // Compute metrics on cleaned points
    const curvatureIndex = calculateCurvatureIndex(points);
    const turning = calculateTurning(points);
    const turningDeg = turning.absolute;
    const netTurningDeg = turning.net;
    const kinkMaxDeg = calculateKinkMaxDeg(points);
    const extensionNorm = calculateExtensionNorm(points, origin);
    const compactness = calculateCompactness(points, origin);

    // Loop detection - gate self-intersection with winding to prevent false positives
    const wind = windingDeg(points, origin);
    const hasLoop = (Math.abs(wind) > 220) || (hasSelfIntersection(points) && Math.abs(wind) > 140);

    // Derive labels from metrics
    let shapeType = 'CURVED';
    if (hasLoop) shapeType = 'LOOPED';
    else if (curvatureIndex < 1.10) shapeType = 'STRAIGHT';
    else if (curvatureIndex > 1.25) shapeType = 'STRONGLY_CURVED';
    else shapeType = 'MODERATELY_CURVED';

    // Low-level curvature (first 35% of points, min 6 for stability)
    let lowLevelCurvature = 'MODERATE';
    const lowLevelPoints = points.slice(0, Math.max(6, Math.floor(points.length * 0.35)));
    const llTurning = calculateTurning(lowLevelPoints);
    if (llTurning.absolute > 60) lowLevelCurvature = 'STRONG';
    else if (llTurning.absolute < 20) lowLevelCurvature = 'WEAK';

    // Storm mode classification
    let stormModeHint = 'SUPERCELL_POSSIBLE';
    if (curvatureIndex < 1.10 && extensionNorm > 0.6) stormModeHint = 'LINEAR';
    else if (lowLevelCurvature === 'STRONG' && extensionNorm > 0.55) stormModeHint = 'SUPERCELL';
    else if (hasLoop && extensionNorm > 0.55) stormModeHint = 'SUPERCELL';
    else if (compactness > 0.8) stormModeHint = 'WEAK_CONVECTIVE';

    // QC sanity checks
    const qcWarnings = geometry.warnings ? [...geometry.warnings] : [];
    if (turningDeg > 420 && !hasLoop) qcWarnings.push('Turning unusually high without loop detection (possible jitter)');
    if (kinkMaxDeg > 120) qcWarnings.push('Max kink extremely high (possible extraction error)');
    if (!geometry.origin) qcWarnings.push('Origin missing; extension/compactness may be unreliable');

    return {
      metrics: {
        curvatureIndex: Math.round(curvatureIndex * 100) / 100,
        turningDeg: Math.round(turningDeg),
        netTurningDeg: Math.round(netTurningDeg),
        kinkMaxDeg: Math.round(kinkMaxDeg),
        extensionNorm: Math.round(extensionNorm * 100) / 100,
        compactness: Math.round(compactness * 100) / 100
      },
      labels: { shapeType, lowLevelCurvature, stormModeHint },
      qc: { confidence: geometry.confidence || 0.5, warnings: qcWarnings }
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
    result.hazardAnalysis = geometry.hazardAnalysis || null;
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

        if (response.status === 504) {
          throw new Error('Server timeout. The AI is taking too long. Please try again with a smaller/simpler image.');
        }

        if (!response.ok) {
          let errorData;
          try {
            errorData = await response.json();
          } catch {
            throw new Error(`Server error: ${response.status}`);
          }
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
        if (!CONFIG.apiKey) throw new Error('No API key configured. Please enter your Gemini API key above.');

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
          e.stopPropagation();
          loadHodographImage(items[i].getAsFile());
          return; // Exit completely after handling
        }
      }
    }, true);

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
            <td style="padding: 4px 0; color: #888;">Net Turning</td>
            <td style="padding: 4px 0; text-align: right; color: #fff; font-weight: bold;">${metrics.netTurningDeg}°</td>
            <td style="padding: 4px 0 4px 8px; color: ${metrics.netTurningDeg > 0 ? '#00c8ff' : metrics.netTurningDeg < 0 ? '#ff88ff' : '#888'}; font-size: 11px;">${metrics.netTurningDeg > 0 ? 'CW' : metrics.netTurningDeg < 0 ? 'CCW' : 'Neutral'}</td>
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
          <tr><td style="padding: 3px 0; color: #888;">Shape</td><td style="padding: 3px 0; text-align: right; color: #fff;">${labels.shapeType.replace(/_/g, ' ')}</td></tr>
          <tr><td style="padding: 3px 0; color: #888;">Low-Level Curvature</td><td style="padding: 3px 0; text-align: right; color: #fff;">${labels.lowLevelCurvature}</td></tr>
          <tr><td style="padding: 3px 0; color: #888;">Storm Mode</td><td style="padding: 3px 0; text-align: right; color: #fff;">${labels.stormModeHint.replace(/_/g, ' ')}</td></tr>
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
    const { metrics, qc, hazardAnalysis } = result;
    
    window.HODOGRAPH_DATA = {
      HODO_CURVATURE: metrics.curvatureIndex,
      HODO_TURNING: metrics.turningDeg,
      HODO_NET_TURNING: metrics.netTurningDeg,
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

    // Display hazard analysis if available
    displayHazardAnalysis(hazardAnalysis, qc.confidence);
  }

  /**
   * Display hazard analysis (hail and straight-line winds) in the results section
   */
  function displayHazardAnalysis(hazardAnalysis, confidence) {
    const hazardsDiv = document.getElementById('hodographHazards');
    const hailPotential = document.getElementById('hailPotential');
    const windPotential = document.getElementById('windPotential');
    const reasoningDiv = document.getElementById('hazardReasoning');

    if (!hazardsDiv || !hailPotential || !windPotential) return;

    // Only show if confidence is sufficient and hazard data exists
    if (!hazardAnalysis || confidence < 0.5) {
      hazardsDiv.style.display = 'none';
      return;
    }

    const hail = hazardAnalysis.largeHail || { potential: 'unknown', reasoning: '' };
    const wind = hazardAnalysis.straightLineWinds || { potential: 'unknown', reasoning: '' };

    // Set hail value - show size if available, otherwise potential
    if (hail.sizeRange) {
      hailPotential.textContent = hail.sizeRange;
    } else if (hail.maxSize) {
      hailPotential.textContent = `${hail.maxSize}"`;
    } else {
      hailPotential.textContent = hail.potential || '--';
    }
    hailPotential.className = 'hazard-value ' + (hail.potential || 'none').toLowerCase();

    // Set wind value - show speed if available, otherwise potential
    if (wind.speedRange) {
      windPotential.textContent = wind.speedRange;
    } else if (wind.maxSpeed) {
      windPotential.textContent = `${wind.maxSpeed} mph`;
    } else {
      windPotential.textContent = wind.potential || '--';
    }
    windPotential.className = 'hazard-value ' + (wind.potential || 'none').toLowerCase();

    // Build reasoning text
    let reasoning = '';
    if (hail.reasoning) {
      reasoning += `<strong>Hail:</strong> ${hail.reasoning}`;
    }
    if (wind.reasoning) {
      if (reasoning) reasoning += '<br>';
      reasoning += `<strong>Winds:</strong> ${wind.reasoning}`;
    }
    
    if (reasoning && reasoningDiv) {
      reasoningDiv.innerHTML = reasoning;
      reasoningDiv.style.display = 'block';
    } else if (reasoningDiv) {
      reasoningDiv.style.display = 'none';
    }

    hazardsDiv.style.display = 'block';
    console.log('Hazard analysis displayed:', hazardAnalysis);
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
