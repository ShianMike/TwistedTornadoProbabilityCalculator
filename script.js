document.addEventListener('DOMContentLoaded', () => {
  const ids = ['TEMP','DEWPOINT','CAPE','LAPSE_RATE_0_3','SURFACE_RH','PWAT','SRH','STORM_SPEED'];
  const get = id => document.getElementById(id);
  const analyzeBtn = get('analyze');
  const resetBtn = get('reset');
  const exportBtn = get('exportBtn');

  const probCanvas = get('probChart');
  const miniCanvas = get('miniWind');
  const windLabel = get('windLabel');

  const sum = {
    TEMP: get('sum_TEMP'),
    CAPE: get('sum_CAPE'),
    LAPSE: get('sum_LAPSE'),
    PWAT: get('sum_PWAT'),
    RH: get('sum_RH'),
    DEW: get('sum_DEW'),
    SRH: get('sum_SRH')
  };

  // Tornado type descriptions
  const tornadoDescriptions = {
    'SIDEWINDER': 'Rotational, narrow tornado often with long track. Dominated by strong low-level rotation (SRH) and storm speed.',
    'STOVEPIPE': 'Very narrow, violent tornado with tight core. Requires extreme instability and high VTP. Rare but potentially intense.',
    'WEDGE': 'Wide, rain-fed tornado with broad circulation. Driven by low-level moisture and moderate CAPE. Often rain-wrapped and slow-moving.',
    'DRILLBIT': 'Thin, tight tornado in dry, fast-moving storms. Often associated with high storm speed and low-level drying.',
    'CONE': 'Classic mid-range tornado with balanced morphology. Moderately intense with moderate rotation and CAPE.',
    'ROPE': 'Weak, decaying funnel typically in low-CAPE or weakening environments. Often thin and elongated.'
  };

  const factorDescriptions = {
    'Multivortex': 'Presence of multiple vortices or satellites spinning around main tornado core. Indicated by high SRH, VTP, and CAPE.',
    'Rainwrapped': 'Tornado obscured by heavy rain and precipitation. Higher with increased PWAT and surface moisture.',
    'Long-track': 'Tornado with extended damage path across ground. Favored by high CAPE, fast storm speed, and strong rotation.'
  };

  let probChart = null;

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

  function readInputs() {
    const out = {};
    const limits = {
      TEMP: {min:-50, max:140},
      DEWPOINT: {min:-50, max:120},
      CAPE: {min:0, max:10226},
      LAPSE_RATE_0_3: {min:0, max:12},
      SURFACE_RH: {min:0, max:100},
      PWAT: {min:0, max:3.5},
      SRH: {min:0, max:1000},
      STORM_SPEED: {min:0, max:200},
      CAPE_3KM: {min:0, max:3000},
      LAPSE_3_6KM: {min:0, max:10},
      RH_MID: {min:0, max:100}
    };
    const allIds = [...ids, 'CAPE_3KM', 'LAPSE_3_6KM', 'RH_MID'];
    allIds.forEach(k => {
      const el = get(k);
      let v = el && el.value !== '' ? parseFloat(el.value) : 0;
      if (!isFinite(v)) v = 0;
      if (limits[k]) {
        v = Math.max(limits[k].min, Math.min(limits[k].max, v));
      }
      out[k] = v;
    });
    
    return out;
  }

  function validateInputs(data) {
    const warnings = [];
    
    // Check for maxed-out "perfect storm" trolling
    const maxedCount = [
      data.CAPE >= 10000,
      data.SRH >= 900,
      data.LAPSE_RATE_0_3 >= 11,
      data.PWAT >= 3.3
    ].filter(Boolean).length;
    
    if (maxedCount >= 3) {
      warnings.push('Multiple maxed parameters detected. This is an unrealistic "perfect storm" scenario rarely (if ever) observed in nature.');
    }
    
    // Check for unrealistically low/zero "dead atmosphere" trolling
    const zeroCount = [
      data.CAPE === 0,
      data.SRH === 0,
      data.LAPSE_RATE_0_3 === 0,
      data.PWAT === 0
    ].filter(Boolean).length;
    
    if (zeroCount >= 3) {
      warnings.push('Multiple zero parameters detected. This represents a completely stable atmosphere with no tornado potential. Check your inputs.');
    }
    
    // Temperature/dewpoint relationship checks
    if (data.TEMP < -20 && data.CAPE > 2000) {
      warnings.push('High CAPE with very cold temperatures is meteorologically unrealistic for tornado environments.');
    }
    
    // Check for physically impossible combinations
    if (data.DEWPOINT > data.TEMP) {
      warnings.push('Dewpoint cannot exceed temperature. Adjusting dewpoint.');
      data.DEWPOINT = data.TEMP;
    }
    
    // Extreme CAPE with very low moisture is unrealistic
    if (data.CAPE > 5000 && data.PWAT < 0.5) {
      warnings.push('Very high CAPE with very low PWAT is meteorologically unlikely.');
    }
    
    // Display warnings
    const warningDiv = document.getElementById('validationWarnings');
    if (warnings.length > 0 && warningDiv) {
      warningDiv.innerHTML = warnings.map(w => `<div class="warning-item">${w}</div>`).join('');
      warningDiv.style.display = 'block';
    } else if (warningDiv) {
      warningDiv.style.display = 'none';
    }
    
    return data;
  }

  function calculate_probabilities(data) {
    // Validate and fix inputs first
    data = validateInputs(data);
    
    const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
    const recordMax = {
      TEMP: 120, DEWPOINT: 90, CAPE: 10226, LAPSE_RATE_0_3: 12,
      SURFACE_RH: 100, PWAT: 3.5, SRH: 1000, STORM_SPEED: 120,
      CAPE_3KM: 3000, LAPSE_3_6KM: 10, RH_MID: 100
    };

    Object.keys(recordMax).forEach(k => { if (typeof data[k] !== 'number') data[k] = 0; });

    const capeN    = clamp(data.CAPE / recordMax.CAPE);
    const srhN     = clamp(data.SRH / recordMax.SRH);
    const lapseN   = clamp((data.LAPSE_RATE_0_3 - 1) / (recordMax.LAPSE_RATE_0_3 - 1));
    const pwatN    = clamp(data.PWAT / recordMax.PWAT);
    const rhN      = clamp(data.SURFACE_RH / recordMax.SURFACE_RH);
    const speedN   = clamp(data.STORM_SPEED / recordMax.STORM_SPEED);
    const cape3kmN = clamp(data.CAPE_3KM / recordMax.CAPE_3KM);
    const lapse36N = clamp(data.LAPSE_3_6KM / recordMax.LAPSE_3_6KM);
    const rhMidN   = clamp(data.RH_MID / recordMax.RH_MID);

    const temp_spread = data.TEMP - data.DEWPOINT;
    const is_dry = (temp_spread >= 12) && (data.SURFACE_RH <= 50);
    const mid_dry = rhMidN <= 0.4;
    const mid_moist = rhMidN >= 0.7;

    const scores = {
      'WEDGE': 4,
      'STOVEPIPE': 4,
      'DRILLBIT': 3,
      'CONE': 5,
      'ROPE': 2,
      'SIDEWINDER': 4
    };

    const moistFactor = clamp(pwatN * 0.7 + rhN * 0.3);
    scores.WEDGE += moistFactor * 55;
    if (moistFactor > 0.35) scores.WEDGE += capeN * 10;
    if (mid_moist) scores.WEDGE += rhMidN * 6;
    else if (mid_dry) scores.WEDGE -= 4;
    scores.WEDGE = Math.max(1, scores.WEDGE - srhN * 22);
    if (speedN > 0.65) scores.WEDGE = Math.max(1, scores.WEDGE - 8);

    // -------------------------
    // STOVEPIPE (very narrow, violent)
    // - Favored by very steep low-level lapse rates and high VTP
    // - Also benefits from CAPE (to supply updraft) and some SRH
    // - 3CAPE and 3–6 km lapse affect narrow core intensity
    // - RARE: requires extreme convergence of multiple factors
    // -------------------------
    // Base: only reward when lapse is VERY steep (> 0.6 normalized = ~9 C/km)
    if (lapseN > 0.6) {
      scores.STOVEPIPE += lapseN * 20;  // reduced from 28; still matters but less dominant
    } else {
      scores.STOVEPIPE -= 12;  // increased penalty for weak lapse
    }
    // CAPE must be present but not excessive (narrower range)
    if (capeN >= 0.3) scores.STOVEPIPE += capeN * 8;
    else scores.STOVEPIPE -= 6;
    // SRH is minimal for stovepipe (they're tight cores, not rotational)
    scores.STOVEPIPE += srhN * 2;
    // 3CAPE helps but with threshold
    if (cape3kmN > 0.4) scores.STOVEPIPE += cape3kmN * 6;
    // Mid-level lapse matters but less than low-level
    if (lapse36N > 0.3) scores.STOVEPIPE += lapse36N * 3;
    // Penalize if conditions favor other types
    // High moisture pushes toward WEDGE
    if (pwatN > 0.6 || rhN > 0.75) scores.STOVEPIPE -= 8;
    // Moderate rotation with lower lapse favors SIDEWINDER
    if (srhN > 0.4 && lapseN < 0.5) scores.STOVEPIPE -= 6;
    scores.STOVEPIPE = Math.max(1, scores.STOVEPIPE);

    if (srhN > 0.3) {
      scores.SIDEWINDER += srhN * 40;
    } else {
      scores.SIDEWINDER -= 6;
    }
    scores.SIDEWINDER += capeN * 12;  // Use CAPE instead of VTP
    if (speedN > 0.4) scores.SIDEWINDER += speedN * 8;

    if (is_dry) scores.DRILLBIT += 18;
    if (lapseN > 0.4) scores.DRILLBIT += lapseN * 10;
    if (speedN > 0.5) {
      scores.DRILLBIT += speedN * 18;
    } else {
      scores.DRILLBIT -= 5;
    }
    if (capeN >= 0.2) scores.DRILLBIT += capeN * 4;
    if (mid_dry) scores.DRILLBIT += rhMidN * 6;

    if (capeN >= 0.25) scores.CONE += capeN * 16;
    else scores.CONE -= 4;
    if (srhN > 0.2) scores.CONE += srhN * 6;
    if (pwatN >= 0.2 && pwatN <= 0.65) scores.CONE += pwatN * 8;
    else if (pwatN > 0.65) scores.CONE -= 3;
    if (cape3kmN > 0.25) scores.CONE += cape3kmN * 3;

    if (capeN <= 0.2) scores.ROPE += 22;
    if (capeN <= 0.08) scores.ROPE += 14;
    if (speedN <= 0.35) scores.ROPE += 12;
    if (pwatN < 0.2) scores.ROPE += 8;

    Object.keys(scores).forEach(k => { scores[k] = Math.max(1, scores[k]); });

    // Use combined CAPE and SRH for overall tornado favorability
    const severityMultiplier = 0.9 + ((capeN + srhN) / 2 * 0.6);
    Object.keys(scores).forEach(k => { scores[k] = Math.max(1, scores[k] * severityMultiplier); });

    const total = Object.values(scores).reduce((a,b) => a + b, 0) || 1;
    const percentages = Object.keys(scores).map(k => ({ Type: k, Prob: Math.round((scores[k] / total) * 1000) / 10 }));
    const types = percentages.sort((a,b) => b.Prob - a.Prob);

    let multiVortexChance = Math.round(clamp(srhN * 0.7 + capeN * 0.3, 0, 1) * 100);
    multiVortexChance = Math.max(1, Math.min(95, multiVortexChance));

    let rainwrappedChance = Math.round(clamp(pwatN * 0.68 + rhN * 0.32, 0, 1) * 100);
    rainwrappedChance = Math.max(1, Math.min(95, rainwrappedChance));

    let longTrackChance = Math.round(clamp(capeN * 0.6 + speedN * 0.4 + srhN * 0.1, 0, 1) * 100);
    longTrackChance = Math.max(1, Math.min(95, longTrackChance));

    return {
      types: types,
      factors: [
        { name: 'Multivortex', chance: multiVortexChance },
        { name: 'Rainwrapped', chance: rainwrappedChance },
        { name: 'Long-track', chance: longTrackChance }
      ]
    };
  }

  function estimate_wind(data) {
    const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

    const MAX = { CAPE: 10226, SRH: 1000, LAPSE: 12, SPEED: 120 };

    const capeN = clamp((data.CAPE || 0) / MAX.CAPE);
    const srhN = clamp((data.SRH || 0) / MAX.SRH);
    const lapseN = clamp(((data.LAPSE_RATE_0_3 || 1) - 1) / (MAX.LAPSE - 1));
    const speedN = clamp((data.STORM_SPEED || 0) / MAX.SPEED);

    // Rebalanced weights without VTP and STP
    const w = { cape: 0.45, srh: 0.35, lapse: 0.12, speed: 0.08 };

    // Calculate raw severity (can exceed 1.0 for extreme cases)
    let severity = capeN * w.cape + srhN * w.srh + lapseN * w.lapse + speedN * w.speed;
    
    // Apply non-linear scaling: boost mid-to-high values more aggressively
    // This makes moderate parameters produce stronger winds
    severity = Math.pow(severity, 0.75); // power < 1 shifts distribution upward
    severity = clamp(severity, 0, 1.5); // allow exceeding 1.0 for extreme cases

    // Wider, more realistic wind speed range
    const MIN_BASE = 75;   // start higher (weak tornadoes still ~EF0-1)
    const MAX_BASE = 320;  // realistic upper bound for EF5
    
    // Center estimate now uses extended severity range
    const center = Math.round(MIN_BASE + severity * (MAX_BASE - MIN_BASE));
    // Wider uncertainty spread for higher intensities
    const spread = Math.round(30 + severity * 90);

    const est_min = Math.max(20, center - Math.round(spread * 0.6));
    const est_max = Math.min(MAX_BASE, center + Math.round(spread * 0.6));

    let label = 'EF0-1';
    const mid = (est_min + est_max) / 2;
    if (mid >= 200) label = 'EF4/EF5';
    else if (mid >= 165) label = 'EF4';
    else if (mid >= 135) label = 'EF3';
    else if (mid >= 111) label = 'EF2';
    else if (mid >= 86) label = 'EF1';
    else label = 'EF0 (landspout)';

    return { est_min, est_max, label };
  }

  function populateSummary(data) {
    sum.TEMP && (sum.TEMP.textContent = data.TEMP ? String(data.TEMP) : '—');
    sum.DEW && (sum.DEW.textContent = data.DEWPOINT ? String(data.DEWPOINT) : '—');
    sum.CAPE && (sum.CAPE.textContent = data.CAPE ? String(data.CAPE) : '—');
    sum.LAPSE && (sum.LAPSE.textContent = data.LAPSE_RATE_0_3 ? String(data.LAPSE_RATE_0_3) : '—');
    sum.PWAT && (sum.PWAT.textContent = data.PWAT ? String(data.PWAT) : '—');
    sum.RH && (sum.RH.textContent = data.SURFACE_RH ? String(data.SURFACE_RH) : '—');
    sum.SRH && (sum.SRH.textContent = data.SRH ? String(data.SRH) : '—');

    const sum3CAPE = document.getElementById('sum_3CAPE');
    const sum36LAPSE = document.getElementById('sum_36LAPSE');
    const sum700RH = document.getElementById('sum_700RH');
    if (sum3CAPE) sum3CAPE.textContent = data.CAPE_3KM ? String(data.CAPE_3KM) : '—';
    if (sum36LAPSE) sum36LAPSE.textContent = data.LAPSE_3_6KM ? String(data.LAPSE_3_6KM) : '—';
    if (sum700RH) sum700RH.textContent = data.RH_MID ? String(data.RH_MID) : '—';
  }

  function tryRegisterDataLabels() {
    try {
      if (window.Chart && window.ChartDataLabels && !Chart.registry.getPlugin('datalabels')) {
        Chart.register(ChartDataLabels);
      }
    } catch (e) {
      console.warn('datalabels plugin not available', e);
    }
  }

  function colorForValue(value) {
    const stops = [
      {v:0, c:[30,136,229]},
      {v:25, c:[38,198,218]},
      {v:50, c:[102,187,106]},
      {v:75, c:[255,167,38]},
      {v:100, c:[239,83,80]}
    ];
    const pct = Math.max(0, Math.min(100, value));
    for (let i=0;i<stops.length-1;i++){
      const a=stops[i], b=stops[i+1];
      if (pct >= a.v && pct <= b.v) {
        const t = (pct - a.v) / (b.v - a.v);
        const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * t);
        const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * t);
        const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * t);
        return `rgb(${r},${g},${bl})`;
      }
    }
    return '#ffffff';
  }

  function roundRect(ctx, x, y, w, h, r, fill, stroke) {
    if (w < 2*r) r = w/2;
    if (h < 2*r) r = h/2;
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

  function drawMiniWind(estimate) {
    if (!miniCanvas) return;
    const ctx = miniCanvas.getContext('2d');
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const cw = miniCanvas.clientWidth || 300;
    const ch = 48;
    miniCanvas.width = Math.round(cw * DPR);
    miniCanvas.height = Math.round(ch * DPR);

    ctx.clearRect(0,0,miniCanvas.width, miniCanvas.height);
    ctx.save();
    ctx.scale(DPR, DPR);

    const ranges = [
      {start: 0, end: 65, color: '#ffffff'},
      {start: 65, end: 110, color: '#4caf50'},
      {start: 110, end: 135, color: '#ffeb3b'},
      {start: 135, end: 165, color: '#ff9800'},
      {start: 165, end: 200, color: '#e53935'},
      {start: 200, end: 350, color: '#ec407a'}
    ];
    const minX = 0, maxX = 350;
    const pad = 6;
    const W = cw - pad*2;
    const H = ch;
    function xFor(v){ return pad + (v-minX)/(maxX-minX) * W; }

    ranges.forEach(r => {
      const x1 = xFor(r.start), x2 = xFor(r.end);
      const w = Math.max(2, x2 - x1);
      ctx.fillStyle = r.color;
      roundRect(ctx, x1, (H/2)-8, w, 16, 3, true, false);
    });

    if (estimate && typeof estimate.est_min === 'number' && typeof estimate.est_max === 'number') {
      const estMin = Math.max(minX, Math.min(maxX, estimate.est_min));
      const estMax = Math.max(minX, Math.min(maxX, estimate.est_max));
      const xMin = xFor(estMin);
      const xMax = xFor(estMax);

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(xMin, H/2);
      ctx.lineTo(xMax, H/2);
      ctx.stroke();

      const cx = (xMin + xMax) / 2;
      const cy = H/2;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      const s = 6;
      ctx.moveTo(cx, cy - s/2);
      ctx.lineTo(cx + s/2, cy);
      ctx.lineTo(cx, cy + s/2);
      ctx.lineTo(cx - s/2, cy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${estimate.est_min}`, xMin, H - 2);
      ctx.fillText(`${estimate.est_max}`, xMax, H - 2);
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      roundRect(ctx, pad, (H/2)-8, W, 16, 3, true, false);
    }

    ctx.restore();
  }

  const drawPercentPlugin = {
    id: 'drawPercentPlugin',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (value == null) return;

          const barX = (bar.x !== undefined) ? bar.x : (bar.getProps ? bar.getProps(['x'], true).x : 0);
          const barY = (bar.y !== undefined) ? bar.y : (bar.getProps ? bar.getProps(['y'], true).y : 0);

          const isHorizontal = chart.config.options.indexAxis === 'y';
          const labelX = isHorizontal ? barX + 10 : barX;
          const labelY = isHorizontal ? barY : barY - 8;

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

  function clearPercentColumn() {
    const pc = ensurePercentColumn();
    if (!pc) return;
    pc.innerHTML = '';
  }

  function updatePercentColumn(values, labels) {
    const pc = ensurePercentColumn();
    if (!pc || !probChart) return;

    pc.innerHTML = '';

    const meta = probChart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;

    meta.data.forEach((bar, idx) => {
      const value = values[idx];
      if (value == null) return;

      const item = document.createElement('div');
      item.className = 'percent-item';
      
      const n = Math.round(value * 10) / 10;
      item.textContent = (Number.isInteger(n) ? n : n.toFixed(1)) + '%';
      
      pc.appendChild(item);

      let barCenterY = bar.y !== undefined ? bar.y : (bar.height !== undefined ? bar.y + bar.height / 2 : 0);

      const canvasHeight = probCanvas.height || 300;
      const percentY = (barCenterY / canvasHeight) * 100;

      item.style.top = `${percentY}%`;
    });
  }

  function renderEmptyProb() {
    tryRegisterDataLabels();
    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const clientW = probCanvas.clientWidth || 800;
    const clientH = Math.max(260, probCanvas.parentElement.clientHeight || 360);
    probCanvas.width = Math.round(clientW * DPR);
    probCanvas.height = Math.round(clientH * DPR);

    const ctx = probCanvas.getContext('2d');
    if (probChart) {
      probChart.destroy();
      probChart = null;
    }

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
        indexAxis: 'y',
        responsive: false,
        maintainAspectRatio: false,
        animation: false,
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { right: 40 } },
        scales: {
          x: { max: 100, ticks: { display: true, color: '#bfcbd8', stepSize: 25 }, grid: { color: 'rgba(255,255,255,0.03)' } },
          y: { ticks: { color: '#dfe9f2', font: { weight: 700 } }, grid: { display: false } }
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

  function renderProbChart(dataArr) {
    tryRegisterDataLabels();

    const labels = dataArr.map(d => d.Type);
    const values = dataArr.map(d => d.Prob);
    if (!values.length) {
      renderEmptyProb();
      return;
    }
    const bgColors = values.map(v => colorForValue(v));

    const DPR = Math.max(1, window.devicePixelRatio || 1);
    const clientW = probCanvas.clientWidth || 800;
    const clientH = Math.max(260, probCanvas.parentElement.clientHeight || 360);
    probCanvas.width = Math.round(clientW * DPR);
    probCanvas.height = Math.round(clientH * DPR);

    const ctx = probCanvas.getContext('2d');
    const safeMax = 100;

    const plugins = [];
    if (window.ChartDataLabels) {
      try {
        if (!Chart.registry.getPlugin('datalabels')) Chart.register(ChartDataLabels);
        plugins.push(ChartDataLabels);
      } catch (e) {
        console.warn('Could not register ChartDataLabels plugin, using fallback', e);
      }
    }
    plugins.push(drawPercentPlugin);

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
        indexAxis: 'y',
        responsive: false,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        interaction: { mode: 'index', intersect: false },
        layout: { padding: { right: 40 } },
        scales: {
          x: { max: safeMax, ticks: { color: '#bfcbd8', stepSize: 25 }, grid: { color: 'rgba(255,255,255,0.03)' } },
          y: { ticks: { color: '#dfe9f2', font: { weight: 700 } }, grid: { display: false } }
        },
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
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

  function setupChartTooltip() {
    if (!probChart || !probChart.canvas) return;
    
    const tooltip = document.getElementById('statTooltip');
    if (!tooltip) return;

    const canvas = probChart.canvas;

    if (canvas._chartMouseMove) {
      canvas.removeEventListener('mousemove', canvas._chartMouseMove);
    }
    if (canvas._chartMouseLeave) {
      canvas.removeEventListener('mouseleave', canvas._chartMouseLeave);
    }
    
    function handleChartMouseMove(e) {
      if (tooltip.dataset.source === 'thermo') return;

      const rect = canvas.getBoundingClientRect();
      const canvasY = e.clientY - rect.top;

      const meta = probChart.getDatasetMeta(0);
      if (!meta || !meta.data || !meta.data.length) return;

      let hoveredType = null;
      meta.data.forEach((datapoint, idx) => {
        if (datapoint && typeof datapoint.y === 'number') {
          const barHeight = datapoint.height || 20;
          if (Math.abs(canvasY - datapoint.y) < barHeight) {
            hoveredType = probChart.data.labels[idx];
          }
        }
      });

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

    function handleChartMouseLeave() {
      if (tooltip.dataset.source === 'chart') {
        tooltip.classList.remove('visible');
        tooltip.setAttribute('aria-hidden', 'true');
        delete tooltip.dataset.source;
      }
    }

    canvas._chartMouseMove = handleChartMouseMove;
    canvas._chartMouseLeave = handleChartMouseLeave;

    canvas.addEventListener('mousemove', canvas._chartMouseMove);
    canvas.addEventListener('mouseleave', canvas._chartMouseLeave);
  }

  let autoAnalysisTimer = null;
  const AUTO_ANALYSIS_DELAY = 500;

  function triggerAutoAnalysis() {
    clearTimeout(autoAnalysisTimer);
    autoAnalysisTimer = setTimeout(() => {
      performAnalysis();
    }, AUTO_ANALYSIS_DELAY);
  }

  function performAnalysis() {
    const data = readInputs();
    populateSummary(data);
    const result = calculate_probabilities(data);
    renderProbChart(result.types);
    renderSpecialFactors(result.factors);
    const estimate = estimate_wind(data);
    drawMiniWind(data.CAPE > 0 ? estimate : null);
    if (data.CAPE > 0) windLabel.textContent = estimate.label;
    else windLabel.textContent = 'No estimate yet';
  }

  const thermoCard = document.querySelector('.thermo-card');
  const specialFactorsContainer = thermoCard.querySelector('#specialFactors');

  function renderSpecialFactors(factors) {
    if (!specialFactorsContainer) return;
    specialFactorsContainer.innerHTML = '<strong>Special Tornado Factors:</strong><br>' +
      factors.map(f => `${f.name}: <span style="color:#fff;font-weight:700">${f.chance}%</span>`).join('<br>');
  }

  // Auto-analyze on input changes
  ids.forEach(id => {
    const el = get(id);
    if (el) {
      el.addEventListener('input', performAnalysis);
      el.addEventListener('change', performAnalysis);
    }
  });

  ['CAPE_3KM', 'LAPSE_3_6KM', 'RH_MID'].forEach(id => {
    const el = get(id);
    if (el) {
      el.addEventListener('input', performAnalysis);
      el.addEventListener('change', performAnalysis);
    }
  });

  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performAnalysis();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      ids.forEach(k => {
        const el = get(k);
        if (el) el.value = '';
      });
      ['CAPE_3KM', 'LAPSE_3_6KM', 'RH_MID'].forEach(k => {
        const el = get(k);
        if (el) el.value = '';
      });
      Object.values(sum).forEach(el => {
        if (el) el.textContent = '—';
      });
      renderEmptyProb();
      drawMiniWind(null);
      windLabel.textContent = 'No estimate yet';
      if (specialFactorsContainer) specialFactorsContainer.innerHTML = '';
    });
  }

  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      try {
        if (typeof html2canvas === 'undefined') {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          script.onload = () => exportToImage();
          document.head.appendChild(script);
        } else {
          await exportToImage();
        }
      } catch (err) {
        console.error('Export failed:', err);
        alert('Export failed. Please try again.');
      }
    });
  }

  async function exportToImage() {
    const rightCol = document.querySelector('.right-col');
    if (!rightCol || typeof html2canvas === 'undefined') {
      alert('Unable to export. Please ensure all content is loaded.');
      return;
    }
    try {
      const canvas = await html2canvas(rightCol, {
        backgroundColor: '#121212',
        scale: 2,
        logging: false,
        useCORS: true
      });
      canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `twisted-weather-analysis-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      });
    } catch (err) {
      console.error('Export error:', err);
      alert('Export failed. Please try again.');
    }
  }

  renderEmptyProb();
  drawMiniWind(null);
  if (windLabel) windLabel.textContent = 'No estimate yet';

  let resizeTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (probChart) {
        const data = probChart.data.labels.map((l, i) => ({Type: l, Prob: probChart.data.datasets[0].data[i]}));
        renderProbChart(data);
      } else {
        renderEmptyProb();
      }
      const currentData = readInputs();
      const estimate = estimate_wind(currentData);
      drawMiniWind(currentData.CAPE > 0 ? estimate : null);
    }, 150);
  });

  console.log('Twisted Weather Analyzer initialized');

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
      // Use fixed positioning near the label
      const rect = e.currentTarget.getBoundingClientRect();
      const left = Math.min(window.innerWidth - 300, Math.max(8, rect.left + 8));
      const top = Math.min(window.innerHeight - 120, rect.bottom + 6);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
    function moveTip(e){
      // Position near cursor
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
});