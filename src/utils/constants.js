/**
 * Tornado Type Constants and Descriptions
 */

export const TORNADO_TYPES = {
  ROPE: {
    name: 'Rope',
    description: 'Thin, weak tornado often in marginal conditions or during decay phase.',
    color: '#6b7280'
  },
  CONE: {
    name: 'Cone',
    description: 'Classic funnel shape with balanced morphology. Most common type.',
    color: '#3b82f6'
  },
  STOVEPIPE: {
    name: 'Stovepipe',
    description: 'Cylindrical, strong tornado with tight core. Often violent.',
    color: '#10b981'
  },
  WEDGE: {
    name: 'Wedge',
    description: 'Very wide tornado (>0.5 mile). Associated with violent supercells.',
    color: '#f97316'
  },
  DRILLBIT: {
    name: 'Drillbit',
    description: 'Fast-moving, narrow tornado in dry environments.',
    color: '#fbbf24'
  },
  SIDEWINDER: {
    name: 'Sidewinder',
    description: 'Fast-moving with kinked hodograph and lateral translation.',
    color: '#ef4444'
  }
};

export const TORNADO_DESCRIPTIONS = {
  SIDEWINDER: 'Fast-moving, kinked/elongated hodograph tornado.',
  STOVEPIPE: 'Very narrow, violent tornado with tight core.',
  WEDGE: 'Wide, rain-fed tornado with broad circulation.',
  DRILLBIT: 'Fast-moving, narrow tornado in dry environment.',
  CONE: 'Classic mid-range tornado with balanced morphology.',
  ROPE: 'Weak, decaying funnel in low-CAPE environments.'
};

export const EF_SCALE = {
  EF0: { min: 65, max: 85, color: '#6b7280', label: 'EF0' },
  EF1: { min: 86, max: 110, color: '#3b82f6', label: 'EF1' },
  EF2: { min: 111, max: 135, color: '#10b981', label: 'EF2' },
  EF3: { min: 136, max: 165, color: '#fbbf24', label: 'EF3' },
  EF4: { min: 166, max: 200, color: '#f97316', label: 'EF4' },
  EF5: { min: 200, max: 400, color: '#ef4444', label: 'EF5' }
};

export const INPUT_LIMITS = {
  TEMP: { min: 15, max: 140, unit: '°F', label: 'Temperature' },
  DEWPOINT: { min: 15, max: 120, unit: '°F', label: 'Dewpoint' },
  CAPE: { min: 0, max: 10226, unit: 'J/kg', label: 'CAPE' },
  CAPE_3KM: { min: 0, max: 300, unit: 'J/kg', label: '3CAPE' },
  LAPSE_RATE_0_3: { min: 0, max: 12, unit: '°C/km', label: '0-3km Lapse Rate' },
  LAPSE_3_6KM: { min: 0, max: 10, unit: '°C/km', label: '3-6km Lapse Rate' },
  PWAT: { min: 0.1, max: 2.5, unit: 'in', label: 'PWAT' },
  SRH: { min: 0, max: 1000, unit: 'm²/s²', label: 'SRH' },
  SURFACE_RH: { min: 0, max: 100, unit: '%', label: 'Surface RH' },
  RH_MID: { min: 0, max: 100, unit: '%', label: '700-500mb RH' },
  STP: { min: 0, max: 64, unit: '', label: 'STP' },
  VTP: { min: 0, max: 16, unit: '', label: 'VTP' },
  STORM_SPEED: { min: 0, max: 200, unit: 'mph', label: 'Storm Motion' }
};

export const THERMO_DESCRIPTIONS = {
  TEMP: 'Temperature shows the temperature of the atmosphere at the surface. Higher temperatures provide warm air to feed developing mesocyclones in supercells.',
  CAPE: 'CAPE (Convective Available Potential Energy) is the measure of potential energy for thunderstorms to develop. Higher CAPE indicates stronger instability and higher potential for strong storms and tornadoes.',
  LAPSE_RATE_0_3: '0-3KM Lapse Rate: Temperature change per kilometer from the surface to 3 km. A steeper (larger) lapse rate indicates stronger low-level instability and contributes to tornado intensity.',
  PWAT: 'PWAT (Precipitable Water) is the total water vapor in a column of air. Higher PWAT increases potential for heavy rainfall, reduced visibility, larger hail, and rain-wrapped tornadoes.',
  SURFACE_RH: 'Surface Relative Humidity (RH) shows the moisture content near the ground. Higher surface RH supports storm development and intensification.',
  DEWPOINT: 'Dew Point indicates the temperature at which air becomes saturated and water condenses. Higher dew points are crucial for storm development.',
  CAPE_3KM: '3CAPE shows CAPE for the lowest 3 km; it helps represent surface-based instability most relevant to tornadic development.',
  LAPSE_3_6KM: '3-6KM Lapse Rate: Temperature change per kilometer from 3 km to 6 km. Contributes to hail and lightning intensity.',
  SRH: 'SRH (Storm-Relative Helicity) measures how much the air within a storm is spinning relative to storm motion. High SRH is a major contributor to strong tornado potential.',
  RH_MID: '700-500 mb RH shows mid-level moisture. High mid-level RH supports storm maintenance.',
  STP: 'Significant Tornado Parameter combines instability (CAPE), shear (SRH), and moisture (PWAT). Higher STP indicates greater potential for significant tornadoes.',
  VTP: 'Violent Tornado Parameter emphasizes extreme instability and low-level rotation. Higher VTP suggests potential for violent (EF4-EF5) tornadoes.',
  STORM_SPEED: 'Storm Motion speed affects tornado morphology. Faster storms tend to produce drillbit or sidewinder types.'
};
