/**
 * TORNADO CALCULATIONS MODULE (React Version)
 * Empirical regression model calibrated on tornado event data
 * Uses weighted feature contributions + hodograph geometry integration
 */

// ========================================================================
// EMPIRICAL REGRESSION MODEL
// ========================================================================
const EMPIRICAL_MODEL = {
  normRanges: {
    CAPE: 7000,
    SRH: 800,
    LAPSE_0_3: 12,
    LAPSE_3_6: 12,
    CAPE_3KM: 5000,
    TVS_PEAKS: 8
  },
  weights: {
    LAPSE_3_6: 44,
    LAPSE_0_3: 42,
    SRH: 40,
    CAPE_3KM: 36,
    CAPE: 38,
    TVS_PEAKS: 39
  },
  baseWind: 105
};

const BAROCLINIC_BETA = 1.2;
const BAROCLINIC_H_EFF_KM = 6;

/**
 * Estimate forcing proxy from available meteorological data
 */
function estimateForcingProxy(data) {
  if (data.GRAD_TX !== undefined && data.GRAD_TZ !== undefined) {
    return { GRAD_TX: data.GRAD_TX, GRAD_TZ: data.GRAD_TZ };
  }

  const TEMP = data.TEMP || 0;
  const DEWPOINT = data.DEWPOINT || 0;
  const STORM_SPEED = data.STORM_SPEED || 0;
  const SRH = data.SRH || 0;
  const LAPSE_RATE_0_3 = data.LAPSE_RATE_0_3 || 0;
  const DEW_SPREAD = Math.max(0, TEMP - DEWPOINT);

  let forcingMagnitude = 0;
  if (DEW_SPREAD > 5) forcingMagnitude += (DEW_SPREAD / 2000);
  if (STORM_SPEED > 50) forcingMagnitude += ((STORM_SPEED - 50) / 5000);
  if (SRH > 300) forcingMagnitude += ((SRH - 300) / 50000);
  if (LAPSE_RATE_0_3 > 8) forcingMagnitude += ((LAPSE_RATE_0_3 - 8) / 1000);
  forcingMagnitude = Math.min(0.015, forcingMagnitude);

  return { GRAD_TX: forcingMagnitude * 0.6, GRAD_TZ: forcingMagnitude * 0.4 };
}

/**
 * Compute baroclinic forcing proxy (returns mph-equivalent)
 */
export function computeBaroclinicProxy(data) {
  const estimated = estimateForcingProxy(data);
  const gradMag = Math.sqrt(estimated.GRAD_TX ** 2 + estimated.GRAD_TZ ** 2);
  const gradKperkm = gradMag * 1000.0;
  const dV_ms = BAROCLINIC_BETA * BAROCLINIC_H_EFF_KM * gradKperkm;
  return dV_ms * 2.23694;
}

/**
 * Predict windspeed using empirical weighted regression
 */
export function predictWindspeedEmpirical(data) {
  const M = EMPIRICAL_MODEL;
  
  const capeNorm = Math.min(1.0, (data.CAPE || 0) / M.normRanges.CAPE);
  const srhNorm = Math.min(1.0, (data.SRH || 0) / M.normRanges.SRH);
  const lapseNorm = Math.min(1.0, (data.LAPSE_RATE_0_3 || 0) / M.normRanges.LAPSE_0_3);
  const lapseHighNorm = Math.min(1.0, (data.LAPSE_RATE_3_6 || 0) / M.normRanges.LAPSE_3_6);
  const cape3Norm = Math.min(1.0, (data.CAPE_3KM || 0) / M.normRanges.CAPE_3KM);
  const tvsNorm = Math.min(1.0, (data.TVS_PEAKS || 0) / M.normRanges.TVS_PEAKS);
  
  let prediction = M.baseWind;
  prediction += lapseHighNorm * M.weights.LAPSE_3_6;
  prediction += lapseNorm * M.weights.LAPSE_0_3;
  prediction += srhNorm * M.weights.SRH;
  prediction += cape3Norm * M.weights.CAPE_3KM;
  prediction += capeNorm * M.weights.CAPE;
  prediction += tvsNorm * M.weights.TVS_PEAKS;
  
  const baroclinicBonus = computeBaroclinicProxy(data) * 0.15;
  prediction += baroclinicBonus;
  prediction *= 1.2;
  
  return Math.max(50, Math.min(400, prediction));
}

