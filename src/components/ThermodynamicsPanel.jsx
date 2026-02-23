import { useMemo } from 'react';
import { THERMO_DESCRIPTIONS } from '../utils/constants';

const StatRow = ({ label, value, unit, description }) => (
  <div className="group relative flex justify-between items-baseline py-2 px-3 
                  rounded-lg hover:bg-slate-700/30 transition-colors cursor-help">
    <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-base font-bold text-white">{value ?? '—'}</span>
      {unit && <span className="text-xs text-slate-500">{unit}</span>}
    </div>
    
    {/* Tooltip */}
    {description && (
      <div className="absolute bottom-full left-0 mb-2 w-64 p-3 rounded-lg 
                      bg-slate-800 border border-slate-700 shadow-xl
                      opacity-0 invisible group-hover:opacity-100 group-hover:visible
                      transition-all duration-200 z-50 pointer-events-none">
        <p className="text-xs text-slate-300 leading-relaxed">{description}</p>
      </div>
    )}
  </div>
);

const WindBar = ({ estimate }) => {
  if (!estimate || estimate.est_max === 0) {
    return (
      <div className="h-10 rounded-lg bg-slate-800/50 flex items-center justify-center">
        <span className="text-sm text-slate-500">No wind estimate</span>
      </div>
    );
  }

  const maxWind = 500; // Scale max
  const minPct = Math.min(100, (estimate.est_min / maxWind) * 100);
  const maxPct = Math.min(100, (estimate.est_max / maxWind) * 100);

  return (
    <div className="space-y-2">
      {/* Container */}
      <div className="relative h-10 rounded-lg overflow-hidden bg-slate-800">
        {/* Full gradient background - colors aligned to 500 scale */}
        {/* 65=13%, 86=17%, 111=22%, 136=27%, 166=33%, 200=40%, 300=60% */}
        <div 
          className="absolute inset-y-0 left-0 rounded-l-lg"
          style={{
            width: `${maxPct}%`,
            background: 'linear-gradient(to right, #64748b 0%, #3b82f6 13%, #22c55e 17%, #eab308 22%, #f97316 27%, #ef4444 33%, #ec4899 40%, #a855f7 60%, #7c3aed 100%)'
          }}
        />
        
        {/* Range highlight box - white borders indicating min-max range */}
        <div 
          className="absolute inset-y-0 border-l-4 border-r-4 border-white"
          style={{ left: `${minPct}%`, width: `${Math.max(2, maxPct - minPct)}%` }}
        />
        
        {/* Label centered in range */}
        <div 
          className="absolute inset-y-0 flex items-center justify-center pointer-events-none"
          style={{ left: `${minPct}%`, width: `${Math.max(2, maxPct - minPct)}%` }}
        >
          <span className="text-sm font-bold text-white drop-shadow-lg px-2 py-0.5 bg-black/50 rounded whitespace-nowrap">
            {estimate.est_min} - {estimate.est_max} mph
          </span>
        </div>
      </div>
      
      {/* Scale markers - positioned at actual percentages */}
      <div className="relative h-4 text-[10px]">
        <span className="absolute text-slate-500" style={{ left: '0%' }}>0</span>
        <span className="absolute text-blue-400" style={{ left: '13%' }}>65</span>
        <span className="absolute text-yellow-400" style={{ left: '22%' }}>111</span>
        <span className="absolute text-orange-400" style={{ left: '27%' }}>136</span>
        <span className="absolute text-red-400" style={{ left: '33%' }}>166</span>
        <span className="absolute text-pink-400" style={{ left: '40%' }}>200</span>
        <span className="absolute text-purple-400" style={{ left: '60%' }}>300</span>
        <span className="absolute text-slate-500" style={{ left: '97%' }}>500</span>
      </div>
    </div>
  );
};

