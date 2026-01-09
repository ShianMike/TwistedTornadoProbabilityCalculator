/**
 * CHART RENDERING MODULE
 * Handles Chart.js rendering and visual elements
 * Provides color gradients and mini wind speed visualization
 */

(function() {
  'use strict';

  // ============================================================================
  // TORNADO TYPE DESCRIPTIONS
  // ============================================================================
  
  // Detailed descriptions for tooltip display
  const tornadoDescriptions = {
    'ROPE': 'Thin, weak tornado often in marginal conditions. Low CAPE, weak rotation, dissipating stage of supercells.',
    'CONE': 'Classic tornado funnel shape. Balanced atmospheric conditions with moderate instability and rotation.',
    'STOVEPIPE': 'Cylindrical, strong tornado (stovepipe shape). High instability, strong rotation, steep lapse rates.',
    'WEDGE': 'Very wide tornado, often violent (>0.5 mile wide). High moisture, slow storm motion, extreme conditions.',
    'FUNNEL': 'Funnel cloud with brief ground contact. Moderate rotation, transient touchdowns, fast-moving systems.',
    'DRILLBIT': 'Fast-moving, narrow tornado in dry environment. High storm speed, low moisture, dry line conditions.',
    'SIDEWINDER': 'Rotational narrow tornado in cold/dry environments. Strong rotation, low temperature, dry air.'
  };

  // ============================================================================
  // TORNADO TYPE DISPLAY NAMES
  // ============================================================================
  
  /**
   * Map internal type keys to display names
   * Used for consistent display across the UI
   */
  const tornadoDisplayNames = {
    'ROPE': 'ROPE',
    'CONE': 'CONE', 
    'STOVEPIPE': 'STOVEPIPE',
    'WEDGE': 'WEDGE',
    'FUNNEL': 'FUNNEL',
    'DRILLBIT': 'DRILLBIT',
    'SIDEWINDER': 'SIDEWINDER'
  };

  /**
   * Get display name for a tornado type
   * @param {string} type - Internal tornado type key
   * @returns {string} Display name
   */
  function getDisplayName(type) {
    return tornadoDisplayNames[type] || type;
  }

  // ============================================================================
  // CHART.JS PLUGIN REGISTRATION
  // ============================================================================
  
  /**
   * Register ChartDataLabels plugin
   * Only registers once to avoid duplicate registration errors
   */
  function tryRegisterDataLabels() {
    try {
      // Check if Chart.js and plugin are loaded
      if (typeof window.Chart === 'undefined' || typeof window.ChartDataLabels === 'undefined') {
        return;
      }
      
      // Register only once
      if (!window._chartDataLabelsRegistered) {
        Chart.register(ChartDataLabels);
        window._chartDataLabelsRegistered = true;
        console.log('[ChartRenderer] ChartDataLabels registered successfully');
      }
    } catch (e) {
      // Silently ignore - probably already registered
    }
   }

  // ============================================================================
  // COLOR GRADIENT FUNCTION
  // ============================================================================
  
  /**
   * Generate color for probability value
   * Creates smooth gradient from blue (low) to red (high)
   * @param {number} value - Probability percentage (0-100)
   * @returns {string} RGB color string
   */
  function colorForValue(value) {
    // Color stops for gradient
    // Blue -> Cyan -> Green -> Yellow -> Orange -> Red
    const stops = [
      {v:0, c:[30,136,229]},      // Blue (0%)
      {v:25, c:[38,198,218]},     // Cyan (25%)
      {v:50, c:[102,187,106]},    // Green (50%)
      {v:75, c:[255,167,38]},     // Orange (75%)
      {v:100, c:[239,83,80]}      // Red (100%)
    ];
    
    // Clamp value to 0-100 range
    const pct = Math.max(0, Math.min(100, value));
    
    // Find color stops to interpolate between
    for (let i=0;i<stops.length-1;i++){
      const a=stops[i], b=stops[i+1];
      if (pct >= a.v && pct <= b.v) {
        // Linear interpolation between stops
        const t = (pct - a.v) / (b.v - a.v);
        const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * t);
        const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * t);
        const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * t);
        return `rgb(${r},${g},${bl})`;
      }
    }
    return '#ffffff';
  }

  // ============================================================================
  // CANVAS DRAWING UTILITIES
  // ============================================================================
  
  /**
   * Draw rounded rectangle on canvas
   * @param {CanvasRenderingContext2D} ctx - Canvas context
   * @param {number} x - X position
   * @param {number} y - Y position
   * @param {number} w - Width
   * @param {number} h - Height
   * @param {number} r - Border radius
   * @param {boolean} fill - Fill the shape
   * @param {boolean} stroke - Stroke the outline
   */
  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    // Adjust radius if rectangle is too small
    if (w < 2*r) r = w/2;
    if (h < 2*r) r = h/2;
    
    // Draw rounded rectangle path
    ctx.beginPath();
    ctx.moveTo(x+r,y);
    ctx.arcTo(x+w,y,x+w,y+h,r);
    ctx.arcTo(x+w,y+h,x,y+h,r);
    ctx.arcTo(x,y+h,x,y,r);
    ctx.arcTo(x,y,x+w,y,r);
    ctx.closePath();
    
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // ============================================================================
  // MINI WIND SPEED VISUALIZATION
  // ============================================================================
  
  /**
   * Draw mini wind speed gradient bar
   * Compact design with proper text sizing
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} estimate - Wind estimate object with min/max values
   */
  function drawMiniWind(canvas, estimate) {
    if (!canvas || !estimate) {
      console.warn('[ChartRenderer] Missing canvas or estimate');
      return;
    }

    console.log('[ChartRenderer] Drawing wind bar with estimate:', estimate);

    const ctx = canvas.getContext('2d', { willReadFrequently: true, alpha: true });
    
    // Get the device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set the display size if different from current
    if (canvas.style.width !== rect.width + 'px') {
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
    }
    
    // Set the actual size in memory (scaled for the device pixel ratio)
    const width = rect.width * dpr;
    const height = rect.height * dpr;
    
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      
      // Scale the drawing context so everything draws at the correct size
      ctx.scale(dpr, dpr);
    }
    
    // Use display dimensions for calculations
    const displayWidth = rect.width;
    const displayHeight = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Realistic EF Scale colors with pink for 200+ mph
    const efColors = [
      { mph: 0,   color: '#6b7280' },
      { mph: 65,  color: '#3b82f6' },
      { mph: 86,  color: '#10b981' },
      { mph: 111, color: '#fbbf24' },
      { mph: 136, color: '#f97316' },
      { mph: 166, color: '#ef4444' },
      { mph: 200, color: '#db2777' },
      { mph: 250, color: '#c026d3' },
      { mph: 300, color: '#a21caf' },
      { mph: 400, color: '#86198f' }
    ];

    const maxMph = 400;
    const minPos = (estimate.est_min / maxMph) * displayWidth;
    const maxPos = (estimate.est_max / maxMph) * displayWidth;

    // Create gradient
    const bgGradient = ctx.createLinearGradient(0, 0, displayWidth, 0);
    efColors.forEach(ef => {
      bgGradient.addColorStop(ef.mph / maxMph, ef.color);
    });

    // Draw main bar with modern radius - positioned lower to make room for text
    const radius = 6; /* Increased from 4 for modern look */
    const barTop = 12; // Start bar lower to make room for text
    const barHeight = displayHeight - barTop - 2;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, barTop, displayWidth, barHeight, radius);
    ctx.fillStyle = bgGradient;
    ctx.fill();
    ctx.restore();

    // Darken non-active areas
    ctx.save();
    ctx.globalAlpha = 0.65; /* Slightly lighter for modern look */
    ctx.fillStyle = '#000000';
    
    if (minPos > 2) {
      ctx.beginPath();
      ctx.roundRect(0, barTop, minPos, barHeight, [radius, 0, 0, radius]);
      ctx.fill();
    }
    
    if (maxPos < displayWidth - 2) {
      ctx.beginPath();
      ctx.roundRect(maxPos, barTop, displayWidth - maxPos, barHeight, [0, radius, radius, 0]);
      ctx.fill();
    }
    ctx.restore();

    // Draw thin EF scale dividers
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    [65, 86, 111, 136, 166, 200].forEach(mph => {
      const x = Math.round((mph / maxMph) * displayWidth);
      ctx.beginPath();
      ctx.moveTo(x, barTop + 2);
      ctx.lineTo(x, displayHeight - 2);
      ctx.stroke();
    });
    ctx.restore();

    // Draw range indicators with modern styling
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 2.5; /* Slightly thicker */
    ctx.lineCap = 'round'; /* Rounded ends for modern look */
    
    ctx.beginPath();
    ctx.moveTo(Math.round(minPos), barTop + 2);
    ctx.lineTo(Math.round(minPos), displayHeight - 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(Math.round(maxPos), barTop + 2);
    ctx.lineTo(Math.round(maxPos), displayHeight - 2);
    ctx.stroke();
    ctx.restore();

    // TEXT RENDERING - Modern typography positioned above the bar
    ctx.save();
    ctx.textBaseline = 'top'; // Position text from top
    ctx.fillStyle = '#ffffff';
    
    // Strong shadow for text visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    // Speed range labels positioned in upper portion of canvas
    ctx.font = '600 12px Inter, sans-serif'; // Increased by 2px
    ctx.letterSpacing = '-0.02em';
    
    // Min wind label (left-aligned above min position)
    ctx.textAlign = 'left';
    const minText = `${estimate.est_min}`;
    ctx.fillText(minText, minPos, 1); // Position near top
    
    // Max wind label (right-aligned above max position)  
    ctx.textAlign = 'right';
    const maxText = `${estimate.est_max}`;
    ctx.fillText(maxText, maxPos, 1); // Position near top
    
    // MPH label in center
    ctx.textAlign = 'center';
    ctx.font = '400 10px Inter, sans-serif'; // Increased by 2px
    const centerX = (minPos + maxPos) / 2;
    ctx.fillText('mph', centerX, 1);

    // Add thermal wind indicator if present and significant
    if (estimate.thermalContribution && estimate.thermalContribution > 5) {
      ctx.font = '500 9px Inter, sans-serif'; // Increased by 2px
      ctx.fillStyle = '#fbbf24'; // Yellow indicator
      ctx.textAlign = 'center';
      const THERMAL_GAMMA_ADJUSTED = 0.6;
      const thermalText = `+${Math.round(estimate.thermalContribution * THERMAL_GAMMA_ADJUSTED)}th`;
      
      // Position on right side if space allows
      if (displayWidth > 400) {
        ctx.textAlign = 'right';
        ctx.fillText(thermalText, displayWidth - 5, 1);
      }
    }

    ctx.restore();

    console.log('[ChartRenderer] Wind bar drawn successfully');
  }

  // ============================================================================
  // EXPORT MODULE
  // ============================================================================
  
  // Export functions to global scope
  window.ChartRenderer = {
    tornadoDescriptions,
    tornadoDisplayNames,
    getDisplayName,  // NEW: Export the display name function
    tryRegisterDataLabels,
    colorForValue,
    roundRect,
    drawMiniWind
  };

})();