/**
 * Calculate tornado morphology probabilities
 */
export function calculateProbabilities(data, hodographData = null) {
  const CAPE = data.CAPE || 0;
  const SRH = data.SRH || 0;
  const PWAT = data.PWAT || 0;
  const LAPSE_RATE_0_3 = data.LAPSE_RATE_0_3 || 0;
  const TEMP = data.TEMP || 0;
  const DEWPOINT = data.DEWPOINT || 0;
  const SURFACE_RH = data.SURFACE_RH || 0;
  const STORM_SPEED = data.STORM_SPEED || 0;
  const CAPE_3KM = data.CAPE_3KM || 0;
  const RH_MID = data.RH_MID || 0;

  let STP, VTP;
  if (data.STP !== undefined && data.STP !== null && data.STP !== '') {
    STP = Math.min(64, Math.max(0, parseFloat(data.STP)));
  } else {
    STP = Math.min(64, Math.max(0, (CAPE / 1500) * (SRH / 150) * (PWAT / 1.5) * 10));
  }
  
  if (data.VTP !== undefined && data.VTP !== null && data.VTP !== '') {
    VTP = Math.min(16, Math.max(0, parseFloat(data.VTP)));
  } else {
    VTP = Math.min(16, Math.max(0, (CAPE / 2000) * (SRH / 200) * (LAPSE_RATE_0_3 / 9) * 5));
  }

  const DEW_SPREAD = Math.max(0, TEMP - DEWPOINT);

  // Hodograph integration
  const hodo = hodographData || {};
  const hodoConf = typeof hodo.HODO_CONF === 'number' ? hodo.HODO_CONF : 0;
  const useHodo = hodoConf >= 0.6;
  
  const HODO_CURVATURE = useHodo && typeof hodo.HODO_CURVATURE === 'number' ? hodo.HODO_CURVATURE : 1.0;
  const HODO_TURNING = useHodo && typeof hodo.HODO_TURNING === 'number' ? hodo.HODO_TURNING : 0;
  const HODO_KINK = useHodo && typeof hodo.HODO_KINK === 'number' ? hodo.HODO_KINK : 0;
  const HODO_EXTENSION = useHodo && typeof hodo.HODO_EXTENSION === 'number' ? hodo.HODO_EXTENSION : 0.5;
  const HODO_COMPACTNESS = useHodo && typeof hodo.HODO_COMPACTNESS === 'number' ? hodo.HODO_COMPACTNESS : 0.5;
  const HODO_HAS_LOOP = useHodo && typeof hodo.HODO_HAS_LOOP === 'boolean' ? hodo.HODO_HAS_LOOP : false;

  const baroclinic_mph = computeBaroclinicProxy(data);

  let scores = {
    ROPE: 0,
    CONE: 0,
    STOVEPIPE: 0,
    WEDGE: 0,
    DRILLBIT: 0,
    SIDEWINDER: 0
  };

  // ROPE TORNADOES
  if (CAPE < 2500) scores.ROPE += 40;
  if (CAPE < 1500) scores.ROPE += 30;
  if (STP < 4) scores.ROPE += 35;
  if (STP < 2) scores.ROPE += 25;
  if (SRH < 250) scores.ROPE += 30;
  if (SRH < 150) scores.ROPE += 20;
  if (VTP < 1.5) scores.ROPE += 25;
  if (LAPSE_RATE_0_3 < 7) scores.ROPE += 20;
  if (PWAT < 1.0) scores.ROPE += 15;
  if (SURFACE_RH < 60) scores.ROPE += 15;
  if (CAPE < 2000 && SRH < 200 && VTP < 1) scores.ROPE += 30;
  scores.ROPE += 8;

  // CONE TORNADOES
  if (CAPE > 2500 && CAPE < 5000) scores.CONE += 35;
  if (CAPE > 4000 && CAPE < 7000) scores.CONE += 25;
  if (SRH > 200 && SRH < 500) scores.CONE += 30;
  if (SRH > 400 && SRH < 700) scores.CONE += 20;
  if (LAPSE_RATE_0_3 > 7 && LAPSE_RATE_0_3 < 9.5) scores.CONE += 25;
  if (LAPSE_RATE_0_3 > 9) scores.CONE += 15;
  if (STP > 5 && STP < 20) scores.CONE += 30;
  if (STP > 15 && STP < 25) scores.CONE += 15;
  if (VTP > 2 && VTP < 7) scores.CONE += 20;
  if (PWAT > 1.0 && PWAT < 1.8) scores.CONE += 15;
  if (SURFACE_RH > 50 && SURFACE_RH < 75) scores.CONE += 10;
  if (STORM_SPEED > 40 && STORM_SPEED < 70) scores.CONE += 10;
  if (CAPE > 3000 && SRH > 250 && VTP > 3 && VTP < 6) scores.CONE += 20;
  if (CAPE > 5000 && SRH > 500) scores.CONE += 25;

  // WEDGE TORNADOES
  if (PWAT > 1.6) scores.WEDGE += 60;
  if (PWAT > 2.0) scores.WEDGE += 50;
  if (SURFACE_RH > 75) scores.WEDGE += 45;
  if (RH_MID > 80) scores.WEDGE += 40;
  if (RH_MID > 90) scores.WEDGE += 30;
  if (DEW_SPREAD < 10) scores.WEDGE += 35;
  if (STORM_SPEED < 50) scores.WEDGE += 40;
  if (STORM_SPEED < 40) scores.WEDGE += 30;
  if (CAPE > 3000) scores.WEDGE += 30;
  if (CAPE > 6000) scores.WEDGE += 45;
  if (CAPE > 7000) scores.WEDGE += 35;
  if (STP > 10) scores.WEDGE += 30;
  if (STP > 15) scores.WEDGE += 25;
  if (CAPE_3KM > 80) scores.WEDGE += 25;
  if (VTP > 5) scores.WEDGE += 25;
  if (PWAT > 1.8 && SURFACE_RH > 80 && STORM_SPEED < 45) scores.WEDGE += 45;
  if (CAPE > 6500 && SRH > 500 && VTP > 4) scores.WEDGE += 50;
  if (STORM_SPEED > 70) scores.WEDGE -= 25;
  if (PWAT < 1.2 && CAPE < 5000) scores.WEDGE -= 30;
  if (DEW_SPREAD > 15 && CAPE < 6000) scores.WEDGE -= 20;

  // STOVEPIPE TORNADOES
  if (VTP > 6) scores.STOVEPIPE += 45;
  if (VTP > 9) scores.STOVEPIPE += 35;
  if (LAPSE_RATE_0_3 > 8.5) scores.STOVEPIPE += 40;
  if (LAPSE_RATE_0_3 > 9.5) scores.STOVEPIPE += 30;
  if (CAPE > 4000) scores.STOVEPIPE += 35;
  if (CAPE > 5500) scores.STOVEPIPE += 25;
  if (CAPE > 6500) scores.STOVEPIPE += 30;
  if (SRH > 400) scores.STOVEPIPE += 30;
  if (SRH > 600) scores.STOVEPIPE += 20;
  if (STP > 15) scores.STOVEPIPE += 25;
  if (STP > 18) scores.STOVEPIPE += 20;
  if (CAPE_3KM > 100) scores.STOVEPIPE += 15;
  if (PWAT > 1.0 && PWAT < 1.7) scores.STOVEPIPE += 15;
  if (VTP > 7 && SRH > 500 && CAPE > 4500) scores.STOVEPIPE += 30;
  if (CAPE > 6000 && SRH > 500) scores.STOVEPIPE += 35;
  if (PWAT > 2.0) scores.STOVEPIPE -= 20;

  // DRILLBIT TORNADOES
  if (STORM_SPEED > 70) scores.DRILLBIT += 35;
  if (STORM_SPEED > 85) scores.DRILLBIT += 25;
  if (PWAT < 1.3) scores.DRILLBIT += 30;
  if (PWAT < 1.0) scores.DRILLBIT += 20;
  if (PWAT < 0.5) scores.DRILLBIT += 15;
  if (DEW_SPREAD > 15) scores.DRILLBIT += 20;
  if (DEW_SPREAD > 20) scores.DRILLBIT += 10;
  if (SURFACE_RH < 60) scores.DRILLBIT += 15;
  if (SURFACE_RH < 50) scores.DRILLBIT += 10;
  if (SRH > 400) scores.DRILLBIT += 20;
  if (SRH > 600) scores.DRILLBIT += 15;
  if (CAPE > 3000 && CAPE < 5500) scores.DRILLBIT += 15;
  if (CAPE > 5000) scores.DRILLBIT += 20;
  if (VTP > 4) scores.DRILLBIT += 10;
  if (STORM_SPEED > 80 && PWAT < 1.2 && DEW_SPREAD > 12) scores.DRILLBIT += 30;
  if (PWAT < 0.5 && CAPE > 4000 && SRH > 500) scores.DRILLBIT += 30;

  // SIDEWINDER TORNADOES
  if (STORM_SPEED > 55) scores.SIDEWINDER += 30;
  if (STORM_SPEED > 70) scores.SIDEWINDER += 25;
  if (STORM_SPEED > 85) scores.SIDEWINDER += 20;
  if (SRH > 400) scores.SIDEWINDER += 30;
  if (SRH > 600) scores.SIDEWINDER += 25;
  if (SRH > 800) scores.SIDEWINDER += 15;
  if (DEW_SPREAD > 15) scores.SIDEWINDER += 10;
  if (SURFACE_RH < 55) scores.SIDEWINDER += 10;
  if (VTP > 4 && VTP < 10) scores.SIDEWINDER += 15;
  if (STORM_SPEED > 65 && SRH > 500) scores.SIDEWINDER += 20;
  if (STORM_SPEED < 40) scores.SIDEWINDER -= 30;
  if (PWAT > 2.0) scores.SIDEWINDER -= 15;

  // Hodograph geometry adjustments
  if (useHodo) {
    const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));
    
    let ropeHodoBonus = 0;
    if (HODO_EXTENSION < 0.45) ropeHodoBonus += 15;
    if (HODO_TURNING < 60) ropeHodoBonus += 12;
    if (HODO_CURVATURE < 1.12 && HODO_KINK < 45) ropeHodoBonus += 10;
    if (HODO_HAS_LOOP || HODO_TURNING > 160) ropeHodoBonus -= 20;
    scores.ROPE += clamp(ropeHodoBonus, -35, 35);
    
    let coneHodoBonus = 0;
    if (HODO_CURVATURE >= 1.15 && HODO_CURVATURE <= 1.35) coneHodoBonus += 15;
    if (HODO_TURNING >= 100 && HODO_TURNING <= 220) coneHodoBonus += 12;
    if (HODO_KINK < 60) coneHodoBonus += 8;
    if (HODO_EXTENSION >= 0.45 && HODO_EXTENSION <= 0.65) coneHodoBonus += 8;
    if (HODO_HAS_LOOP) coneHodoBonus -= 15;
    if (HODO_KINK > 75) coneHodoBonus -= 12;
    if (HODO_EXTENSION > 0.75 && HODO_CURVATURE < 1.2) coneHodoBonus -= 10;
    scores.CONE += clamp(coneHodoBonus, -35, 35);
    
    let stovepipeHodoBonus = 0;
    if (HODO_TURNING > 170) stovepipeHodoBonus += 15;
    if (HODO_CURVATURE > 1.28) stovepipeHodoBonus += 12;
    if (HODO_COMPACTNESS > 0.58) stovepipeHodoBonus += 10;
    if (HODO_EXTENSION >= 0.55 && HODO_EXTENSION <= 0.75) stovepipeHodoBonus += 8;
    if (HODO_HAS_LOOP && PWAT < 1.8) stovepipeHodoBonus += 12;
    if (HODO_COMPACTNESS < 0.48) stovepipeHodoBonus -= 15;
    scores.STOVEPIPE += clamp(stovepipeHodoBonus, -35, 35);
    
    let wedgeHodoBonus = 0;
    if (HODO_HAS_LOOP || HODO_TURNING > 220) wedgeHodoBonus += 15;
    if (HODO_EXTENSION > 0.65) wedgeHodoBonus += 12;
    if (HODO_CURVATURE > 1.30) wedgeHodoBonus += 10;
    if (HODO_COMPACTNESS > 0.55) wedgeHodoBonus += 8;
    if (HODO_EXTENSION < 0.55) wedgeHodoBonus -= 12;
    if (HODO_KINK > 80) wedgeHodoBonus -= 10;
    scores.WEDGE += clamp(wedgeHodoBonus, -35, 35);
    
    let drillbitHodoBonus = 0;
    if (HODO_CURVATURE < 1.18) drillbitHodoBonus += 15;
    if (HODO_EXTENSION > 0.65) drillbitHodoBonus += 12;
    if (HODO_TURNING < 120) drillbitHodoBonus += 10;
    if (HODO_COMPACTNESS < 0.55) drillbitHodoBonus += 8;
    if (HODO_HAS_LOOP || HODO_CURVATURE > 1.30) drillbitHodoBonus -= 18;
    if (HODO_KINK > 60) drillbitHodoBonus -= 15;
    scores.DRILLBIT += clamp(drillbitHodoBonus, -35, 35);
    
    let sidewinderHodoBonus = 0;
    if (hodo.HODO_SHAPE === 'KINKED') sidewinderHodoBonus += 25;
    else if (HODO_KINK > 70) sidewinderHodoBonus += 20;
    else if (HODO_KINK > 50) sidewinderHodoBonus += 12;
    if (HODO_EXTENSION > 0.60 && HODO_CURVATURE < 1.30) sidewinderHodoBonus += 12;
    if (HODO_COMPACTNESS < 0.52) sidewinderHodoBonus += 10;
    if (HODO_HAS_LOOP) sidewinderHodoBonus -= 25;
    if (HODO_CURVATURE > 1.40) sidewinderHodoBonus -= 15;
    if (HODO_KINK < 40 && HODO_CURVATURE < 1.15) sidewinderHodoBonus -= 10;
    scores.SIDEWINDER += clamp(sidewinderHodoBonus, -35, 35);
  }

  // Baroclinic forcing adjustments
  if (baroclinic_mph > 30) {
    scores.STOVEPIPE += 25;
    scores.SIDEWINDER += 15;
  } else if (baroclinic_mph > 15) {
    scores.STOVEPIPE += 15;
    scores.CONE += 10;
    scores.SIDEWINDER += 10;
  } else if (baroclinic_mph < 6) {
    scores.WEDGE += 15;
    scores.ROPE += 8;
  }

  // Cross-penalties
  if (VTP > 10 && LAPSE_RATE_0_3 > 9.5) {
    scores.STOVEPIPE += 25;
    scores.CONE -= 20;
    scores.ROPE -= 30;
  }
  
  if (PWAT > 2.0 && RH_MID > 85) {
    scores.WEDGE += 30;
    scores.STOVEPIPE -= 15;
    scores.ROPE -= 10;
  }
  
  if (VTP > 9 && SRH > 700 && CAPE > 5500) {
    scores.STOVEPIPE += 15;
    scores.CONE -= 15;
  }
  
  if (CAPE < 2800 && SRH < 280 && VTP < 1.5) {
    scores.ROPE += 35;
    scores.CONE -= 25;
    scores.SIDEWINDER -= 30;
    scores.STOVEPIPE -= 40;
  }
  
  if (SRH > 550 && STORM_SPEED > 60 && VTP < 10 && PWAT < 1.8) {
    scores.SIDEWINDER += 25;
    scores.STOVEPIPE -= 15;
  }

  if (STORM_SPEED > 70 && CAPE < 5500 && VTP < 8 && PWAT < 1.4) {
    scores.DRILLBIT += 30;
  }
  
  if (CAPE > 6500 || VTP > 11) {
    scores.DRILLBIT -= 15;
  }

  // Normalize probabilities
  const totalScore = Object.values(scores).reduce((sum, val) => sum + Math.max(0, val), 0);
  
  let probabilities = {};
  if (totalScore > 0) {
    const types = Object.keys(scores);
    const rawFractions = types.map(type => {
      const frac = (Math.max(0, scores[type]) / totalScore) * 100;
      return { type, frac, floor: Math.floor(frac), remainder: frac - Math.floor(frac) };
    });
    
    rawFractions.forEach(item => {
      probabilities[item.type] = item.floor;
    });
    
    let remaining = 100 - rawFractions.reduce((sum, item) => sum + item.floor, 0);
    rawFractions.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remaining && i < rawFractions.length; i++) {
      probabilities[rawFractions[i].type]++;
    }
  } else {
    const isExtreme = (CAPE > 5000 && SRH > 400) || STP > 15 || VTP > 5;
    if (isExtreme) {
      probabilities = { ROPE: 10, CONE: 28, STOVEPIPE: 24, WEDGE: 24, DRILLBIT: 10, SIDEWINDER: 4 };
    } else {
      probabilities = { ROPE: 25, CONE: 20, STOVEPIPE: 15, WEDGE: 20, DRILLBIT: 12, SIDEWINDER: 8 };
    }
  }

  // Special factors
  const factors = [];

  // Rain-wrap probability
  let rainWrapChance = 0;
  if (PWAT > 1.5) {
    rainWrapChance = Math.min(95, Math.round(30 + (PWAT - 1.5) * 40));
  } else if (PWAT > 1.0) {
    rainWrapChance = Math.max(5, Math.round(10 + (PWAT - 1.0) * 20));
  }
  if (rainWrapChance > 0) {
    factors.push({ name: 'Rain-Wrapped', chance: rainWrapChance });
  }

  // Large hail probability
  let hailChance = 0;
  if (CAPE > 2500 && LAPSE_RATE_0_3 > 8) {
    hailChance = Math.min(90, Math.round(40 + (CAPE - 2500) / 50));
  } else if (CAPE > 2000 && LAPSE_RATE_0_3 > 7) {
    hailChance = Math.max(5, Math.round(20 + (CAPE - 2000) / 100));
  }
  if (hailChance > 0) {
    factors.push({ name: 'Large Hail', chance: hailChance });
  }

  // Multiple vortices
  let multiVortexChance = 0;
  if (SRH > 300 && CAPE > 2000) {
    if (SRH > 300) multiVortexChance += 20;
    if (SRH > 400) multiVortexChance += 15;
    if (SRH > 500) multiVortexChance += 15;
    if (SRH > 600) multiVortexChance += 10;
    if (VTP > 4) multiVortexChance += 10;
    if (VTP > 7) multiVortexChance += 10;
    if (CAPE > 4000) multiVortexChance += 10;
  } else if (SRH > 200 && CAPE > 1500) {
    multiVortexChance = Math.max(5, Math.round(10 + (SRH - 200) / 30));
  }
  multiVortexChance = Math.min(85, multiVortexChance);
  if (multiVortexChance > 0) {
    factors.push({ name: 'Multiple Vortices', chance: multiVortexChance });
  }

  // Dust vortices
  let dustVortexChance = 0;
  if (DEW_SPREAD > 15 && STORM_SPEED > 60 && SURFACE_RH < 50) {
    dustVortexChance = Math.min(80, Math.round(30 + (DEW_SPREAD - 15) * 3));
  } else if (DEW_SPREAD > 12 && STORM_SPEED > 50 && SURFACE_RH < 60) {
    dustVortexChance = Math.max(5, Math.round(15 + (DEW_SPREAD - 12) * 2));
  }
  if (dustVortexChance > 0) {
    factors.push({ name: 'Dust Vortices', chance: dustVortexChance });
  }

  // Dust Field
  let dustFieldChance = 0;
  if (DEW_SPREAD > 10 && SURFACE_RH < 65 && STORM_SPEED > 40) {
    if (DEW_SPREAD > 10) dustFieldChance += 25;
    if (DEW_SPREAD > 18) dustFieldChance += 20;
    if (SURFACE_RH < 65) dustFieldChance += 15;
    if (SURFACE_RH < 50) dustFieldChance += 15;
    if (SURFACE_RH < 35) dustFieldChance += 10;
    if (STORM_SPEED > 50) dustFieldChance += 10;
    if (STORM_SPEED > 70) dustFieldChance += 10;
    if (SRH > 300) dustFieldChance += 10;
    if (PWAT > 1.8) dustFieldChance -= 20;
    if (RH_MID > 80) dustFieldChance -= 15;
    dustFieldChance = Math.max(0, Math.min(95, dustFieldChance));
  }
  if (dustFieldChance > 0) {
    factors.push({ name: 'Dust Field', chance: dustFieldChance });
  }

  // Long-track tornado
  let longTrackChance = 0;
  if (STP > 18 || (SRH > 350 && STORM_SPEED > 40 && CAPE > 2500)) {
    longTrackChance = Math.min(90, Math.round(40 + (STP - 18) * 2 + (STORM_SPEED - 40) / 3));
  } else if (STP > 12 || (SRH > 250 && STORM_SPEED > 35 && CAPE > 2000)) {
    longTrackChance = Math.max(5, Math.round(20 + (STP - 12) * 2));
  }
  if (longTrackChance > 0) {
    factors.push({ name: 'Long-Track', chance: longTrackChance });
  }

  // Lightning frequency
  let lightningChance = 0;
  if (CAPE > 3000) {
    lightningChance = Math.min(95, Math.round(50 + (CAPE - 3000) / 40));
  } else if (CAPE > 1500) {
    lightningChance = Math.max(5, Math.round(20 + (CAPE - 1500) / 75));
  }
  if (lightningChance > 0) {
    factors.push({ name: 'Frequent Lightning', chance: lightningChance });
  }

  const types = Object.keys(probabilities).map(type => ({
    Type: type,
    Prob: probabilities[type]
  }));

  return {
    types: types,
    factors: factors,
    indices: {
      STP: Math.round(STP).toString(),
      VTP: Math.round(VTP).toString()
    },
    baroclinicProxy: Math.round(baroclinic_mph * 10) / 10,
    hodographUsed: useHodo
  };
}

