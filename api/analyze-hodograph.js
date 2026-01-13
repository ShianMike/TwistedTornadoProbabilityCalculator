/**
 * Hodograph Analysis API Endpoint
 * This serverless function keeps your OpenAI API key secret on the server
 * Users never see your API key - they just call this endpoint
 * 
 * RATE LIMITING: Prevents abuse (max 10 requests per IP per hour)
 */

// Simple in-memory rate limiting (resets on cold start)
// For production, consider using Vercel KV or Upstash Redis
const rateLimitMap = new Map();
const RATE_LIMIT = 10; // Max requests per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds

function getRateLimitKey(req) {
  // Get IP address from various headers (Vercel, Cloudflare, etc.)
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
  
  // Reset if window expired
  if (now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  // Check if over limit
  if (record.count >= RATE_LIMIT) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }
  
  // Increment counter
  record.count++;
  return { allowed: true, remaining: RATE_LIMIT - record.count };
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST
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
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'No image provided' });
    }

    // Validate image size (rough check - base64 is ~1.37x larger than binary)
    const imageSizeKB = (image.length * 0.75) / 1024;
    if (imageSizeKB > 5000) { // 5MB limit
      return res.status(400).json({ error: 'Image too large. Maximum size is 5MB.' });
    }

    // Your API key is stored as an environment variable in Vercel
    // Users NEVER see this key!
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const prompt = `You are a meteorology expert analyzing a hodograph image. A hodograph shows how wind speed and direction change with height in the atmosphere.

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

    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: image, detail: 'high' } }
            ]
          }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      return res.status(response.status).json({ 
        error: errorData.error?.message || 'OpenAI API error' 
      });
    }

    const data = await response.json();
    const analysis = data.choices[0].message.content;

    return res.status(200).json({ 
      analysis,
      rateLimit: {
        remaining: rateLimit.remaining,
        limit: RATE_LIMIT
      }
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
