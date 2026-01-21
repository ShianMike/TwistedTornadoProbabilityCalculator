/**
 * TWISTED WEATHER ANALYZER - MAIN SCRIPT
 */

document.addEventListener('DOMContentLoaded', () => {
  
  // ============================================================================
  // DEBUG FLAG - Uses shared module or fallback
  // ============================================================================
  const DEBUG = (window.TornadoTypes && window.TornadoTypes.DEBUG) || false;
  
  function debugLog(...args) {
    if (DEBUG) console.log('[Script]', ...args);
  }

  // ============================================================================
  // DOM ELEMENT REFERENCES
  // ============================================================================
  
  // Core input field IDs for atmospheric parameters
  const ids = ['TEMP','DEWPOINT','CAPE','LAPSE_RATE_0_3','SURFACE_RH','PWAT','SRH','STORM_SPEED'];
  
  // Helper function to get elements by ID
  const get = id => document.getElementById(id);
  
  // Button references
  const analyzeBtn = get('analyze');
  const resetBtn = get('reset');

  // Chart canvases
  const probCanvas = get('probChart');      // Main probability distribution chart
  const miniCanvas = get('miniWind');       // Mini wind speed visualization
  const windLabel = get('windLabel');       // EF-scale text label

  // Summary display elements (thermodynamics panel)
  const sum = {
    TEMP: get('sum_TEMP'),
    CAPE: get('sum_CAPE'),
    LAPSE: get('sum_LAPSE'),
    PWAT: get('sum_PWAT'),
    RH: get('sum_RH'),
    DEW: get('sum_DEW'),
    SRH: get('sum_SRH'),
    STORM_SPEED: get('sum_STORM_SPEED')  // Add this
  };

  // Global chart instance
  let probChart = null;
  
  // Special factors container reference
  const specialFactorsContainer = document.getElementById('specialFactors');

  // ============================================================================
  // TORNADO TYPE DESCRIPTIONS - Use shared module with fallback
  // ============================================================================
  
  function getTornadoDescriptions() {
    return (window.TornadoTypes && window.TornadoTypes.DESCRIPTIONS) || {
      'SIDEWINDER': 'Fast-moving, kinked/elongated hodograph tornado.',
      'STOVEPIPE': 'Very narrow, violent tornado with tight core.',
      'WEDGE': 'Wide, rain-fed tornado with broad circulation.',
      'DRILLBIT': 'Fast-moving, narrow tornado in dry environment.',
      'CONE': 'Classic mid-range tornado with balanced morphology.',
      'ROPE': 'Weak, decaying funnel in low-CAPE environments.'
    };
  }

  // ============================================================================
  // INPUT READING & VALIDATION
  // ============================================================================
  
  /**
   * Read all input values from form fields
   * Validates and clamps values to realistic meteorological limits
   * @returns {Object} Object containing all atmospheric parameters
   */
  function readInputs() {
    const out = {};
    
    // Define acceptable ranges for each parameter
    const limits = {
      TEMP: {min:15, max:140},              // Temperature (F)
      DEWPOINT: {min:15, max:120},          // Dewpoint (F)
      CAPE: {min:0, max:10226},             // Convective Available Potential Energy (J/kg)
      LAPSE_RATE_0_3: {min:0, max:12},      // 0-3km lapse rate (C/km)
      SURFACE_RH: {min:0, max:100},         // Surface relative humidity (%)
      PWAT: {min:0.1, max:2.5},             // Precipitable water (inches)
      SRH: {min:0, max:1000},               // Storm-relative helicity (m²/s²)
      STORM_SPEED: {min:0, max:200},        // Storm motion speed (mph)
      CAPE_3KM: {min:0, max:300},           // 3km CAPE (J/kg)
      LAPSE_3_6KM: {min:0, max:10},         // 3-6km lapse rate (C/km)
      RH_MID: {min:0, max:100}              // 700-500mb relative humidity (%)
    };
    
    // Include additional thermodynamic parameters
    const allIds = [...ids, 'CAPE_3KM', 'LAPSE_3_6KM', 'RH_MID'];
    
    // Read and validate each input
    allIds.forEach(k => {
      const el = get(k);
      // Only read if element exists AND has a non-empty value
      if (el && el.value !== '') {
        let v = parseFloat(el.value);
        if (!isFinite(v)) v = 0;
        
        // Clamp to limits if defined
        if (limits[k]) {
          v = Math.max(limits[k].min, Math.min(limits[k].max, v));
        }
        out[k] = v;
      } else {
        // Set to 0 if empty
        out[k] = 0;
      }
    });
    
    return out;
  }

  // ============================================================================
  // SUMMARY PANEL UPDATE
  // ============================================================================
  
  /**
   * Update the thermodynamics summary panel with input values
   * Displays values in the right-side statistics cards
   * @param {Object} data - Atmospheric parameter object
   */
  function updateSummary(data) {
    // Update left column statistics
    if (sum.TEMP) sum.TEMP.textContent = (data.TEMP && data.TEMP !== 0) ? String(data.TEMP) : '—';
    if (sum.DEW) sum.DEW.textContent = (data.DEWPOINT && data.DEWPOINT !== 0) ? String(data.DEWPOINT) : '—';
    if (sum.CAPE) sum.CAPE.textContent = (data.CAPE && data.CAPE !== 0) ? String(data.CAPE) : '—';
    if (sum.LAPSE) sum.LAPSE.textContent = (data.LAPSE_RATE_0_3 && data.LAPSE_RATE_0_3 !== 0) ? String(data.LAPSE_RATE_0_3) : '—';
    if (sum.PWAT) sum.PWAT.textContent = (data.PWAT && data.PWAT !== 0) ? String(data.PWAT) : '—';
    if (sum.RH) sum.RH.textContent = (data.SURFACE_RH && data.SURFACE_RH !== 0) ? String(data.SURFACE_RH) : '—';
    if (sum.SRH) sum.SRH.textContent = (data.SRH && data.SRH !== 0) ? String(data.SRH) : '—';
    if (sum.STORM_SPEED) sum.STORM_SPEED.textContent = (data.STORM_SPEED && data.STORM_SPEED !== 0) ? String(data.STORM_SPEED) : '—';

    // Update right column statistics
    const sum3CAPE = document.getElementById('sum_3CAPE');
    const sum36LAPSE = document.getElementById('sum_36LAPSE');
    const sum700RH = document.getElementById('sum_700RH');
    if (sum3CAPE) sum3CAPE.textContent = (data.CAPE_3KM && data.CAPE_3KM !== 0) ? String(data.CAPE_3KM) : '—';
    if (sum36LAPSE) sum36LAPSE.textContent = (data.LAPSE_3_6KM && data.LAPSE_3_6KM !== 0) ? String(data.LAPSE_3_6KM) : '—';
    if (sum700RH) sum700RH.textContent = (data.RH_MID && data.RH_MID !== 0) ? String(data.RH_MID) : '—';
    
    // Update STP display
    const stpElement = document.getElementById('sum_STP');
    if (stpElement) {
      if (data.STP !== undefined && data.STP !== null && data.STP !== '') {
        stpElement.textContent = Math.round(parseFloat(data.STP));  // Changed to whole number
      } else {
        stpElement.textContent = '—';
      }
    }
    
    // Update VTP display
    const vtpElement = document.getElementById('sum_VTP');
    if (vtpElement) {
      if (data.VTP !== undefined && data.VTP !== null && data.VTP !== '') {
        vtpElement.textContent = Math.round(parseFloat(data.VTP));  // Changed to whole number
      } else {
        vtpElement.textContent = '—';
      }
    }
  }

  // ============================================================================
  // PERCENTAGE COLUMN MANAGEMENT
  // ============================================================================
  
  /**
   * Ensure percentage column exists on the right side of probability chart
   * Creates the column element if it doesn't exist
   * @returns {HTMLElement|null} The percentage column element
   */
  function ensurePercentColumn() {
    const wrap = probCanvas && probCanvas.parentElement;
    if (!wrap) return null;
    
    let pc = wrap.querySelector('#percentCol');
    if (!pc) {
      pc = document.createElement('div');
      pc.id = 'percentCol';
      pc.className = 'percent-col';
      pc.style.position = 'absolute';
      pc.style.right = '12px';
      pc.style.top = '36px';
      pc.style.bottom = '12px';
      pc.style.width = '72px';
      pc.style.pointerEvents = 'none';
      wrap.style.position = wrap.style.position || 'relative';
      wrap.appendChild(pc);
    }
    return pc;
  }

  ensurePercentColumn();

  // ============================================================================
  // MINI WIND VISUALIZATION
  // ============================================================================
  
  /**
   * Draw the mini wind speed visualization canvas
   * Delegates to ChartRenderer module
   * @param {HTMLCanvasElement} canvas - Canvas element
   * @param {Object} estimate - Wind estimate object with min/max values
   */
  function drawMiniWind(canvas, estimate) {
    debugLog('[MiniWind] Drawing with estimate:', estimate);
    
    if (!canvas) {
      if (DEBUG) console.error('[MiniWind] Canvas element not found');
      return;
    }
    
    if (!window.ChartRenderer) {
      if (DEBUG) console.error('[MiniWind] ChartRenderer module not loaded');
      return;
    }
    
    if (!estimate || !estimate.est_max || estimate.est_max === 0) {
      debugLog('[MiniWind] No estimate or zero wind speed, clearing canvas');
      // Clear the canvas
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
    
    debugLog('[MiniWind] Calling ChartRenderer.drawMiniWind');
    window.ChartRenderer.drawMiniWind(canvas, estimate);
  }

  // ============================================================================
  // CHART.JS PLUGIN REGISTRATION
  // ============================================================================
  
  /**
   * Register ChartDataLabels plugin with Chart.js
   * Ensures plugin is loaded before attempting registration
   */
  function tryRegisterDataLabels() {
    if (window.ChartRenderer && typeof window.Chart !== 'undefined') {
      window.ChartRenderer.tryRegisterDataLabels();
    } else {
      debugLog('ChartRenderer or Chart.js not loaded yet');
    }
  }

  /**
   * Get color for probability value (gradient from blue to red)
   * @param {number} value - Probability percentage (0-100)
   * @returns {string} RGB color string
   */
  function colorForValue(value) {
    return window.ChartRenderer ? window.ChartRenderer.colorForValue(value) : '#ffffff';
  }

  // ============================================================================
  // CUSTOM CHART PLUGINS
  // ============================================================================
  
  /**
   * Custom Chart.js plugin to draw percentage labels on bars
   * Displays percentage values directly on the chart bars
   */
  const drawPercentPlugin = {
    id: 'drawPercentPlugin',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (value == null) return;

          // Get bar position (supports both vertical and horizontal bars)
          const barX = (bar.x !== undefined) ? bar.x : (bar.getProps ? bar.getProps(['x'], true).x : 0);
          const barY = (bar.y !== undefined) ? bar.y : (bar.getProps ? bar.getProps(['y'], true).y : 0);

          const isHorizontal = chart.config.options.indexAxis === 'y';
          const labelX = isHorizontal ? barX + 10 : barX;
          const labelY = isHorizontal ? barY : barY - 8;

          // Draw percentage text
          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.font = '700 14px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(String(value) + '%', labelX, labelY);
          ctx.restore();
        });
      });
    }
  };

  // ============================================================================
  // PERCENTAGE COLUMN RENDERING
  // ============================================================================
  
  /**
   * Clear all percentage items from the column
   */
  function clearPercentColumn() {
    const pc = ensurePercentColumn();
    if (!pc) return;
    pc.innerHTML = '';
  }

  /**
   * Update percentage column with current chart values
   * Positions percentage labels aligned with chart bars
   * @param {Array<number>} values - Array of probability percentages
   * @param {Array<string>} labels - Array of tornado type labels
   */
  function updatePercentColumn(values, labels) {
    const pc = ensurePercentColumn();
    if (!pc || !probChart) return;

    pc.innerHTML = '';

    const meta = probChart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;

    meta.data.forEach((bar, idx) => {
      const value = values[idx];
      if (value == null) return;

      // Create percentage label element
      const item = document.createElement('div');
      item.className = 'percent-item';
      
      // Format number (1 decimal if needed, integer if whole number)
      const n = Math.round(value * 10) / 10;
      item.textContent = (Number.isInteger(n) ? n : n.toFixed(1)) + '%';
      
      pc.appendChild(item);

      // Calculate vertical position to align with bar center
      let barCenterY = bar.y !== undefined ? bar.y : (bar.height !== undefined ? bar.y + bar.height / 2 : 0);

      const canvasHeight = probCanvas.height || 300;
      const percentY = (barCenterY / canvasHeight) * 100;

      item.style.top = `${percentY}%`;
    });
  }

  // ============================================================================
  // EMPTY CHART RENDERING
  // ============================================================================
  
  /**
   * Render empty placeholder chart when no data is available
   * Shows "No data" placeholder
   */
  function renderEmptyProb() {
    // Ensure Chart.js is loaded
    if (typeof Chart === 'undefined') {
      debugLog('Chart.js not loaded, delaying empty chart render');
      setTimeout(renderEmptyProb, 100);
      return;
    }
    
    tryRegisterDataLabels();
    
    // Set canvas size with device pixel ratio for crisp rendering
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const clientW = probCanvas.clientWidth || 800;
    const clientH = Math.max(260, probCanvas.parentElement.clientHeight || 360);
    probCanvas.width = Math.round(clientW * DPR);
    probCanvas.height = Math.round(clientH * DPR);

    const ctx = probCanvas.getContext('2d');
    
    // Destroy existing chart if present
    if (probChart) {
      probChart.destroy();
      probChart = null;
    }

    // Create empty chart configuration
    const chartOptions = {
      type: 'bar',
      data: {
        labels: ['No data'],
        datasets: [{
          data: [0],
          backgroundColor: ['rgba(120,120,120,0.35)'],
          borderRadius: 8,
          maxBarThickness: 40
        }]
      },
      options: {
        indexAxis: 'y',                    // Horizontal bars
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { right: 40 } },
        scales: {
          x: { 
            max: 100, 
            ticks: { display: true, color: '#bfcbd8', stepSize: 25 }, 
            grid: { color: 'rgba(255,255,255,0.03)' } 
          },
          y: { 
            ticks: { color: '#dfe9f2', font: { weight: 700 } }, 
            grid: { display: false } 
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: { display: false }
        }
      }
    };

    probChart = new Chart(ctx, chartOptions);
    clearPercentColumn();
    probCanvas.style.pointerEvents = 'auto';
  }

  // ============================================================================
  // PROBABILITY CHART RENDERING
  // ============================================================================
  
  /**
   * Render probability distribution chart with tornado type data
   * Creates horizontal bar chart showing likelihood of each tornado type
   * @param {Array<Object>} dataArr - Array of {Type, Prob} objects
   */
  function renderProbChart(dataArr) {
    // Ensure Chart.js is loaded
    if (typeof Chart === 'undefined') {
      debugLog('Chart.js not loaded, delaying chart render');
      setTimeout(() => renderProbChart(dataArr), 100);
      return;
    }
    
    tryRegisterDataLabels();

    // Extract labels and values - USE DISPLAY NAMES
    const labels = dataArr.map(d => {
      // Map internal key to display name (DRILLBIT -> DRILLBIT/FUNNEL)
      return window.ChartRenderer ? window.ChartRenderer.getDisplayName(d.Type) : d.Type;
    });
    const values = dataArr.map(d => d.Prob);
    
    if (!values.length) {
      renderEmptyProb();
      return;
    }
    
    // Generate gradient colors based on probability values
    const bgColors = values.map(v => colorForValue(v));

    // Set canvas size with device pixel ratio
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const clientW = probCanvas.clientWidth || 800;
    const clientH = Math.max(260, probCanvas.parentElement.clientHeight || 360);
    probCanvas.width = Math.round(clientW * DPR);
    probCanvas.height = Math.round(clientH * DPR);

    const ctx = probCanvas.getContext('2d');
    const safeMax = 100;

    // Register plugins
    const plugins = [];
    if (window.ChartDataLabels) {
      plugins.push(ChartDataLabels);
    }
    plugins.push(drawPercentPlugin);

    // Update existing chart if present
    if (probChart) {
      probChart.options.scales.x.max = safeMax;
      probChart.data.labels = labels;
      probChart.data.datasets[0].data = values;
      probChart.data.datasets[0].backgroundColor = bgColors;
      probChart.update('none');
      requestAnimationFrame(() => updatePercentColumn(values, labels));
      probCanvas.style.pointerEvents = 'auto';
      setupChartTooltip();
      return;
    }

    // Create new chart
    const chartOptions = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Probability',
          data: values,
          backgroundColor: bgColors,
          borderRadius: 8,
          maxBarThickness: 48,
          categoryPercentage: 0.9,
          barPercentage: 0.9
        }]
      },
      options: {
        indexAxis: 'y',                    // Horizontal bars
        responsive: false,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { right: 40 } },
        scales: {
          x: { 
            max: safeMax,
            min: 0,
            beginAtZero: true,
            ticks: { 
              color: '#bfcbd8', 
              stepSize: 25,
              font: { size: 11 }
            },
            grid: { 
              color: 'rgba(255,255,255,0.08)',  // Increased visibility
              lineWidth: 1,
              drawBorder: true,
              drawTicks: true
            },
            border: {
              display: true,
              color: 'rgba(255,255,255,0.1)'
            }
          },
          y: { 
            ticks: { 
              color: '#dfe9f2', 
              font: { weight: 700, size: 12 }
            },
            grid: { 
              display: false 
            },
            border: {
              display: false
            }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },      // Custom tooltip handled separately
          datalabels: {
            anchor: 'end',
            align: 'start',
            offset: 10,
            color: '#ffffff',
            font: { weight: '700', size: 14 },
            formatter: (value) => {
              const n = Math.round(value * 10) / 10;
              return String(Number.isInteger(n) ? n : n.toFixed(1)) + '%';
            },
            display: true,
            clamp: false
          }
        }
      },
      plugins: plugins
    };

    probChart = new Chart(ctx, chartOptions);
    requestAnimationFrame(() => updatePercentColumn(values, labels));
    requestAnimationFrame(() => setupChartTooltip());
    probCanvas.style.pointerEvents = 'auto';
  }

  // ============================================================================
  // SPECIAL FACTORS RENDERING
  // ============================================================================
  
  /**
   * Render special tornado factors as a bar graph
   * @param {Array} factors - Array of factor objects with name and chance
   */
  function renderSpecialFactors(factors) {
    if (!specialFactorsContainer) {
      debugLog('[SpecialFactors] Container not found');
      return;
    }
    
    if (!factors || factors.length === 0) {
      specialFactorsContainer.innerHTML = '';
      specialFactorsContainer.style.display = 'none';
      return;
    }
    
    specialFactorsContainer.style.display = 'block';
    
    // Create bar graph display matching morphology distribution style
    const html = '<div style="display: flex; flex-direction: column; gap: 16px; padding: 8px 0;">' +
      factors.map(f => {
        const barWidth = Math.max(5, (f.chance / 100) * 100);
        return `
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 13px; color: #a0aec0; min-width: 120px; text-align: left;">${f.name}</span>
            <div style="flex: 1; height: 28px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; position: relative;">
              <div style="height: 100%; width: ${barWidth}%; background: linear-gradient(90deg, #06b6d4, #0891b2); border-radius: 4px; display: flex; align-items: center; justify-content: flex-end; padding-right: 10px; min-width: 50px;">
                <span style="color: #fff; font-size: 13px; font-weight: 700;">${f.chance}%</span>
              </div>
            </div>
          </div>
        `;
      }).join('') +
    '</div>';
    
    specialFactorsContainer.innerHTML = html;
  }

  // ============================================================================
  // EXPORT FUNCTIONALITY (CSV)
  // ============================================================================
  
  /**
   * Export current input and results data as CSV file
   * Formats data as CSV and triggers download
   */
  function exportCSV() {
    // Gather input data
    const inputData = readInputs();
    
    // Gather summary data
    const summaryData = {
      TEMP: sum.TEMP.textContent,
      DEW: sum.DEW.textContent,
      CAPE: sum.CAPE.textContent,
      LAPSE: sum.LAPSE.textContent,
      PWAT: sum.PWAT.textContent,
      RH: sum.RH.textContent,
      SRH: sum.SRH.textContent
    };
    
    // Combine input and summary data
    const csvData = [
      ['Parameter', 'Value'],
      ...Object.entries({...inputData, ...summaryData}).map(([k, v]) => [k, v])
    ];
    
    // Convert to CSV string
    const csvContent = 'data:text/csv;charset=utf-8,' + csvData.map(e => e.join(',')).join('\n');
    
    // Encode URI and trigger download
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'twisted_weather_analysis.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ============================================================================
  // CHART TOOLTIP SETUP
  // ============================================================================
  
  /**
   * Setup custom tooltip for probability chart
   * Shows tornado type descriptions on hover
   */
  function setupChartTooltip() {
    if (!probChart || !probChart.canvas) return;
    
    const tooltip = document.getElementById('statTooltip');
    if (!tooltip) return;

    const canvas = probChart.canvas;

    // Remove existing listeners
    if (canvas._chartMouseMove) {
      canvas.removeEventListener('mousemove', canvas._chartMouseMove);
    }
    if (canvas._chartMouseLeave) {
      canvas.removeEventListener('mouseleave', canvas._chartMouseLeave);
    }
    
    /**
     * Handle mouse movement over chart
     * Detect which bar is hovered and show tooltip
     */
    function handleChartMouseMove(e) {
      // Don't override thermo tooltips
      if (tooltip.dataset.source === 'thermo') return;

      const rect = canvas.getBoundingClientRect();
      const canvasY = e.clientY - rect.top;

      const meta = probChart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;

      // Find hovered bar
      let hoveredType = null;
      meta.data.forEach((datapoint, idx) => {
        if (datapoint && typeof datapoint.y === 'number') {
          const barHeight = datapoint.height || 20;
          if (Math.abs(canvasY - datapoint.y) < barHeight) {
            hoveredType = probChart.data.labels[idx];
          }
        }
      });

      // Show tooltip if tornado type found
      if (hoveredType && tornadoDescriptions[hoveredType]) {
        tooltip.innerHTML = `<strong>${hoveredType}</strong><br>${tornadoDescriptions[hoveredType]}`;
        tooltip.classList.add('visible');
        tooltip.setAttribute('aria-hidden', 'false');
        tooltip.dataset.source = 'chart';
        
        // Position near cursor using fixed positioning
        const left = Math.min(window.innerWidth - 300, Math.max(8, e.clientX + 12));
        const top = Math.min(window.innerHeight - 120, Math.max(8, e.clientY + 12));
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      } else {
        if (tooltip.dataset.source === 'chart') {
          tooltip.classList.remove('visible');
          tooltip.setAttribute('aria-hidden', 'true');
          delete tooltip.dataset.source;
        }
      }
    }

    /**
     * Handle mouse leaving chart area
     * Hide tooltip when mouse leaves
     */
    function handleChartMouseLeave() {
      if (tooltip.dataset.source === 'chart') {
        tooltip.classList.remove('visible');
        tooltip.setAttribute('aria-hidden', 'true');
        delete tooltip.dataset.source;
      }
    }

    // Store listeners for cleanup
    canvas._chartMouseMove = handleChartMouseMove;
    canvas._chartMouseLeave = handleChartMouseLeave;

    // Attach event listeners
    canvas.addEventListener('mousemove', canvas._chartMouseMove);
    canvas.addEventListener('mouseleave', canvas._chartMouseLeave);
  }

  // ============================================================================
  // AUTO-ANALYSIS SYSTEM
  // ============================================================================
  
  let autoAnalysisTimer = null;
  const AUTO_ANALYSIS_DELAY = 500;    // Wait 500ms after last input before auto-analyzing

  /**
   * Trigger auto-analysis with debounce
   * Prevents excessive calculations while user is typing
   */
  function triggerAutoAnalysis() {
    clearTimeout(autoAnalysisTimer);
    autoAnalysisTimer = setTimeout(() => {
      performAnalysis();
    }, AUTO_ANALYSIS_DELAY);
  }

  /**
   * Perform complete tornado analysis
   * - Reads inputs
   * - Updates summary
   * - Calculates probabilities
   * - Renders charts
   * - Estimates wind speeds
   */
  function performAnalysis() {
    const data = readInputs();
    
    // Add STP, VTP, and STORM_SPEED to data if they exist
    const stpInput = document.getElementById('STP');
    const vtpInput = document.getElementById('VTP');
    const stormSpeedInput = document.getElementById('STORM_SPEED');
    
    if (stpInput && stpInput.value !== '') {
      data.STP = parseFloat(stpInput.value);
    }
    if (vtpInput && vtpInput.value !== '') {
      data.VTP = parseFloat(vtpInput.value);
    }
    if (stormSpeedInput && stormSpeedInput.value !== '') {
      data.STORM_SPEED = parseFloat(stormSpeedInput.value);
    }
    
    // Update summary with all values including STP/VTP/STORM_SPEED
    updateSummary(data);
    
    // Validate inputs and show warnings
    if (window.InputValidation) {
      window.InputValidation.validateInputs(data);
    }
    
    // Check if calculation modules are loaded
    if (!window.TornadoCalculations || !window.ChartRenderer) {
      debugLog('Required modules not loaded yet, retrying in 500ms...');
      setTimeout(() => performAnalysis(), 500);
      return;
    }
    
    // Calculate and display risk level (only if STP and VTP are filled)
    if (data.STP !== undefined && data.VTP !== undefined) {
      const riskResult = window.TornadoCalculations.calculate_risk_level(data);
      displayRiskBadge(riskResult);
    } else {
      // Hide risk badge if inputs are cleared
      const riskBadge = document.getElementById('riskBadge');
      if (riskBadge) {
        riskBadge.style.display = 'none';
      }
    }
    
    // Calculate tornado probabilities
    const result = window.TornadoCalculations.calculate_probabilities(data);
    
    // SORT by probability (highest first) - show all types even with 0%
    const sortedTypes = result.types
      .sort((a, b) => b.Prob - a.Prob);  // Sort descending (highest first)
    
    renderProbChart(sortedTypes);
    renderSpecialFactors(result.factors);
    
    debugLog('[Analysis] Estimating wind speeds with data:', data);
    
    // Estimate wind speeds
    const estimate = window.TornadoCalculations.estimate_wind(data);
    
    debugLog('[Analysis] Wind estimate result:', estimate);
    
    // Draw wind visualization
    if (estimate && estimate.est_max > 0) {
      drawMiniWind(miniCanvas, estimate);
      windLabel.textContent = estimate.label || 'No estimate';
    } else {
      drawMiniWind(miniCanvas, null);
      windLabel.textContent = 'No estimate yet';
    }
    
    // Show/hide theoretical wind estimate
    const theoreticalDiv = document.getElementById('theoreticalWind');
    const windDisclaimerDiv = document.getElementById('windDisclaimer');
    
    if (theoreticalDiv && estimate && estimate.theoretical) {
      theoreticalDiv.style.display = 'block';
      const maxDisplay = estimate.theoretical.theo_max_display || estimate.theoretical.theo_max;
      theoreticalDiv.innerHTML = `<strong>Theoretical Maximum:</strong> ${estimate.theoretical.theo_min}–${maxDisplay} mph<br><span style="font-size:11px;opacity:0.8;">Extreme conditions may support winds beyond measured EF5 thresholds. This represents the upper boundary of possible tornado intensity when atmospheric parameters reach extreme values rarely observed in real meteorological events.</span>`;
    } else if (theoreticalDiv) {
      theoreticalDiv.style.display = 'none';
    }
    
    if (windDisclaimerDiv) {
      windDisclaimerDiv.style.display = (estimate && estimate.est_max > 0) ? 'block' : 'none';
    }
  }
  
  // Expose performAnalysis globally so hodograph analyzer can trigger recalculation
  window.performAnalysis = performAnalysis;

  /**
   * Display the calculated risk level as a simple badge
   * @param {Object} riskResult - Risk level result object
   */
  function displayRiskBadge(riskResult) {
    // Find or create risk badge element
    let riskBadge = document.getElementById('riskBadge');
    
    // Check if STP and VTP are both provided
    const stpInput = document.getElementById('STP');
    const vtpInput = document.getElementById('VTP');
    const hasSTP = stpInput && stpInput.value !== '';
    const hasVTP = vtpInput && vtpInput.value !== '';
    
    // Only show if both STP and VTP are filled
    if (!hasSTP || !hasVTP) {
      if (riskBadge) {
        riskBadge.style.display = 'none';
      }
      return;
    }
    
    if (!riskBadge) {
      riskBadge = document.createElement('div');
      riskBadge.id = 'riskBadge';
      
      // Insert inside thermo-header h2 (as last child of h2)
      const thermoH2 = document.querySelector('.thermo-header h2');
      if (thermoH2) {
        thermoH2.appendChild(riskBadge);
      }
    }

    // Update badge with risk level
    const textColor = (riskResult.risk === 'MRGL' || riskResult.risk === 'SLGT') ? '#000' : '#fff';
    riskBadge.style.backgroundColor = riskResult.color;
    riskBadge.style.color = textColor;
    riskBadge.style.display = 'inline-flex';
    riskBadge.textContent = riskResult.risk;
  }

  // ============================================================================
  // EVENT LISTENERS - MANUAL ANALYSIS ONLY
  // ============================================================================
  
  // Auto-analysis DISABLED - users must click "Analyze" button
  // Input listeners only for validation, not auto-calculation
  // ids.forEach(id => {
  //   const el = get(id);
  //   if (el) {
  //     el.addEventListener('input', performAnalysis);
  //     el.addEventListener('change', performAnalysis);
  //   }
  // });

  // Auto-analysis DISABLED for additional parameters
  // ['CAPE_3KM', 'LAPSE_3_6KM', 'RH_MID', 'STP', 'VTP', 'RISK'].forEach(id => {
  //   const el = get(id);
  //   if (el) {
  //     el.addEventListener('input', performAnalysis);
  //     el.addEventListener('change', performAnalysis);
  //   }
  // });

  // ============================================================================
  // EVENT LISTENERS - BUTTONS
  // ============================================================================
  
  /**
   * Analyze button click handler
   * Manually trigger analysis
   */
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      debugLog('Analyze button clicked');
      performAnalysis();
    });
  }

  /**
   * Reset button click handler
   * Clear all inputs and reset visualizations
   */
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      debugLog('Reset button clicked');
      
      // Clear all form inputs
      ids.forEach(k => {
        const el = get(k);
        if (el) el.value = '';
      });
      ['CAPE_3KM', 'LAPSE_3_6KM', 'RH_MID', 'STP', 'VTP', 'RISK'].forEach(k => {
        const el = get(k);
        if (el) {
          if (k === 'RISK') {
            el.selectedIndex = 0; // Reset dropdown to first option
          } else {
            el.value = '';
          }
        }
      });
      
      // Clear image upload field and preview
      const fileInput = document.getElementById('fileInput');
      const preview = document.getElementById('preview');
      const ocrStatus = document.getElementById('ocrStatus');
      if (fileInput) fileInput.value = '';
      if (preview) preview.innerHTML = '';
      if (ocrStatus) ocrStatus.textContent = '';
      
      // Clear summary values
      Object.values(sum).forEach(el => {
        if (el) el.textContent = '—';
      });
      
      const sum3CAPE = document.getElementById('sum_3CAPE');
      const sum36LAPSE = document.getElementById('sum_36LAPSE');
      const sum700RH = document.getElementById('sum_700RH');
      const sumSTP = document.getElementById('sum_STP');
      const sumVTP = document.getElementById('sum_VTP');
      if (sum3CAPE) sum3CAPE.textContent = '—';
      if (sum36LAPSE) sum36LAPSE.textContent = '—';
      if (sum700RH) sum700RH.textContent = '—';
      if (sumSTP) sumSTP.textContent = '—';
      if (sumVTP) sumVTP.textContent = '—';
      
      // Reset visualizations
      renderEmptyProb();
      drawMiniWind(miniCanvas, null);
      windLabel.textContent = 'No estimate yet';
      if (specialFactorsContainer) specialFactorsContainer.innerHTML = '';
      
      // Hide all disclaimers and warnings
      const theoreticalDiv = document.getElementById('theoreticalWind');
      const windDisclaimerDiv = document.getElementById('windDisclaimer');
      const warningDiv = document.getElementById('validationWarnings');
      if (theoreticalDiv) theoreticalDiv.style.display = 'none';
      if (windDisclaimerDiv) windDisclaimerDiv.style.display = 'none';
      if (warningDiv) warningDiv.style.display = 'none';
      
      // Hide risk badge
      const riskBadge = document.getElementById('riskBadge');
      if (riskBadge) riskBadge.style.display = 'none';
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize the application
   */
  function init() {
    debugLog('Twisted Weather Analyzer initialized');
    
    // Load the example image for the tip section
    loadTipExampleImage();
    
    // Check module loading status after delay
    if (DEBUG) {
      setTimeout(() => {
        console.log('Modules loaded:', {
          TornadoCalculations: !!window.TornadoCalculations,
          ChartRenderer: !!window.ChartRenderer,
          InputValidation: !!window.InputValidation,
          Chart: typeof Chart !== 'undefined',
          ChartDataLabels: typeof ChartDataLabels !== 'undefined'
        });
      }, 1000);
    }
  }

  /**
   * Load the example layout image into the tip section
   */
  function loadTipExampleImage() {
    const tipImage = document.getElementById('tipExampleImage');
    if (tipImage) {
      // Load example layout image from assets folder
      tipImage.src = 'assets/example-layout.png';
      tipImage.onerror = function() {
        // If image fails to load, hide the container
        const container = document.querySelector('.tip-image-container');
        if (container) {
          container.style.display = 'none';
        }
      };
    }
  }

  // Initial render
  if (typeof Chart !== 'undefined') {
    renderEmptyProb();
  } else {
    debugLog('Waiting for Chart.js to load...');
    setTimeout(() => {
      if (typeof Chart !== 'undefined') {
        renderEmptyProb();
      } else {
        if (DEBUG) console.error('[Script] Chart.js failed to load after timeout');
      }
    }, 1000);
  }
  
  drawMiniWind(miniCanvas, null);
  if (windLabel) windLabel.textContent = 'No estimate yet';

  // ============================================================================
  // WINDOW RESIZE HANDLER
  // ============================================================================
  
  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (probChart) {
        const data = probChart.data.labels.map((l, i) => ({
          Type: l, 
          Prob: probChart.data.datasets[0].data[i]
        }));
        renderProbChart(data);
      } else {
        renderEmptyProb();
      }
      
      const currentData = readInputs();
      const estimate = window.TornadoCalculations ? 
        window.TornadoCalculations.estimate_wind(currentData) : null;
      if (estimate) drawMiniWind(miniCanvas, currentData.CAPE > 0 ? estimate : null);
    }, 150);
  });

  // ============================================================================
  // THERMODYNAMICS TOOLTIP SETUP
  // ============================================================================
  
  (function setupThermoTooltips(){
    const tooltip = document.getElementById('statTooltip');
    if (!tooltip) return;
    
    const labels = document.querySelectorAll('.thermo-card .k[data-desc]');
    
    function showTip(e){
      const el = e.currentTarget;
      const desc = el.getAttribute('data-desc') || '';
      tooltip.textContent = desc;
      tooltip.classList.add('visible');
      tooltip.setAttribute('aria-hidden','false');
      tooltip.dataset.source = 'thermo';
      positionTip(e);
    }
    
    function positionTip(e){
      const rect = e.currentTarget.getBoundingClientRect();
      const left = Math.min(window.innerWidth - 300, Math.max(8, rect.left + 8));
      const top = Math.min(window.innerHeight - 120, rect.bottom + 6);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
    
    function moveTip(e){
      const left = Math.min(window.innerWidth - 300, Math.max(8, e.clientX + 8));
      const top = Math.min(window.innerHeight - 120, Math.max(8, e.clientY + 12));
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
    
    function hideTip(){
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden','true');
      delete tooltip.dataset.source;
    }
    
    labels.forEach(lbl => {
      lbl.addEventListener('mouseenter', showTip);
      lbl.addEventListener('mousemove', moveTip);
      lbl.addEventListener('mouseleave', hideTip);
      lbl.addEventListener('focus', showTip);
      lbl.addEventListener('blur', hideTip);
    });
    
    window.addEventListener('scroll', hideTip, true);
    window.addEventListener('resize', hideTip);
  })();
  
  // ============================================================================
  // INPUT VALIDATION FOR STP/VTP
  // ============================================================================
  
  const stpInput = get('STP');
  const vtpInput = get('VTP');
  
  if (stpInput) {
    stpInput.addEventListener('input', function() {
      let val = parseFloat(this.value);
      if (!isNaN(val)) {
        if (val > 64) this.value = 64;
        if (val < 0) this.value = 0;
      }
    });
  }
  
  if (vtpInput) {
    vtpInput.addEventListener('input', function() {
      let val = parseFloat(this.value);
      if (!isNaN(val)) {
        if (val > 16) this.value = 16;
        if (val < 0) this.value = 0;
      }
    });
  }

  // Run initialization
  init();
});