/**
 * Estimate tornado wind speeds
 */
export function estimateWind(data) {
  const CAPE = data.CAPE || 0;
  const SRH = data.SRH || 0;
  const LAPSE_RATE_0_3 = data.LAPSE_RATE_0_3 || 0;
  const PWAT = data.PWAT || 0;
  const CAPE_3KM = data.CAPE_3KM || 0;
  const STORM_SPEED = data.STORM_SPEED || 0;
  const TEMP = data.TEMP || data.TEMPERATURE || 0;
  const DEWPOINT = data.DEWPOINT || 0;
  const LAPSE_RATE_3_6 = data.LAPSE_RATE_3_6 || 0;
  const SURFACE_RH = data.SURFACE_RH || 0;
  const RH_MID = data.RH_MID || data['700-500MB_RH'] || 0;
  const Total_TVS_Peaks = data.TVS_PEAKS || data.Total_TVS_Peaks || 0;

  let STP, VTP;
  if (data.STP !== undefined && data.STP !== null && data.STP !== '') {
    STP = Math.min(64, Math.max(0, parseFloat(data.STP)));
  } else {
    STP = Math.min(64, Math.max(0, (CAPE / 1500) * (SRH / 150) * (PWAT / 1.5) * 10));
  }
  
  if (data.VTP !== undefined && data.VTP !== null && data.VTP !== '') {
    VTP = Math.min(16, Math.max(0, parseFloat(data.VTP)));
  } else {
    VTP = Math.min(16, Math.max(0, (CAPE / 2000) * (SRH / 200) * (LAPSE_RATE_0_3 / 9) * 5));
  }

  if (CAPE < 500 && STP < 4) {
    return {
      est_min: 0,
      est_max: 0,
      label: 'No tornado potential',
      theoretical: null,
      baroclinicProxy: 0,
      adjustedWind: 0
    };
  }

  const baseWind = predictWindspeedEmpirical({
    CAPE: CAPE,
    SRH: SRH,
    LAPSE_RATE_0_3: LAPSE_RATE_0_3,
    PWAT: PWAT,
    TEMP: TEMP,
    DEWPOINT: DEWPOINT,
    CAPE_3KM: CAPE_3KM,
    LAPSE_RATE_3_6: LAPSE_RATE_3_6 || (LAPSE_RATE_0_3 * 0.85),
    SURFACE_RH: SURFACE_RH,
    RH_MID: RH_MID,
    STORM_SPEED: STORM_SPEED,
    TVS_PEAKS: Total_TVS_Peaks || 0
  });
  
  const baroclinic_mph = computeBaroclinicProxy(data);
  const BAROCLINIC_GAMMA = 0.6;
  const adjustedWindRaw = baseWind + BAROCLINIC_GAMMA * baroclinic_mph;
  const adjustedWind = Math.max(0, Math.min(500, adjustedWindRaw));

  const uncertainty = baseWind * 0.15;
  let est_min = Math.max(50, Math.round(baseWind - uncertainty));
  let est_max = Math.round(baseWind + uncertainty);
  
  est_max = Math.min(400, est_max);
  
  if (est_max - est_min < 12) {
    est_max = est_min + 12;
  }
  
  if (est_max - est_min > 35) {
    const mid = (est_min + est_max) / 2;
    est_min = Math.round(mid - 17);
    est_max = Math.round(mid + 17);
  }

  let efScale = 'EF0';
  let efLabel = 'EF0 (65-85 mph)';

  if (est_max >= 200 && est_min >= 165) {
    efScale = 'EF5';
    efLabel = 'EF5 (>200 mph)';
  } else if (est_max >= 200 && est_min >= 135) {
    efScale = 'EF4';
    efLabel = 'EF4 (166-200 mph)';
  } else if (est_max >= 200 && est_min >= 110) {
    efScale = 'EF3';
    efLabel = 'EF3 (136-165 mph)';
  } else if (est_max >= 165 && est_min >= 135) {
    efScale = 'EF4';
    efLabel = 'EF4 (166-200 mph)';
  } else if (est_max >= 165 && est_min >= 110) {
    efScale = 'EF3';
    efLabel = 'EF3 (136-165 mph)';
  } else if (est_max >= 135 && est_min >= 110) {
    efScale = 'EF3';
    efLabel = 'EF3 (136-165 mph)';
  } else if (est_max >= 135 && est_min >= 86) {
    efScale = 'EF2';
    efLabel = 'EF2 (111-135 mph)';
  } else if (est_max >= 110 && est_min >= 86) {
    efScale = 'EF2';
    efLabel = 'EF2 (111-135 mph)';
  } else if (est_max >= 110 && est_min >= 65) {
    efScale = 'EF1';
    efLabel = 'EF1 (86-110 mph)';
  } else if (est_max >= 86) {
    efScale = 'EF1';
    efLabel = 'EF1 (86-110 mph)';
  }

  let theoretical = null;
  const isExtremeVTP = VTP >= 3;
  const isExtremeSTP = STP >= 11;
  const isExtremeConditions = CAPE > 6000 && SRH > 600;
  const isHighWinds = est_max >= 230;
  
  if (isHighWinds && (isExtremeVTP || isExtremeSTP || isExtremeConditions)) {
    const theo_min = est_max + 18;
    const theo_max = Math.round(est_max * 1.20) + 45;
    const cappedMax = Math.min(480, theo_max);
    const maxSuffix = theo_max >= 300 ? '+' : '';
    
    theoretical = {
      theo_min: theo_min,
      theo_max: cappedMax,
      theo_max_display: `${cappedMax}${maxSuffix}`
    };
  }

  return {
    est_min: est_min,
    est_max: est_max,
    label: efLabel,
    efScale: efScale,
    theoretical: theoretical,
    baroclinicProxy: Math.round(baroclinic_mph * 10) / 10,
    adjustedWind: Math.round(adjustedWind)
  };
}

