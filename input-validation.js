/**
 * INPUT VALIDATION MODULE
 * Validates atmospheric parameters and displays warnings for unrealistic inputs
 */

(function() {
  'use strict';

  /**
   * Check for unrealistic input combinations and display warnings
   * Helps users identify potentially incorrect data entry
   * @param {Object} data - Atmospheric parameter object
   */
  function validateInputs(data) {
    const warnings = [];
    const warningDiv = document.getElementById('validationWarnings');
    
    if (!warningDiv) return;
    
    // Check for dewpoint > temperature (physically impossible)
    if (data.DEWPOINT > data.TEMP && data.TEMP > 0 && data.DEWPOINT > 0) {
      warnings.push('WARNING: Dewpoint cannot exceed temperature - check your inputs');
    }
    
    // Check for unrealistically high CAPE for given temperature
    if (data.CAPE > 6000 && data.TEMP < 70) {
      warnings.push('WARNING: Very high CAPE with cool temperatures is unusual - verify CAPE value');
    }
    
    // Check for unrealistically low CAPE with extreme parameters
    if (data.CAPE < 1000 && data.LAPSE_RATE_0_3 > 9) {
      warnings.push('WARNING: Low CAPE with extreme lapse rate is inconsistent - verify values');
    }
    
    // Check for unrealistically high lapse rate
    if (data.LAPSE_RATE_0_3 > 10.5) {
      warnings.push('WARNING: Extremely high 0-3km lapse rate - values above 10.5 C/km are very rare');
    }
    
    // Check for unrealistically low lapse rate with high CAPE
    if (data.CAPE > 5000 && data.LAPSE_RATE_0_3 < 6) {
      warnings.push('WARNING: High CAPE with low lapse rate is unusual - verify lapse rate');
    }
    
    // Check for unrealistically high SRH
    if (data.SRH > 1100) {
      warnings.push('WARNING: Extremely high SRH - values above 1100 m²/s² are exceptionally rare');
    }
    
    // Check for low SRH with high storm speed
    if (data.SRH < 300 && data.STORM_SPEED > 60) {
      warnings.push('WARNING: Low SRH with high storm speed is unusual - verify rotation parameters');
    }
    
    // Check for unrealistically high storm speed
    if (data.STORM_SPEED > 105) {
      warnings.push('WARNING: Very high storm speed - verify storm motion value');
    }
    
    // Check for very low RH with high PWAT (inconsistent)
    if (data.PWAT > 1.8 && data.SURFACE_RH < 55) {
      warnings.push('WARNING: High PWAT with low surface RH is unusual - check moisture parameters');
    }
    
    // Check for very high RH with low PWAT (inconsistent)
    if (data.SURFACE_RH > 85 && data.PWAT < 0.9) {
      warnings.push('WARNING: High surface RH with low PWAT is inconsistent - verify moisture values');
    }
    
    // Check for high 3CAPE with low total CAPE (unlikely)
    if (data.CAPE_3KM > 150 && data.CAPE < 2000) {
      warnings.push('WARNING: High 3CAPE with low total CAPE is unusual - verify CAPE values');
    }
    
    // Check for 3CAPE exceeding reasonable percentage of total CAPE
    if (data.CAPE_3KM > data.CAPE * 0.5 && data.CAPE > 1000) {
      warnings.push('WARNING: 3CAPE exceeds 50% of total CAPE - this is extremely unusual');
    }
    
    // Check for extreme temperature spread
    const dewSpread = data.TEMP - data.DEWPOINT;
    if (dewSpread > 35 && data.TEMP > 0 && data.DEWPOINT > 0) {
      warnings.push('WARNING: Very large temperature-dewpoint spread - extremely dry conditions');
    }
    
    // Check for negative or zero dew spread with high RH
    if (dewSpread <= 0 && data.SURFACE_RH < 95 && data.TEMP > 0 && data.DEWPOINT > 0) {
      warnings.push('WARNING: Temperature equals or is below dewpoint but RH is not near 100%');
    }
    
    // Check for unrealistic PWAT for temperature
    if (data.TEMP > 90 && data.PWAT < 0.8) {
      warnings.push('WARNING: Very low PWAT for high temperature - unusual dry conditions');
    }
    
    if (data.TEMP < 60 && data.PWAT > 2.0) {
      warnings.push('WARNING: Very high PWAT for cool temperature - verify moisture value');
    }
    
    // Check for extreme PWAT values
    if (data.PWAT > 2.3) {
      warnings.push('WARNING: Extremely high PWAT - values above 2.3 inches are very rare');
    }
    
    if (data.PWAT < 0.6 && data.CAPE > 2000) {
      warnings.push('WARNING: Very low PWAT for significant CAPE - verify moisture parameters');
    }
    
    // Check for extreme temperatures
    if (data.TEMP > 110) {
      warnings.push('WARNING: Extremely high temperature - verify temperature reading');
    }
    
    if (data.TEMP < 40 && data.CAPE > 3000) {
      warnings.push('WARNING: High CAPE with very cool temperature is highly unusual');
    }
    
    // Check for dry mid-levels with high surface moisture
    if (data.RH_MID < 40 && data.SURFACE_RH > 80) {
      warnings.push('WARNING: Very dry mid-levels with moist surface - strong capping likely');
    }
    
    // Check for 3-6km lapse rate issues
    if (data.LAPSE_3_6KM > data.LAPSE_RATE_0_3 + 2 && data.LAPSE_RATE_0_3 > 0 && data.LAPSE_3_6KM > 0) {
      warnings.push('WARNING: 3-6km lapse rate exceeds 0-3km lapse - inverted profile is unusual');
    }
    
    // Check for very low 3-6km lapse with high 0-3km lapse
    if (data.LAPSE_3_6KM < 5 && data.LAPSE_RATE_0_3 > 9) {
      warnings.push('WARNING: Low mid-level lapse with high low-level lapse - verify lapse rates');
    }
    
    // Check for all zeros (no data entered)
    const allZero = data.CAPE === 0 && data.SRH === 0 && data.TEMP === 0 && data.DEWPOINT === 0;
    if (allZero) {
      warnings.push('INFO: No atmospheric data entered - enter parameters to begin analysis');
    }
    
    // Display warnings or hide div
    if (warnings.length > 0) {
      warningDiv.innerHTML = warnings.join('<br>');
      warningDiv.style.display = 'block';
    } else {
      warningDiv.style.display = 'none';
    }
  }

  // Export to global scope
  window.InputValidation = {
    validateInputs: validateInputs
  };

})();
