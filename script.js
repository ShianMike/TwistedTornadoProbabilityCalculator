document.addEventListener('DOMContentLoaded', () => {
  const ids = ['TEMP','DEWPOINT','CAPE','LAPSE_RATE_0_3','SURFACE_RH','PWAT','SRH','STP','VTP','STORM_SPEED'];
  const get = id => document.getElementById(id);
  const analyzeBtn = get('analyze');
  const resetBtn = get('reset');
  const exportBtn = get('exportBtn');

  const probCanvas = get('probChart');
  const miniCanvas = get('miniWind');
  const windLabel = get('windLabel'); // efLabel intentionally removed

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

  // Ensure percent column exists, create if not
  function ensurePercentColumn() {
    const wrap = probCanvas && probCanvas.parentElement;
    if (!wrap) return null;
    let pc = wrap.querySelector('#percentCol');
    if (!pc) {
      pc = document.createElement('div');
      pc.id = 'percentCol';
      pc.className = 'percent-col';
      // basic styling fallback if CSS missing
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

  const percentColEl = ensurePercentColumn();

  function readInputs() {
    const out = {};
    ids.forEach(k => {
      const el = get(k);
      // If STORM_SPEED is present as STORM_SPEED or STORM_SPEED mismatch, try common fallback id
      let v = el && el.value !== '' ? parseFloat(el.value) : 0;
      if (!isFinite(v)) v = 0;
      out[k] = v;
    });
    return out;
  }

  function calculate_probabilities(data) {
    const scores = {
      'WEDGE': 5,
      'STOVEPIPE': 10,
      'DRILLBIT': 5,
      'CONE': 20,
      'ROPE': 5,
      'SIDEWINDER': 0,
      'MULTI-VORTEX': 5
    };

    const temp_spread = data.TEMP - data.DEWPOINT;

    const is_soupy = (temp_spread <= 5) && (data.SURFACE_RH >= 80);
    const is_dry = (temp_spread >= 15) && (data.SURFACE_RH <= 60);

    const is_high_cape = (data.CAPE >= 5000);
    const is_low_cape = (data.CAPE <= 2500);

    const is_extreme_srh = (data.SRH >= 450);
    const is_violent_lapse = (data.LAPSE_RATE_0_3 >= 9.5);
    const is_wedge_lapse = (data.LAPSE_RATE_0_3 >= 7.5 && data.LAPSE_RATE_0_3 <= 9.0);

    const is_fast = (data.STORM_SPEED > 60);
    const is_hypersonic = (data.STORM_SPEED > 75);

    if (is_soupy) scores['WEDGE'] += 50;
    if (is_high_cape) scores['WEDGE'] += 20;
    if (is_wedge_lapse) scores['WEDGE'] += 15;
    if (is_hypersonic && !is_soupy) scores['WEDGE'] -= 10;

    if (is_dry) scores['DRILLBIT'] += 40;
    if (is_violent_lapse) scores['DRILLBIT'] += 30;
    if (is_fast) scores['DRILLBIT'] += 20;
    if (is_hypersonic) scores['DRILLBIT'] += 15;

    if (is_extreme_srh && is_violent_lapse) scores['SIDEWINDER'] += 40;
    if (is_hypersonic) scores['SIDEWINDER'] += 40;
    if (data.VTP >= 3) scores['SIDEWINDER'] += 20;

    if (data.LAPSE_RATE_0_3 > 8.5) scores['STOVEPIPE'] += 30;
    if (is_high_cape && !is_soupy) scores['STOVEPIPE'] += 20;

    if (is_extreme_srh) scores['MULTI-VORTEX'] += 40;
    if (data.SRH > 600) scores['MULTI-VORTEX'] += 50;

    if (is_low_cape && !is_hypersonic) scores['ROPE'] += 50;

    const total_score = Object.values(scores).reduce((a,b) => a + b, 0) || 1;
    const percentages = {};
    Object.keys(scores).forEach(key => {
      percentages[key] = Math.round((scores[key] / total_score) * 1000) / 10; // one decimal
    });

    const arr = Object.entries(percentages)
                   .map(([k,v]) => ({Type: k, Prob: v}))
                   .filter(x => x.Prob > 0)
                   .sort((a,b) => b.Prob - a.Prob);

    return arr;
  }

  function estimate_wind(data) {
    if (data.VTP >= 4) return {est_min:290, est_max:320, label:'EF5 (THEORETICAL MAX)'};
    if (data.VTP === 3) return {est_min:260, est_max:310, label:'EF5 (CATASTROPHIC)'};
    if (data.VTP === 2) return {est_min:190, est_max:230, label:'EF4 (VIOLENT)'};
    return {est_min:130, est_max:160, label:'EF2/EF3 (STRONG)'};
  }

  function populateSummary(data) {
    sum.TEMP && (sum.TEMP.textContent = data.TEMP ? String(data.TEMP) : '—');
    sum.DEW && (sum.DEW.textContent = data.DEWPOINT ? String(data.DEWPOINT) : '—');
    sum.CAPE && (sum.CAPE.textContent = data.CAPE ? String(data.CAPE) : '—');
    sum.LAPSE && (sum.LAPSE.textContent = data.LAPSE_RATE_0_3 ? String(data.LAPSE_RATE_0_3) : '—');
    sum.PWAT && (sum.PWAT.textContent = data.PWAT ? String(data.PWAT) : '—');
    sum.RH && (sum.RH.textContent = data.SURFACE_RH ? String(data.SURFACE_RH) : '—');
    sum.SRH && (sum.SRH.textContent = data.SRH ? String(data.SRH) : '—');
    sum.STP && (sum.STP.textContent = data.STP ? String(data.STP) : '—');
    sum.VTP && (sum.VTP.textContent = data.VTP ? String(data.VTP) : '—');
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
      {start:65,end:110,color:'#4caf50'},
      {start:111,end:165,color:'#ffb300'},
      {start:166,end:199,color:'#ff7043'},
      {start:200,end:320,color:'#e53935'}
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

  // Fallback plugin to draw percentage text if ChartDataLabels fails or missing
  const drawPercentPlugin = {
    id: 'drawPercentPlugin',
    afterDatasetsDraw(chart) {
      const ctx = chart.ctx;
      chart.data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        meta.data.forEach((bar, index) => {
          const value = dataset.data[index];
          if (value == null) return;

          // Chart.js v4 exposes .x and .y on elements. fallback to getProps if not present.
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

    pc.innerHTML = ''; // clear existing items

    const meta = probChart.getDatasetMeta(0);
    if (!meta || !meta.data || !meta.data.length) return;

    const chartBox = probCanvas.getBoundingClientRect();
    const canvasContainer = probCanvas.parentElement;
    if (!canvasContainer) return;

    meta.data.forEach((bar, idx) => {
      const value = values[idx];
      if (value == null) return;

      const item = document.createElement('div');
      item.className = 'percent-item';
      
      // format value: show one decimal if fractional, otherwise integer
      const n = Math.round(value * 10) / 10;
      item.textContent = (Number.isInteger(n) ? n : n.toFixed(1)) + '%';
      
      pc.appendChild(item);

      // Calculate bar center position in canvas pixel coordinates
      // For horizontal bars (indexAxis: 'y'), the bar's Y position is what we need
      let barCenterY = 0;
      
      if (bar.y !== undefined) {
        // Chart.js v4: bar.y is the center Y coordinate in canvas pixels
        barCenterY = bar.y;
      } else if (bar.height !== undefined && bar.y !== undefined) {
        // Fallback: calculate from top + half height
        barCenterY = bar.y + bar.height / 2;
      }

      // Convert canvas pixel Y to percentage of container height
      const canvasHeight = probCanvas.height || 300;
      const percentY = (barCenterY / canvasHeight) * 100;

      // Apply positioning relative to percent-col container
      item.style.top = `${percentY}%`;
    });
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
    plugins.push(drawPercentPlugin); // always include fallback for robustness

    if (probChart) {
      probChart.options.scales.x.max = safeMax;
      probChart.data.labels = labels;
      probChart.data.datasets[0].data = values;
      probChart.data.datasets[0].backgroundColor = bgColors;
      probChart.update('none');
      // sync DOM percent column on next frame
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

    // Wait a frame for chart elements to be measured, then place DOM labels
    requestAnimationFrame(() => updatePercentColumn(values, labels));

    probCanvas.style.pointerEvents = 'auto';
  }

  // analyze handler
  analyzeBtn.addEventListener('click', () => {
    const data = readInputs();
    populateSummary(data);

    const probs = calculate_probabilities(data);
    renderProbChart(probs);

    const estimate = estimate_wind(data);
    drawMiniWind(data.VTP > 0 ? estimate : null);

    if (data.VTP > 0) windLabel.textContent = estimate.label;
    else windLabel.textContent = 'No estimate yet';
  });

  // reset handler
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
  });

  // export handler
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

  // initial render
  renderEmptyProb();
  drawMiniWind(null);
  if (windLabel) windLabel.textContent = 'No estimate yet';

  // responsive redraw with synced percent column
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
});
