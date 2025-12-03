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
    'DRILLBIT': 'Thin, tight tornado in dry, fast-moving storms. Often associated with high storm speed and low-level drying.',
    'CONE': 'Classic mid-range tornado with balanced morphology. Moderately intense with moderate rotation and CAPE.',
    'ROPE': 'Weak, decaying funnel typically in low-CAPE or weakening environments. Often thin and elongated.'
  };

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
   * Draw mini wind speed visualization
   * Shows color-coded wind range with EF scale markers
   * @param {HTMLCanvasElement} canvas - Target canvas element
   * @param {Object} estimate - Wind estimate object with est_min and est_max
   */
  function drawMiniWind(canvas, estimate) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;
    
    // Set canvas size with device pixel ratio
    canvas.width = 400 * DPR;
    canvas.height = 48 * DPR;
    
    ctx.scale(DPR, DPR);
    ctx.clearRect(0, 0, 400, 48);
    
    if (!estimate || estimate.est_min === 0) {
      // Draw placeholder
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(0, 16, 400, 16);
      ctx.fillStyle = '#7a8b99';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No wind estimate', 200, 28);
      return;
    }
    
    const MIN_SPEED = 65;
    const MAX_SPEED = 320;
    const BAR_WIDTH = 400;
    const BAR_HEIGHT = 16;
    const BAR_Y = 16;
    
    // Calculate positions
    const minPos = ((estimate.est_min - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * BAR_WIDTH;
    const maxPos = ((estimate.est_max - MIN_SPEED) / (MAX_SPEED - MIN_SPEED)) * BAR_WIDTH;
    const rangeWidth = maxPos - minPos;
    
    // Draw background bar with smooth gradient from green to red to pink
    const gradient = ctx.createLinearGradient(0, 0, BAR_WIDTH, 0);
    gradient.addColorStop(0, '#4ade80');      // EF0 (green) at 65 mph
    gradient.addColorStop(0.08, '#fbbf24');   // EF1 (yellow) ~86 mph
    gradient.addColorStop(0.18, '#fb923c');   // EF2 (orange) ~111 mph
    gradient.addColorStop(0.27, '#ef4444');   // EF3 (red) ~136 mph
    gradient.addColorStop(0.41, '#dc2626');   // EF4 (dark red) ~166 mph
    gradient.addColorStop(0.53, '#991b1b');   // EF5 (very dark red) ~200 mph
    gradient.addColorStop(0.70, '#be185d');   // Transitioning to pink ~243 mph
    gradient.addColorStop(0.85, '#ec4899');   // EF5+ (pink/magenta) ~282 mph
    gradient.addColorStop(1, '#db2777');      // EF5++ (darker pink) 320 mph
    
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = gradient;
    ctx.fillRect(0, BAR_Y, BAR_WIDTH, BAR_HEIGHT);
    
    // Draw active range (white overlay)
    ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(minPos, BAR_Y, rangeWidth, BAR_HEIGHT);
    
    // Draw labels with "Est." prefix
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '600 12px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`Est. ${estimate.est_min}`, minPos, BAR_Y - 4);
    
    ctx.textAlign = 'right';
    ctx.fillText(`Est. ${estimate.est_max}`, maxPos, BAR_Y + BAR_HEIGHT + 14);
  }

  // ============================================================================
  // EXPORT MODULE
  // ============================================================================
  
  // Export functions to global scope
  window.ChartRenderer = {
    tornadoDescriptions,
    tryRegisterDataLabels,
    colorForValue,
    roundRect,
    drawMiniWind
  };

})();
