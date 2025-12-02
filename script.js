document.addEventListener('DOMContentLoaded', () => {
  const ids = ['TEMP','DEWPOINT','CAPE','LAPSE_RATE_0_3','SURFACE_RH','PWAT','SRH','STP','VTP','STORM_SPEED'];
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
    SRH: get('sum_SRH'),
    STP: get('sum_STP'),
    VTP: get('sum_VTP')
  };

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
    // define same limits as the form (defensive)
    const limits = {
      TEMP: {min:-50, max:140},
      DEWPOINT: {min:-50, max:120},
      CAPE: {min:0, max:10226},
      LAPSE_RATE_0_3: {min:0, max:12},
      SURFACE_RH: {min:0, max:100},
      PWAT: {min:0, max:3.5},
      SRH: {min:0, max:1000},
      STP: {min:0, max:64},
      VTP: {min:0, max:16},
      STORM_SPEED: {min:0, max:200}
    };
    ids.forEach(k => {
      const el = get(k);
      let v = el && el.value !== '' ? parseFloat(el.value) : 0;
      if (!isFinite(v)) v = 0;
      // clamp to limits if available
      if (limits[k]) {
        v = Math.max(limits[k].min, Math.min(limits[k].max, v));
      }
      out[k] = v;
    });
    return out;
  }

  function calculate_probabilities(data) {
		// normalize/clamp helpers
		const clamp = (v, a=0, b=1) => Math.max(a, Math.min(b, v));
		const recordMax = {
			TEMP: 120, DEWPOINT: 90, CAPE: 10226, LAPSE_RATE_0_3: 12,
			SURFACE_RH: 100, PWAT: 3.5, SRH: 1000, STP: 64, VTP: 16, STORM_SPEED: 120
		};

		// ensure numeric defaults
		Object.keys(recordMax).forEach(k => { if (typeof data[k] !== 'number') data[k] = 0; });

		// normalized metrics [0..1]
		const capeN    = clamp(data.CAPE / recordMax.CAPE);
		const srhN     = clamp(data.SRH  / recordMax.SRH);
		const stpN     = clamp(data.STP  / recordMax.STP);
		const vtpN     = clamp(data.VTP  / recordMax.VTP);
		const lapseN   = clamp((data.LAPSE_RATE_0_3 - 1) / (recordMax.LAPSE_RATE_0_3 - 1));
		const pwatN    = clamp(data.PWAT / recordMax.PWAT);
		const rhN      = clamp(data.SURFACE_RH / recordMax.SURFACE_RH);
		const speedN   = clamp(data.STORM_SPEED / recordMax.STORM_SPEED);

		// realistic flags
		const temp_spread = data.TEMP - data.DEWPOINT;
		const is_soupy = (temp_spread <= 4) && (data.SURFACE_RH >= 75);
		const is_moist = (data.SURFACE_RH >= 65);
		const is_dry = (temp_spread >= 12) && (data.SURFACE_RH <= 50);

		// base priors (small starting values so contributions dominate)
		const scores = {
			'WEDGE': 4,
			'STOVEPIPE': 4,
			'DRILLBIT': 3,
			'CONE': 5,
			'ROPE': 2,
			'SIDEWINDER': 4
		};

		// -------------------------
		// WEDGE (wide, rain-fed)
		// - Driven primarily by low-level moisture: PWAT + surface RH
		// - Needs moderate CAPE to sustain a broad updraft
		// - Penalized by strong low-level rotation (SRH), high VTP, and very fast translation
		// -------------------------
		const moistFactor = clamp(pwatN * 0.7 + rhN * 0.3);
		scores.WEDGE += moistFactor * 55;           // moisture is primary driver
		if (moistFactor > 0.35) scores.WEDGE += capeN * 10; // CAPE helps only when moist
		scores.WEDGE = Math.max(1, scores.WEDGE - srhN * 22 - vtpN * 18);
		if (speedN > 0.65) scores.WEDGE = Math.max(1, scores.WEDGE - 8);

		// -------------------------
		// STOVEPIPE (very narrow, violent)
		// - Favored by very steep low-level lapse rates and high VTP
		// - Also benefits from CAPE (to supply updraft) and some SRH
		// -------------------------
		scores.STOVEPIPE += lapseN * 48;  // strong lapse -> concentrated updraft
		// stronger VTP influence so changing VTP has clearer impact
		scores.STOVEPIPE += vtpN * 52;    // violent parameter pushes toward stovepipe
		scores.STOVEPIPE += capeN * 10;
		scores.STOVEPIPE += srhN * 6;

		// -------------------------
		// SIDEWINDER (rotational, often fast/long-track narrow tornado)
		// - Dominated by SRH (low-level rotation)
		// - Boosted by VTP and storm speed
		// -------------------------
		scores.SIDEWINDER += srhN * 60;
		// VTP also supports sidewinder (violent parameter) — increase impact
		scores.SIDEWINDER += vtpN * 36;
		scores.SIDEWINDER += speedN * 12;

		// -------------------------
		// DRILLBIT (thin, often in dry, fast storms)
		// - Favored by dry boundary layer, high lapse, and fast storm motion
		// - Moderate CAPE helps support updraft intensity
		// -------------------------
		if (is_dry) scores.DRILLBIT += 30;
		scores.DRILLBIT += lapseN * 14;
		if (speedN > 0.55) scores.DRILLBIT += speedN * 28;
		scores.DRILLBIT += capeN * 6;

		// -------------------------
		// CONE (classic, mid-range tornado)
		// - Moderately favored by CAPE (buoyancy) and moderate SRH
		// - PWAT helps keep it from being rain-wrapped (moderate positive)
		// -------------------------
		scores.CONE += capeN * 26;
		scores.CONE += srhN * 8;
		scores.CONE += pwatN * 6;

		// -------------------------
		// ROPE (weak, decaying funnels)
		// - Favored in low-CAPE, weaker flow, or late-stage dissipation
		// - Slow storm motion increases chance
		// -------------------------
		if (capeN <= 0.18) scores.ROPE += 24;
		if (speedN <= 0.35) scores.ROPE += 10;
		// small bonus from low PWAT (less likelihood of broad wedge)
		if (pwatN < 0.25) scores.ROPE += 6;

		// enforce minima
		Object.keys(scores).forEach(k => { scores[k] = Math.max(1, scores[k]); });

		// modest STP multiplier (reflects overall favorable composite)
		const stpMultiplier = 0.9 + (stpN * 0.6); // conservative scaling
		Object.keys(scores).forEach(k => { scores[k] = Math.max(1, scores[k] * stpMultiplier); });

		// convert to percentages
		const total = Object.values(scores).reduce((a,b) => a + b, 0) || 1;
		const percentages = Object.keys(scores).map(k => ({ Type: k, Prob: Math.round((scores[k] / total) * 1000) / 10 }));

		const types = percentages.sort((a,b) => b.Prob - a.Prob);

		// Special factors (separate from morphology distribution)
		let multiVortexChance = Math.round(clamp(srhN * 0.6 + vtpN * 0.25 + capeN * 0.15, 0, 1) * 100);
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
	  // Composite severity-based wind estimator (uses more than VTP)
	  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

	  // reasonable normalization maxima (same as used elsewhere)
	  const MAX = { CAPE: 10226, SRH: 1000, STP: 64, VTP: 16, LAPSE: 12, SPEED: 120 };

	  const vtpN = clamp((data.VTP || 0) / MAX.VTP);
	  const stpN = clamp((data.STP || 0) / MAX.STP);
	  const capeN = clamp((data.CAPE || 0) / MAX.CAPE);
	  const srhN = clamp((data.SRH || 0) / MAX.SRH);
	  const lapseN = clamp(((data.LAPSE_RATE_0_3 || 1) - 1) / (MAX.LAPSE - 1));
	  const speedN = clamp((data.STORM_SPEED || 0) / MAX.SPEED);

	  // Tunable weights (increase VTP influence so VTP changes are more decisive)
	  const w = { vtp: 0.60, stp: 0.15, cape: 0.12, srh: 0.08, lapse: 0.03, speed: 0.02 };

	  const severity = clamp(
	    vtpN * w.vtp +
	    stpN * w.stp +
	    capeN * w.cape +
	    srhN * w.srh +
	    lapseN * w.lapse +
	    speedN * w.speed,
	    0, 1
	  );

	  // Map severity [0..1] to a continuous wind estimate.
	  // Base range chosen to cover EF0-ish up to EF5 record.
	  const MIN_BASE = 60;   // lower-bound base for weakest events
	  const MAX_BASE = 333;  // record upper bound
	  // central estimate scales with severity
	  const center = Math.round(MIN_BASE + severity * (MAX_BASE - MIN_BASE));
	  // uncertainty window: narrower for low severity, wider for high severity
	  const spread = Math.round(20 + severity * 100);

	  const est_min = Math.max(20, center - Math.round(spread * 0.6));
	  const est_max = Math.min(MAX_BASE, center + Math.round(spread * 0.6));

	  // Label by EF-style thresholds (approximate)
	  let label = 'EF0-1';
	  const mid = (est_min + est_max) / 2;
	  if (mid >= 200) label = 'EF4/EF5';
	  else if (mid >= 165) label = 'EF4';
	  else if (mid >= 135) label = 'EF3';
	  else if (mid >= 111) label = 'EF2';
	  else if (mid >= 65) label = 'EF1';
	  else label = 'EF0 (landspout)';

	  return { est_min, est_max, label };
}

  function populateSummary(data) {
    // Show 3CAPE and 3-6KM LAPSE as scaled values (for display only)
    // 3CAPE: 60% of CAPE, rounded, clamped to [1, 200]
    let threeCAPE = Math.round(data.CAPE * 0.6);
    threeCAPE = Math.max(1, Math.min(200, threeCAPE));

    const threeSixLapse = Math.round(data.LAPSE_RATE_0_3 * 0.8 * 10) / 10;
    const sevenHundredRH = Math.round(data.SURFACE_RH * 0.7);

    sum.TEMP && (sum.TEMP.textContent = data.TEMP ? String(data.TEMP) : '—');
    sum.DEW && (sum.DEW.textContent = data.DEWPOINT ? String(data.DEWPOINT) : '—');
    sum.CAPE && (sum.CAPE.textContent = data.CAPE ? String(data.CAPE) : '—');
    sum.LAPSE && (sum.LAPSE.textContent = data.LAPSE_RATE_0_3 ? String(data.LAPSE_RATE_0_3) : '—');
    sum.PWAT && (sum.PWAT.textContent = data.PWAT ? String(data.PWAT) : '—');
    sum.RH && (sum.RH.textContent = data.SURFACE_RH ? String(data.SURFACE_RH) : '—');
    sum.SRH && (sum.SRH.textContent = data.SRH ? String(data.SRH) : '—');
    sum.STP && (sum.STP.textContent = data.STP ? String(data.STP) : '—');
    sum.VTP && (sum.VTP.textContent = data.VTP ? String(data.VTP) : '—');

    // These IDs must exist in your HTML for the extra fields
    const sum3CAPE = document.getElementById('sum_3CAPE');
    const sum36LAPSE = document.getElementById('sum_36LAPSE');
    const sum700RH = document.getElementById('sum_700RH');
    if (sum3CAPE) sum3CAPE.textContent = threeCAPE ? String(threeCAPE) : '—';
    if (sum36LAPSE) sum36LAPSE.textContent = threeSixLapse ? String(threeSixLapse) : '—';
    if (sum700RH) sum700RH.textContent = sevenHundredRH ? String(sevenHundredRH) : '—';
  }

  let probChart = null;

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

    // Fill the entire bar with color ranges, no gaps at ends
    // EF0/landspout: white, EF1: green, EF2: yellow, EF3: orange, EF4: red, EF5+: pink
    const ranges = [
      {start: 0, end: 65, color: '#ffffff'},      // Landspout/EF0
      {start: 65, end: 110, color: '#4caf50'},    // EF1 (green)
      {start: 110, end: 135, color: '#ffeb3b'},   // EF2 (yellow)
      {start: 135, end: 165, color: '#ff9800'},   // EF3 (orange)
      {start: 165, end: 200, color: '#e53935'},   // EF4 (red)
      {start: 200, end: 350, color: '#ec407a'}    // EF5+ (pink)
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
    probCanvas.style.pointerEvents = 'auto';
  }

  // Auto-analysis with debounce
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
    drawMiniWind(data.VTP > 0 ? estimate : null);
    if (data.VTP > 0) windLabel.textContent = estimate.label;
    else windLabel.textContent = 'No estimate yet';
  }

  // --- NEW: Render special factors below the chart ---
  // Reference the specialFactors container inside thermo-card
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

  // Analyze button handler
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      performAnalysis();
    });
  }

  // Reset button handler
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      ids.forEach(k => {
        const el = get(k);
        if (el) el.value = '';
      });
      Object.values(sum).forEach(el => {
        if (el) el.textContent = '—';
      });
      renderEmptyProb();
      drawMiniWind(null);
      windLabel.textContent = 'No estimate yet';
      // Clear special factors
      if (specialFactorsContainer) specialFactorsContainer.innerHTML = '';
    });
  }

  // Export handler
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

  // Initial render
  renderEmptyProb();
  drawMiniWind(null);
  if (windLabel) windLabel.textContent = 'No estimate yet';

  // Responsive redraw
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
      const vtpVal = parseFloat(get('VTP').value) || 0;
      const estimate = estimate_wind({VTP: vtpVal});
      drawMiniWind((vtpVal>0)?estimate:null);
    }, 150);
  });

  console.log('Twisted Weather Analyzer initialized');

  // Tooltip for thermodynamics labels
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
      positionTip(e);
    }
    function positionTip(e){
      const rect = (e.currentTarget) ? e.currentTarget.getBoundingClientRect() : (e);
      const cardRect = document.querySelector('.thermo-card').getBoundingClientRect();
      // calculate position relative to thermo-card
      const left = Math.min(cardRect.width - 280, Math.max(8, (rect.left - cardRect.left) + 8));
      const top = (rect.top - cardRect.top) + rect.height + 6;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
    function moveTip(e){
      // If triggered by mousemove, position near pointer
      const cardRect = document.querySelector('.thermo-card').getBoundingClientRect();
      const left = Math.min(cardRect.width - 280, Math.max(8, e.clientX - cardRect.left + 8));
      const top = Math.min(cardRect.height - 40, e.clientY - cardRect.top + 12);
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${top}px`;
    }
    function hideTip(){
      tooltip.classList.remove('visible');
      tooltip.setAttribute('aria-hidden','true');
    }
    labels.forEach(lbl => {
      lbl.addEventListener('mouseenter', showTip);
      lbl.addEventListener('mousemove', moveTip);
      lbl.addEventListener('mouseleave', hideTip);
      lbl.addEventListener('focus', showTip);
      lbl.addEventListener('blur', hideTip);
    });
    // hide on scroll or resize to avoid stuck tooltip
    window.addEventListener('scroll', hideTip, true);
    window.addEventListener('resize', hideTip);
  })();
});
