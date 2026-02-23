// Data storage
let collectedData = [];
let currentImage = null;
let isSubmitting = false; // Prevent duplicate submissions

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  const fileInput = document.getElementById('fileInput');
  const dataForm = document.getElementById('dataForm');

  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        console.log('File selected:', file.name);
        loadImage(file);
      }
    });
  }

  // Listen for paste events
  document.addEventListener('paste', async function(e) {
    const items = e.clipboardData.items;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        console.log('Image pasted from clipboard');
        loadImage(blob);
        break;
      }
    }
  });

  // Form submission
  if (dataForm) {
    dataForm.addEventListener('submit', handleSubmit);
  }

  // Load any saved data from localStorage
  loadSavedData();
});

// Load image and process with OCR
function loadImage(file) {
  console.log('Loading image:', file);
  const reader = new FileReader();
  reader.onload = function(e) {
    currentImage = e.target.result;
    console.log('Image loaded successfully');
    displayImage(currentImage);
    processImage(currentImage);
  };
  reader.readAsDataURL(file);
}

// Display image in preview
function displayImage(imageSrc) {
  const preview = document.getElementById('preview');
  if (preview) {
    preview.innerHTML = `<img src="${imageSrc}" alt="OCR Image Preview">`;
    console.log('Image displayed in preview');
  }
}

// Process image with OCR using Tesseract
async function processImage(imageSrc) {
  showStatus('Processing image...', 'processing');

  try {
    const result = await Tesseract.recognize(
      imageSrc,
      'eng',
      {
        logger: m => {
          if (m.status === 'recognizing text') {
            showStatus(`Processing: ${Math.round(m.progress * 100)}%`, 'processing');
          }
          console.log(m);
        }
      }
    );

    const extractedText = result.data.text;
    console.log('Extracted text:', extractedText);
    
    displayOCRResults(extractedText);
    showStatus(`Successfully extracted text from image!`, 'success');
  } catch (error) {
    console.error('OCR Error:', error);
    showStatus('Error processing image. Please try again.', 'error');
  }
}

// Display OCR results and auto-fill parameters
function displayOCRResults(text) {
  const resultsContainer = document.getElementById('ocrResults');
  const extractedTextArea = document.getElementById('extractedText');
  
  if (resultsContainer) {
    extractedTextArea.value = text;
    resultsContainer.style.display = 'flex';
  }
  
  // Auto-fill weather parameters from extracted text
  const parsedValues = parseWeatherData(text);
  fillWeatherFields(parsedValues);
}

