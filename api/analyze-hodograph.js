/**
 * Hodograph Analysis API Endpoint v2.0
 * 
 * Supports TWO modes:
 * 1. extractGeometry: true  -> Returns structured JSON for metric calculation
 * 2. extractGeometry: false -> Returns human-readable analysis text
 * 
 * RATE LIMITING: Max 10 requests per IP per hour
 */

const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 60 * 1000;

function getRateLimitKey(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
         req.headers['x-real-ip'] ||
         req.socket?.remoteAddress ||
         'unknown';
}

function checkRateLimit(ip) {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  if (now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  if (record.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }
  
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count };
}

// Geometry extraction prompt for deterministic metric calculation
const GEOMETRY_PROMPT = `You are analyzing a hodograph image from a weather simulation game.

TASK: Extract the geometric data from this hodograph plot as structured JSON.

A hodograph shows wind vectors at different heights plotted as points connected by a line. The origin (0,0) represents no wind, and distance from origin represents wind speed.

Please extract:

1. **plotBbox**: The bounding box of the plot area in normalized coordinates [0-1]
   - xMin, yMin, xMax, yMax relative to image dimensions

2. **origin**: The position of the origin point (0,0) in normalized coordinates
   - x, y values between 0 and 1

3. **polylinePoints**: The main colored trace as ordered points (from surface upward)
   - Array of {x, y} objects in normalized coordinates
   - Include ALL visible points along the curve
   - Maximum 80 points, downsample if needed
   - Order from lowest altitude (surface) to highest

4. **stormMotion** (if visible): Storm motion marker/arrow
   - x, y: position in normalized coordinates
   - direction: degrees (meteorological, 0=N, 90=E)
   - speed: if text is visible, the speed value

5. **plotRadius**: Estimated radius of the outermost ring in the same units as the scale

6. **confidence**: Your confidence in the extraction (0.0 to 1.0)

7. **warnings**: Array of any issues encountered (e.g., "partial occlusion", "unclear origin", "ambiguous scale")

RESPOND WITH ONLY VALID JSON in this exact format:
{
  "plotBbox": {"xMin": 0.1, "yMin": 0.1, "xMax": 0.9, "yMax": 0.9},
  "origin": {"x": 0.5, "y": 0.5},
  "polylinePoints": [{"x": 0.5, "y": 0.5}, {"x": 0.52, "y": 0.48}],
  "stormMotion": {"x": 0.6, "y": 0.4, "direction": 250, "speed": 35},
  "plotRadius": 80,
  "confidence": 0.85,
  "warnings": []
}

If you cannot detect certain elements, use null for those fields.
Do NOT include any explanation text, ONLY the JSON object.`;

// Standard analysis prompt for human-readable output
const ANALYSIS_PROMPT = `You are a meteorology expert analyzing a hodograph image. A hodograph shows how wind speed and direction change with height in the atmosphere.

Please analyze this hodograph and provide the following information:

1. **Wind Shear Analysis:**
   - 0-1 km wind shear (magnitude and direction)
   - 0-3 km wind shear (magnitude and direction)
   - 0-6 km wind shear (magnitude and direction)

2. **Storm-Relative Helicity (SRH):**
   - Estimate 0-1 km SRH (in m²/s²)
   - Estimate 0-3 km SRH (in m²/s²)

3. **Hodograph Shape:**
   - Describe the overall shape (straight, curved, looped, etc.)
   - Note any backing or veering of winds
   - Identify any significant directional changes

4. **Supercell/Tornado Potential:**
   - Assess the hodograph's support for supercell development
   - Evaluate tornado potential based on low-level shear
   - Identify the likely dominant storm mode (supercell, linear, etc.)

5. **Additional Observations:**
   - Note any unusual features
   - Identify the presence of streamwise vorticity
   - Comment on the environmental wind profile

Please provide numerical estimates where possible and format your response clearly with sections.`;

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check rate limit
  const ip = getRateLimitKey(req);
  const rateLimit = checkRateLimit(ip);
  
  res.setHeader('X-RateLimit-Limit', RATE_LIMIT);
  res.setHeader('X-RateLimit-Remaining', rateLimit.remaining);
  
  if (!rateLimit.allowed) {
    res.setHeader('Retry-After', rateLimit.retryAfter);
    return res.status(429).json({ 
      error: `Rate limit exceeded. Please try again in ${Math.ceil(rateLimit.retryAfter / 60)} minutes.`,
      retryAfter: rateLimit.retryAfter
    });
  }

  try {
    const { image, extractGeometry } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Validate image size (5MB limit)
    const imageSizeKB = (image.length * 0.75) / 1024;
    if (imageSizeKB > 5000) {
      return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    // Choose prompt based on mode
    const prompt = extractGeometry ? GEOMETRY_PROMPT : ANALYSIS_PROMPT;

    // Extract base64 data from data URL
    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1] || 'image/png';

    // Call Gemini API
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data
              }
            }
          ]
        }],
        generationConfig: {
          maxOutputTokens: extractGeometry ? 4000 : 1500,
          temperature: extractGeometry ? 0.1 : 0.7
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'Gemini API error' 
      });
    }

    const data = await response.json();
    const analysisText = data.candidates[0].content.parts[0].text;

    // If geometry mode, try to parse JSON
    if (extractGeometry) {
      try {
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const geometry = JSON.parse(jsonMatch[0]);
          return res.status(200).json({
            geometry,
            analysis: analysisText,
            rateLimit: { remaining: rateLimit.remaining, limit: RATE_LIMIT }
          });
        }
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        // Fall through to return raw text
      }
    }

    return res.status(200).json({ 
      analysis: analysisText,
      rateLimit: { remaining: rateLimit.remaining, limit: RATE_LIMIT }
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
