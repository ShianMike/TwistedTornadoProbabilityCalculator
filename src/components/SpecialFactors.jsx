import { useMemo } from 'react';

// Categorize factors
const TORNADO_FACTORS = ['Multiple Vortices', 'Dust Vortices', 'Long-Track', 'Dust Field'];
const WEATHER_FACTORS = ['Rain-Wrapped', 'Large Hail', 'Frequent Lightning'];

// SVG icons for each factor
const FactorIcon = ({ name, className = "w-5 h-5" }) => {
  const icons = {
    'Rain-Wrapped': (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    'Large Hail': (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
    'Multiple Vortices': (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    'Dust Vortices': (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    'Dust Field': (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    'Long-Track': (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    'Frequent Lightning': (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  };
  
  return icons[name] || (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
};

const factorColors = {
  'Rain-Wrapped': { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', icon: 'text-blue-400' },
  'Large Hail': { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', icon: 'text-cyan-400' },
  'Multiple Vortices': { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', icon: 'text-purple-400' },
  'Dust Vortices': { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: 'text-amber-400' },
  'Dust Field': { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: 'text-yellow-400' },
  'Long-Track': { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: 'text-red-400' },
  'Frequent Lightning': { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', icon: 'text-orange-400' }
};

// Descriptions for each factor
const factorDescriptions = {
  // Tornado Characteristics
  'Multiple Vortices': 'The tornado contains multiple sub-vortices rotating around the main circulation, often seen in violent tornadoes. Can cause erratic damage patterns.',
  'Dust Vortices': 'Small secondary vortices or debris swirls visible around the main tornado, indicating strong surface-level rotation and turbulence.',
  'Long-Track': 'The tornado is likely to travel a significant distance (10+ miles) before dissipating, often associated with supercell storms with persistent mesocyclones.',
  'Dust Field': 'A large area of dust and debris is being lifted around the tornado, indicating strong inflow winds and surface interaction. Common in dry conditions.',
  
  // Weather Conditions
  'Rain-Wrapped': 'The tornado is obscured by heavy rain, making it difficult to see. Very dangerous as the tornado may not be visible until it is very close.',
  'Large Hail': 'Significant hail (1"+ diameter) is likely with this storm. Often occurs in the same region as tornadoes, can cause vehicle and structural damage.',
  'Frequent Lightning': 'The storm is producing frequent lightning strikes, indicating strong updraft and electrical activity within the supercell.'
};

const FactorCard = ({ factor }) => {
  const colors = factorColors[factor.name] || { 
    bg: 'bg-slate-500/10', 
    border: 'border-slate-500/30', 
    text: 'text-slate-400',
    icon: 'text-slate-400'
  };
  
  const description = factorDescriptions[factor.name];
  
  const getChanceLevel = (chance) => {
    if (chance >= 70) return 'HIGH';
    if (chance >= 40) return 'MODERATE';
    return 'LOW';
  };

  const chanceLevel = getChanceLevel(factor.chance);
  
  return (
    <div className={`group relative overflow-hidden p-4 rounded-xl ${colors.bg} 
                     border ${colors.border} transition-all duration-300
                     hover:scale-[1.02] hover:shadow-lg cursor-help`}>
      <div className="relative flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colors.bg} ${colors.icon}`}>
            <FactorIcon name={factor.name} className="w-5 h-5" />
          </div>
          <div>
            <h4 className={`font-semibold ${colors.text}`}>{factor.name}</h4>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
              chanceLevel === 'HIGH' ? 'bg-red-500/20 text-red-400' :
              chanceLevel === 'MODERATE' ? 'bg-amber-500/20 text-amber-400' :
              'bg-slate-500/20 text-slate-400'
            }`}>
              {chanceLevel}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          <span className="text-2xl font-black text-white">{factor.chance}</span>
          <span className="text-sm text-slate-400">%</span>
        </div>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-500 ${
            factor.chance >= 70 ? 'bg-red-500' :
            factor.chance >= 40 ? 'bg-amber-500' :
            'bg-slate-500'
          }`}
          style={{ width: `${factor.chance}%` }}
        />
      </div>
      
      {/* Tooltip on hover - positioned inside card */}
      {description && (
        <div className="grid transition-all duration-300 ease-out
                        grid-rows-[0fr] group-hover:grid-rows-[1fr]">
          <div className="overflow-hidden">
            <p className="text-xs text-slate-400 leading-relaxed mt-3 pt-2 border-t border-slate-700/30">
              {description}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Tornado Characteristics Component
export function TornadoCharacteristics({ factors }) {
  const tornadoFactors = useMemo(() => {
    if (!factors) return [];
    return factors
      .filter(f => TORNADO_FACTORS.includes(f.name))
      .sort((a, b) => b.chance - a.chance);
  }, [factors]);

  if (tornadoFactors.length === 0) {
    return (
      <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-purple-500/20">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Tornado Characteristics</h2>
        </div>
        <div className="flex items-center justify-center min-h-[100px] text-slate-500">
          <p>No tornado characteristics detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-purple-500/20">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white">Tornado Characteristics</h2>
        <span className="ml-auto px-2 py-1 rounded-full bg-purple-500/20 text-xs text-purple-400">
          {tornadoFactors.length} detected
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {tornadoFactors.map((factor) => (
          <FactorCard key={factor.name} factor={factor} />
        ))}
      </div>
    </div>
  );
}

// Weather Conditions Component
export function WeatherConditions({ factors }) {
  const weatherFactors = useMemo(() => {
    if (!factors) return [];
    return factors
      .filter(f => WEATHER_FACTORS.includes(f.name))
      .sort((a, b) => b.chance - a.chance);
  }, [factors]);

  if (weatherFactors.length === 0) {
    return (
      <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-cyan-500/20">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Weather Conditions</h2>
        </div>
        <div className="flex items-center justify-center min-h-[100px] text-slate-500">
          <p>No weather conditions detected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-lg bg-cyan-500/20">
          <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-white">Weather Conditions</h2>
        <span className="ml-auto px-2 py-1 rounded-full bg-cyan-500/20 text-xs text-cyan-400">
          {weatherFactors.length} detected
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {weatherFactors.map((factor) => (
          <FactorCard key={factor.name} factor={factor} />
        ))}
      </div>
    </div>
  );
}

// Legacy default export for backward compatibility
export default function SpecialFactors({ factors }) {
  return (
    <>
      <TornadoCharacteristics factors={factors} />
      <WeatherConditions factors={factors} />
    </>
  );
}