// Parse weather data from OCR text (similar to imageprocess.js)
function parseWeatherData(text) {
  const values = {};
  
  console.log('Raw extracted text:', text);
  
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Remove multiple dots/periods and normalize whitespace
    const cleanLine = line.replace(/\.{2,}/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (!cleanLine) continue;
    
    console.log('Processing line:', cleanLine);
    
    // TEMPERATURE
    if (/TEMPERATURE/i.test(cleanLine)) {
      const match = cleanLine.match(/TEMPERATURE[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['TEMP'] = match[1];
        console.log('Found TEMPERATURE:', match[1]);
      }
    }
    
    // DEWPOINT
    if (/DEWPOINT/i.test(cleanLine)) {
      const match = cleanLine.match(/DEWPOINT[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['DEWPOINT'] = match[1];
        console.log('Found DEWPOINT:', match[1]);
      }
    }
    
    // 3CAPE - check this FIRST to avoid conflicts
    if (/3\s*CAPE/i.test(cleanLine)) {
      const match = cleanLine.match(/3\s*CAPE[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['CAPE_3KM'] = match[1];
        console.log('Found 3CAPE:', match[1]);
      }
    }
    
    // CAPE - match CAPE with a space or start of line before it (not preceded by 3)
    if (/\bCAPE\b/i.test(cleanLine)) {
      const match = cleanLine.match(/(?:^|[^3])\s*CAPE[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['CAPE'] = match[1];
        console.log('Found CAPE:', match[1]);
      }
    }
    
    // 0-3KM LAPSE
    if (/0[- ]?3\s*KM\s+LAPSE/i.test(cleanLine)) {
      const match = cleanLine.match(/0[- ]?3\s*KM\s+LAPSE[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['LAPSE_RATE_0_3'] = match[1];
        console.log('Found 0-3KM LAPSE:', match[1]);
      }
    }
    
    // 3-6KM LAPSE
    if (/3[- ]?6\s*KM\s+LAPSE/i.test(cleanLine)) {
      const match = cleanLine.match(/3[- ]?6\s*KM\s+LAPSE[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['LAPSE_3_6KM'] = match[1];
        console.log('Found 3-6KM LAPSE:', match[1]);
      }
    }
    
    // PWAT - handle both "PWAT" and OCR error "PHAT"
    if (/\b(PWAT|PHAT)\b/i.test(cleanLine)) {
      // Look for value followed by "IN"
      let pwatValue = null;
      
      // First try: look for explicit "IN" unit (backward scan)
      if (/\bIN\b/i.test(cleanLine)) {
        const inIndex = cleanLine.toUpperCase().indexOf('IN');
        const beforeIn = cleanLine.substring(0, inIndex);
        
        if (!/SRH/i.test(beforeIn) && !/LAPSE/i.test(beforeIn)) {
          let endIdx = inIndex - 1;
          
          // Skip whitespace backward (only whitespace, not dots)
          while (endIdx >= 0 && /\s/.test(cleanLine[endIdx])) {
            endIdx--;
          }
          
          // Extract number backward
          let numStr = '';
          while (endIdx >= 0 && /[\d.]/.test(cleanLine[endIdx])) {
            numStr = cleanLine[endIdx] + numStr;
            endIdx--;
          }
          
          if (numStr && /^\d+\.?\d*$/.test(numStr)) {
            pwatValue = numStr;
          }
        }
      }
      
      // Fallback: look for number after PWAT/PHAT if no IN found
      if (!pwatValue) {
        const match = cleanLine.match(/(PWAT|PHAT)[.\s:]*(\d+\.?\d*)/i);
        if (match) {
          pwatValue = match[2];
        }
      }
      
      if (pwatValue) {
        values['PWAT'] = pwatValue;
        console.log('Found PWAT:', pwatValue);
      }
    }
    
    // PWAT FALLBACK - if still not found, look for any number before "IN" (in case PHAT/PWAT label is missing or separate)
    if (!values['PWAT'] && /\bIN\b/i.test(cleanLine)) {
      const inIndex = cleanLine.toUpperCase().indexOf('IN');
      const beforeIn = cleanLine.substring(0, inIndex);
      
      // Make sure this is not for SRH or LAPSE
      if (!/SRH/i.test(beforeIn) && !/LAPSE/i.test(beforeIn) && !/WIND/i.test(beforeIn)) {
        let endIdx = inIndex - 1;
        
        // Skip whitespace backward (only whitespace, not dots)
        while (endIdx >= 0 && /\s/.test(cleanLine[endIdx])) {
          endIdx--;
        }
        
        // Extract number backward
        let numStr = '';
        while (endIdx >= 0 && /[\d.]/.test(cleanLine[endIdx])) {
          numStr = cleanLine[endIdx] + numStr;
          endIdx--;
        }
        
        if (numStr && /^\d+\.?\d*$/.test(numStr)) {
          values['PWAT'] = numStr;
          console.log('Found PWAT (fallback):', numStr);
        }
      }
    }
    
    // SRH - handle variations like "M2/S2" or "M²/S²"
    if (/\bSRH\b/i.test(cleanLine)) {
      const match = cleanLine.match(/SRH[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['SRH'] = match[1];
        console.log('Found SRH:', match[1]);
      }
    }
    
    // SURFACE RH
    if (/SURFACE\s+RH|SURFACE_RH|SURFACE\s*%/i.test(cleanLine)) {
      const match = cleanLine.match(/SURFACE[.\s]*RH[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['SURFACE_RH'] = match[1];
        console.log('Found SURFACE RH:', match[1]);
      }
    }
    
    // 700-500 RH or MID RH - handle "700-500M8" (OCR error for MB)
    if (/700[- ]?500|MID.*RH|RH.*MID/i.test(cleanLine)) {
      const match = cleanLine.match(/700[- ]?500[.\s]*(?:M[B8])?[.\s]*RH[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['RH_MID'] = match[1];
        console.log('Found 700-500 RH:', match[1]);
      }
    }
    
    // STP - handle format "STP..12" or "STP...12" or "STP: 12"
    if (/\bSTP\b/i.test(cleanLine)) {
      const match = cleanLine.match(/\bSTP\b[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['STP'] = match[1];
        console.log('Found STP:', match[1]);
      }
    }
    
    // VTP - handle format "VTP...3" or "VTP: 3"
    if (/\bVTP\b/i.test(cleanLine)) {
      const match = cleanLine.match(/\bVTP\b[.\s:]*(\d+\.?\d*)/i);
      if (match) {
        values['VTP'] = match[1];
        console.log('Found VTP:', match[1]);
      }
    }
    
    // STORM MOTION
    if (/STORM.*MOTION|MOTION.*STORM|STORM\s+SPEED/i.test(cleanLine)) {
      const match = cleanLine.match(/(\d+\.?\d*)\s*(?:mph|MPH|m\/s)/);
      if (match) {
        values['STORM_SPEED'] = match[1];
        console.log('Found STORM MOTION:', match[1]);
      }
    }
  }
  
  return values;
}

// Auto-fill weather form fields
function fillWeatherFields(values) {
  const fieldMap = {
    'TEMP': 'TEMP',
    'DEWPOINT': 'DEWPOINT',
    'CAPE': 'CAPE',
    'CAPE_3KM': 'CAPE_3KM',
    'LAPSE_RATE_0_3': 'LAPSE_RATE_0_3',
    'LAPSE_3_6KM': 'LAPSE_3_6KM',
    'PWAT': 'PWAT',
    'SURFACE_RH': 'SURFACE_RH',
    'RH_MID': 'RH_MID',
    'SRH': 'SRH',
    'STP': 'STP',
    'VTP': 'VTP',
    'STORM_SPEED': 'STORM_SPEED'
  };

  for (const [key, fieldId] of Object.entries(fieldMap)) {
    if (values[key]) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.value = values[key];
        console.log(`Filled ${fieldId} with ${values[key]}`);
      }
    }
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('ocrStatus');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;
  
  if (type === 'success' || type === 'error') {
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }
}

// Copy extracted text to clipboard
function copyExtractedText() {
  const textArea = document.getElementById('extractedText');
  textArea.select();
  document.execCommand('copy');
  
  // Fill the OCR reading field
  document.getElementById('ocrReading').value = textArea.value;
  
  showStatus('Text copied and filled in form!', 'success');
}

// Handle form submission
function handleSubmit(event) {
  event.preventDefault();

  // Prevent duplicate submissions
  if (isSubmitting) {
    console.log('Already submitting, preventing duplicate');
    return;
  }

  // Validate required fields
  const tornadoType = document.getElementById('tornadoType').value;
  const maxWinds = document.getElementById('maxWindsValue').value;
  const windComparison = document.getElementById('windComparison').value;

  if (!tornadoType) {
    showStatus('Please select a Tornado Type', 'error');
    return;
  }
  if (!maxWinds) {
    showStatus('Please enter Max Winds', 'error');
    return;
  }
  if (!windComparison) {
    showStatus('Please select a Comparison operator', 'error');
    return;
  }

  // Set submitting flag
  isSubmitting = true;

  // Collect all weather parameters
  const dataEntry = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    
    // Tornado type
    tornadoType: tornadoType,
    
    // Wind data
    maxWinds: maxWinds,
    windComparison: getComparisonLabel(windComparison),
    
    // Thermodynamic parameters
    TEMP: document.getElementById('TEMP').value,
    CAPE: document.getElementById('CAPE').value,
    LAPSE_RATE_0_3: document.getElementById('LAPSE_RATE_0_3').value,
    PWAT: document.getElementById('PWAT').value,
    SURFACE_RH: document.getElementById('SURFACE_RH').value,
    STP: document.getElementById('STP').value,
    STORM_SPEED: document.getElementById('STORM_SPEED').value,
    DEWPOINT: document.getElementById('DEWPOINT').value,
    CAPE_3KM: document.getElementById('CAPE_3KM').value,
    LAPSE_3_6KM: document.getElementById('LAPSE_3_6KM').value,
    SRH: document.getElementById('SRH').value,
    RH_MID: document.getElementById('RH_MID').value,
    VTP: document.getElementById('VTP').value
  };

  // Add to collection
  collectedData.push(dataEntry);

  // Save to localStorage
  saveTornadoData();

  // Upload to Google Sheets
  uploadToGoogleSheets(dataEntry);

  // Show success message
  showSuccessMessage(dataEntry);

  // Update data preview
  displayDataEntries();

  // Reset form
  setTimeout(() => {
    document.getElementById('dataForm').reset();
    isSubmitting = false; // Reset flag after submission completes
  }, 2000);
}

// Get label for wind comparison
function getComparisonLabel(value) {
  const labels = {
    'greater': '>',
    'less': '<',
    'equal': '='
  };
  return labels[value] || value;
}

// Show success message
function showSuccessMessage(dataEntry) {
  const successMsg = document.getElementById('successMessage');
  const successDetails = document.getElementById('successDetails');
  
  const detailsText = `
    <strong>Data saved successfully!</strong><br>
    <strong>Type:</strong> ${dataEntry.tornadoType} | 
    <strong>CAPE:</strong> ${dataEntry.CAPE} J/kg | 
    <strong>Winds:</strong> ${dataEntry.maxWinds} mph ${dataEntry.windComparison}
  `;
  
  successDetails.innerHTML = detailsText;
  successMsg.style.display = 'block';
  
  setTimeout(() => {
    successMsg.style.display = 'none';
  }, 5000);
}

// Display collected data entries
function displayDataEntries() {
  const dataList = document.getElementById('dataList');
  const downloadBtn = document.getElementById('downloadBtn');
  
  if (collectedData.length === 0) {
    dataList.innerHTML = '<p class="empty-message">No data entries yet. Submit a form to see entries here.</p>';
    downloadBtn.style.display = 'none';
    return;
  }

  downloadBtn.style.display = 'block';

  dataList.innerHTML = collectedData
    .slice()
    .reverse()
    .map(entry => `
      <div class="data-entry">
        <div class="data-entry-row">
          <span class="data-entry-label">Type:</span>
          <span class="data-entry-value">${entry.tornadoType}</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">Winds:</span>
          <span class="data-entry-value">${entry.maxWinds} mph ${entry.windComparison}</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">TEMP:</span>
          <span class="data-entry-value">${entry.TEMP}°F</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">DEWPOINT:</span>
          <span class="data-entry-value">${entry.DEWPOINT}°F</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">CAPE:</span>
          <span class="data-entry-value">${entry.CAPE} J/kg</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">3CAPE:</span>
          <span class="data-entry-value">${entry.CAPE_3KM} J/kg</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">0-3KM LAPSE:</span>
          <span class="data-entry-value">${entry.LAPSE_RATE_0_3} C/km</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">3-6KM LAPSE:</span>
          <span class="data-entry-value">${entry.LAPSE_3_6KM} C/km</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">PWAT:</span>
          <span class="data-entry-value">${entry.PWAT} in</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">SURFACE RH:</span>
          <span class="data-entry-value">${entry.SURFACE_RH}%</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">700-500MB RH:</span>
          <span class="data-entry-value">${entry.RH_MID}%</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">SRH:</span>
          <span class="data-entry-value">${entry.SRH} m²/s²</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">STP:</span>
          <span class="data-entry-value">${entry.STP}</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">VTP:</span>
          <span class="data-entry-value">${entry.VTP}</span>
        </div>
        <div class="data-entry-row">
          <span class="data-entry-label">STORM MOTION:</span>
          <span class="data-entry-value">${entry.STORM_SPEED} mph</span>
        </div>
      </div>
    `)
    .join('');
}

// Delete data entry
function deleteEntry(id) {
  if (confirm('Are you sure you want to delete this entry?')) {
    collectedData = collectedData.filter(entry => entry.id !== id);
    saveTornadoData();
    displayDataEntries();
  }
}

// Save data to localStorage
function saveTornadoData() {
  try {
    localStorage.setItem('tornadoData', JSON.stringify(collectedData));
    console.log('Data saved to localStorage');
  } catch (error) {
    console.error('Error saving data:', error);
    alert('Error saving data to browser storage');
  }
}

// Load data from localStorage
function loadSavedData() {
  try {
    const saved = localStorage.getItem('tornadoData');
    if (saved) {
      collectedData = JSON.parse(saved);
      console.log('Loaded', collectedData.length, 'entries from localStorage');
      displayDataEntries();
    }
  } catch (error) {
    console.error('Error loading saved data:', error);
  }
}

// Reset form
function resetForm() {
  document.getElementById('dataForm').reset();
  document.getElementById('ocrStatus').style.display = 'none';
  const ocrResults = document.getElementById('ocrResults');
  if (ocrResults) ocrResults.style.display = 'none';
  document.getElementById('preview').innerHTML = '';
}

// Clear OCR input and thermodynamic parameters
function clearOCRInput() {
  // Clear preview and restore placeholder with guide image
  const preview = document.getElementById('preview');
  preview.innerHTML = `
    <div class="preview-placeholder">
      <div class="preview-guide">
        <p class="guide-text">Capture or paste a screenshot of weather data parameters (TEMP, CAPE, PWAT, etc.) for automatic extraction</p>
        <div class="guide-image-container">
          <img src="assets/example-layout.png" alt="Example of how to capture weather data" class="guide-example-image">
        </div>
      </div>
    </div>
  `;
  
  // Clear status
  document.getElementById('ocrStatus').style.display = 'none';
  
  // Clear OCR results if exists
  const ocrResults = document.getElementById('ocrResults');
  if (ocrResults) ocrResults.style.display = 'none';
  
  // Clear file input
  document.getElementById('fileInput').value = '';
  
  // Clear thermodynamic parameters
  const paramIds = [
    'TEMP', 'DEWPOINT', 'CAPE', 'CAPE_3KM', 'LAPSE_RATE_0_3', 'LAPSE_3_6KM',
    'PWAT', 'SURFACE_RH', 'RH_MID', 'SRH', 'STP', 'VTP', 'STORM_SPEED'
  ];
  
  paramIds.forEach(id => {
    const field = document.getElementById(id);
    if (field) field.value = '';
  });
}

// Add another tornado type entry
function addAnotherTornado() {
  // First, save the current entry
  const event = { preventDefault: () => {} };
  handleSubmit(event);
  
  // Then reset only tornado type and wind fields for next entry
  setTimeout(() => {
    document.getElementById('tornadoType').value = '';
    document.getElementById('maxWindsValue').value = '';
    document.getElementById('windComparison').value = '';
    
    // Scroll to form for next entry
    document.querySelector('.data-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 500);
}

// Download data as CSV
// Upload to Google Sheets
async function uploadToGoogleSheets(entry) {
  try {
    // Replace with your Google Apps Script Web App URL
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxE_ij5SHYZDkLGo-B_8735XiiFaCPPfywJR5FDgKHGZkE-gnvO32upQlcD6N15sXIU/exec';
    
    if (APPS_SCRIPT_URL === 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE') {
      console.log('Google Sheets URL not configured yet');
      return;
    }

    const payload = {
      timestamp: entry.timestamp,
      tornadoType: entry.tornadoType,
      maxWinds: entry.maxWinds,
      windComparison: entry.windComparison,
      TEMP: entry.TEMP,
      DEWPOINT: entry.DEWPOINT,
      CAPE: entry.CAPE,
      CAPE_3KM: entry.CAPE_3KM,
      LAPSE_RATE_0_3: entry.LAPSE_RATE_0_3,
      LAPSE_3_6KM: entry.LAPSE_3_6KM,
      PWAT: entry.PWAT,
      SURFACE_RH: entry.SURFACE_RH,
      RH_MID: entry.RH_MID,
      SRH: entry.SRH,
      STP: entry.STP,
      VTP: entry.VTP,
      STORM_SPEED: entry.STORM_SPEED
    };

    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log('Data sent to Google Sheets');
  } catch (error) {
    console.error('Error uploading to Google Sheets:', error);
  }
}

// Download single tornado entry as CSV (auto-triggered after submission)
function downloadSingleEntryCSV(entry) {
  const headers = [
    'Timestamp',
    'Tornado Type',
    'Max Winds (mph)',
    'Wind Comparison',
    'Temperature (F)',
    'Dewpoint (F)',
    'CAPE (J/kg)',
    '3CAPE (J/kg)',
    '0-3km Lapse Rate (C/km)',
    '3-6km Lapse (C/km)',
    'PWAT (in)',
    'Surface RH (%)',
    '700-500mb RH (%)',
    'SRH (m²/s²)',
    'STP',
    'VTP',
    'Storm Motion (mph)'
  ];

  const row = [
    entry.timestamp,
    entry.tornadoType,
    entry.maxWinds,
    entry.windComparison,
    entry.TEMP,
    entry.DEWPOINT,
    entry.CAPE,
    entry.CAPE_3KM,
    entry.LAPSE_RATE_0_3,
    entry.LAPSE_3_6KM,
    entry.PWAT,
    entry.SURFACE_RH,
    entry.RH_MID,
    entry.SRH,
    entry.STP,
    entry.VTP,
    entry.STORM_SPEED
  ];

  // Create CSV content with header and single row
  const csvContent = [
    headers.join(','),
    row.join(',')
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  link.setAttribute('href', url);
  link.setAttribute('download', `tornado-entry-${entry.tornadoType}-${timestamp}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Download all collected data as CSV (admin/user download)
function downloadData() {
  if (collectedData.length === 0) {
    alert('No data to download');
    return;
  }

  // Prepare CSV header - all weather parameters
  const headers = [
    'Timestamp',
    'Tornado Type',
    'Max Winds (mph)',
    'Wind Comparison',
    'Temperature (F)',
    'Dewpoint (F)',
    'CAPE (J/kg)',
    '3CAPE (J/kg)',
    '0-3km Lapse Rate (C/km)',
    '3-6km Lapse (C/km)',
    'PWAT (in)',
    'Surface RH (%)',
    '700-500mb RH (%)',
    'SRH (m²/s²)',
    'STP',
    'VTP',
    'Storm Motion (mph)'
  ];
  
  // Prepare CSV rows
  const rows = collectedData.map(entry => [
    entry.timestamp,
    entry.tornadoType,
    entry.maxWinds,
    entry.windComparison,
    entry.TEMP,
    entry.DEWPOINT,
    entry.CAPE,
    entry.CAPE_3KM,
    entry.LAPSE_RATE_0_3,
    entry.LAPSE_3_6KM,
    entry.PWAT,
    entry.SURFACE_RH,
    entry.RH_MID,
    entry.SRH,
    entry.STP,
    entry.VTP,
    entry.STORM_SPEED
  ]);

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', `weather-data-${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Paste from clipboard button
async function pasteFromClipboard() {
  console.log('Paste button clicked');
  try {
    const items = await navigator.clipboard.read();
    for (const item of items) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type);
          console.log('Image found in clipboard');
          loadImage(blob);
          return;
        }
      }
    }
    showStatus('No image found in clipboard. Try pressing Ctrl+V instead.', 'error');
  } catch (err) {
    console.error('Clipboard read error:', err);
    showStatus('Clipboard access denied. Please use file upload or Ctrl+V to paste.', 'error');
  }
}
