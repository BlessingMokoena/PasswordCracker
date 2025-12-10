// Common passwords dictionary
const COMMON_PASSWORDS = [
    "password", "123456", "qwerty", "admin", "letmein", "welcome", 
    "pass123", "password1", "12345678", "abc123", "Password", "iloveyou"
];

// State management
let attackRunning = false;
let shouldStop = false;
let startTime = 0;
let totalAttempts = 0;

// DOM Elements
const targetPassword = document.getElementById('targetPassword');
const toggleTarget = document.getElementById('toggleTarget');
const maxLength = document.getElementById('maxLength');
const charsetType = document.getElementById('charsetType');
const enableDictionary = document.getElementById('enableDictionary');
const enableBruteforce = document.getElementById('enableBruteforce');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const hashDisplay = document.getElementById('hashValue');
const statusBadge = document.getElementById('statusBadge');
const currentMethod = document.getElementById('currentMethod');
const totalAttemptsEl = document.getElementById('totalAttempts');
const attemptsPerSecEl = document.getElementById('attemptsPerSec');
const elapsedTimeEl = document.getElementById('elapsedTime');
const progressPercent = document.getElementById('progressPercent');
const progressFill = document.getElementById('progressFill');
const resultSection = document.getElementById('resultSection');
const logContainer = document.getElementById('logContainer');
const clearLogBtn = document.getElementById('clearLogBtn');

// Toggle password visibility
toggleTarget.addEventListener('click', () => {
    const type = targetPassword.type === 'password' ? 'text' : 'password';
    targetPassword.type = type;
    toggleTarget.querySelector('span').textContent = type === 'password' ? '👁️' : '🙈';
});

// Start attack
startBtn.addEventListener('click', async () => {
    const password = targetPassword.value;
    
    if (!password) {
        alert('Please enter a target password!');
        return;
    }

    if (!enableDictionary.checked && !enableBruteforce.checked) {
        alert('Please enable at least one attack method!');
        return;
    }

    const maxLen = parseInt(maxLength.value);
    if (maxLen < 1 || maxLen > 6) {
        alert('Max length must be between 1 and 6!');
        return;
    }

    await startCracking(password, maxLen, charsetType.value);
});

// Stop attack
stopBtn.addEventListener('click', () => {
    shouldStop = true;
    updateStatus('Stopping...', 'warning');
});

// Clear log
clearLogBtn.addEventListener('click', () => {
    logContainer.innerHTML = `
        <div class="empty-state">
            <div class="empty-icon">📋</div>
            <p>No attack logs yet. Start an attack to see the progress.</p>
        </div>
    `;
});

// Hash password using SHA-256
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate word variations
function* generateWordVariations(word) {
    yield word;
    yield word.charAt(0).toUpperCase() + word.slice(1); // Capitalize
    yield word.toUpperCase();
    
    for (let i = 0; i < 10; i++) {
        yield word + i;
        yield (word.charAt(0).toUpperCase() + word.slice(1)) + i;
        yield word.toUpperCase() + i;
    }
}

// Dictionary attack
async function dictionaryAttack(targetHash) {
    logMessage('Starting dictionary attack...', 'info');
    updateStatus('Running: Dictionary Attack', 'running');
    currentMethod.textContent = 'Method: Dictionary Attack';
    
    let attempts = 0;
    
    for (const word of COMMON_PASSWORDS) {
        if (shouldStop) break;
        
        for (const variant of generateWordVariations(word)) {
            if (shouldStop) break;
            
            attempts++;
            totalAttempts++;
            
            const hash = await hashPassword(variant);
            
            if (hash === targetHash) {
                return { success: true, password: variant, attempts, method: 'Dictionary Attack' };
            }
            
            // Update UI every 100 attempts
            if (attempts % 100 === 0) {
                updateStats();
                await sleep(0); // Allow UI to update
            }
        }
    }
    
    return { success: false, attempts, method: 'Dictionary Attack' };
}

// Get character set
function getCharset(type) {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const digits = '0123456789';
    const special = '!@#$%^&*()';
    
    if (type === 'simple') {
        return lowercase + digits;
    } else {
        return lowercase + uppercase + digits + special;
    }
}

// Generate combinations
function* generateCombinations(charset, length) {
    if (length === 1) {
        for (const char of charset) {
            yield char;
        }
        return;
    }
    
    for (const char of charset) {
        for (const rest of generateCombinations(charset, length - 1)) {
            yield char + rest;
        }
    }
}

// Brute force attack
async function bruteForceAttack(targetHash, maxLen, charsetName) {
    const charset = getCharset(charsetName);
    logMessage(`Starting brute force attack (charset: ${charsetName}, max length: ${maxLen})...`, 'info');
    updateStatus('Running: Brute Force Attack', 'running');
    currentMethod.textContent = `Method: Brute Force (${charset.length} character set)`;
    
    let attempts = 0;
    let totalCombinations = 0;
    
    // Calculate total combinations
    for (let len = 1; len <= maxLen; len++) {
        totalCombinations += Math.pow(charset.length, len);
    }
    
    logMessage(`Total combinations to try: ${totalCombinations.toLocaleString()}`, 'info');
    
    for (let len = 1; len <= maxLen; len++) {
        if (shouldStop) break;
        
        logMessage(`Trying length ${len}...`, 'info');
        
        for (const combo of generateCombinations(charset, len)) {
            if (shouldStop) break;
            
            attempts++;
            totalAttempts++;
            
            const hash = await hashPassword(combo);
            
            if (hash === targetHash) {
                return { success: true, password: combo, attempts, method: 'Brute Force' };
            }
            
            // Update UI periodically
            if (attempts % 500 === 0) {
                const progress = (attempts / totalCombinations) * 100;
                updateProgress(progress);
                updateStats();
                await sleep(0);
            }
        }
    }
    
    return { success: false, attempts, method: 'Brute Force' };
}

