/**
 * Image Processing Module
 * Handles image upload, paste, and OCR extraction
 */
let currentImage = null;

// Debug flag - set to true for verbose logging
const DEBUG = (typeof window.TornadoTypes !== 'undefined' && window.TornadoTypes.DEBUG) || false;

/**
 * Conditional logging - only logs when DEBUG is true
 * @param  {...any} args - Arguments to log
 */
function debugLog(...args) {
  if (DEBUG) console.log('[ImageProcess]', ...args);
}

document.addEventListener('DOMContentLoaded', function() {
    const fileInput = document.getElementById('fileInput');

    // For index.html file input
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                debugLog('File selected:', file.name);
                loadImage(file);
            }
        });
    }

    // Listen for paste events on the entire document
    document.addEventListener('paste', async function(e) {
        const items = e.clipboardData.items;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                debugLog('Image pasted from clipboard');
                loadImage(blob);
                break;
            }
        }
    });
});

// Paste from clipboard button function (called from HTML onclick in index.html)
async function pasteFromClipboard() {
    debugLog('Paste button clicked');
    try {
        const items = await navigator.clipboard.read();
        for (const item of items) {
            for (const type of item.types) {
                if (type.startsWith('image/')) {
                    const blob = await item.getType(type);
                    debugLog('Image found in clipboard');
                    loadImage(blob);
                    return;
                }
            }
        }
        showStatus('No image found in clipboard. Try pressing Ctrl+V instead.', 'error');
    } catch (err) {
        if (DEBUG) console.error('Clipboard read error:', err);
        showStatus('Clipboard access denied. Please use Ctrl+V to paste.', 'error');
    }
}

// Load and display image
function loadImage(file) {
    debugLog('Loading image:', file);
    const reader = new FileReader();
    reader.onload = function(e) {
        currentImage = e.target.result;
        debugLog('Image loaded successfully');
        displayImage(currentImage);
        processImage(currentImage);
    };
    reader.readAsDataURL(file);
}

// Display image in preview
function displayImage(imageSrc) {
    const preview = document.getElementById('preview');
    if (preview) {
        preview.innerHTML = `<img src="${imageSrc}" alt="Weather Data Preview">`;
        debugLog('Image displayed in preview');
    } else {
        if (DEBUG) console.error('Preview element not found');
    }
}

// Process image with OCR
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
                    debugLog(m);
                }
            }
        );

        const extractedText = result.data.text;
        debugLog('Extracted text:', extractedText);
        
        const values = parseWeatherData(extractedText);
        fillFields(values);

        if (Object.keys(values).length > 0) {
            showStatus(`Successfully extracted ${Object.keys(values).length} values!`, 'success');
        } else {
            showStatus('No data could be extracted. Try a clearer image.', 'error');
        }
    } catch (error) {
        if (DEBUG) console.error('OCR Error:', error);
        showStatus('Error processing image. Please try again.', 'error');
    }
}

