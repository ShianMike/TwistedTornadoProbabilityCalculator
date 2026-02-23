import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { INPUT_LIMITS } from '../utils/constants';

const inputFields = [
  { id: 'TEMP', label: 'Temperature', unit: '°F', step: 0.1, required: true },
  { id: 'DEWPOINT', label: 'Dewpoint', unit: '°F', step: 0.1, required: true },
  { id: 'CAPE', label: 'CAPE', unit: 'J/kg', step: 1, required: true },
  { id: 'CAPE_3KM', label: '3CAPE', unit: 'J/kg', step: 1, required: true },
  { id: 'LAPSE_RATE_0_3', label: '0-3km Lapse', unit: '°C/km', step: 0.1, required: true },
  { id: 'LAPSE_3_6KM', label: '3-6km Lapse', unit: '°C/km', step: 0.1, required: true },
  { id: 'PWAT', label: 'PWAT', unit: 'in', step: 0.01, required: true },
  { id: 'SRH', label: 'SRH', unit: 'm²/s²', step: 1, required: true },
  { id: 'SURFACE_RH', label: 'Surface RH', unit: '%', step: 1, required: true },
  { id: 'RH_MID', label: '700-500mb RH', unit: '%', step: 1, required: true },
  { id: 'STP', label: 'STP', unit: '', step: 0.1, required: true },
  { id: 'VTP', label: 'VTP', unit: '', step: 0.1, required: true },
  { id: 'STORM_SPEED', label: 'Storm Motion', unit: 'mph', step: 1, required: true },
];

const tornadoTypes = ['rope', 'cone', 'stovepipe', 'sidewinder', 'drillbit', 'wedge', 'funnel'];

