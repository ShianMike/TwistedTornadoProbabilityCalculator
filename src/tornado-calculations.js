/**
 * TORNADO CALCULATIONS MODULE
 * Empirical regression model calibrated on tornado event data
 * Uses weighted feature contributions + hodograph geometry integration
 */

(function() {
  'use strict';

  // ========================================================================
  // EMPIRICAL REGRESSION MODEL
  // ========================================================================
  // Hand-tuned weights derived from correlation analysis of tornado events
  // This is NOT a true ML model - it's a rule-based additive regression
  const EMPIRICAL_MODEL = {
    // Feature normalization ranges (observed data bounds)
    normRanges: {
      CAPE: 7000,
      SRH: 800,
      LAPSE_0_3: 12,
      LAPSE_3_6: 12,
      CAPE_3KM: 5000,
      TVS_PEAKS: 8
    },
    // Weights calibrated to produce realistic wind estimates
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

  /**
   * Predict windspeed using empirical weighted regression
   * @param {Object} data - Atmospheric data
   * @returns {number} Predicted windspeed in mph
   */
  function predictWindspeedEmpirical(data) {
    const M = EMPIRICAL_MODEL;
    
    // Normalize features to 0-1 range
    const capeNorm = Math.min(1.0, (data.CAPE || 0) / M.normRanges.CAPE);
    const srhNorm = Math.min(1.0, (data.SRH || 0) / M.normRanges.SRH);
    const lapseNorm = Math.min(1.0, (data.LAPSE_RATE_0_3 || 0) / M.normRanges.LAPSE_0_3);
    const lapseHighNorm = Math.min(1.0, (data.LAPSE_RATE_3_6 || 0) / M.normRanges.LAPSE_3_6);
    const cape3Norm = Math.min(1.0, (data.CAPE_3KM || 0) / M.normRanges.CAPE_3KM);
    const tvsNorm = Math.min(1.0, (data.TVS_PEAKS || 0) / M.normRanges.TVS_PEAKS);
    
    // Weighted sum
    let prediction = M.baseWind;
    prediction += lapseHighNorm * M.weights.LAPSE_3_6;
    prediction += lapseNorm * M.weights.LAPSE_0_3;
    prediction += srhNorm * M.weights.SRH;
    prediction += cape3Norm * M.weights.CAPE_3KM;
    prediction += capeNorm * M.weights.CAPE;
    prediction += tvsNorm * M.weights.TVS_PEAKS;
    
    // Apply baroclinic proxy bonus for extreme conditions
    const baroclinicBonus = computeBaroclinicProxy(data) * 0.15;
    prediction += baroclinicBonus;
    
    // Clamp to reasonable bounds
    return Math.max(50, Math.min(400, prediction));
  }

  // ========================================================================
  // BAROCLINIC FORCING PROXY
  // ========================================================================
  // NOTE: This is a GAME MECHANIC that estimates forcing strength from
  // available parameters. It is NOT a physical thermal wind calculation.
  // Real thermal wind requires actual temperature gradient measurements.
  
  const BAROCLINIC_BETA = 1.2;     // scaling factor
  const BAROCLINIC_H_EFF_KM = 6;   // effective depth in km

  /**
   * Estimate forcing proxy from available meteorological data
   * This is a game mechanic, not real physics
   * @param {Object} data - Meteorological data
   * @returns {Object} Estimated proxy gradients
   */
  function estimateForcingProxy(data) {
    // If explicit gradients provided, use them
    if (data.GRAD_TX !== undefined && data.GRAD_TZ !== undefined) {
      return { GRAD_TX: data.GRAD_TX, GRAD_TZ: data.GRAD_TZ };
    }

    const TEMP = data.TEMP || 0;
    const DEWPOINT = data.DEWPOINT || 0;
    const STORM_SPEED = data.STORM_SPEED || 0;
    const SRH = data.SRH || 0;
    const LAPSE_RATE_0_3 = data.LAPSE_RATE_0_3 || 0;
    const DEW_SPREAD = Math.max(0, TEMP - DEWPOINT);

    // Combine indicators of strong forcing
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
   * This is a GAME MECHANIC for estimating atmospheric forcing
   */
  function computeBaroclinicProxy(data) {
    const estimated = estimateForcingProxy(data);
    const gradMag = Math.sqrt(estimated.GRAD_TX ** 2 + estimated.GRAD_TZ ** 2);
    const gradKperkm = gradMag * 1000.0;
    const dV_ms = BAROCLINIC_BETA * BAROCLINIC_H_EFF_KM * gradKperkm;
    return dV_ms * 2.23694; // convert to mph
  }

  /**
   * Calculate tornado morphology probabilities
   * Uses atmospheric parameters + hodograph geometry when available
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
    // HODOGRAPH GEOMETRY INTEGRATION
    // ========================================================================
    // Read hodograph metrics from global state if available and confident
    const hodo = window.HODOGRAPH_DATA || {};
    const hodoConf = hodo.HODO_CONF || 0;
    const useHodo = hodoConf >= 0.6; // Only trust hodograph data if confidence >= 60%
    
    const HODO_CURVATURE = useHodo ? (hodo.HODO_CURVATURE || 1.0) : 1.0;
    const HODO_TURNING = useHodo ? (hodo.HODO_TURNING || 0) : 0;
    const HODO_NET_TURNING = useHodo ? (hodo.HODO_NET_TURNING || 0) : 0;
    const HODO_KINK = useHodo ? (hodo.HODO_KINK || 0) : 0;
    const HODO_EXTENSION = useHodo ? (hodo.HODO_EXTENSION || 0.5) : 0.5;
    const HODO_COMPACTNESS = useHodo ? (hodo.HODO_COMPACTNESS || 0.5) : 0.5;
    const HODO_SHAPE = useHodo ? (hodo.HODO_SHAPE || '') : '';
    const HODO_HAS_LOOP = useHodo ? (hodo.HODO_HAS_LOOP || false) : false;

    // ========================================================================
    // COMPUTE BAROCLINIC FORCING PROXY
    // ========================================================================
    const baroclinic_mph = computeBaroclinicProxy(data);

    let scores = {
      ROPE: 0,              // Thin, weak tornadoes
      CONE: 0,              // Classic funnel shape
      STOVEPIPE: 0,         // Stovepipe tornadoes
      WEDGE: 0,             // Wide tornadoes
      DRILLBIT: 0,          // Fast-moving, narrow tornadoes
      SIDEWINDER: 0         // Rotational, narrow tornadoes in cold/dry environments
    };

    // ========================================================================
    // REALISTIC TORNADO MORPHOLOGY CLASSIFICATION
    // Based on meteorological research and ML analysis of 121 tornado events
    // Classifications match real-world tornado science and damage patterns
    // ========================================================================

    // ROPE TORNADOES: Thin, weak tornadoes (typically EF0-EF1, <100 mph)
    // Characteristics: Low CAPE, weak rotation, marginal atmospheric conditions
    // Common in: Weakening supercells, marginal environments, dissipating stage
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
    // Marginal conditions favor rope tornadoes
    if (CAPE < 2000 && SRH < 200 && VTP < 1) scores.ROPE += 30;
    // Baseline viability in any conditions (weak ropes can occur even in strong environments)
    scores.ROPE += 8;

    // CONE TORNADOES: Classic funnel shape (typically EF1-EF3, 86-165 mph)
    // Characteristics: Moderate instability and rotation, balanced atmospheric conditions
    // Most common tornado type in supercells
    if (CAPE > 2500 && CAPE < 5000) scores.CONE += 35;
    if (CAPE > 4000 && CAPE < 7000) scores.CONE += 25;  // Extended upper range
    if (SRH > 200 && SRH < 500) scores.CONE += 30;
    if (SRH > 400 && SRH < 700) scores.CONE += 20;      // Extended upper range
    if (LAPSE_RATE_0_3 > 7 && LAPSE_RATE_0_3 < 9.5) scores.CONE += 25;
    if (LAPSE_RATE_0_3 > 9) scores.CONE += 15;          // Steep lapse bonus
    if (STP > 5 && STP < 20) scores.CONE += 30;
    if (STP > 15 && STP < 25) scores.CONE += 15;        // Higher STP bonus
    if (VTP > 2 && VTP < 7) scores.CONE += 20;
    if (PWAT > 1.0 && PWAT < 1.8) scores.CONE += 15;
    if (SURFACE_RH > 50 && SURFACE_RH < 75) scores.CONE += 10;
    if (STORM_SPEED > 40 && STORM_SPEED < 70) scores.CONE += 10;
    // Balanced atmospheric conditions favor cone tornadoes
    if (CAPE > 3000 && SRH > 250 && VTP > 3 && VTP < 6) scores.CONE += 20;
    // Strong instability + rotation combo (like your scenario)
    if (CAPE > 5000 && SRH > 500) scores.CONE += 25;

    // WEDGE TORNADOES: Very wide, often violent tornadoes (typically EF3-EF5, 136+ mph)
    // Characteristics: High moisture, slow storm motion, extreme width (>0.5 mile)
    // BUT can also occur in dry environments with extreme instability
    if (PWAT > 1.6) scores.WEDGE += 60;
    if (PWAT > 2.0) scores.WEDGE += 50;
    if (SURFACE_RH > 75) scores.WEDGE += 45;
    if (RH_MID > 80) scores.WEDGE += 40;
    if (RH_MID > 90) scores.WEDGE += 30;
    if (DEW_SPREAD < 10) scores.WEDGE += 35;         // High moisture content
    if (STORM_SPEED < 50) scores.WEDGE += 40;        // Slow-moving storms
    if (STORM_SPEED < 40) scores.WEDGE += 30;
    if (CAPE > 3000) scores.WEDGE += 30;
    if (CAPE > 6000) scores.WEDGE += 45;             // Very high CAPE can produce dry wedges
    if (CAPE > 7000) scores.WEDGE += 35;             // Extreme CAPE bonus
    if (STP > 10) scores.WEDGE += 30;
    if (STP > 15) scores.WEDGE += 25;                // High STP bonus
    if (CAPE_3KM > 80) scores.WEDGE += 25;
    if (VTP > 5) scores.WEDGE += 25;                 // Still need some rotation
    // Optimal wedge conditions: high moisture + moderate-strong instability
    if (PWAT > 1.8 && SURFACE_RH > 80 && STORM_SPEED < 45) scores.WEDGE += 45;
    // NEW: Dry wedge conditions - extreme instability can overcome dry air
    if (CAPE > 6500 && SRH > 500 && VTP > 4) scores.WEDGE += 50;
    // Penalties for dry conditions or fast motion (reduced for high CAPE scenarios)
    if (STORM_SPEED > 70) scores.WEDGE -= 25;
    if (PWAT < 1.2 && CAPE < 5000) scores.WEDGE -= 30;  // Only penalize dry if CAPE not extreme
    if (DEW_SPREAD > 15 && CAPE < 6000) scores.WEDGE -= 20;  // Only penalize large spread if CAPE not extreme

    // STOVEPIPE TORNADOES: Cylindrical, strong tornadoes (stovepipe shape)
    // Characteristics: High instability, strong rotation, steep lapse rates
    // Often associated with violent supercells
    if (VTP > 6) scores.STOVEPIPE += 45;
    if (VTP > 9) scores.STOVEPIPE += 35;
    if (LAPSE_RATE_0_3 > 8.5) scores.STOVEPIPE += 40;
    if (LAPSE_RATE_0_3 > 9.5) scores.STOVEPIPE += 30;
    if (CAPE > 4000) scores.STOVEPIPE += 35;
    if (CAPE > 5500) scores.STOVEPIPE += 25;
    if (CAPE > 6500) scores.STOVEPIPE += 30;             // Very high CAPE bonus
    if (SRH > 400) scores.STOVEPIPE += 30;
    if (SRH > 600) scores.STOVEPIPE += 20;
    if (STP > 15) scores.STOVEPIPE += 25;
    if (STP > 18) scores.STOVEPIPE += 20;                // High STP bonus
    if (CAPE_3KM > 100) scores.STOVEPIPE += 15;
    if (PWAT > 1.0 && PWAT < 1.7) scores.STOVEPIPE += 15;
    // High rotation + instability combination
    if (VTP > 7 && SRH > 500 && CAPE > 4500) scores.STOVEPIPE += 30;
    // Very high instability scenario (like yours)
    if (CAPE > 6000 && SRH > 500) scores.STOVEPIPE += 35;
    // Penalty for excessive moisture (favors wedge instead)
    if (PWAT > 2.0) scores.STOVEPIPE -= 20;

    // DRILLBIT TORNADOES: Fast-moving, narrow tornadoes (game type)
    // Characteristics: High storm speed, often in dry environments
    if (STORM_SPEED > 70) scores.DRILLBIT += 35;
    if (STORM_SPEED > 85) scores.DRILLBIT += 25;
    if (PWAT < 1.3) scores.DRILLBIT += 30;
    if (PWAT < 1.0) scores.DRILLBIT += 20;
    if (PWAT < 0.5) scores.DRILLBIT += 15;              // Very dry bonus
    if (DEW_SPREAD > 15) scores.DRILLBIT += 20;
    if (DEW_SPREAD > 20) scores.DRILLBIT += 10;         // Large spread bonus
    if (SURFACE_RH < 60) scores.DRILLBIT += 15;
    if (SURFACE_RH < 50) scores.DRILLBIT += 10;         // Very dry surface
    if (SRH > 400) scores.DRILLBIT += 20;
    if (SRH > 600) scores.DRILLBIT += 15;               // High rotation bonus
    if (CAPE > 3000 && CAPE < 5500) scores.DRILLBIT += 15;
    if (CAPE > 5000) scores.DRILLBIT += 20;             // High CAPE in dry environment
    if (VTP > 4) scores.DRILLBIT += 10;
    // Fast + dry conditions favor drillbit
    if (STORM_SPEED > 80 && PWAT < 1.2 && DEW_SPREAD > 12) scores.DRILLBIT += 30;
    // Dry + high instability/rotation (like your scenario)
    if (PWAT < 0.5 && CAPE > 4000 && SRH > 500) scores.DRILLBIT += 30;

    // SIDEWINDER TORNADOES: Fast-moving, kinked/elongated hodograph, lateral translation
    // Characteristics: High storm speed, kinked hodograph, strong shear, poor vertical coherence
    // NOT temperature-dependent - can occur in warm environments with right kinematics
    
    // Primary driver: FAST STORM MOTION
    if (STORM_SPEED > 55) scores.SIDEWINDER += 30;
    if (STORM_SPEED > 70) scores.SIDEWINDER += 25;
    if (STORM_SPEED > 85) scores.SIDEWINDER += 20;
    
    // Primary driver: STRONG SHEAR/ROTATION
    if (SRH > 400) scores.SIDEWINDER += 30;
    if (SRH > 600) scores.SIDEWINDER += 25;
    if (SRH > 800) scores.SIDEWINDER += 15;
    
    // Note: Hodograph geometry adjustments are now in the unified hodograph block below
    // This keeps all hodograph logic in one place with proper capping
    
    // Secondary: dry conditions can enhance but aren't required
    if (DEW_SPREAD > 15) scores.SIDEWINDER += 10;
    if (SURFACE_RH < 55) scores.SIDEWINDER += 10;
    
    // Moderate instability sweet spot (not too weak, not wedge-extreme)
    if (VTP > 4 && VTP < 10) scores.SIDEWINDER += 15;
    
    // Fast + high shear combination
    if (STORM_SPEED > 65 && SRH > 500) scores.SIDEWINDER += 20;
    
    // Penalty for slow-moving storms (favors other types)
    if (STORM_SPEED < 40) scores.SIDEWINDER -= 30;
    // Penalty for excessive moisture (favors wedge)
    if (PWAT > 2.0) scores.SIDEWINDER -= 15;

    // ========================================================================
    // HODOGRAPH GEOMETRY ADJUSTMENTS (when confident)
    // Cap hodograph influence to ±35 per type so thermos still dominate
    // ========================================================================
    if (useHodo) {
      // Helper to clamp hodograph bonus
      const clamp = (val, lo, hi) => Math.max(lo, Math.min(hi, val));
      
      // --- ROPE: weak/linear shear, poorly organized ---
      let ropeHodoBonus = 0;
      if (HODO_EXTENSION < 0.45) ropeHodoBonus += 15;  // Short/weak shear
      if (HODO_TURNING < 60) ropeHodoBonus += 12;      // Little turning
      if (HODO_CURVATURE < 1.12 && HODO_KINK < 45) ropeHodoBonus += 10;  // Boring/linear
      if (HODO_HAS_LOOP || HODO_TURNING > 160) ropeHodoBonus -= 20;  // Too organized
      scores.ROPE += clamp(ropeHodoBonus, -35, 35);
      
      // --- CONE: clean continuous curvature, no extreme loopiness ---
      let coneHodoBonus = 0;
      if (HODO_CURVATURE >= 1.15 && HODO_CURVATURE <= 1.35) coneHodoBonus += 15;
      if (HODO_TURNING >= 100 && HODO_TURNING <= 220) coneHodoBonus += 12;
      if (HODO_KINK < 60) coneHodoBonus += 8;  // Smooth
      if (HODO_EXTENSION >= 0.45 && HODO_EXTENSION <= 0.65) coneHodoBonus += 8;
      if (HODO_HAS_LOOP) coneHodoBonus -= 15;  // Push to stovepipe/wedge
      if (HODO_KINK > 75) coneHodoBonus -= 12;  // Push to sidewinder
      if (HODO_EXTENSION > 0.75 && HODO_CURVATURE < 1.2) coneHodoBonus -= 10;  // Push to drillbit/sidewinder
      scores.CONE += clamp(coneHodoBonus, -35, 35);
      
      // --- STOVEPIPE: strong tight organization (large turning + compact) ---
      let stovepipeHodoBonus = 0;
      if (HODO_TURNING > 170) stovepipeHodoBonus += 15;
      if (HODO_CURVATURE > 1.28) stovepipeHodoBonus += 12;
      if (HODO_COMPACTNESS > 0.58) stovepipeHodoBonus += 10;  // Tight/packed
      if (HODO_EXTENSION >= 0.55 && HODO_EXTENSION <= 0.75) stovepipeHodoBonus += 8;
      if (HODO_HAS_LOOP && PWAT < 1.8) stovepipeHodoBonus += 12;  // Loop + not screaming wedge
      if (HODO_COMPACTNESS < 0.48) stovepipeHodoBonus -= 15;  // Too spread
      scores.STOVEPIPE += clamp(stovepipeHodoBonus, -35, 35);
      
      // --- WEDGE: extreme organization + big footprint ---
      let wedgeHodoBonus = 0;
      if (HODO_HAS_LOOP || HODO_TURNING > 220) wedgeHodoBonus += 15;
      if (HODO_EXTENSION > 0.65) wedgeHodoBonus += 12;
      if (HODO_CURVATURE > 1.30) wedgeHodoBonus += 10;
      if (HODO_COMPACTNESS > 0.55) wedgeHodoBonus += 8;
      if (HODO_EXTENSION < 0.55) wedgeHodoBonus -= 12;  // Hard to justify big mode
      if (HODO_KINK > 80) wedgeHodoBonus -= 10;  // Messy → sidewinder
      scores.WEDGE += clamp(wedgeHodoBonus, -35, 35);
      
      // --- DRILLBIT: elongated/linear fast-shear, low curvature ---
      let drillbitHodoBonus = 0;
      if (HODO_CURVATURE < 1.18) drillbitHodoBonus += 15;
      if (HODO_EXTENSION > 0.65) drillbitHodoBonus += 12;
      if (HODO_TURNING < 120) drillbitHodoBonus += 10;  // Low-moderate turning
      if (HODO_COMPACTNESS < 0.55) drillbitHodoBonus += 8;  // Spread out
      if (HODO_HAS_LOOP || HODO_CURVATURE > 1.30) drillbitHodoBonus -= 18;  // Push to organized types
      // Separation from SIDEWINDER: penalize drillbit when kinked (push to sidewinder)
      if (HODO_KINK > 60) drillbitHodoBonus -= 15;
      scores.DRILLBIT += clamp(drillbitHodoBonus, -35, 35);
      
      // --- SIDEWINDER: kinked/segmented, fast, not vertically coherent ---
      let sidewinderHodoBonus = 0;
      if (HODO_SHAPE === 'KINKED') sidewinderHodoBonus += 25;  // Strong signal
      else if (HODO_KINK > 70) sidewinderHodoBonus += 20;
      else if (HODO_KINK > 50) sidewinderHodoBonus += 12;
      if (HODO_EXTENSION > 0.60 && HODO_CURVATURE < 1.30) sidewinderHodoBonus += 12;
      if (HODO_COMPACTNESS < 0.52) sidewinderHodoBonus += 10;
      if (HODO_HAS_LOOP) sidewinderHodoBonus -= 25;  // Push to stovepipe/wedge
      if (HODO_CURVATURE > 1.40) sidewinderHodoBonus -= 15;  // Too wrapped
      // Separation from DRILLBIT: sidewinder needs kink OR messy geometry
      if (HODO_KINK < 40 && HODO_CURVATURE < 1.15) sidewinderHodoBonus -= 10;  // Classic dryline bullet → drillbit
      scores.SIDEWINDER += clamp(sidewinderHodoBonus, -35, 35);
    }

    // ========================================================================
    // BAROCLINIC FORCING PROXY ADJUSTMENTS
    // ========================================================================
    
    // Strong forcing favors violent, narrow tornadoes
    if (baroclinic_mph > 30) {
      scores.STOVEPIPE += 25;
      scores.SIDEWINDER += 15;
    } else if (baroclinic_mph > 15) {
      scores.STOVEPIPE += 15;
      scores.CONE += 10;
      scores.SIDEWINDER += 10;
    } else if (baroclinic_mph < 6) {
      // Weak forcing favors wider, moisture-driven tornadoes
      scores.WEDGE += 15;
      scores.ROPE += 8;
    }

    // ========================================================================
    // CROSS-PENALTIES AND BONUSES (based on observed conflicts)
    // ========================================================================
    
    // Very high VTP + extreme lapse → STOVEPIPE, not CONE
    if (VTP > 10 && LAPSE_RATE_0_3 > 9.5) {
      scores.STOVEPIPE += 25;
      scores.CONE -= 20;
      scores.ROPE -= 30;
    }
    
    // Extreme moisture → WEDGE, reduce other types
    if (PWAT > 2.0 && RH_MID > 85) {
      scores.WEDGE += 30;
      scores.STOVEPIPE -= 15;
      scores.ROPE -= 10;
    }
    
    // Extreme instability + rotation → STOVEPIPE favored
    if (VTP > 9 && SRH > 700 && CAPE > 5500) {
      scores.STOVEPIPE += 15;
      scores.CONE -= 15;
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
    // NORMALIZE PROBABILITIES (Largest Remainder Method for exact 100% sum)
    // ========================================================================
    const totalScore = Object.values(scores).reduce((sum, val) => sum + Math.max(0, val), 0);
    
    let probabilities = {};
    if (totalScore > 0) {
      // Calculate raw fractions and floor values
      const types = Object.keys(scores);
      const rawFractions = types.map(type => {
        const frac = (Math.max(0, scores[type]) / totalScore) * 100;
        return { type, frac, floor: Math.floor(frac), remainder: frac - Math.floor(frac) };
      });
      
      // Assign floor values first
      rawFractions.forEach(item => {
        probabilities[item.type] = item.floor;
      });
      
      // Distribute remainder to largest fractional parts
      let remaining = 100 - rawFractions.reduce((sum, item) => sum + item.floor, 0);
      rawFractions.sort((a, b) => b.remainder - a.remainder);
      for (let i = 0; i < remaining && i < rawFractions.length; i++) {
        probabilities[rawFractions[i].type]++;
      }
    } else {
      // Fallback when all scores are zero/negative
      const isExtreme = (CAPE > 5000 && SRH > 400) || STP > 15 || VTP > 5;
      
      if (isExtreme) {
        probabilities = { ROPE: 10, CONE: 28, STOVEPIPE: 24, WEDGE: 24, DRILLBIT: 10, SIDEWINDER: 4 };
      } else {
        probabilities = { ROPE: 25, CONE: 20, STOVEPIPE: 15, WEDGE: 20, DRILLBIT: 12, SIDEWINDER: 8 };
      }
    }

    // ========================================================================
    // SPECIAL FACTORS
    // ========================================================================
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

    // Multiple vortices - MORE REALISTIC CONDITIONS
    let multiVortexChance = 0;
    if (SRH > 300 && CAPE > 2000) {
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
    } else if (SRH > 200 && CAPE > 1500) {
      // Lower threshold for some chance
      multiVortexChance = Math.max(5, Math.round(10 + (SRH - 200) / 30));
    }
    multiVortexChance = Math.min(85, multiVortexChance);
    if (multiVortexChance > 0) {
      factors.push({ name: 'Multiple Vortices', chance: multiVortexChance });
    }

    // Dust vortices - dry environment with high winds
    let dustVortexChance = 0;
    if (DEW_SPREAD > 15 && STORM_SPEED > 60 && SURFACE_RH < 50) {
      dustVortexChance = Math.min(80, Math.round(30 + (DEW_SPREAD - 15) * 3));
    } else if (DEW_SPREAD > 12 && STORM_SPEED > 50 && SURFACE_RH < 60) {
      dustVortexChance = Math.max(5, Math.round(15 + (DEW_SPREAD - 12) * 2));
    }
    if (dustVortexChance > 0) {
      factors.push({ name: 'Dust Vortices', chance: dustVortexChance });
    }

    // Dust Field - extensive dust kicked up by tornado in dry environment
    let dustFieldChance = 0;
    if (DEW_SPREAD > 10 && SURFACE_RH < 65 && STORM_SPEED > 40) {
      // Base chance from dry conditions
      if (DEW_SPREAD > 10) dustFieldChance += 25;
      if (DEW_SPREAD > 18) dustFieldChance += 20;
      if (SURFACE_RH < 65) dustFieldChance += 15;
      if (SURFACE_RH < 50) dustFieldChance += 15;
      if (SURFACE_RH < 35) dustFieldChance += 10;
      
      // Enhanced by storm motion and rotation
      if (STORM_SPEED > 50) dustFieldChance += 10;
      if (STORM_SPEED > 70) dustFieldChance += 10;
      if (SRH > 300) dustFieldChance += 10;
      
      // Reduced in high moisture environments
      if (PWAT > 1.8) dustFieldChance -= 20;
      if (RH_MID > 80) dustFieldChance -= 15;
      
      dustFieldChance = Math.max(0, Math.min(95, dustFieldChance));
    }
    if (dustFieldChance > 0) {
      factors.push({ name: 'Dust Field', chance: dustFieldChance });
    }

    // Long-track tornado potential - influenced by STP (game scale)
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
   * Estimate tornado wind speeds using empirical regression
   * 
   * ⚡ PEAK WIND SPEED GUIDE ⚡
   * ============================================================================
   * IMPORTANT: The returned wind speeds represent the MAXIMUM/PEAK strength the
   * tornado will reach at its most intense point, NOT the average wind speed
   * throughout the tornado's lifetime.
   *
   * Tornado Lifecycle:
   *   - Initiation: Weak winds (50-80 mph)
   *   - Development: Increasing strength (progressive wind increase)
   *   - Peak/Mature: Maximum winds (returned value here) ← YOU ARE HERE
   *   - Decay: Weakening winds (declining from peak)
   *
   * Application:
   *   - Use returned wind speeds as the maximum possible strength
   *   - Actual gameplay winds may fluctuate below this peak value
   *   - Peak is typically reached in the middle stage of the tornado lifecycle
   *   - Different tornado morphologies reach peak at different heights/times
   *
   * Model Details:
   *   - Empirical weighted regression calibrated on tornado event data
   *   - Features: CAPE, SRH, lapse rates, PWAT, moisture, TVS, storm dynamics
   *   - Range: 50-400 mph depending on atmospheric input
   *   - Includes baroclinic forcing proxy for extreme instability scenarios
   * ============================================================================
   */
  function estimate_wind(data) {
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
        baroclinicProxy: 0,
        adjustedWind: 0
      };
    }

    // ========================================================================
    // EMPIRICAL WINDSPEED PREDICTION
    // Weighted regression calibrated on tornado event data
    // ========================================================================
    
    const baseWind = predictWindspeedEmpirical({
      CAPE: CAPE,
      SRH: SRH,
      LAPSE_RATE_0_3: LAPSE_RATE_0_3,
      PWAT: PWAT,
      TEMP: TEMP,
      DEWPOINT: DEWPOINT,
      CAPE_3KM: CAPE_3KM,
      LAPSE_RATE_3_6: LAPSE_RATE_3_6 || (LAPSE_RATE_0_3 * 0.85),  // Estimate if not provided
      SURFACE_RH: SURFACE_RH,
      RH_MID: RH_MID,
      STORM_SPEED: STORM_SPEED,
      TVS_PEAKS: Total_TVS_Peaks || 0
    });
    
    // ========================================================================
    // BAROCLINIC FORCING ADJUSTMENT
    // ========================================================================
    const baroclinic_mph = computeBaroclinicProxy(data);
    
    // Apply baroclinic proxy contribution
    const BAROCLINIC_GAMMA = 0.6;
    const adjustedWindRaw = baseWind + BAROCLINIC_GAMMA * baroclinic_mph;
    const adjustedWind = Math.max(0, Math.min(500, adjustedWindRaw));

    const uncertainty = baseWind * 0.15;  // Empirical model uncertainty range
    let est_min = Math.max(50, Math.round(baseWind - uncertainty));
    let est_max = Math.round(baseWind + uncertainty);
    
    // Apply realistic caps based on game data
    est_max = Math.min(400, est_max);
    
    // Ensure minimum range
    if (est_max - est_min < 12) {
      est_max = est_min + 12;
    }
    
    // Cap maximum range
    if (est_max - est_min > 35) {
      const mid = (est_min + est_max) / 2;
      est_min = Math.round(mid - 17);
      est_max = Math.round(mid + 17);
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
      baroclinicProxy: Math.round(baroclinic_mph * 10) / 10,
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
    computeBaroclinicProxy: computeBaroclinicProxy,
    predictWindspeedEmpirical: predictWindspeedEmpirical
  };

})();