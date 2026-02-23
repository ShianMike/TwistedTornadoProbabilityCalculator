import { useMemo } from 'react';
import { TORNADO_TYPES, TORNADO_DESCRIPTIONS } from '../utils/constants';

const colorForValue = (value) => {
  const stops = [
    { v: 0, c: [100, 116, 139] },    // Slate
    { v: 15, c: [59, 130, 246] },    // Blue
    { v: 30, c: [16, 185, 129] },    // Emerald
    { v: 50, c: [251, 191, 36] },    // Amber
    { v: 70, c: [249, 115, 22] },    // Orange
    { v: 100, c: [239, 68, 68] }     // Red
  ];
  
  const pct = Math.max(0, Math.min(100, value));
  
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i], b = stops[i + 1];
    if (pct >= a.v && pct <= b.v) {
      const t = (pct - a.v) / (b.v - a.v);
      const r = Math.round(a.c[0] + (b.c[0] - a.c[0]) * t);
      const g = Math.round(a.c[1] + (b.c[1] - a.c[1]) * t);
      const bl = Math.round(a.c[2] + (b.c[2] - a.c[2]) * t);
      return `rgb(${r},${g},${bl})`;
    }
  }
  return 'rgb(239, 68, 68)';
};

const ProbabilityBar = ({ type, probability, isTop, maxProbability }) => {
  const typeInfo = TORNADO_TYPES[type] || { name: type, color: '#64748b' };
  const description = TORNADO_DESCRIPTIONS[type] || '';
  
  // Scale width relative to max probability so bars appear longer
  // Minimum 8% width so small values are still visible
  const scaledWidth = maxProbability > 0 
    ? Math.max(8, (probability / maxProbability) * 100)
    : probability;
  
  return (
    <div className="group relative">
      <div className="flex items-center gap-4 mb-3">
        <span className={`text-sm font-semibold min-w-[90px] ${
          isTop ? 'text-white' : 'text-slate-300'
        }`}>
          {typeInfo.name}
        </span>
        <div className="flex-1 h-8 bg-slate-800/50 rounded-lg overflow-hidden relative">
          {/* Background bar */}
          <div 
            className="absolute inset-y-0 left-0 transition-all duration-500 ease-out rounded-lg"
            style={{ 
              width: `${scaledWidth}%`,
              background: colorForValue(probability)
            }}
          />
          
          {/* Highlight effect for top result */}
          {isTop && probability > 0 && (
            <div 
              className="absolute inset-y-0 left-0 bg-white/10"
              style={{ width: `${scaledWidth}%` }}
            />
          )}
        </div>
        <span className={`text-sm font-bold min-w-[45px] text-right ${
          isTop ? 'text-white' : 'text-slate-400'
        }`}>
          {probability}%
        </span>
      </div>
      
      {/* Hover tooltip */}
      <div className="absolute left-24 bottom-full mb-2 w-56 p-3 rounded-lg 
                      bg-slate-800 border border-slate-700 shadow-xl
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-200 z-50 pointer-events-none">
        <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
      </div>
    </div>
  );
};

export default function ProbabilityChart({ types }) {
  const sortedTypes = useMemo(() => {
    if (!types) return [];
    return [...types].sort((a, b) => b.Prob - a.Prob);
  }, [types]);

  const topType = sortedTypes[0];

  if (!types || types.length === 0) {
    return (
      <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60 flex items-center justify-center min-h-[300px]">
        <p className="text-slate-500">No probability data available</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-rose-500/20">
          <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white">Tornado Morphology Probability</h2>
      </div>

      {/* Top Result Card */}
      {topType && topType.Prob > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-cyan-500/10
                        border border-cyan-500/20">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wide">Most Likely</span>
              <h3 className="text-2xl font-black text-cyan-400">
                {TORNADO_TYPES[topType.Type]?.name || topType.Type}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-4xl font-black text-white">{topType.Prob}</span>
              <span className="text-xl text-slate-400">%</span>
            </div>
          </div>
        </div>
      )}

      {/* Probability Bars */}
      <div className="space-y-3">
        {sortedTypes.map((item, index) => (
          <ProbabilityBar 
            key={item.Type}
            type={item.Type}
            probability={item.Prob}
            isTop={index === 0}
            maxProbability={topType?.Prob || 100}
          />
        ))}
      </div>
    </div>
  );
}
