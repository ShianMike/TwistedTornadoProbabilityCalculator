/**
 * INPUT VALIDATION MODULE
 * Comprehensive validation of atmospheric parameters and user inputs
 * Provides detailed warnings for unrealistic, inconsistent, or suspicious data
 */

(function() {
  'use strict';

  /**
   * Severity levels for validation messages
   */
  const SeverityLevel = {
    CRITICAL: 'CRITICAL',
    ERROR: 'ERROR',
    WARNING: 'WARNING',
    INFO: 'INFO'
  };

  /**
   * Validation message with severity classification
   * @param {string} message - The validation message
   * @param {string} severity - One of SeverityLevel values
   * @returns {Object} Message object with severity metadata
   */
  function createMessage(message, severity = SeverityLevel.WARNING) {
    return { message, severity };
  }

  /**
   * Comprehensive input validation with cross-parameter consistency checks
   * @param {Object} data - Atmospheric parameter object
   * @returns {Object} Validation result with messages and severity level
   */
  function validateInputs(data) {
    const messages = [];
    const warningDiv = document.getElementById('validationWarnings');
    
    if (!warningDiv) return;

    // CRITICAL CHECKS - Physically impossible conditions
    validatePhysicalImpossibilities(data, messages);
    
    // ERROR CHECKS - Highly inconsistent combinations
    validateHighlyInconsistentCombinations(data, messages);
    
    // WARNING CHECKS - Unusual but possible conditions
    validateUnusualConditions(data, messages);
    
    // RANGE CHECKS - Out-of-typical-range parameters
    validateExtremeValues(data, messages);
    
    // CONSISTENCY CHECKS - Cross-parameter relationships
    validateCrossParameterConsistency(data, messages);
    
    // COMPLETENESS CHECKS - Data entry status
    validateDataCompleteness(data, messages);

    // Display results
    displayValidationMessages(warningDiv, messages);
  }

  /**
   * Check for physically impossible conditions
   */
  function validatePhysicalImpossibilities(data, messages) {
    // Dewpoint cannot exceed temperature
    if (data.DEWPOINT > data.TEMP && data.TEMP > 0 && data.DEWPOINT > 0) {
      messages.push(createMessage(
        'CRITICAL: Dewpoint cannot exceed temperature - this is physically impossible. Check temperature and dewpoint values.',
        SeverityLevel.CRITICAL
      ));
    }

    // Temperature-dewpoint spread cannot be negative
    const dewSpread = data.TEMP - data.DEWPOINT;
    if (dewSpread < 0 && data.TEMP > 0 && data.DEWPOINT > 0) {
      messages.push(createMessage(
        'CRITICAL: Dewpoint exceeds temperature - this is impossible. Verify both temperature and dewpoint.',
        SeverityLevel.CRITICAL
      ));
    }

    // CAPE cannot be negative
    if (data.CAPE < 0) {
      messages.push(createMessage(
        'CRITICAL: CAPE cannot be negative. Negative CAPE indicates stable atmosphere.',
        SeverityLevel.CRITICAL
      ));
    }

    // SRH cannot be negative
    if (data.SRH < 0) {
      messages.push(createMessage(
        'CRITICAL: SRH cannot be negative. Check wind shear calculation.',
        SeverityLevel.CRITICAL
      ));
    }

    // 3CAPE cannot exceed total CAPE by more than 100%
    if (data.CAPE_3KM > data.CAPE && data.CAPE > 0) {
      messages.push(createMessage(
        'CRITICAL: 3CAPE exceeds total CAPE - physically impossible. Verify CAPE measurements.',
        SeverityLevel.CRITICAL
      ));
    }
  }

  /**
   * Check for highly inconsistent parameter combinations
   */
  function validateHighlyInconsistentCombinations(data, messages) {
    // High CAPE with cool temperature
    if (data.CAPE > 6000 && data.TEMP < 70) {
      messages.push(createMessage(
        'ERROR: Very high CAPE (>6000) with cool temperature (<70F) is highly unusual. Verify CAPE and temperature.',
        SeverityLevel.ERROR
      ));
    }

    // Low CAPE with extreme lapse rate
    if (data.CAPE < 1000 && data.LAPSE_RATE_0_3 > 9) {
      messages.push(createMessage(
        'ERROR: Low CAPE with extreme lapse rate (>9 C/km) is inconsistent. Check CAPE or lapse rate value.',
        SeverityLevel.ERROR
      ));
    }

    // High CAPE with low lapse rate
    if (data.CAPE > 5000 && data.LAPSE_RATE_0_3 < 6) {
      messages.push(createMessage(
        'ERROR: High CAPE (>5000) with low lapse rate (<6 C/km) - verify lapse rate. Instability requires steep lapse.',
        SeverityLevel.ERROR
      ));
    }

    // High PWAT with low surface RH
    if (data.PWAT > 1.8 && data.SURFACE_RH < 55) {
      messages.push(createMessage(
        'ERROR: High PWAT (>1.8") with low surface RH (<55%) is inconsistent. Check moisture parameters.',
        SeverityLevel.ERROR
      ));
    }

    // High surface RH with low PWAT
    if (data.SURFACE_RH > 85 && data.PWAT < 0.9) {
      messages.push(createMessage(
        'ERROR: High surface RH (>85%) with low PWAT (<0.9") is inconsistent. Verify moisture measurements.',
        SeverityLevel.ERROR
      ));
    }

    // Very low PWAT for significant CAPE
    if (data.PWAT < 0.6 && data.CAPE > 2000) {
      messages.push(createMessage(
        'ERROR: Very low PWAT (<0.6") with significant CAPE (>2000) - extremely dry conditions. Verify PWAT.',
        SeverityLevel.ERROR
      ));
    }

    // 3CAPE exceeds 50% of total CAPE
    if (data.CAPE_3KM > data.CAPE * 0.5 && data.CAPE > 1000) {
      messages.push(createMessage(
        'ERROR: 3CAPE exceeds 50% of total CAPE - this is extremely unusual. Verify both CAPE measurements.',
        SeverityLevel.ERROR
      ));
    }

    // Cool temperature with very high PWAT
    if (data.TEMP < 60 && data.PWAT > 2.0) {
      messages.push(createMessage(
        'ERROR: Very high PWAT (>2.0") with cool temperature (<60F) - unusual. Verify PWAT value.',
        SeverityLevel.ERROR
      ));
    }

    // Dry mid-levels with high surface moisture indicates strong capping
    if (data.RH_MID < 40 && data.SURFACE_RH > 80) {
      messages.push(createMessage(
        'ERROR: Very dry mid-levels (<40% RH) with moist surface (>80% RH) - strong capping inversion present.',
        SeverityLevel.ERROR
      ));
    }
  }

  /**
   * Check for unusual but possible conditions
   */
  function validateUnusualConditions(data, messages) {
    // Extremely high lapse rate
    if (data.LAPSE_RATE_0_3 > 10.5) {
      messages.push(createMessage(
        'WARNING: Extremely high 0-3km lapse rate (>10.5 C/km) - values this steep are exceptionally rare.',
        SeverityLevel.WARNING
      ));
    }

    // Extremely high SRH
    if (data.SRH > 1100) {
      messages.push(createMessage(
        'WARNING: Extremely high SRH (>1100 m²/s²) - values this high are very rare and exceptional.',
        SeverityLevel.WARNING
      ));
    }

    // Low SRH with high storm speed
    if (data.SRH < 300 && data.STORM_SPEED > 60) {
      messages.push(createMessage(
        'WARNING: Low SRH (<300) with high storm speed (>60 mph) - unusual rotation for this motion.',
        SeverityLevel.WARNING
      ));
    }

    // Extremely high storm speed
    if (data.STORM_SPEED > 105) {
      messages.push(createMessage(
        'WARNING: Very high storm speed (>105 mph) - exceptional forward motion. Verify storm motion value.',
        SeverityLevel.WARNING
      ));
    }

    // Extremely high PWAT
    if (data.PWAT > 2.3) {
      messages.push(createMessage(
        'WARNING: Extremely high PWAT (>2.3") - values this high are very rare and typically require tropical or Gulf moisture.',
        SeverityLevel.WARNING
      ));
    }

    // Extremely low PWAT
    if (data.PWAT < 0.5) {
      messages.push(createMessage(
        'WARNING: Extremely low PWAT (<0.5") - very dry conditions with minimal atmospheric moisture.',
        SeverityLevel.WARNING
      ));
    }

    // Extreme temperature
    if (data.TEMP > 110) {
      messages.push(createMessage(
        'WARNING: Extremely high temperature (>110F) - verify temperature reading. Very rare condition.',
        SeverityLevel.WARNING
      ));
    }

    if (data.TEMP < 40 && data.CAPE > 3000) {
      messages.push(createMessage(
        'WARNING: High CAPE (>3000) with very cool temperature (<40F) - highly unusual combination.',
        SeverityLevel.WARNING
      ));
    }

    // Extreme dewpoint spread
    const dewSpread = data.TEMP - data.DEWPOINT;
    if (dewSpread > 35 && data.TEMP > 0 && data.DEWPOINT > 0) {
      messages.push(createMessage(
        'WARNING: Very large temperature-dewpoint spread (>35F) - extremely dry conditions.',
        SeverityLevel.WARNING
      ));
    }

    // Saturated conditions with inconsistent RH
    if (dewSpread <= 0 && data.SURFACE_RH < 95 && data.TEMP > 0 && data.DEWPOINT > 0) {
      messages.push(createMessage(
        'WARNING: Temperature near or below dewpoint but RH not near 100% - check for data consistency.',
        SeverityLevel.WARNING
      ));
    }

    // Inverted lapse rate profile
    if (data.LAPSE_3_6KM > data.LAPSE_RATE_0_3 + 2 && data.LAPSE_RATE_0_3 > 0 && data.LAPSE_3_6KM > 0) {
      messages.push(createMessage(
        'WARNING: 3-6km lapse rate exceeds 0-3km lapse - inverted profile is unusual.',
        SeverityLevel.WARNING
      ));
    }

    // Very low mid-level lapse with high low-level lapse
    if (data.LAPSE_3_6KM < 5 && data.LAPSE_RATE_0_3 > 9) {
      messages.push(createMessage(
        'WARNING: Low mid-level lapse (<5 C/km) with high low-level lapse (>9 C/km) - verify lapse rates.',
        SeverityLevel.WARNING
      ));
    }
  }

  /**
   * Check for extreme parameter values
   */
  function validateExtremeValues(data, messages) {
    // High PWAT with cool surface temperature
    if (data.TEMP > 90 && data.PWAT < 0.8) {
      messages.push(createMessage(
        'INFO: Very low PWAT (<0.8") with high temperature (>90F) - unusual dry conditions.',
        SeverityLevel.INFO
      ));
    }

    // Low CAPE warnings
    if (data.CAPE < 500) {
      messages.push(createMessage(
        'INFO: Low CAPE (<500 J/kg) indicates marginal atmospheric instability.',
        SeverityLevel.INFO
      ));
    }

    // Very high CAPE
    if (data.CAPE > 7000) {
      messages.push(createMessage(
        'INFO: Very high CAPE (>7000 J/kg) indicates extreme atmospheric instability.',
        SeverityLevel.INFO
      ));
    }

    // Moderate CAPE
    if (data.CAPE >= 1500 && data.CAPE <= 2500) {
      messages.push(createMessage(
        'INFO: Moderate CAPE (1500-2500 J/kg) indicates typical supercell conditions.',
        SeverityLevel.INFO
      ));
    }
  }

  /**
   * Check cross-parameter consistency and relationships
   */
  function validateCrossParameterConsistency(data, messages) {
    // Estimate expected PWAT from temperature
    if (data.TEMP > 85 && data.PWAT < 1.0) {
      messages.push(createMessage(
        'INFO: Expected higher PWAT with warm temperature (>85F). Current value may be unusually low.',
        SeverityLevel.INFO
      ));
    }

    // High 3CAPE relative to total CAPE
    if (data.CAPE > 1000 && data.CAPE_3KM > data.CAPE * 0.35) {
      messages.push(createMessage(
        'INFO: High 3CAPE relative to total CAPE (>35%) - boundary layer is very unstable.',
        SeverityLevel.INFO
      ));
    }

    // Check SRH relative to CAPE
    if (data.SRH > 400 && data.CAPE < 1500) {
      messages.push(createMessage(
        'INFO: High SRH (>400) with relatively low CAPE (<1500) - strong shear with weak instability.',
        SeverityLevel.INFO
      ));
    }

    // Check for marginal shear with high CAPE
    if (data.SRH < 100 && data.CAPE > 4000) {
      messages.push(createMessage(
        'INFO: Low SRH (<100) with very high CAPE (>4000) - strong instability but weak rotation.',
        SeverityLevel.INFO
      ));
    }
  }

  /**
   * Check data entry completeness and status
   */
  function validateDataCompleteness(data, messages) {
    // Check for all zeros (no data entered)
    const allZero = data.CAPE === 0 && data.SRH === 0 && data.TEMP === 0 && data.DEWPOINT === 0 && data.PWAT === 0;
    if (allZero) {
      messages.push(createMessage(
        'INFO: No atmospheric data entered - provide parameters to generate tornado probability analysis.',
        SeverityLevel.INFO
      ));
    }

    // Check for partial data entry
    const partialData = [data.CAPE, data.SRH, data.TEMP, data.DEWPOINT, data.PWAT, data.LAPSE_RATE_0_3].filter(v => v > 0).length;
    if (partialData > 0 && partialData < 4) {
      messages.push(createMessage(
        'INFO: Partial data entry detected - more parameters will improve prediction accuracy.',
        SeverityLevel.INFO
      ));
    }
  }

  /**
   * Display validation messages in DOM with severity-based styling
   */
  function displayValidationMessages(warningDiv, messages) {
    if (messages.length === 0) {
      warningDiv.style.display = 'none';
      return;
    }

    // Sort by severity (CRITICAL > ERROR > WARNING > INFO)
    const severityOrder = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
    messages.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Create HTML for each message with color coding
    const messageHTML = messages.map(msg => {
      const colorClass = getSeverityColor(msg.severity);
      return `<div class="validation-message ${colorClass}">${msg.message}</div>`;
    }).join('');

    warningDiv.innerHTML = messageHTML;
    warningDiv.style.display = 'block';
  }

  /**
   * Get CSS color class for severity level
   */
  function getSeverityColor(severity) {
    switch(severity) {
      case SeverityLevel.CRITICAL:
        return 'severity-critical';
      case SeverityLevel.ERROR:
        return 'severity-error';
      case SeverityLevel.WARNING:
        return 'severity-warning';
      case SeverityLevel.INFO:
        return 'severity-info';
      default:
        return 'severity-warning';
    }
  }

  // Export to global scope
  window.InputValidation = {
    validateInputs: validateInputs
  };

})();
