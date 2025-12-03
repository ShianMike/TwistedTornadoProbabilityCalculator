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
   * Shows EF-scale ranges with colored bands and estimated wind range
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} estimate - Wind estimate object with est_min/est_max
   */
  function drawMiniWind(canvas, estimate) {
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const cw = canvas.clientWidth || 300;
    const ch = 48;
    
    // Set canvas size for crisp rendering
    canvas.width = Math.round(cw * DPR);
    canvas.height = Math.round(ch * DPR);

    // Clear and scale for device pixel ratio
    ctx.clearRect(0,0,canvas.width, canvas.height);
    ctx.save();
    ctx.scale(DPR, DPR);

    // ========================================================================
    // EF-SCALE RANGES
    // Define color bands for each EF rating
    // ========================================================================
    const ranges = [
      {start: 0, end: 65, color: '#ffffff'},      // Below EF0
      {start: 65, end: 110, color: '#4caf50'},    // EF0-EF1
      {start: 110, end: 135, color: '#ffeb3b'},   // EF2
      {start: 135, end: 165, color: '#ff9800'},   // EF3
      {start: 165, end: 200, color: '#e53935'},   // EF4
      {start: 200, end: 350, color: '#ec407a'}    // EF5+
    ];
    
    const minX = 0, maxX = 350;
    const pad = 6;
    const W = cw - pad*2;
    const H = ch;
    
    /**
     * Convert wind speed to X position
     */
    function xFor(v){ return pad + (v-minX)/(maxX-minX) * W; }

    // Draw title
    ctx.fillStyle = '#9aa3ad';
    ctx.font = '9px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.letterSpacing = '0.5px';
    ctx.fillText('WIND SPEED RANGE (MPH)', cw / 2, 8);

    // Draw EF-scale color bands
    ranges.forEach(r => {
      const x1 = xFor(r.start), x2 = xFor(r.end);
      const w = Math.max(2, x2 - x1);
      ctx.fillStyle = r.color;
      roundRect(ctx, x1, (H/2)+2, w, 16, 3, true, false);
    });

    // ========================================================================
    // DRAW WIND ESTIMATE INDICATOR
    // Show estimated wind range with line and labels
    // ========================================================================
    if (estimate && typeof estimate.est_min === 'number' && typeof estimate.est_max === 'number') {
      // Clamp estimates to display range
      const estMin = Math.max(minX, Math.min(maxX, estimate.est_min));
      const estMax = Math.max(minX, Math.min(maxX, estimate.est_max));
      const xMin = xFor(estMin);
      const xMax = xFor(estMax);

      // Draw white line showing range
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(xMin, (H/2)+10);
      ctx.lineTo(xMax, (H/2)+10);
      ctx.stroke();

      // Draw diamond marker at center
      const cx = (xMin + xMax) / 2;
      const cy = (H/2)+10;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const s = 6;
      ctx.moveTo(cx, cy - s/2);
      ctx.lineTo(cx + s/2, cy);
      ctx.lineTo(cx, cy + s/2);
      ctx.lineTo(cx - s/2, cy);
      ctx.closePath();
      ctx.fill();

      // Draw min/max speed labels with backgrounds
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const minText = `${estimate.est_min}`;
      const maxText = `${estimate.est_max}`;
      const minMetrics = ctx.measureText(minText);
      const maxMetrics = ctx.measureText(maxText);
      
      const bgPadding = 4;
      const bgHeight = 16;
      
      // Min speed label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      roundRect(ctx, xMin - (minMetrics.width / 2) - bgPadding, H - 12, 
                minMetrics.width + bgPadding * 2, bgHeight, 4, true, false);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(minText, xMin, H - 4);
      
      // Max speed label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      roundRect(ctx, xMax - (maxMetrics.width / 2) - bgPadding, H - 12,
                maxMetrics.width + bgPadding * 2, bgHeight, 4, true, false);
      
      ctx.fillStyle = '#ffffff';
      ctx.fillText(maxText, xMax, H - 4);
    } else {
      // No estimate available - show empty state
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      roundRect(ctx, pad, (H/2)+2, W, 16, 3, true, false);
    }

    ctx.restore();
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
