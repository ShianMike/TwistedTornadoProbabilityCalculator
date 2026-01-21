/**
 * TORNADO TYPES MODULE
 * Centralized definitions for tornado morphology types
 * Single source of truth for descriptions, display names, and colors
 */

(function() {
  'use strict';

  // ============================================================================
  // DEBUG FLAG - Set to false for production
  // ============================================================================
  const DEBUG = false;

  // ============================================================================
  // TORNADO TYPE DESCRIPTIONS
  // ============================================================================
  
  /**
   * Detailed descriptions for each tornado morphology type
   * Used in chart tooltips and UI displays
   */
  const TORNADO_DESCRIPTIONS = {
    'ROPE': 'Thin, weak tornado often in marginal conditions. Low CAPE, weak rotation, dissipating stage of supercells.',
    'CONE': 'Classic tornado funnel shape. Balanced atmospheric conditions with moderate instability and rotation.',
    'STOVEPIPE': 'Cylindrical, strong tornado (stovepipe shape). High instability, strong rotation, steep lapse rates.',
    'WEDGE': 'Very wide tornado, often violent (>0.5 mile wide). High moisture, slow storm motion, extreme conditions.',
    'DRILLBIT': 'Fast-moving, narrow tornado in dry, linear-shear environment. High storm speed, low moisture.',
    'SIDEWINDER': 'Fast-moving, kinked/elongated hodograph tornado. High storm speed, strong shear, lateral translation.'
  };

  // ============================================================================
  // TORNADO TYPE DISPLAY NAMES
  // ============================================================================
  
  /**
   * Map internal type keys to display names
   * Used for consistent display across the UI
   */
  const TORNADO_DISPLAY_NAMES = {
    'ROPE': 'ROPE',
    'CONE': 'CONE', 
    'STOVEPIPE': 'STOVEPIPE',
    'WEDGE': 'WEDGE',
    'DRILLBIT': 'DRILLBIT',
    'SIDEWINDER': 'SIDEWINDER'
  };

  // ============================================================================
  // TORNADO TYPE COLORS
  // ============================================================================
  
  /**
   * Color scheme for tornado types (for charts and displays)
   */
  const TORNADO_COLORS = {
    'ROPE': '#6b7280',      // Gray
    'CONE': '#22c55e',      // Green
    'STOVEPIPE': '#f59e0b', // Amber
    'WEDGE': '#ef4444',     // Red
    'DRILLBIT': '#8b5cf6',  // Purple
    'SIDEWINDER': '#06b6d4' // Cyan
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  /**
   * Get display name for a tornado type
   * @param {string} type - Internal tornado type key
   * @returns {string} Display name
   */
  function getDisplayName(type) {
    return TORNADO_DISPLAY_NAMES[type] || type;
  }

  /**
   * Get description for a tornado type
   * @param {string} type - Internal tornado type key
   * @returns {string} Description
   */
  function getDescription(type) {
    return TORNADO_DESCRIPTIONS[type] || 'Unknown tornado type.';
  }

  /**
   * Get color for a tornado type
   * @param {string} type - Internal tornado type key
   * @returns {string} Hex color code
   */
  function getColor(type) {
    return TORNADO_COLORS[type] || '#888888';
  }

  /**
   * Get all tornado types
   * @returns {string[]} Array of type keys
   */
  function getAllTypes() {
    return Object.keys(TORNADO_DESCRIPTIONS);
  }

  /**
   * Debug logger - only logs when DEBUG is true
   * @param  {...any} args - Arguments to log
   */
  function debugLog(...args) {
    if (DEBUG) console.log('[TornadoTypes]', ...args);
  }

  // ============================================================================
  // EXPORT MODULE
  // ============================================================================

  window.TornadoTypes = {
    DESCRIPTIONS: TORNADO_DESCRIPTIONS,
    DISPLAY_NAMES: TORNADO_DISPLAY_NAMES,
    COLORS: TORNADO_COLORS,
    getDisplayName: getDisplayName,
    getDescription: getDescription,
    getColor: getColor,
    getAllTypes: getAllTypes,
    debugLog: debugLog,
    DEBUG: DEBUG
  };

})();
