/**
 * TORNADO CALCULATIONS MODULE
 * Trained on 32 real tornado events from weather_composite_data.csv
 */

(function() {
  'use strict';

  // ========================================================================
  // THERMAL WIND PROXY CALCULATIONS
  // ========================================================================
  
  // Tunable constants
  const THERMAL_BETA = 1.2;     // maps |∇T| to ΔV proxy
  const THERMAL_H_EFF_KM = 6;   // effective depth in km
  const THERMAL_GAMMA = 0.6;    // how strongly ΔV_th maps to tornado winds
  const FINITE_DELTA_M = 1000;  // finite-difference spacing in meters for surface proxy

  /**
   * Estimate temperature gradients from available meteorological data
   * Used when explicit temperature gradient data is not available
   * @param {Object} data - Meteorological data
   * @returns {Object} Estimated gradients {GRAD_TX, GRAD_TZ} in K/m
   */
  function estimateThermalGradients(data) {
    // If gradients already provided, return them
    if (data.GRAD_TX !== undefined && data.GRAD_TZ !== undefined) {
      return { GRAD_TX: data.GRAD_TX, GRAD_TZ: data.GRAD_TZ };
    }

    // Estimate from meteorological parameters
    // Strong thermal gradients correlate with:
    // - High dew point spread (dry line situations)
    // - High storm speed (strong forcing)
    // - High SRH (baroclinic zones)
    // - High lapse rate (steep temperature decrease with height)
    const TEMP = data.TEMP || 0;
    const DEWPOINT = data.DEWPOINT || 0;
    const STORM_SPEED = data.STORM_SPEED || 0;
    const SRH = data.SRH || 0;
    const LAPSE_RATE_0_3 = data.LAPSE_RATE_0_3 || 0;

    const DEW_SPREAD = Math.max(0, TEMP - DEWPOINT);

    // Base gradient from dew point spread (dry lines create strong gradients)
    // Typical values: 0.001-0.01 K/m for significant gradients
    let gradientMagnitude = 0;

    // Dew spread contribution (0-20°C spread → 0-0.008 K/m)
    if (DEW_SPREAD > 5) {
      gradientMagnitude += (DEW_SPREAD / 2000);
    }

    // Storm speed contribution (faster storms = stronger gradients)
    if (STORM_SPEED > 50) {
      gradientMagnitude += ((STORM_SPEED - 50) / 5000);
    }

    // SRH contribution (higher rotation = baroclinic zone)
    if (SRH > 300) {
      gradientMagnitude += ((SRH - 300) / 50000);
    }

    // Lapse rate contribution (steep lapse = thermal contrast)
    if (LAPSE_RATE_0_3 > 8) {
      gradientMagnitude += ((LAPSE_RATE_0_3 - 8) / 1000);
    }

    // Cap at realistic maximum (0.015 K/m is very strong)
    gradientMagnitude = Math.min(0.015, gradientMagnitude);

    // Split into x and z components (assume roughly equal, slightly favor x)
    const GRAD_TX = gradientMagnitude * 0.6;
    const GRAD_TZ = gradientMagnitude * 0.4;

    return { GRAD_TX, GRAD_TZ };
  }

  /**
   * Surface-proxy finite-difference thermal-wind proxy (returns mph)
   */
  function computeThermalWind_surfaceProxyFromData(data) {
    // Accept either explicit neighbor temps in Kelvin or precomputed gradients in K/m
    const Tcx = data.T_CENTER;
    const Txp = data.T_XPLUS;
    const Txm = data.T_XMINUS;
    const Tzp = data.T_ZPLUS;
    const Tzm = data.T_ZMINUS;

    if (Tcx === undefined || Txp === undefined || Txm === undefined || Tzp === undefined || Tzm === undefined) {
      // Try precomputed gradients
      if (data.GRAD_TX !== undefined && data.GRAD_TZ !== undefined) {
        const dTx = data.GRAD_TX; // K/m
        const dTz = data.GRAD_TZ; // K/m
        const gradKperm = Math.sqrt(dTx * dTx + dTz * dTz);
        const gradKperkm = gradKperm * 1000.0;
        const dV_ms = THERMAL_BETA * THERMAL_H_EFF_KM * gradKperkm;
        return dV_ms * 2.23694;
      }
      
      // Estimate gradients from available data
      const estimated = estimateThermalGradients(data);
      const dTx = estimated.GRAD_TX;
      const dTz = estimated.GRAD_TZ;
      const gradKperm = Math.sqrt(dTx * dTx + dTz * dTz);
      const gradKperkm = gradKperm * 1000.0;
      const dV_ms = THERMAL_BETA * THERMAL_H_EFF_KM * gradKperkm;
      return dV_ms * 2.23694;
    }

    // finite differences (K/m)
    const dTx = (Txp - Txm) / (2 * FINITE_DELTA_M);
    const dTz = (Tzp - Tzm) / (2 * FINITE_DELTA_M);
    const gradKperm = Math.sqrt(dTx * dTx + dTz * dTz); // K/m
    const gradKperkm = gradKperm * 1000.0;               // K/km
    const dV_ms = THERMAL_BETA * THERMAL_H_EFF_KM * gradKperkm;
    return dV_ms * 2.23694; // mph
  }

  /**
   * Calculate tornado morphology probabilities
   * TRAINED ON ACTUAL GAME DATA - 32 tornado events
   * NOW INCLUDES THERMAL WIND CONTRIBUTION
   */
  function calculate_probabilities(data) {
    // Extract atmospheric parameters with defaults
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

    // Get or calculate STP and VTP with PROPER CAPS
    let STP, VTP;
    if (data.STP !== undefined && data.STP !== null && data.STP !== '') {
      STP = Math.min(64, Math.max(0, parseFloat(data.STP))); // CAP: 0-64
    } else {
      STP = Math.min(64, Math.max(0, (CAPE / 1500) * (SRH / 150) * (PWAT / 1.5) * 10));
    }
    
    if (data.VTP !== undefined && data.VTP !== null && data.VTP !== '') {
      VTP = Math.min(16, Math.max(0, parseFloat(data.VTP))); // CAP: 0-16
    } else {
      VTP = Math.min(16, Math.max(0, (CAPE / 2000) * (SRH / 200) * (LAPSE_RATE_0_3 / 9) * 5));
    }

    const DEW_SPREAD = Math.max(0, TEMP - DEWPOINT);

    // ========================================================================
    // COMPUTE THERMAL WIND CONTRIBUTION (BEFORE SCORING)
    // ========================================================================
    const thermal_mph = computeThermalWind_surfaceProxyFromData(data);

    let scores = {
      SIDEWINDER: 0,
      STOVEPIPE: 0,
      WEDGE: 0,
      DRILLBIT: 0,  // MERGED: Fast-moving, dry environment tornadoes (combines old DRILLBIT + FUNNEL)
      CONE: 0,
      ROPE: 0
    };

    // ========================================================================
    // DATA-DRIVEN TORNADO TYPE CLASSIFICATION
    // Based on observed patterns in 32 real game tornado events
    // ========================================================================

    // ROPE: Weak/marginal tornadoes - NERFED to reduce dominance
    // Data shows only 1 clear example: 137 mph @ 1591 ft (CAPE 4172, SRH 279, VTP low)
    // Characteristics: Everything below significant tornado thresholds
    if (CAPE < 3500) scores.ROPE += 50;              // REDUCED from 60
    if (CAPE < 3000) scores.ROPE += 38;              // REDUCED from 45
    if (STP < 5) scores.ROPE += 45;                  // REDUCED from 55
    if (STP < 3) scores.ROPE += 32;                  // REDUCED from 40
    if (VTP < 2) scores.ROPE += 42;                  // REDUCED from 50
    if (VTP < 1.5) scores.ROPE += 28;                // REDUCED from 35
    if (SRH < 350) scores.ROPE += 38;                // REDUCED from 45
    if (SRH < 250) scores.ROPE += 24;                // REDUCED from 30
    if (LAPSE_RATE_0_3 < 7.5) scores.ROPE += 32;     // REDUCED from 40
    if (LAPSE_RATE_0_3 < 7) scores.ROPE += 20;       // REDUCED from 25
    if (STORM_SPEED < 60) scores.ROPE += 20;         // REDUCED from 25
    if (PWAT < 1.3) scores.ROPE += 18;               // REDUCED from 22
    if (SURFACE_RH < 72) scores.ROPE += 18;          // REDUCED from 22
    // Marginal conditions bonus - NERFED
    if (CAPE < 3500 && SRH < 350 && VTP < 2) scores.ROPE += 35; // REDUCED from 45

    // CONE: Most common type - slightly reduced to balance
    // Data shows: CAPE 4000-6500, SRH 350-650, Lapse 8-10, Speed 50-70
    // Width typically 1500-5000 ft
    if (CAPE > 3500 && CAPE < 6500) scores.CONE += 45; // REDUCED from 50
    if (SRH > 350 && SRH < 650) scores.CONE += 35;     // REDUCED from 40
    if (LAPSE_RATE_0_3 > 7.5 && LAPSE_RATE_0_3 < 10) scores.CONE += 30; // REDUCED from 35
    if (STP > 10 && STP < 30) scores.CONE += 40;      // REDUCED from 45
    if (VTP > 3 && VTP < 9) scores.CONE += 25;        // REDUCED from 30
    if (STORM_SPEED > 50 && STORM_SPEED < 75) scores.CONE += 22; // REDUCED from 25
    if (PWAT > 1.1 && PWAT < 1.7) scores.CONE += 18;  // REDUCED from 20
    if (SURFACE_RH > 60 && SURFACE_RH < 80) scores.CONE += 13; // REDUCED from 15

    // WEDGE: Wide tornadoes - BUFFED to be more competitive
    // Data shows: PWAT 1.8-2.3, RH 70-100%, slower motion, very wide (5000-80,000 ft)
    // Examples: 18,532 ft (PWAT 1.5, RH 75/68), 31,680 ft (PWAT 2.3, RH 84/100)
    if (PWAT > 1.5) scores.WEDGE += 60;              // REDUCED threshold from 1.7, REDUCED score from 70
    if (PWAT > 1.9) scores.WEDGE += 50;              // REDUCED threshold from 2.0
    if (SURFACE_RH > 70) scores.WEDGE += 40;         // REDUCED threshold from 75
    if (RH_MID > 75) scores.WEDGE += 38;             // REDUCED threshold from 80
    if (RH_MID > 88) scores.WEDGE += 28;             // REDUCED threshold from 90
    if (DEW_SPREAD < 12) scores.WEDGE += 28;         // INCREASED threshold from 10, INCREASED score
    if (STORM_SPEED < 68) scores.WEDGE += 32;        // INCREASED threshold from 65
    if (STORM_SPEED < 58) scores.WEDGE += 22;        // INCREASED threshold from 55
    if (CAPE > 2800) scores.WEDGE += 22;             // REDUCED threshold from 3000
    if (STP > 13) scores.WEDGE += 22;                // REDUCED threshold from 15
    if (CAPE_3KM > 100) scores.WEDGE += 18;          // REDUCED threshold from 110
    // Strong penalties for fast motion or dry air
    if (STORM_SPEED > 78) scores.WEDGE -= 35;        // INCREASED threshold from 75
    if (PWAT < 1.3) scores.WEDGE -= 28;

    // STOVEPIPE: Narrow violent tornadoes - BUFFED scoring
    // Data shows: CAPE 5500-7500, SRH 600-850, Lapse 9-10.5, narrow width (500-1200 ft)
    // Examples: 252 mph/1148 ft, 373 mph/6247 ft, 301 mph/500 ft
    if (VTP > 7) scores.STOVEPIPE += 60;             // REDUCED threshold from 9, REDUCED score from 70
    if (VTP > 10) scores.STOVEPIPE += 45;            // REDUCED threshold from 12
    if (LAPSE_RATE_0_3 > 8.8) scores.STOVEPIPE += 50; // REDUCED threshold from 9.3
    if (LAPSE_RATE_0_3 > 9.8) scores.STOVEPIPE += 38; // REDUCED threshold from 10
    if (CAPE > 5200) scores.STOVEPIPE += 42;         // REDUCED threshold from 5500
    if (CAPE > 6200) scores.STOVEPIPE += 33;         // REDUCED threshold from 6500
    if (SRH > 550) scores.STOVEPIPE += 38;           // REDUCED threshold from 600
    if (SRH > 680) scores.STOVEPIPE += 28;           // REDUCED threshold from 700
    if (STP > 22) scores.STOVEPIPE += 33;            // REDUCED threshold from 25
    if (CAPE_3KM > 125) scores.STOVEPIPE += 23;      // REDUCED threshold from 135
    if (PWAT > 0.9 && PWAT < 1.6) scores.STOVEPIPE += 22; // WIDENED range
    // Penalty adjusted
    if (PWAT > 2.0) scores.STOVEPIPE -= 18;          // INCREASED threshold from 2.0

    // DRILLBIT: Fast-moving, dry environment - MERGED WITH FUNNEL
    // Data shows: Storm speed 70-92 mph, PWAT 0.8-1.5, narrow to moderate width
    // Includes both grounded fast tornadoes and rotating funnels aloft
    // Examples: 373 mph @ 92 mph storm, 265 mph @ 83 mph storm
    
    // High speed + dry conditions (classic drillbit)
    if (STORM_SPEED > 70) scores.DRILLBIT += 58;
    if (STORM_SPEED > 80) scores.DRILLBIT += 40;  // Combined bonus
    if (STORM_SPEED > 90) scores.DRILLBIT += 25;
    
    // Dry environment indicators
    if (PWAT < 1.3) scores.DRILLBIT += 48;
    if (PWAT < 1.0) scores.DRILLBIT += 38;
    if (DEW_SPREAD > 13) scores.DRILLBIT += 38;
    if (DEW_SPREAD > 18) scores.DRILLBIT += 28;
    if (SURFACE_RH < 65) scores.DRILLBIT += 28;
    
    // Moderate to high rotation (supports both drillbit and funnel types)
    if (SRH > 450) scores.DRILLBIT += 42;
    if (SRH > 600) scores.DRILLBIT += 28;
    
    // Instability factors (moderate range supports both types)
    if (CAPE > 3000 && CAPE < 5500) scores.DRILLBIT += 32;  // Moderate CAPE (funnel range)
    if (CAPE > 4200) scores.DRILLBIT += 22;  // Higher CAPE (drillbit range)
    
    // STP/VTP factors
    if (STP > 10 && STP < 25) scores.DRILLBIT += 23;
    if (STP > 13) scores.DRILLBIT += 23;
    if (VTP > 3 && VTP < 8) scores.DRILLBIT += 28;
    if (VTP > 4) scores.DRILLBIT += 22;
    
    // Lapse rate factors (supports transitional characteristics)
    if (LAPSE_RATE_0_3 > 7 && LAPSE_RATE_0_3 < 9) scores.DRILLBIT += 18;
    
    // Dry line scenario bonus (combined)
    if (STORM_SPEED > 65 && PWAT < 1.4 && DEW_SPREAD > 12) scores.DRILLBIT += 35;

    // ========================================================================
    // THERMAL WIND BONUS RULES
    // Add after all existing scoring blocks, before cross-penalties
    // ========================================================================
    
    // Strong thermal gradient favors violent, narrow tornadoes
    if (thermal_mph > 30) {
      scores.STOVEPIPE += 30;
      scores.DRILLBIT += 12;
    } else if (thermal_mph > 15) {
      scores.STOVEPIPE += 18;
      scores.CONE += 10;
    } else if (thermal_mph < 6) {
      // Weak thermal gradient favors wider, moisture-driven tornadoes
      scores.WEDGE += 15;
      scores.ROPE += 8;
    }

    // ========================================================================
    // CROSS-PENALTIES AND BONUSES (based on observed conflicts)
    // ========================================================================
    
    // Very high VTP + extreme lapse → STOVEPIPE, not CONE or SIDEWINDER
    if (VTP > 11 && LAPSE_RATE_0_3 > 9.5) {
      scores.STOVEPIPE += 30;
      scores.CONE -= 20;
      scores.SIDEWINDER -= 20;
    }
    
    // Extreme moisture → WEDGE, reduce other types
    if (PWAT > 2.0 && RH_MID > 85) {
      scores.WEDGE += 25;
      scores.STOVEPIPE -= 15;
      scores.DRILLBIT -= 25;
      scores.SIDEWINDER -= 15;
    }
    
    // Extreme speed + dry → DRILLBIT, not WEDGE or SIDEWINDER
    if (STORM_SPEED > 80 && PWAT < 1.2) {
      scores.DRILLBIT += 35;  // INCREASED from 25
      scores.WEDGE -= 30;
      scores.SIDEWINDER -= 20;
    }
    
    // Weak conditions → ROPE, reduce all significant types
    if (CAPE < 2800 && SRH < 280 && VTP < 1.5) {
      scores.ROPE += 35;
      scores.CONE -= 25;
      scores.SIDEWINDER -= 30;
      scores.STOVEPIPE -= 40;
    }
    
    // Balanced high SRH + speed (not extreme) → SIDEWINDER, not STOVEPIPE
    if (SRH > 550 && STORM_SPEED > 60 && VTP < 10 && PWAT < 1.8) {
      scores.SIDEWINDER += 25;
      scores.STOVEPIPE -= 15;
    }

    // Fast + dry + moderate instability → DRILLBIT (was FUNNEL)
    if (STORM_SPEED > 70 && CAPE < 5500 && VTP < 8 && PWAT < 1.4) {
      scores.DRILLBIT += 30;  // INCREASED from 25
    }
    
    // If conditions too extreme → reduce DRILLBIT slightly
    if (CAPE > 6500 || VTP > 11) {
      scores.DRILLBIT -= 15;
    }

    // ========================================================================
    // NORMALIZE PROBABILITIES
    // ========================================================================
    const totalScore = Object.values(scores).reduce((sum, val) => Math.max(0, sum + val), 0);
    
    let probabilities = {};
    if (totalScore > 0) {
      Object.keys(scores).forEach(type => {
        probabilities[type] = Math.max(0, Math.round((Math.max(0, scores[type]) / totalScore) * 100));
      });
    } else {
      probabilities = {
        SIDEWINDER: 0,
        STOVEPIPE: 0,
        WEDGE: 0,
        DRILLBIT: 0,
        CONE: 15,
        ROPE: 80
      };
    }

    // ========================================================================
    // SPECIAL FACTORS
    // ========================================================================
    const factors = [];

    // Rain-wrap probability
    if (PWAT > 1.5) {
      const rainWrapChance = Math.min(95, Math.round(30 + (PWAT - 1.5) * 40));
      factors.push({ name: 'Rain-Wrapped', chance: rainWrapChance });
    }

    // Large hail probability
    if (CAPE > 2500 && LAPSE_RATE_0_3 > 8) {
      const hailChance = Math.min(90, Math.round(40 + (CAPE - 2500) / 50));
      factors.push({ name: 'Large Hail', chance: hailChance });
    }

    // Multiple vortices - MORE REALISTIC CONDITIONS
    // Can occur with moderate to high rotation, not just extreme conditions
    // Lower threshold: moderate SRH with decent instability
    if (SRH > 300 && CAPE > 2000) {
      let multiVortexChance = 0;
      
      // Base chance from SRH
      if (SRH > 300) multiVortexChance += 20;
      if (SRH > 400) multiVortexChance += 15;
      if (SRH > 500) multiVortexChance += 15;
      if (SRH > 600) multiVortexChance += 10;
      
      // Bonus from VTP (but not required)
      if (VTP > 4) multiVortexChance += 10;
      if (VTP > 7) multiVortexChance += 10;
      
      // Bonus from strong instability
      if (CAPE > 4000) multiVortexChance += 10;
      
      // Cap at 85%
      multiVortexChance = Math.min(85, multiVortexChance);
      
      if (multiVortexChance > 0) {
        factors.push({ name: 'Multiple Vortices', chance: multiVortexChance });
      }
    }

    // Dust vortices - dry environment with high winds
    if (DEW_SPREAD > 15 && STORM_SPEED > 60 && SURFACE_RH < 50) {
      const dustVortexChance = Math.min(80, Math.round(30 + (DEW_SPREAD - 15) * 3));
      factors.push({ name: 'Dust Vortices', chance: dustVortexChance });
    }

    // Long-track tornado potential - influenced by STP (game scale)
    if (STP > 18 || (SRH > 350 && STORM_SPEED > 40 && CAPE > 2500)) {
      const longTrackChance = Math.min(90, Math.round(40 + (STP - 18) * 2 + (STORM_SPEED - 40) / 3));
      factors.push({ name: 'Long-Track', chance: longTrackChance });
    }

    // Lightning frequency
    if (CAPE > 3000) {
      const lightningChance = Math.min(95, Math.round(50 + (CAPE - 3000) / 40));
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
      thermalContribution: Math.round(thermal_mph * 10) / 10
    };
  }

  /**
   * Estimate tornado wind speeds using machine learning from game data
   * Trained on 32 real tornado events from weather_composite_data.csv
   * NOW INCLUDES THERMAL WIND ADJUSTMENT
   */
  function estimate_wind(data) {
    const CAPE = data.CAPE || 0;
    const SRH = data.SRH || 0;
    const LAPSE_RATE_0_3 = data.LAPSE_RATE_0_3 || 0;
    const PWAT = data.PWAT || 0;
    const CAPE_3KM = data.CAPE_3KM || 0;
    const STORM_SPEED = data.STORM_SPEED || 0;

    // Get or calculate STP and VTP (game scale) with PROPER CAPS
    let STP, VTP;
    if (data.STP !== undefined && data.STP !== null && data.STP !== '') {
      STP = Math.min(64, Math.max(0, parseFloat(data.STP))); // CAP: 0-64
    } else {
      STP = Math.min(64, Math.max(0, (CAPE / 1500) * (SRH / 150) * (PWAT / 1.5) * 10));
    }
    
    if (data.VTP !== undefined && data.VTP !== null && data.VTP !== '') {
      VTP = Math.min(16, Math.max(0, parseFloat(data.VTP))); // CAP: 0-16
    } else {
      VTP = Math.min(16, Math.max(0, (CAPE / 2000) * (SRH / 200) * (LAPSE_RATE_0_3 / 9) * 5));
    }

    // Minimum thresholds based on data analysis
    if (CAPE < 500 && STP < 4) {
      return {
        est_min: 0,
        est_max: 0,
        label: 'No tornado potential',
        theoretical: null,
        thermalContribution: 0,
        adjustedWind: 0
      };
    }

    // ========================================================================
    // TRAINED REGRESSION MODEL - FULLY RETRAINED ON 39 EVENTS
    // Complete dataset: 137-373 mph observed range
    // New data points: 137, 141, 150, 155, 160, 174, 175, 189, 200, 206, 
    //                  211, 216, 220, 237, 250, 252, 253, 257, 258, 261, 
    //                  265, 280, 282, 286, 301, 315, 373 mph
    // ========================================================================
    
    // Normalized components (based on observed data ranges from full dataset)
    const capeNorm = Math.min(1.0, CAPE / 9178);       // Max observed: 9178
    const srhNorm = Math.min(1.0, SRH / 834);          // Max observed: 834
    const lapseNorm = Math.min(1.0, LAPSE_RATE_0_3 / 10.6);  // Max observed: 10.6
    const speedNorm = Math.min(1.0, STORM_SPEED / 92); // Max observed: 92
    const stpNorm = Math.min(1.0, STP / 50);
    const vtpNorm = Math.min(1.0, VTP / 13);          // Slightly increased cap
    
    // Weighted components - RETRAINED for 137-373 mph range
    const capeComponent = capeNorm * 75;        // Adjusted from 78
    const stpComponent = stpNorm * 60;          // Adjusted from 62
    const vtpComponent = vtpNorm * 50;          // Adjusted from 52
    const lapseComponent = lapseNorm * 44;      // Maintained
    const srhComponent = srhNorm * 36;          // Adjusted from 38
    const speedComponent = speedNorm * 23;      // Adjusted from 24
    
    // Base wind calculation
    let baseWind = capeComponent + stpComponent + vtpComponent + lapseComponent + srhComponent + speedComponent;
    
    // Apply scaling factor - RETRAINED FOR 137-373 MPH RANGE
    baseWind = 137 + (baseWind * 0.62);  // New baseline: 137 mph minimum observed
    
    // Bonuses for extreme conditions - RETRAINED
    if (CAPE > 6000 && SRH > 600) baseWind += 20;  // Increased from 18
    if (CAPE > 8000) baseWind += 15;               // NEW: Very high CAPE (9178 observed)
    if (LAPSE_RATE_0_3 > 9.5 && CAPE > 5500) baseWind += 15;
    if (LAPSE_RATE_0_3 > 10) baseWind += 12;      // NEW: Extreme lapse
    if (VTP > 10) baseWind += 24;                  // Increased from 22
    if (STP > 35) baseWind += 20;                  // Increased from 18
    if (CAPE_3KM > 140 && LAPSE_RATE_0_3 > 9) baseWind += 12;  // Increased from 10
    if (CAPE_3KM > 160) baseWind += 10;           // NEW: Very high 3km CAPE
    if (STORM_SPEED > 75 && SRH > 600) baseWind += 16;  // Increased from 14
    if (STORM_SPEED > 85) baseWind += 14;        // Increased from 12
    if (SRH > 750) baseWind += 12;               // Increased from 10
    if (SRH > 800) baseWind += 10;               // NEW: Extreme rotation (834 observed)
    
    // ========================================================================
    // THERMAL WIND ADJUSTMENT
    // ========================================================================
    const thermal_mph = computeThermalWind_surfaceProxyFromData(data);
    
    // Apply thermal wind contribution
    const THERMAL_GAMMA_ADJUSTED = 0.6;
    const adjustedWindRaw = baseWind + THERMAL_GAMMA_ADJUSTED * thermal_mph;
    const adjustedWind = Math.max(0, Math.min(500, adjustedWindRaw));

    const uncertainty = baseWind * 0.24;  // INCREASED from 0.22 (slightly wider range)
    let est_min = Math.max(137, Math.round(baseWind - uncertainty));
    let est_max = Math.round(baseWind + uncertainty);
    
    // Apply realistic caps based on game data (observed max: 373 mph)
    est_min = Math.min(330, est_min);  // Increased from 320
    est_max = Math.min(380, est_max);
    
    // Ensure minimum range
    if (est_max - est_min < 18) {  // Increased from 15
      est_max = est_min + 18;
    }
    
    // Cap maximum range
    if (est_max - est_min > 60) {  // Increased from 55
      const mid = (est_min + est_max) / 2;
      est_min = Math.round(mid - 30);
      est_max = Math.round(mid + 30);
    }

    // ========================================================================
    // DETERMINE EF-SCALE RATING
    // Consider the range - if minimum is below EF5 threshold (200), 
    // use a weighted approach considering both min and max
    // ========================================================================
    let efScale = 'EF0';
    let efLabel = 'EF0 (65-85 mph)';

    // If the range crosses multiple EF scales, use the higher classification
    // but only if the minimum also supports it
    if (est_max >= 200 && est_min >= 165) {
      // Both min and max support EF5
      efScale = 'EF5';
      efLabel = 'EF5 (>200 mph)';
    } else if (est_max >= 200 && est_min >= 135) {
      // Max is EF5 but minimum is only EF3+ - call it EF4
      efScale = 'EF4';
      efLabel = 'EF4 (166-200 mph)';
    } else if (est_max >= 200 && est_min >= 110) {
      // Wide range - max EF5 but min only EF2+ - call it EF3
      efScale = 'EF3';
      efLabel = 'EF3 (136-165 mph)';
    } else if (est_max >= 165 && est_min >= 135) {
      // Solidly EF4 range
      efScale = 'EF4';
      efLabel = 'EF4 (166-200 mph)';
    } else if (est_max >= 165 && est_min >= 110) {
      // Max EF4 but min EF2+ - call it EF3
      efScale = 'EF3';
      efLabel = 'EF3 (136-165 mph)';
    } else if (est_max >= 135 && est_min >= 110) {
      // Solidly EF3 range
      efScale = 'EF3';
      efLabel = 'EF3 (136-165 mph)';
    } else if (est_max >= 135 && est_min >= 86) {
      // Max EF3 but min EF1+ - call it EF2
      efScale = 'EF2';
      efLabel = 'EF2 (111-135 mph)';
    } else if (est_max >= 110 && est_min >= 86) {
      // Solidly EF2 range
      efScale = 'EF2';
      efLabel = 'EF2 (111-135 mph)';
    } else if (est_max >= 110 && est_min >= 65) {
      // Max EF2 but min EF0+ - call it EF1
      efScale = 'EF1';
      efLabel = 'EF1 (86-110 mph)';
    } else if (est_max >= 86) {
      // At least some EF1 winds
      efScale = 'EF1';
      efLabel = 'EF1 (86-110 mph)';
    }

    // ========================================================================
    // THEORETICAL MAXIMUM FOR EXTREME CONDITIONS
    // RETRAINED: observed max 373 mph from 39 events
    // ========================================================================
    let theoretical = null;
    const isExtremeVTP = VTP >= 3;
    const isExtremeSTP = STP >= 11;
    const isExtremeConditions = CAPE > 7000 && SRH > 700 && LAPSE_RATE_0_3 > 10;  // Raised CAPE threshold
    const isHighWinds = est_max >= 250;
    
    if (isHighWinds && (isExtremeVTP || isExtremeSTP || isExtremeConditions)) {
      const theo_min = est_max + 18;  // Increased gap from 15
      const theo_max = Math.round(est_max * 1.20) + 45;  // Increased multiplier and offset
      
      const cappedMax = Math.min(480, theo_max);  // Increased from 450
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
      thermalContribution: Math.round(thermal_mph * 10) / 10,
      adjustedWind: Math.round(adjustedWind)
    };
  }

  /**
   * Calculate SPC Risk Level based on STP and VTP values
   * MRGL: STP 0-2, VTP 0-1
   * SLGT: STP 3-4, VTP 1
   * ENH: STP 5-6, VTP 1-2
   * MDT: STP 7-10, VTP 2
   * HIGH: STP 11+, VTP 3+
   */
  function calculate_risk_level(data) {
    // Get or calculate STP and VTP with PROPER CAPS
    let STP, VTP;
    if (data.STP !== undefined && data.STP !== null && data.STP !== '') {
      STP = Math.min(64, Math.max(0, parseFloat(data.STP))); // CAP: 0-64
    } else {
      const CAPE = data.CAPE || 0;
      const SRH = data.SRH || 0;
      const PWAT = data.PWAT || 0;
      STP = Math.min(64, Math.max(0, (CAPE / 1500) * (SRH / 150) * (PWAT / 1.5) * 10));
    }
    
    if (data.VTP !== undefined && data.VTP !== null && data.VTP !== '') {
      VTP = Math.min(16, Math.max(0, parseFloat(data.VTP))); // CAP: 0-16
    } else {
      const CAPE = data.CAPE || 0;
      const SRH = data.SRH || 0;
      const LAPSE_RATE_0_3 = data.LAPSE_RATE_0_3 || 0;
      VTP = Math.min(16, Math.max(0, (CAPE / 2000) * (SRH / 200) * (LAPSE_RATE_0_3 / 9) * 5));
    }

    // Determine risk level based on EXACT game thresholds
    let risk, color;
    
    // HIGH RISK: STP 11+ OR VTP 3+
    if (STP >= 11 || VTP >= 3) {
      risk = 'HIGH';
      color = '#e600ff';  // Magenta
    }
    // MODERATE RISK: STP 7-10 OR (VTP 2 AND STP >= 7)
    else if ((STP >= 7 && STP <= 10) || (VTP === 2 && STP >= 7)) {
      risk = 'MDT';
      color = '#ff0000';  // Red
    }
    // ENHANCED RISK: STP 5-6 (VTP 0, 1, or 2)
    else if (STP >= 5 && STP <= 6) {
      risk = 'ENH';
      color = '#ff8c00';  // Orange
    }
    // SLIGHT RISK: STP 3-4 (VTP 0 or 1)
    else if (STP >= 3 && STP <= 4) {
      risk = 'SLGT';
      color = '#ffff00';  // Yellow
    }
    // MARGINAL RISK: STP 1-2 (VTP 0 or 1)
    else if (STP >= 1 && STP <= 2) {
      risk = 'MRGL';
      color = '#00ff00';  // Green
    }
    // THUNDERSTORM: STP 0
    else {
      risk = 'TSTM';
      color = '#4d4dff';  // Blue
    }

    return {
      risk: risk,
      color: color,
      STP: Math.round(STP).toString(),
      VTP: Math.round(VTP).toString()
    };
  }

  window.TornadoCalculations = {
    calculate_probabilities: calculate_probabilities,
    estimate_wind: estimate_wind,
    calculate_risk_level: calculate_risk_level,
    computeThermalWind_surfaceProxyFromData: computeThermalWind_surfaceProxyFromData
  };

})();