// Parse weather data from extracted text
function parseWeatherData(text) {
    const values = {};
    
    debugLog('Raw extracted text:', text);
    
    const lines = text.split('\n');
    
    for (const line of lines) {
        const cleanLine = line.replace(/\.{2,}/g, ' ').replace(/\s+/g, ' ').trim();
        
        if (!cleanLine) continue;
        
        debugLog('Processing line:', cleanLine);
        
        // TEMPERATURE
        if (/TEMPERATURE/i.test(cleanLine)) {
            const match = cleanLine.match(/TEMPERATURE[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['TEMP'] = match[1];
                debugLog('Found TEMPERATURE:', match[1]);
            }
        }
        
        // DEWPOINT
        if (/DEWPOINT/i.test(cleanLine)) {
            const match = cleanLine.match(/DEWPOINT[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['DEWPOINT'] = match[1];
                debugLog('Found DEWPOINT:', match[1]);
            }
        }
        
        // 3CAPE - check this FIRST to avoid conflicts
        if (/3\s*CAPE/i.test(cleanLine)) {
            const match = cleanLine.match(/3\s*CAPE[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['CAPE_3KM'] = match[1];
                debugLog('Found 3CAPE:', match[1]);
            }
        }
        
        // CAPE - match CAPE with a space or start of line before it (not preceded by 3)
        if (/\bCAPE\b/i.test(cleanLine)) {
            const match = cleanLine.match(/(?:^|[^3])\s*CAPE[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['CAPE'] = match[1];
                debugLog('Found CAPE:', match[1]);
            }
        }
        
        // 0-3KM LAPSE
        if (/0[- ]?3\s*KM\s+LAPSE/i.test(cleanLine)) {
            const match = cleanLine.match(/0[- ]?3\s*KM\s+LAPSE[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['LAPSE_RATE_0_3'] = match[1];
                debugLog('Found 0-3KM LAPSE:', match[1]);
            }
        }
        
        // 3-6KM LAPSE
        if (/3[- ]?6\s*KM\s+LAPSE/i.test(cleanLine)) {
            const match = cleanLine.match(/3[- ]?6\s*KM\s+LAPSE[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['LAPSE_3_6KM'] = match[1];
                debugLog('Found 3-6KM LAPSE:', match[1]);
            }
        }
        
        // PWAT - search for "IN" unit and extract the number before it
        if (/\bIN\b/i.test(cleanLine)) {
            // Make sure this IN is for PWAT, not part of another measurement
            // Check if line doesn't have SRH before IN
            const inIndex = cleanLine.toUpperCase().indexOf('IN');
            const beforeIn = cleanLine.substring(0, inIndex);
            
            if (!/SRH/i.test(beforeIn) && !/LAPSE/i.test(beforeIn)) {
                const match = cleanLine.match(/([\d\.]+)\s+IN/i);
                if (match) {
                    values['PWAT'] = match[1];
                    debugLog('Found PWAT:', match[1]);
                }
            }
        }
        
        // SRH
        if (/\bSRH\b/i.test(cleanLine)) {
            const match = cleanLine.match(/\bSRH\b[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['SRH'] = match[1];
                debugLog('Found SRH:', match[1]);
            }
        }
        
        // SURFACE RH
        if (/SURFACE\s+RH/i.test(cleanLine)) {
            const match = cleanLine.match(/SURFACE\s+RH[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['SURFACE_RH'] = match[1];
                debugLog('Found SURFACE RH:', match[1]);
            }
        }
        
        // 700-500MB RH
        if (/700[- ]?500\s*MB\s+RH/i.test(cleanLine)) {
            const match = cleanLine.match(/700[- ]?500\s*MB\s+RH[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['RH_MID'] = match[1];
                debugLog('Found 700-500MB RH:', match[1]);
            }
        }

        // STORM SPEED
        if (/STORM\s+SPEED/i.test(cleanLine)) {
            const match = cleanLine.match(/STORM\s+SPEED[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['STORM_SPEED'] = match[1];
                debugLog('Found STORM SPEED:', match[1]);
            }
        }

        // STP
        if (/\bSTP\b/i.test(cleanLine)) {
            const match = cleanLine.match(/\bSTP\b[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['STP'] = match[1];
                debugLog('Found STP:', match[1]);
            }
        }
        
        // VTP
        if (/\bVTP\b/i.test(cleanLine)) {
            const match = cleanLine.match(/\bVTP\b[.\s:]*(\d+\.?\d*)/i);
            if (match) {
                values['VTP'] = match[1];
                debugLog('Found VTP:', match[1]);
            }
        }
    }

    return values;
}

// Fill form fields with extracted values
function fillFields(values) {
    debugLog('Filling fields with values:', values);
    
    for (const [fieldId, value] of Object.entries(values)) {
        const input = document.getElementById(fieldId);
        if (input) {
            input.value = value;
            input.style.backgroundColor = 'rgba(76, 175, 80, 0.2)';
            // Trigger input event for validation
            input.dispatchEvent(new Event('input', { bubbles: true }));
            debugLog(`✓ Filled ${fieldId} with value: ${value}`);
            setTimeout(() => {
                input.style.backgroundColor = '';
            }, 2000);
        } else {
            debugLog(`✗ Input field not found for: ${fieldId}`);
        }
    }
}

// Show status message
function showStatus(message, type) {
    const statusElement = document.getElementById('ocrStatus');
    
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = 'ocr-status ' + type;
        statusElement.style.display = 'block';
        
        if (type === 'success') {
            setTimeout(() => {
                statusElement.style.display = 'none';
            }, 5000);
        }
    }
    
    debugLog('Status:', message, type);
}