// Main cracking function
async function startCracking(password, maxLen, charset) {
    // Reset state
    attackRunning = true;
    shouldStop = false;
    startTime = Date.now();
    totalAttempts = 0;
    
    // Update UI
    startBtn.style.display = 'none';
    stopBtn.style.display = 'inline-flex';
    resultSection.style.display = 'none';
    resultSection.classList.remove('show', 'result-success', 'result-failed');
    
    // Display hash
    const targetHash = await hashPassword(password);
    hashDisplay.textContent = targetHash;
    
    logMessage(`Target hash: ${targetHash}`, 'info');
    
    // Start stats update interval
    const statsInterval = setInterval(updateStats, 100);
    
    let result = null;
    
    try {
        // Dictionary attack
        if (enableDictionary.checked) {
            result = await dictionaryAttack(targetHash);
            
            if (result.success || shouldStop) {
                clearInterval(statsInterval);
                displayResult(result, password);
                return;
            }
            
            logMessage('Dictionary attack failed. Moving to brute force...', 'warning');
        }
        
        // Brute force attack
        if (enableBruteforce.checked && !shouldStop) {
            result = await bruteForceAttack(targetHash, maxLen, charset);
            clearInterval(statsInterval);
            displayResult(result, password);
            return;
        }
        
        // If stopped
        if (shouldStop) {
            clearInterval(statsInterval);
            updateStatus('Stopped', 'failed');
            logMessage('Attack stopped by user', 'error');
        }
        
    } catch (error) {
        clearInterval(statsInterval);
        console.error('Error:', error);
        logMessage(`Error: ${error.message}`, 'error');
        updateStatus('Error', 'failed');
    } finally {
        attackRunning = false;
        startBtn.style.display = 'inline-flex';
        stopBtn.style.display = 'none';
    }
}

// Display result
function displayResult(result, originalPassword) {
    updateStats(); // Final update
    
    if (result.success) {
        updateStatus('Password Cracked!', 'success');
        logMessage(`✅ Password cracked: "${result.password}" using ${result.method}`, 'success');
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        const aps = Math.round(totalAttempts / (elapsed || 1));
        
        resultSection.innerHTML = `
            <div class="result-title" style="color: var(--success);">🎉 Success! Password Cracked</div>
            <div class="result-password">${result.password}</div>
            <div class="result-stats">
                <div class="result-stat">
                    <div class="result-stat-label">Method Used</div>
                    <div class="result-stat-value">${result.method}</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-label">Total Attempts</div>
                    <div class="result-stat-value">${totalAttempts.toLocaleString()}</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-label">Time Taken</div>
                    <div class="result-stat-value">${elapsed}s</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-label">Attempts/Second</div>
                    <div class="result-stat-value">${aps.toLocaleString()}</div>
                </div>
            </div>
        `;
        
        resultSection.classList.add('result-success');
        
    } else {
        updateStatus('Failed to Crack', 'failed');
        logMessage(`❌ Failed to crack password within the specified parameters`, 'error');
        
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        
        resultSection.innerHTML = `
            <div class="result-title" style="color: var(--danger);">❌ Attack Failed</div>
            <p style="color: var(--text-dim); text-align: center; margin: 15px 0;">
                Could not crack the password with the current settings. Try:
            </p>
            <ul style="color: var(--text-dim); margin-left: 20px;">
                <li>Increasing the max brute-force length</li>
                <li>Using the full character set</li>
                <li>Enabling both attack methods</li>
            </ul>
            <div class="result-stats" style="margin-top: 15px;">
                <div class="result-stat">
                    <div class="result-stat-label">Total Attempts</div>
                    <div class="result-stat-value">${totalAttempts.toLocaleString()}</div>
                </div>
                <div class="result-stat">
                    <div class="result-stat-label">Time Taken</div>
                    <div class="result-stat-value">${elapsed}s</div>
                </div>
            </div>
        `;
        
        resultSection.classList.add('result-failed');
    }
    
    resultSection.style.display = 'block';
    resultSection.classList.add('show');
    updateProgress(0);
}

// Update UI status
function updateStatus(text, type) {
    statusBadge.textContent = text;
    statusBadge.className = `status-badge status-${type}`;
}

// Update statistics
function updateStats() {
    const elapsed = (Date.now() - startTime) / 1000;
    const aps = Math.round(totalAttempts / (elapsed || 1));
    
    totalAttemptsEl.textContent = totalAttempts.toLocaleString();
    attemptsPerSecEl.textContent = aps.toLocaleString();
    elapsedTimeEl.textContent = elapsed.toFixed(1) + 's';
}

// Update progress bar
function updateProgress(percent) {
    progressPercent.textContent = `${Math.round(percent)}%`;
    progressFill.style.width = `${percent}%`;
}

// Log message
function logMessage(message, type = 'info') {
    const isEmpty = logContainer.querySelector('.empty-state');
    if (isEmpty) {
        logContainer.innerHTML = '';
    }
    
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `
        <div class="log-time">[${time}]</div>
        <div>${message}</div>
    `;
    
    logContainer.insertBefore(entry, logContainer.firstChild);
    
    // Keep only last 100 entries
    while (logContainer.children.length > 100) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

// Sleep utility
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Initialize
updateStatus('Ready', 'ready');
currentMethod.textContent = 'Select options and click "Start Cracking"';
logMessage('Password Cracking Simulator initialized', 'info');
logMessage('Configure your target and click "Start Cracking"', 'info');