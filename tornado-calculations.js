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
    const CAPE_3KM = data.CAPE_3KM || 0;
    const RH_MID = data.RH_MID || 0;

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
    // SIDEWINDER PROBABILITY (REBALANCED)
    // Strong rotation + forward speed = long-track rotational tornado
    // ========================================================================
    if (SRH > 400) scores.SIDEWINDER += 20;
    if (SRH > 550) scores.SIDEWINDER += 18;
    if (STORM_SPEED > 55) scores.SIDEWINDER += 15;
    if (STORM_SPEED > 70) scores.SIDEWINDER += 12;
    if (CAPE > 2000 && CAPE < 5000) scores.SIDEWINDER += 15;
    if (LAPSE_RATE_0_3 > 8) scores.SIDEWINDER += 10;
    if (PWAT < 1.5) scores.SIDEWINDER += 10;
    if (SURFACE_RH < 75) scores.SIDEWINDER += 8;

    // ========================================================================
    // STOVEPIPE PROBABILITY (REBALANCED)
    // Extreme instability + tight rotation = violent narrow core
    // Lowered VTP threshold for more realistic occurrence
    // ========================================================================
    if (VTP > 1.5) scores.STOVEPIPE += 25;  // Lowered from 2
    if (VTP > 2.5) scores.STOVEPIPE += 20;
    if (CAPE > 3000) scores.STOVEPIPE += 18;
    if (CAPE > 4500) scores.STOVEPIPE += 15;
    if (SRH > 350) scores.STOVEPIPE += 15;
    if (LAPSE_RATE_0_3 > 9) scores.STOVEPIPE += 15;
    if (DEW_SPREAD < 5) scores.STOVEPIPE += 12;
    
    // Needs good but not excessive moisture
    if (PWAT > 1.0 && PWAT < 1.6) scores.STOVEPIPE += 10;

    // ========================================================================
    // WEDGE PROBABILITY (BALANCED)
    // High moisture + broad circulation + slower motion
    // ========================================================================
    if (PWAT > 1.5) scores.WEDGE += 22;
    if (PWAT > 1.8) scores.WEDGE += 20;
    if (PWAT > 2.1) scores.WEDGE += 15;
    if (SURFACE_RH > 75) scores.WEDGE += 18;
    if (SURFACE_RH > 85) scores.WEDGE += 12;
    if (RH_MID > 75) scores.WEDGE += 15;
    if (RH_MID > 85) scores.WEDGE += 12;
    if (CAPE > 3200 && CAPE < 6000) scores.WEDGE += 15;
    if (CAPE_3KM > 100) scores.WEDGE += 12;
    if (STORM_SPEED < 65) scores.WEDGE += 15;  // Slow-moving
    if (SRH > 400 && SRH < 600) scores.WEDGE += 12;
    if (DEW_SPREAD < 8) scores.WEDGE += 12;
    
    // Penalty for very fast motion (wedges are typically slow)
    if (STORM_SPEED > 65) scores.WEDGE -= 10;

    // ========================================================================
    // DRILLBIT PROBABILITY (ENHANCED)
    // Fast-moving + dry + high shear = thin drilling tornado
    // ========================================================================
    if (STORM_SPEED > 65) scores.DRILLBIT += 28;
    if (STORM_SPEED > 75) scores.DRILLBIT += 18;
    if (PWAT < 1.3) scores.DRILLBIT += 22;  // Raised threshold slightly
    if (PWAT < 0.9) scores.DRILLBIT += 15;  // Very dry
    if (DEW_SPREAD > 12) scores.DRILLBIT += 18;
    if (DEW_SPREAD > 18) scores.DRILLBIT += 12;  // Dry line scenario
    if (CAPE > 4500) scores.DRILLBIT += 12;
    if (SRH > 400) scores.DRILLBIT += 12;
    
    // Bonus for classic dry line setup
    if (STORM_SPEED > 50 && PWAT < 1.2 && DEW_SPREAD > 15) scores.DRILLBIT += 15;

    // ========================================================================
    // CONE PROBABILITY (REBALANCED)
    // Balanced parameters = classic cone tornado
    // ========================================================================
    if (STP > 0.8 && STP < 5) scores.CONE += 35;  // Broader STP range
    if (CAPE > 1500 && CAPE < 6000) scores.CONE += 20;  // Broader CAPE range
    if (SRH > 180 && SRH < 500) scores.CONE += 18;
    if (PWAT > 1.0 && PWAT < 1.8) scores.CONE += 15;
    if (LAPSE_RATE_0_3 > 6.5 && LAPSE_RATE_0_3 < 9.5) scores.CONE += 15;
    if (SURFACE_RH > 60 && SURFACE_RH < 85) scores.CONE += 10;
    if (STORM_SPEED > 40 && STORM_SPEED < 80) scores.CONE += 10;  // Moderate speed
    
    // Bonus for well-balanced environment
    if (STP > 1.5 && STP < 3.5 && CAPE > 4000 && SRH > 350) scores.CONE += 15;

    // ========================================================================
    // ROPE PROBABILITY (REBALANCED)
    // Weak, decaying conditions or marginal environments
    // Expanded CAPE range to include marginal severe weather
    // ========================================================================
    if (CAPE < 3000) scores.ROPE += 30;  // Expanded from 1500
    if (CAPE < 2000) scores.ROPE += 15;  // Extra boost for very low CAPE
    if (CAPE > 500 && CAPE < 1200) scores.ROPE += 10;
     if (SRH < 200) scores.ROPE += 20;
     if (PWAT < 1.0) scores.ROPE += 15;
     if (DEW_SPREAD > 15) scores.ROPE += 10;
     if (LAPSE_RATE_0_3 < 7) scores.ROPE += 10;
    
    // Additional conditions for rope tornadoes
    if (CAPE < 2500 && SRH < 250) scores.ROPE += 15;  // Weak instability + weak rotation
    if (CAPE > 1000 && CAPE < 2500 && PWAT < 1.3) scores.ROPE += 10;  // Marginal environment

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

    // Long-track tornado potential
    // High SRH + fast storm motion + sufficient instability
    if (SRH > 300 && STORM_SPEED > 35 && CAPE > 2000) {
      const longTrackChance = Math.min(85, Math.round(35 + (SRH - 300) / 15 + (STORM_SPEED - 35) / 3));
      factors.push({ name: 'Long-Track', chance: longTrackChance });
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
    const CAPE_3KM = data.CAPE_3KM || 0;

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

    // Base wind potential from CAPE (instability) - BUFFED +15%
    const capeComponent = Math.sqrt(CAPE / 1000) * 35;  // Increased from 30 to 35

    // Rotational component from SRH - BUFFED +15%
    const srhComponent = Math.sqrt(SRH / 100) * 29;  // Increased from 25 to 29

    // Low-level instability boost from lapse rate - BUFFED +15%
    const lapseComponent = (LAPSE_RATE_0_3 / 10) * 23;  // Increased from 20 to 23

    // Moisture component - BUFFED
    const moistureComponent = PWAT > 1.5 ? 12 : -3;  // Increased bonus, reduced penalty
    
    // Low-level CAPE bonus - BUFFED
    const capeBonus = CAPE_3KM > 100 ? 10 : 0;  // Increased from 8
    
    // Extreme instability bonus - NEW
    const extremeBonus = (CAPE > 5000 && SRH > 400) ? 8 : 0;

    // Combine components for base wind estimate
    let baseWind = capeComponent + srhComponent + lapseComponent + moistureComponent + capeBonus + extremeBonus;

    // Apply realistic bounds with improved range consistency
    let est_min = Math.max(65, Math.round(baseWind * 0.85));  // Changed from 0.88
    let est_max = Math.max(est_min + 15, Math.round(baseWind * 1.25));  // Changed from 1.12 for better extreme scaling

    // Cap at typical maximum (allow EF5+)
    est_min = Math.min(220, est_min);
    est_max = Math.min(250, est_max);
    
    // Ensure minimum gap but not too wide
    if (est_max - est_min < 15) {
      est_max = est_min + 15;
    }
    if (est_max - est_min > 35) {
      const mid = (est_min + est_max) / 2;
      est_min = Math.round(mid - 17);
      est_max = Math.round(mid + 18);
    }

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