export default function DataGathering() {
  const [formData, setFormData] = useState({});
  const [tornadoType, setTornadoType] = useState('');
  const [windValue, setWindValue] = useState('');
  const [windComparison, setWindComparison] = useState('');
  const [submissions, setSubmissions] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  const handleInputChange = useCallback((id, value) => {
    const limits = INPUT_LIMITS[id];
    let numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      setFormData(prev => ({ ...prev, [id]: '' }));
      return;
    }
    
    if (limits) {
      numValue = Math.max(limits.min, Math.min(limits.max, numValue));
    }
    
    setFormData(prev => ({ ...prev, [id]: numValue }));
  }, []);

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    
    const entry = {
      ...formData,
      tornadoType,
      maxWinds: windValue,
      windComparison,
      timestamp: new Date().toISOString()
    };
    
    setSubmissions(prev => [...prev, entry]);
    setShowSuccess(true);
    
    setTimeout(() => setShowSuccess(false), 3000);
  }, [formData, tornadoType, windValue, windComparison]);

  const handleReset = useCallback(() => {
    setFormData({});
    setTornadoType('');
    setWindValue('');
    setWindComparison('');
  }, []);

  const downloadCSV = useCallback(() => {
    if (submissions.length === 0) return;
    
    const headers = Object.keys(submissions[0]);
    const csv = [
      headers.join(','),
      ...submissions.map(row => headers.map(h => row[h] ?? '').join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tornado_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }, [submissions]);

  const handleImagePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
          const url = URL.createObjectURL(blob);
          setPreviewImage(url);
          break;
        }
      }
    } catch (err) {
      console.error('Failed to paste image');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950">
      
      <main className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-10">
          <Link 
            to="/"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-cyan-400 
                       text-sm mb-4 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Forecaster
          </Link>
          
          <h1 className="text-3xl sm:text-4xl font-black text-emerald-400
                         tracking-tight">
            Tornado Data Gathering
          </h1>
          <p className="mt-2 text-slate-400 text-sm sm:text-base">
            Record tornado observations using OCR reading and manual classification
          </p>
          
          <div className="mt-6 h-px bg-slate-700/50"></div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - OCR and Parameters */}
          <div className="space-y-6">
            {/* OCR Section */}
            <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/20">
                  <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                OCR Image Input
              </h2>
              
              <div className="flex gap-2 mb-4">
                <label className="flex-1 cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" 
                         onChange={(e) => {
                           const file = e.target.files?.[0];
                           if (file) setPreviewImage(URL.createObjectURL(file));
                         }} />
                  <div className="flex items-center justify-center gap-2 px-4 py-3
                                  bg-slate-800/50 border border-slate-700/50 border-dashed
                                  rounded-lg text-slate-400 text-sm
                                  hover:bg-slate-700/50 hover:border-slate-600/50 hover:text-slate-300
                                  transition-all duration-200">
                    📁 Upload Image
                  </div>
                </label>
                
                <button onClick={handleImagePaste}
                        className="flex items-center gap-2 px-4 py-3
                                   bg-slate-800/50 border border-slate-700/50
                                   rounded-lg text-slate-400 text-sm
                                   hover:bg-slate-700/50 hover:border-slate-600/50 hover:text-slate-300
                                   transition-all duration-200">
                  📋 Paste
                </button>
              </div>

              {previewImage ? (
                <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
                  <img src={previewImage} alt="Preview" className="max-h-40 mx-auto rounded-lg object-contain" />
                </div>
              ) : (
                <div className="p-8 border-2 border-dashed border-slate-700/50 rounded-xl text-center">
                  <p className="text-slate-500 text-sm">Capture or paste a screenshot of weather data</p>
                </div>
              )}
            </div>

            {/* Parameters Section */}
            <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
              <h2 className="text-lg font-bold text-white mb-4">Thermodynamic Parameters</h2>
              <p className="text-xs text-amber-400 mb-4">⚠️ Please review and correct any values before submitting</p>
              
              <div className="grid grid-cols-2 gap-3">
                {inputFields.map((field) => (
                  <div key={field.id}>
                    <label className="block text-xs font-medium text-slate-400 mb-1">
                      {field.label} {field.required && <span className="text-red-400">*</span>}
                      {field.unit && <span className="text-slate-500 ml-1">({field.unit})</span>}
                    </label>
                    <input
                      type="number"
                      step={field.step}
                      min={INPUT_LIMITS[field.id]?.min}
                      max={INPUT_LIMITS[field.id]?.max}
                      value={formData[field.id] ?? ''}
                      onChange={(e) => handleInputChange(field.id, e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 
                                 rounded-lg text-white text-sm
                                 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50
                                 transition-all duration-200"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Classification */}
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
              <h2 className="text-lg font-bold text-white mb-6">Data Classification</h2>
              
              {/* Tornado Type */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                  Tornado Type <span className="text-red-400">*</span>
                </label>
                <select
                  value={tornadoType}
                  onChange={(e) => setTornadoType(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 
                             rounded-lg text-white text-sm
                             focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50
                             transition-all duration-200 cursor-pointer"
                >
                  <option value="">-- Select Tornado Type --</option>
                  {tornadoTypes.map(type => (
                    <option key={type} value={type} className="bg-slate-800">
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Wind Speed */}
              <div className="mb-6">
                <label className="block text-xs font-medium text-slate-400 mb-2 uppercase tracking-wide">
                  Wind Speed Recording
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Max Winds (mph)"
                    value={windValue}
                    onChange={(e) => setWindValue(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 
                               rounded-lg text-white text-sm placeholder:text-slate-500
                               focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50
                               transition-all duration-200"
                  />
                  <select
                    value={windComparison}
                    onChange={(e) => setWindComparison(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 
                               rounded-lg text-white text-sm
                               focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50
                               transition-all duration-200 cursor-pointer"
                  >
                    <option value="">Comparison</option>
                    <option value="greater" className="bg-slate-800">Greater Than (&gt;)</option>
                    <option value="less" className="bg-slate-800">Less Than (&lt;)</option>
                  </select>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button type="submit" className="flex-1 btn-primary py-3 text-sm font-semibold">
                  💾 Save Data Entry
                </button>
                <button 
                  type="button" 
                  onClick={handleReset}
                  className="btn-secondary py-3 px-4"
                >
                  Reset
                </button>
              </div>
            </form>

            {/* Success Message */}
            {showSuccess && (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/30 
                              animate-in fade-in slide-in-from-top-2 duration-300">
                <p className="text-emerald-400 font-semibold flex items-center gap-2">
                  ✓ Data Saved Successfully
                </p>
              </div>
            )}

            {/* Submissions */}
            <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Submitted Data</h2>
                {submissions.length > 0 && (
                  <button onClick={downloadCSV} className="btn-secondary text-xs py-2 px-3">
                    📥 Download CSV
                  </button>
                )}
              </div>
              
              {submissions.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">
                  No data entries yet. Submit a form to see entries here.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {submissions.map((entry, i) => (
                    <div key={i} className="p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-white capitalize">{entry.tornadoType}</span>
                        <span className="text-sm text-slate-400">
                          {entry.maxWinds ? `${entry.windComparison === 'greater' ? '>' : '<'} ${entry.maxWinds} mph` : '--'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        CAPE: {entry.CAPE} | SRH: {entry.SRH} | STP: {entry.STP}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
