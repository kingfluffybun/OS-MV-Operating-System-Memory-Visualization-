let adminCreds = null;

function initAdminSetup() {
    const credsData = sessionStorage.getItem('tempAdminData');
    
    if (!credsData) {
        window.location.href = '/index.html';
        return;
    }

    adminCreds = JSON.parse(credsData);
    setupEventListeners();
}

function setupEventListeners() {
    // Welcome Message
    const showCredsBtn = document.getElementById('show-creds-btn');
    if (showCredsBtn) {
        showCredsBtn.addEventListener('click', showCredentials)
    }

    // Admin Credentials
    const copyBtn = document.getElementById('copy-creds');
    const downloadBtn = document.getElementById('download-creds');
    const continueBtn = document.getElementById('continue-btn');

    if (copyBtn) copyBtn.addEventListener('click', copyAdminCreds);
    if (downloadBtn) downloadBtn.addEventListener('click', downloadAdminCreds);
    if (continueBtn) continueBtn.addEventListener('click', continueToApp);
}

// Show Admin Credentials
function showCredentials() {
    // Hide Welcome Message
    const welcome = document.getElementById('welcome-step');
    const creds = document.getElementById('creds-step');

    if (welcome) welcome.style.display = 'none';
    if (creds) {
        creds.style.display = 'block';
        displayAdminCreds();
    }
}

// Displays the admin creds
function displayAdminCreds() {
    if (!adminCreds) return;

    const username = document.getElementById('admin-username');
    const password = document.getElementById('admin-password');
    const recovery = document.getElementById('admin-recovery');
    
    if (username) username.textContent = adminCreds.username;
    if (password) password.textContent = adminCreds.password;
    if (recovery) recovery.textContent = adminCreds.recoveryKey;
}

// Copy
function copyAdminCreds() {
    if (!adminCreds) return;
    const text = `Username: ${adminCreds.username}\nPassword: ${adminCreds.password}\nRecovery Key: ${adminCreds.recoveryKey}`;
    
    navigator.clipboard.writeText(text).then(() => {
        showStatus('Copied to clipboard!', 'green');
    }).catch(err => {
        showStatus('Failed to copy: ' + err, 'red');
    });
}

// Download
function downloadAdminCreds() {
    if (!adminCreds) return;
    const text = `OS-MV Admin Credentials\n\nUsername: ${adminCreds.username}\nPassword: ${adminCreds.password}\nRecovery Key: ${adminCreds.recoveryKey}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'OS-MV-admin-creds.txt';
    document.body.appendChild(a);
    showStatus('Downloading...', 'blue');
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => {
        showStatus('Downloaded!', 'green');
    }, 1000);
}

function continueToApp() {
    sessionStorage.removeItem('tempAdminData');
    sessionStorage.removeItem('recoveryKeys');
    window.location.href = '/';
}

function showStatus(message, color) {
    const status = document.getElementById('status');
    if (status) {
        status.textContent = message;
        status.style.color = color;
    }
}

// ========== INITIALIZATION ==========
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminSetup);
} else {
    initAdminSetup();
}