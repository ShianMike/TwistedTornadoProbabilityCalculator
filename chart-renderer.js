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
    'SIDEWINDER': 'Rotational, narrow tornado often with long track. Dominated by strong low-level rotation (SRH) and storm speed.',
    'STOVEPIPE': 'Very narrow, violent tornado with tight core. Requires extreme instability and high VTP. Rare but potentially intense.',
    'WEDGE': 'Wide, rain-fed tornado with broad circulation. Driven by low-level moisture and moderate CAPE. Often rain-wrapped and slow-moving.',
    'DRILLBIT': 'Fast-moving tornado in dry environment. Thin to moderate circulation with high storm speed and low moisture. Includes both grounded fast tornadoes and rotating funnels aloft. Often associated with dry lines and strong wind shear.',
    'CONE': 'Classic mid-range tornado with balanced morphology. Moderately intense with moderate rotation and CAPE.',
    'ROPE': 'Weak, decaying funnel typically in low-CAPE or weakening environments. Often thin and elongated.'
  };

  // ============================================================================
  // TORNADO TYPE DISPLAY NAMES
  // ============================================================================
  
  /**
   * Map internal type keys to display names
   * Used for showing "DRILLBIT/FUNNEL" in the UI while keeping "DRILLBIT" as the internal key
   */
  const tornadoDisplayNames = {
    'SIDEWINDER': 'SIDEWINDER',
    'STOVEPIPE': 'STOVEPIPE',
    'WEDGE': 'WEDGE',
    'DRILLBIT': 'DRILLBIT/FUNNEL',  // Display name includes /FUNNEL
    'CONE': 'CONE',
    'ROPE': 'ROPE'
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
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

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
    const minPos = (estimate.est_min / maxMph) * width;
    const maxPos = (estimate.est_max / maxMph) * width;

    // Create gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, 0);
    efColors.forEach(ef => {
      bgGradient.addColorStop(ef.mph / maxMph, ef.color);
    });

    // Draw main bar with modern radius
    const radius = 6; /* Increased from 4 for modern look */
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(0, 0, width, height, radius);
    ctx.fillStyle = bgGradient;
    ctx.fill();
    ctx.restore();

    // Darken non-active areas
    ctx.save();
    ctx.globalAlpha = 0.65; /* Slightly lighter for modern look */
    ctx.fillStyle = '#000000';
    
    if (minPos > 2) {
      ctx.beginPath();
      ctx.roundRect(0, 0, minPos, height, [radius, 0, 0, radius]);
      ctx.fill();
    }
    
    if (maxPos < width - 2) {
      ctx.beginPath();
      ctx.roundRect(maxPos, 0, width - maxPos, height, [0, radius, radius, 0]);
      ctx.fill();
    }
    ctx.restore();

    // Draw thin EF scale dividers
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    [65, 86, 111, 136, 166, 200].forEach(mph => {
      const x = Math.round((mph / maxMph) * width);
      ctx.beginPath();
      ctx.moveTo(x, 2);
      ctx.lineTo(x, height - 2);
      ctx.stroke();
    });
    ctx.restore();

    // Draw range indicators with modern styling
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.lineWidth = 2.5; /* Slightly thicker */
    ctx.lineCap = 'round'; /* Rounded ends for modern look */
    
    ctx.beginPath();
    ctx.moveTo(Math.round(minPos), 2);
    ctx.lineTo(Math.round(minPos), height - 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(Math.round(maxPos), 2);
    ctx.lineTo(Math.round(maxPos), height - 2);
    ctx.stroke();
    ctx.restore();

    // TEXT RENDERING - Modern typography
    ctx.save();
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    
    // Strong shadow for text visibility
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;

    const midY = height / 2;

    // Speed range label with modern font sizing
    ctx.font = '600 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '-0.02em';
    
    const centerX = (minPos + maxPos) / 2;
    const rangeText = `${estimate.est_min}-${estimate.est_max} mph`;
    
    // Show if there's enough space - REDUCED threshold from 100 to 60
    if ((maxPos - minPos) > 60) {
      ctx.fillText(rangeText, centerX, midY);
    } else if ((maxPos - minPos) > 40) {
      // For narrower ranges, use smaller font
      ctx.font = '600 13px Inter, sans-serif';
      ctx.fillText(rangeText, centerX, midY);
    } else if ((maxPos - minPos) > 20) {
      // For very narrow ranges, use even smaller font
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillText(rangeText, centerX, midY);
    }

    // Add thermal wind indicator if present and significant
    if (estimate.thermalContribution && estimate.thermalContribution > 5) {
      ctx.font = '500 11px Inter, sans-serif';
      ctx.fillStyle = '#fbbf24'; // Yellow indicator
      const THERMAL_GAMMA_ADJUSTED = 0.6;
      const thermalText = `+${Math.round(estimate.thermalContribution * THERMAL_GAMMA_ADJUSTED)} mph thermal`;
      
      // Position below main text if space allows
      if (height > 30 && (maxPos - minPos) > 50) {
        ctx.fillText(thermalText, centerX, midY + 12);
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
