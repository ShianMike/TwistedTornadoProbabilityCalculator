import { useState, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import { INPUT_LIMITS } from '../utils/constants';

const inputFields = [
  { id: 'TEMP', label: 'Temperature', unit: '°F', step: 0.1 },
  { id: 'DEWPOINT', label: 'Dewpoint', unit: '°F', step: 0.1 },
  { id: 'CAPE', label: 'CAPE', unit: 'J/kg', step: 1 },
  { id: 'CAPE_3KM', label: '3CAPE', unit: 'J/kg', step: 1 },
  { id: 'LAPSE_RATE_0_3', label: '0-3km Lapse', unit: '°C/km', step: 0.1 },
  { id: 'LAPSE_3_6KM', label: '3-6km Lapse', unit: '°C/km', step: 0.1 },
  { id: 'PWAT', label: 'PWAT', unit: 'in', step: 0.01 },
  { id: 'SRH', label: 'SRH', unit: 'm²/s²', step: 1 },
  { id: 'SURFACE_RH', label: 'Surface RH', unit: '%', step: 1 },
  { id: 'RH_MID', label: '700-500mb RH', unit: '%', step: 1 },
  { id: 'STP', label: 'STP', unit: '', step: 0.1 },
  { id: 'VTP', label: 'VTP', unit: '', step: 0.1 },
  { id: 'STORM_SPEED', label: 'Storm Motion', unit: 'mph', step: 1 },
];

// Parse weather data from OCR text
function parseWeatherData(text) {
  const values = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    const cleanLine = line.replace(/\.{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    if (!cleanLine) continue;
    
    // TEMPERATURE
    if (/TEMPERATURE/i.test(cleanLine)) {
      const match = cleanLine.match(/TEMPERATURE[.\s:]*(\d+\.?\d*)/i);
      if (match) values['TEMP'] = parseFloat(match[1]);
    }
    
    // DEWPOINT
    if (/DEWPOINT/i.test(cleanLine)) {
      const match = cleanLine.match(/DEWPOINT[.\s:]*(\d+\.?\d*)/i);
      if (match) values['DEWPOINT'] = parseFloat(match[1]);
    }
    
    // 3CAPE - check first to avoid conflicts
    if (/3\s*CAPE/i.test(cleanLine)) {
      const match = cleanLine.match(/3\s*CAPE[.\s:]*(\d+\.?\d*)/i);
      if (match) values['CAPE_3KM'] = parseFloat(match[1]);
    }
    
    // CAPE
    if (/\bCAPE\b/i.test(cleanLine)) {
      const match = cleanLine.match(/(?:^|[^3])\s*CAPE[.\s:]*(\d+\.?\d*)/i);
      if (match) values['CAPE'] = parseFloat(match[1]);
    }
    
    // 0-3KM LAPSE
    if (/0[- ]?3\s*KM\s+LAPSE/i.test(cleanLine)) {
      const match = cleanLine.match(/0[- ]?3\s*KM\s+LAPSE[.\s:]*(\d+\.?\d*)/i);
      if (match) values['LAPSE_RATE_0_3'] = parseFloat(match[1]);
    }
    
    // 3-6KM LAPSE
    if (/3[- ]?6\s*KM\s+LAPSE/i.test(cleanLine)) {
      const match = cleanLine.match(/3[- ]?6\s*KM\s+LAPSE[.\s:]*(\d+\.?\d*)/i);
      if (match) values['LAPSE_3_6KM'] = parseFloat(match[1]);
    }
    
    // PWAT
    if (/\bIN\b/i.test(cleanLine)) {
      const inIndex = cleanLine.toUpperCase().indexOf('IN');
      const beforeIn = cleanLine.substring(0, inIndex);
      if (!/SRH/i.test(beforeIn) && !/LAPSE/i.test(beforeIn)) {
        const match = cleanLine.match(/([\d\.]+)\s+IN/i);
        if (match) values['PWAT'] = parseFloat(match[1]);
      }
    }
    
    // SRH
    if (/\bSRH\b/i.test(cleanLine)) {
      const match = cleanLine.match(/\bSRH\b[.\s:]*(\d+\.?\d*)/i);
      if (match) values['SRH'] = parseFloat(match[1]);
    }
    
    // SURFACE RH
    if (/SURFACE\s+RH/i.test(cleanLine)) {
      const match = cleanLine.match(/SURFACE\s+RH[.\s:]*(\d+\.?\d*)/i);
      if (match) values['SURFACE_RH'] = parseFloat(match[1]);
    }
    
    // 700-500MB RH
    if (/700[- ]?500\s*MB\s+RH/i.test(cleanLine)) {
      const match = cleanLine.match(/700[- ]?500\s*MB\s+RH[.\s:]*(\d+\.?\d*)/i);
      if (match) values['RH_MID'] = parseFloat(match[1]);
    }

    // STORM SPEED
    if (/STORM\s+SPEED/i.test(cleanLine)) {
      const match = cleanLine.match(/STORM\s+SPEED[.\s:]*(\d+\.?\d*)/i);
      if (match) values['STORM_SPEED'] = parseFloat(match[1]);
    }

    // STP
    if (/\bSTP\b/i.test(cleanLine)) {
      const match = cleanLine.match(/\bSTP\b[.\s:]*(\d+\.?\d*)/i);
      if (match) values['STP'] = parseFloat(match[1]);
    }
    
    // VTP
    if (/\bVTP\b/i.test(cleanLine)) {
      const match = cleanLine.match(/\bVTP\b[.\s:]*(\d+\.?\d*)/i);
      if (match) values['VTP'] = parseFloat(match[1]);
    }
  }

  return values;
}

export default function InputForm({ data, onChange }) {
  const [previewImage, setPreviewImage] = useState(null);
  const [ocrStatus, setOcrStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState({});

  // Process image with OCR
  const processImage = useCallback(async (imageSrc) => {
    setIsProcessing(true);
    setOcrStatus('Processing image...');

    try {
      const worker = await createWorker('eng');
      
      const result = await worker.recognize(imageSrc);
      const extractedText = result.data.text;
      
      await worker.terminate();
      
      const values = parseWeatherData(extractedText);
      
      if (Object.keys(values).length > 0) {
        // Update all values at once
        onChange(values);
        
        // Highlight filled fields
        setHighlightedFields(values);
        setTimeout(() => setHighlightedFields({}), 2000);
        
        setOcrStatus(`Extracted ${Object.keys(values).length} values!`);
      } else {
        setOcrStatus('No data could be extracted. Try a clearer image.');
      }
    } catch (error) {
      console.error('OCR Error:', error);
      setOcrStatus('Error processing image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [onChange]);

  const handleInputChange = useCallback((id, value) => {
    const limits = INPUT_LIMITS[id];
    let numValue = parseFloat(value);
    
    if (isNaN(numValue)) {
      onChange({ [id]: '' });
      return;
    }
    
    if (limits) {
      numValue = Math.max(limits.min, Math.min(limits.max, numValue));
    }
    
    onChange({ [id]: numValue });
  }, [onChange]);

  const handleImagePaste = useCallback(async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
          const blob = await item.getType(item.types.find(t => t.startsWith('image/')));
          const url = URL.createObjectURL(blob);
          setPreviewImage(url);
          processImage(url);
          break;
        }
      }
    } catch (err) {
      setOcrStatus('Clipboard access denied. Try Ctrl+V instead.');
    }
  }, [processImage]);

  const handleFileUpload = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewImage(url);
      processImage(url);
    }
  }, [processImage]);

  return (
    <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-cyan-500/20">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white">Input Parameters</h2>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {inputFields.map((field) => {
          const limits = INPUT_LIMITS[field.id];
          const value = data[field.id];
          const isOutOfRange = value !== undefined && value !== '' && limits && 
            (Number(value) < limits.min || Number(value) > limits.max);
          
          return (
            <div key={field.id} className="group">
              <label className="block text-xs font-medium text-slate-400 mb-1.5 
                                group-focus-within:text-cyan-400 transition-colors">
                {field.label}
                {field.unit && <span className="text-slate-500 ml-1">({field.unit})</span>}
              </label>
              <input
                type="number"
                step={field.step}
                min={limits?.min}
                max={limits?.max}
                value={value ?? ''}
                onChange={(e) => handleInputChange(field.id, e.target.value)}
                className={`w-full px-3 py-2.5 border 
                           rounded-lg text-white text-sm
                           placeholder:text-slate-500
                           focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/50
                           hover:border-slate-600/50
                           transition-all duration-200
                           ${isOutOfRange 
                             ? 'bg-red-500/20 border-red-500/50' 
                             : highlightedFields[field.id] !== undefined 
                               ? 'bg-green-500/20 border-green-500/50' 
                               : 'bg-slate-800/50 border-slate-700/50'}`}
                placeholder="—"
              />
              {isOutOfRange && (
                <p className="text-xs text-red-400 mt-1">
                  Range: {limits.min} - {limits.max}{limits.unit ? ` ${limits.unit}` : ''}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Image Upload Section */}
      <div className="border-t border-slate-700/50 pt-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
            OCR Input
          </span>
          <div className="flex-1 h-px bg-slate-700/50"></div>
        </div>
        
        <div className="flex gap-2">
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
            onClick={handleImagePaste}
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

        {previewImage && (
          <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 relative">
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-h-32 mx-auto rounded object-contain"
            />
            {isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/70 rounded-lg">
                <div className="flex items-center gap-2 text-cyan-400">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  <span className="text-sm">Processing...</span>
                </div>
              </div>
            )}
          </div>
        )}

        {ocrStatus && (
          <p className={`mt-3 text-xs text-center ${
            ocrStatus.includes('Extracted') ? 'text-green-400' :
            ocrStatus.includes('Error') || ocrStatus.includes('No data') ? 'text-red-400' :
            'text-cyan-400/70'
          }`}>{ocrStatus}</p>
        )}

        {/* Image Layout Tip */}
        <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
          <p className="text-xs font-semibold text-slate-300 mb-2">Image Layout Tip</p>
          <p className="text-xs text-slate-400 mb-3">For best OCR results, snip the thermos like this:</p>
          <div className="flex justify-center">
            <img 
              src="/thermos-example.png" 
              alt="Example of how to capture weather data"
              className="max-h-48 rounded border border-slate-700/50 object-contain"
            />
          </div>
        </div>


      </div>
    </div>
  );
}
