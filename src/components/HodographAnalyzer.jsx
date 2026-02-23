import { useState, useCallback } from 'react';

const CONFIG = {
  serverEndpoint: window.location.hostname.includes('vercel.app') 
    ? '/api/analyze-hodograph' 
    : 'https://twisted-tornado-probability-calculator-shians-projects-7aecca1a.vercel.app/api/analyze-hodograph',
};

export default function HodographAnalyzer({ onAnalyzed }) {
  const [image, setImage] = useState(null);
  const [imageBlob, setImageBlob] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState('');
  const [results, setResults] = useState(null);

  // Auto-analyze when image is loaded
  const loadAndAnalyze = useCallback(async (blob) => {
    const url = URL.createObjectURL(blob);
    setImage(url);
    setImageBlob(blob);
    setStatus('Image loaded. Click Analyze to process.');
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
          loadAndAnalyze(blob);
          break;
        }
      }
    } catch (err) {
      setStatus('Failed to paste image. Try Ctrl+V instead.');
    }
  }, [loadAndAnalyze]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      loadAndAnalyze(file);
    }
  }, [loadAndAnalyze]);

  const analyzeHodograph = useCallback(async () => {
    if (!image) return;
    
    setIsAnalyzing(true);
    setStatus('Analyzing hodograph with AI...');
    
    try {
      // Convert image to base64
      const response = await fetch(image);
      const blob = await response.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });

      const apiResponse = await fetch(CONFIG.serverEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          image: base64,
          extractGeometry: true 
        })
      });

      if (!apiResponse.ok) {
        throw new Error('Analysis failed');
      }

      const data = await apiResponse.json();
      
      // Process results from API
      const metrics = {
        HODO_CONF: data.confidence || data.qc?.confidence || 0.8,
        HODO_CURVATURE: data.metrics?.curvatureIndex || 1.2,
        HODO_TURNING: data.metrics?.turningDeg || data.metrics?.turning?.absolute || 120,
        HODO_KINK: data.metrics?.kinkMaxDeg || 30,
        HODO_EXTENSION: data.metrics?.extensionNorm || 0.6,
        HODO_COMPACTNESS: data.metrics?.compactness || 0.5,
        HODO_HAS_LOOP: data.labels?.hasLoop || false,
        HODO_SHAPE: data.labels?.shapeType || 'CURVED'
      };

      setResults(metrics);
      onAnalyzed(metrics);
      setStatus('Analysis complete!');
    } catch (err) {
      setStatus('Analysis failed. Please try again.');
      console.error(err);
    } finally {
      setIsAnalyzing(false);
    }
  }, [image, onAnalyzed]);

  // Shape type descriptions
  const getShapeDescription = (shape) => {
    const descriptions = {
      'STRAIGHT': 'Low rotation potential',
      'CURVED': 'Moderate rotation potential',
      'KINKED': 'Enhanced low-level shear',
      'LOOPED': 'Significant rotation potential',
      'FISH_HOOK': 'Strong supercell signature'
    };
    return descriptions[shape] || shape;
  };

  return (
    <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white">Hodograph Analyzer</h2>
        <span className="badge-beta">BETA</span>
      </div>

      {/* Upload Section */}
      <div className="flex gap-2 mb-4">
        <label className="flex-1 cursor-pointer">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <div className="flex items-center justify-center gap-2 px-4 py-2.5
                          bg-slate-800/50 border border-slate-700/50 border-dashed
                          rounded-lg text-slate-400 text-sm
                          hover:bg-slate-700/50 hover:border-slate-600/50 hover:text-slate-300
                          transition-all duration-200">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Load Image
          </div>
        </label>
        
        <button
          onClick={handlePaste}
          className="flex items-center gap-2 px-4 py-2.5
                     bg-slate-800/50 border border-slate-700/50
                     rounded-lg text-slate-400 text-sm
                     hover:bg-slate-700/50 hover:border-slate-600/50 hover:text-slate-300
                     transition-all duration-200"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Paste
        </button>
      </div>

      {/* Hodograph Snip Tip */}
      <div className="mb-4 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
        <p className="text-xs font-semibold text-cyan-400 mb-2">Hodograph Snip Tip</p>
        <p className="text-xs text-slate-400 mb-3">For best results, snip the hodograph like this:</p>
        <div className="flex justify-center">
          <img 
            src="/Hodograph-example.png" 
            alt="Hodograph snip example"
            className="max-h-32 rounded border border-slate-700/50 object-contain"
          />
        </div>
      </div>

      {/* Image Preview */}
      {image ? (
        <div className="relative mb-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30">
          <img 
            src={image} 
            alt="Hodograph" 
            className="max-h-48 mx-auto rounded-lg object-contain"
          />
          <button
            onClick={() => {
              setImage(null);
              setResults(null);
              setStatus('');
            }}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-slate-400 
                       hover:text-white hover:bg-slate-800 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="mb-4 p-8 border-2 border-dashed border-slate-700/50 rounded-xl text-center">
          <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-slate-500 text-sm">Paste or upload a hodograph image</p>
        </div>
      )}

      {/* Analyze Button */}
      {image && (
        <button
          onClick={analyzeHodograph}
          disabled={isAnalyzing}
          className="w-full mb-4 py-3 px-4 rounded-xl font-semibold text-sm
                     bg-purple-500/20
                     border border-purple-500/30 text-purple-300
                     hover:bg-purple-500/30 hover:text-purple-200
                     disabled:opacity-50 disabled:cursor-not-allowed
                     transition-all duration-200"
        >
          {isAnalyzing ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
              </svg>
              Analyzing...
            </span>
          ) : 'Analyze Hodograph'}
        </button>
      )}

      {/* Status */}
      {status && (
        <p className={`text-xs text-center mb-4 ${
          status.includes('complete') ? 'text-green-400' : 
          status.includes('failed') ? 'text-red-400' : 'text-cyan-400'
        }`}>
          {status}
        </p>
      )}

      {/* Results */}
      {results && (
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 mb-4">
          {/* Shape Type Header */}
          <div className="text-center mb-4 pb-3 border-b border-slate-700/50">
            <span className="text-xs text-slate-500 uppercase tracking-wide">Shape Type</span>
            <p className="text-xl font-bold text-purple-400">{results.HODO_SHAPE}</p>
            <p className="text-xs text-slate-400 mt-1">{getShapeDescription(results.HODO_SHAPE)}</p>
          </div>
          
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 bg-slate-900/30 rounded-lg">
              <span className="text-xs text-slate-500">Curvature</span>
              <p className="text-lg font-bold text-white">{results.HODO_CURVATURE?.toFixed(2)}</p>
            </div>
            <div className="text-center p-2 bg-slate-900/30 rounded-lg">
              <span className="text-xs text-slate-500">Turning</span>
              <p className="text-lg font-bold text-white">{results.HODO_TURNING?.toFixed(0)}°</p>
            </div>
            <div className="text-center p-2 bg-slate-900/30 rounded-lg">
              <span className="text-xs text-slate-500">Max Kink</span>
              <p className="text-lg font-bold text-white">{results.HODO_KINK?.toFixed(0)}°</p>
            </div>
            <div className="text-center p-2 bg-slate-900/30 rounded-lg">
              <span className="text-xs text-slate-500">Confidence</span>
              <p className={`text-lg font-bold ${
                results.HODO_CONF >= 0.7 ? 'text-green-400' :
                results.HODO_CONF >= 0.5 ? 'text-amber-400' : 'text-red-400'
              }`}>{(results.HODO_CONF * 100).toFixed(0)}%</p>
            </div>
          </div>
          
          {/* Loop indicator */}
          {results.HODO_HAS_LOOP && (
            <div className="mt-3 p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-center">
              <span className="text-xs text-purple-400 font-semibold">Loop Detected</span>
            </div>
          )}
        </div>
      )}

      {/* Info Tips */}
      <div className="mt-4 space-y-2">
        <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-amber-400/80">
            <strong>Tip:</strong> 
            <span className="text-slate-400 ml-1">Wait 30-60 seconds for AI analysis results.</span>
          </p>
        </div>
        <div className="p-2.5 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
          <p className="text-xs text-cyan-400/80">
            <strong>What is a hodograph?</strong>
            <span className="text-slate-400 ml-1">Shows wind speed/direction changes with height.</span>
          </p>
        </div>
      </div>
    </div>
  );
}