/**
 * Calculate SPC Risk Level
 */
export function calculateRiskLevel(data) {
  let STP, VTP;
  if (data.STP !== undefined && data.STP !== null && data.STP !== '') {
    STP = Math.min(64, Math.max(0, parseFloat(data.STP)));
  } else {
    const CAPE = data.CAPE || 0;
    const SRH = data.SRH || 0;
    const PWAT = data.PWAT || 0;
    STP = Math.min(64, Math.max(0, (CAPE / 1500) * (SRH / 150) * (PWAT / 1.5) * 10));
  }
  
  if (data.VTP !== undefined && data.VTP !== null && data.VTP !== '') {
    VTP = Math.min(16, Math.max(0, parseFloat(data.VTP)));
  } else {
    const CAPE = data.CAPE || 0;
    const SRH = data.SRH || 0;
    const LAPSE_RATE_0_3 = data.LAPSE_RATE_0_3 || 0;
    VTP = Math.min(16, Math.max(0, (CAPE / 2000) * (SRH / 200) * (LAPSE_RATE_0_3 / 9) * 5));
  }

  let risk, color;
  
  if (STP >= 11 || VTP >= 3) {
    risk = 'HIGH';
    color = '#e600ff';
  } else if ((STP >= 7 && STP <= 10) || (VTP === 2 && STP >= 7)) {
    risk = 'MDT';
    color = '#ff0000';
  } else if (STP >= 5 && STP <= 6) {
    risk = 'ENH';
    color = '#ff8c00';
  } else if (STP >= 3 && STP <= 4) {
    risk = 'SLGT';
    color = '#ffff00';
  } else if (STP >= 1 && STP <= 2) {
    risk = 'MRGL';
    color = '#00ff00';
  } else {
    risk = 'TSTM';
    color = '#4d4dff';
  }

  return {
    risk: risk,
    color: color,
    STP: Math.round(STP).toString(),
    VTP: Math.round(VTP).toString()
  };
}