export default function ThermodynamicsPanel({ data, windEstimate, hodographData }) {
  const displayData = useMemo(() => ({
    TEMP: data.TEMP,
    DEWPOINT: data.DEWPOINT,
    CAPE: data.CAPE,
    CAPE_3KM: data.CAPE_3KM,
    LAPSE_RATE_0_3: data.LAPSE_RATE_0_3,
    LAPSE_3_6KM: data.LAPSE_3_6KM,
    PWAT: data.PWAT,
    SRH: data.SRH,
    SURFACE_RH: data.SURFACE_RH,
    RH_MID: data.RH_MID,
    STP: data.STP,
    VTP: data.VTP,
  }), [data]);

  return (
    <div className="glass-card p-6 backdrop-blur-xl bg-slate-900/60">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Thermodynamics</h2>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Left Column */}
        <div className="space-y-1 bg-slate-800/30 rounded-xl p-3">
          <StatRow 
            label="Temperature" 
            value={displayData.TEMP} 
            unit="°F" 
            description={THERMO_DESCRIPTIONS.TEMP}
          />
          <StatRow 
            label="CAPE" 
            value={displayData.CAPE} 
            unit="J/kg" 
            description={THERMO_DESCRIPTIONS.CAPE}
          />
          <StatRow 
            label="0-3km Lapse" 
            value={displayData.LAPSE_RATE_0_3} 
            unit="°C/km" 
            description={THERMO_DESCRIPTIONS.LAPSE_RATE_0_3}
          />
          <StatRow 
            label="PWAT" 
            value={displayData.PWAT} 
            unit="in" 
            description={THERMO_DESCRIPTIONS.PWAT}
          />
          <StatRow 
            label="Surface RH" 
            value={displayData.SURFACE_RH} 
            unit="%" 
            description={THERMO_DESCRIPTIONS.SURFACE_RH}
          />
          <StatRow 
            label="STP" 
            value={displayData.STP ? Math.round(displayData.STP) : null} 
            description={THERMO_DESCRIPTIONS.STP}
          />
        </div>

        {/* Right Column */}
        <div className="space-y-1 bg-slate-800/30 rounded-xl p-3">
          <StatRow 
            label="Dewpoint" 
            value={displayData.DEWPOINT} 
            unit="°F" 
            description={THERMO_DESCRIPTIONS.DEWPOINT}
          />
          <StatRow 
            label="3CAPE" 
            value={displayData.CAPE_3KM} 
            unit="J/kg" 
            description={THERMO_DESCRIPTIONS.CAPE_3KM}
          />
          <StatRow 
            label="3-6km Lapse" 
            value={displayData.LAPSE_3_6KM} 
            unit="°C/km" 
            description={THERMO_DESCRIPTIONS.LAPSE_3_6KM}
          />
          <StatRow 
            label="SRH" 
            value={displayData.SRH} 
            unit="m²/s²" 
            description={THERMO_DESCRIPTIONS.SRH}
          />
          <StatRow 
            label="700-500mb RH" 
            value={displayData.RH_MID} 
            unit="%" 
            description={THERMO_DESCRIPTIONS.RH_MID}
          />
          <StatRow 
            label="VTP" 
            value={displayData.VTP ? Math.round(displayData.VTP) : null}
            description={THERMO_DESCRIPTIONS.VTP}
          />
        </div>
      </div>

      {/* Wind Estimate Section */}
      <div className="border-t border-slate-700/50 pt-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg bg-red-500/20">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Peak Wind Speed</h3>
            <p className="text-xs text-slate-500">Estimated at most intense point</p>
          </div>
        </div>
        
        <WindBar estimate={windEstimate} />

        {/* Theoretical Maximum */}
        {windEstimate?.theoretical && (
          <div className="mt-4 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
                <span className="text-sm font-semibold text-purple-400">Theoretical Maximum</span>
              </div>
              <span className="text-lg font-bold text-white">
                {windEstimate.theoretical.theo_min} - {windEstimate.theoretical.theo_max_display} mph
              </span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              The theoretical maximum represents the <strong className="text-purple-400">absolute upper limit</strong> of 
              wind speeds possible under perfect atmospheric conditions. Actual winds rarely reach this ceiling.
            </p>
          </div>
        )}

        {/* Wind Guide */}
        {windEstimate && windEstimate.est_max > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
            <p className="text-xs text-slate-400 leading-relaxed">
              <strong className="text-slate-300">Peak Wind Speed:</strong> The estimated range represents 
              the <strong className="text-slate-300">maximum wind intensity</strong> at the tornado's strongest point. 
              This is the peak value, not sustained or average winds. Colors correspond to typical intensity thresholds 
              used in damage surveys.
            </p>
          </div>
        )}

        {/* Hodograph Hazards */}
        {hodographData && hodographData.HODO_CONF >= 0.6 && (
          <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 
                          border border-purple-500/20">
            <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-300 mb-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Hodograph Hazard Analysis
            </h4>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-2xl">🧊</span>
                <p className="text-xs text-slate-400 mt-1">Max Hail Size</p>
                <p className="text-sm font-bold text-white">2.0" - 3.5"</p>
              </div>
              <div>
                <span className="text-2xl">💨</span>
                <p className="text-xs text-slate-400 mt-1">Max Wind Gust</p>
                <p className="text-sm font-bold text-white">80+ mph</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
