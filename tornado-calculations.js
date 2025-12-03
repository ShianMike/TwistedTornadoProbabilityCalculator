/**
 * TORNADO CALCULATIONS MODULE
 * Calculates tornado probabilities and wind speed estimates
 * Based on atmospheric parameters and meteorological indices
 */

(function() {
  'use strict';

  /**
   * Calculate tornado morphology probabilities
   * Uses atmospheric parameters to determine likelihood of each tornado type
   * @param {Object} data - Atmospheric parameters (CAPE, SRH, PWAT, etc.)
   * @returns {Object} Object containing tornado types and special factors
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

    // Calculate derived indices

    // Significant Tornado Parameter (STP)
    // Combines CAPE, SRH, and low-level moisture
    const STP = (CAPE / 1500) * (SRH / 150) * (PWAT / 1.5);

    // Violent Tornado Parameter (VTP)
    // Emphasizes extreme instability and rotation
    const VTP = (CAPE / 2000) * (SRH / 200) * (LAPSE_RATE_0_3 / 9);

    // Moisture availability (dew point spread)
    const DEW_SPREAD = Math.max(0, TEMP - DEWPOINT);

    // Initialize probability scores for each tornado type
    let scores = {
      SIDEWINDER: 0,
      STOVEPIPE: 0,
      WEDGE: 0,
      DRILLBIT: 0,
      CONE: 0,
      ROPE: 0
    };

    // ========================================================================
    // SIDEWINDER PROBABILITY
    // Favors strong rotation (SRH) and faster storm motion
    // ========================================================================
    if (SRH > 200) scores.SIDEWINDER += 25;
    if (SRH > 400) scores.SIDEWINDER += 15;
    if (STORM_SPEED > 30) scores.SIDEWINDER += 15;
    if (STORM_SPEED > 50) scores.SIDEWINDER += 10;
    if (CAPE > 2000 && CAPE < 4000) scores.SIDEWINDER += 10;
    if (LAPSE_RATE_0_3 > 8) scores.SIDEWINDER += 10;

    // ========================================================================
    // STOVEPIPE PROBABILITY
    // Requires extreme instability and very high VTP
    // ========================================================================
    if (VTP > 2) scores.STOVEPIPE += 30;
    if (CAPE > 3500) scores.STOVEPIPE += 20;
    if (SRH > 300) scores.STOVEPIPE += 15;
    if (LAPSE_RATE_0_3 > 9) scores.STOVEPIPE += 15;
    if (DEW_SPREAD < 5) scores.STOVEPIPE += 10;

    // ========================================================================
    // WEDGE PROBABILITY
    // Favors high moisture, moderate CAPE, and rain-wrapped conditions
    // ========================================================================
    if (PWAT > 1.5) scores.WEDGE += 25;
    if (PWAT > 2.0) scores.WEDGE += 15;
    if (SURFACE_RH > 75) scores.WEDGE += 15;
    if (CAPE > 1500 && CAPE < 3500) scores.WEDGE += 15;
    if (STORM_SPEED < 35) scores.WEDGE += 10;
    if (SRH > 150 && SRH < 400) scores.WEDGE += 10;

    // ========================================================================
    // DRILLBIT PROBABILITY
    // Favors fast-moving storms with lower moisture
    // ========================================================================
    if (STORM_SPEED > 40) scores.DRILLBIT += 25;
    if (STORM_SPEED > 60) scores.DRILLBIT += 15;
    if (PWAT < 1.2) scores.DRILLBIT += 20;
    if (DEW_SPREAD > 10) scores.DRILLBIT += 15;
    if (CAPE > 2500) scores.DRILLBIT += 10;
    if (SRH > 250) scores.DRILLBIT += 10;

    // ========================================================================
    // CONE PROBABILITY
    // Classic balanced tornado - moderate values across parameters
    // ========================================================================
    if (STP > 1 && STP < 4) scores.CONE += 30;
    if (CAPE > 1500 && CAPE < 3500) scores.CONE += 15;
    if (SRH > 150 && SRH < 350) scores.CONE += 15;
    if (PWAT > 1.0 && PWAT < 1.8) scores.CONE += 10;
    if (LAPSE_RATE_0_3 > 7 && LAPSE_RATE_0_3 < 9.5) scores.CONE += 10;

    // ========================================================================
    // ROPE PROBABILITY
    // Weak, decaying conditions or marginal environments
    // ========================================================================
    if (CAPE < 1500) scores.ROPE += 30;
    if (CAPE > 500 && CAPE < 1000) scores.ROPE += 10;
    if (SRH < 200) scores.ROPE += 20;
    if (PWAT < 1.0) scores.ROPE += 15;
    if (DEW_SPREAD > 15) scores.ROPE += 10;
    if (LAPSE_RATE_0_3 < 7) scores.ROPE += 10;

    // ========================================================================
    // NORMALIZE PROBABILITIES
    // Convert raw scores to percentages
    // ========================================================================
    const totalScore = Object.values(scores).reduce((sum, val) => sum + val, 0);
    
    let probabilities = {};
    if (totalScore > 0) {
      // Convert to percentages
      Object.keys(scores).forEach(type => {
        probabilities[type] = Math.round((scores[type] / totalScore) * 100);
      });
    } else {
      // No significant tornado potential - default to ROPE
      probabilities = {
        SIDEWINDER: 0,
        STOVEPIPE: 0,
        WEDGE: 0,
        DRILLBIT: 0,
        CONE: 10,
        ROPE: 90
      };
    }

    // ========================================================================
    // CALCULATE SPECIAL FACTORS
    // Additional hazards and phenomena
    // ========================================================================
    const factors = [];

    // Rain-wrap probability (reduces visibility)
    if (PWAT > 1.5) {
      const rainWrapChance = Math.min(95, Math.round(30 + (PWAT - 1.5) * 40));
      factors.push({ name: 'Rain-Wrap', chance: rainWrapChance });
    }

    // Large hail probability
    if (CAPE > 2500 && LAPSE_RATE_0_3 > 8) {
      const hailChance = Math.min(90, Math.round(40 + (CAPE - 2500) / 50));
      factors.push({ name: 'Large Hail', chance: hailChance });
    }

    // Multiple vortices (satellite tornadoes)
    if (SRH > 400 && VTP > 2) {
      const multiVortexChance = Math.min(80, Math.round(25 + (SRH - 400) / 10));
      factors.push({ name: 'Multiple Vortices', chance: multiVortexChance });
    }

    // Lightning frequency
    if (CAPE > 3000) {
      const lightningChance = Math.min(95, Math.round(50 + (CAPE - 3000) / 40));
      factors.push({ name: 'Frequent Lightning', chance: lightningChance });
    }

    // Low visibility due to heavy rain
    if (PWAT > 1.8 && SURFACE_RH > 80) {
      factors.push({ name: 'Low Visibility', chance: 75 });
    }

    // Format output for chart rendering
    const types = Object.keys(probabilities).map(type => ({
      Type: type,
      Prob: probabilities[type]
    }));

    return {
      types: types,
      factors: factors
    };
  }

  /**
   * Estimate tornado wind speeds
   * Calculates Enhanced Fujita scale estimate based on atmospheric parameters
   * @param {Object} data - Atmospheric parameters
   * @returns {Object} Wind estimate with min/max speeds and EF-scale label
   */
  function estimate_wind(data) {
    const CAPE = data.CAPE || 0;
    const SRH = data.SRH || 0;
    const LAPSE_RATE_0_3 = data.LAPSE_RATE_0_3 || 0;
    const PWAT = data.PWAT || 0;

    // No tornado if CAPE is too low
    if (CAPE < 500) {
      return {
        est_min: 0,
        est_max: 0,
        label: 'No tornado potential',
        theoretical: null
      };
    }

    // Calculate composite indices for wind estimation

    // Base wind potential from CAPE (instability)
    const capeComponent = Math.sqrt(CAPE / 1000) * 30;

    // Rotational component from SRH
    const srhComponent = Math.sqrt(SRH / 100) * 25;

    // Low-level instability boost from lapse rate
    const lapseComponent = (LAPSE_RATE_0_3 / 10) * 20;

    // Moisture component (can enhance or reduce wind)
    const moistureComponent = PWAT > 1.5 ? 10 : -5;

    // Combine components for base wind estimate
    let baseWind = capeComponent + srhComponent + lapseComponent + moistureComponent;

    // Apply realistic bounds (65-200 mph typical range)
    let est_min = Math.max(65, Math.round(baseWind * 0.8));
    let est_max = Math.max(est_min + 20, Math.round(baseWind * 1.2));

    // Cap at typical maximum
    est_min = Math.min(200, est_min);
    est_max = Math.min(200, est_max);

    // ========================================================================
    // DETERMINE EF-SCALE RATING
    // Enhanced Fujita scale based on wind speeds
    // ========================================================================
    let efScale = 'EF0';
    let efLabel = 'EF0 (65-85 mph)';

    if (est_max >= 86 && est_max < 110) {
      efScale = 'EF1';
      efLabel = 'EF1 (86-110 mph)';
    } else if (est_max >= 110 && est_max < 135) {
      efScale = 'EF2';
      efLabel = 'EF2 (111-135 mph)';
    } else if (est_max >= 135 && est_max < 165) {
      efScale = 'EF3';
      efLabel = 'EF3 (136-165 mph)';
    } else if (est_max >= 165 && est_max < 200) {
      efScale = 'EF4';
      efLabel = 'EF4 (166-200 mph)';
    } else if (est_max >= 200) {
      efScale = 'EF5';
      efLabel = 'EF5 (>200 mph)';
    }

    // ========================================================================
    // THEORETICAL MAXIMUM FOR EXTREME CONDITIONS
    // Calculate potential for winds beyond EF5 threshold
    // ========================================================================
    let theoretical = null;
    if (CAPE > 4500 && SRH > 450 && LAPSE_RATE_0_3 > 9.5) {
      // Extreme conditions - theoretical winds beyond measured EF5
      const theo_min = Math.round(est_max * 1.1);
      const theo_max = Math.round(est_max * 1.3);
      theoretical = {
        theo_min: Math.min(250, theo_min),
        theo_max: Math.min(300, theo_max)
      };
    }

    return {
      est_min: est_min,
      est_max: est_max,
      label: efLabel,
      efScale: efScale,
      theoretical: theoretical
    };
  }

  // Export functions to global scope
  window.TornadoCalculations = {
    calculate_probabilities: calculate_probabilities,
    estimate_wind: estimate_wind
  };

})();
