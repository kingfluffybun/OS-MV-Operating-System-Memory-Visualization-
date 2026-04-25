const container = document.getElementById('container');
const recoveryWordCount = 12;
let isSubmitting = false;
let generatedRecoveryKeys = '';
let pendingUsername = '';
let pendingPassword = '';

// Show Sign Up
function showSignUp() {
    container.classList.add("right-panel-active");
}

// Show Sign In
function showSignIn() {
    container.classList.remove("right-panel-active");
}

// Toggle Password Visibility
function togglePassword(element) {
    const input = element.parentElement.querySelector('input');
    const eyeOff = element.querySelector('.eye-off');
    const eyeOpen = element.querySelector('.eye-open');

    if (input.type === "password") {
        input.type = "text";
        eyeOff.style.display = "none";
        eyeOpen.style.display = "block";
    } else {
        input.type = "password";
        eyeOff.style.display = "block";
        eyeOpen.style.display = "none";
    }
}

// ========== LOGIN ==========
function signIn() {
    const form = document.getElementById('login-form');
    const loaderWrapper = document.getElementById("loader-wrapper");
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('login-user').value;
        const password = document.getElementById('login-pass').value;
        const messageEl = document.getElementById('message');

        const result = await login(username, password);

        if (result.success) {

            if (loaderWrapper) {
                loaderWrapper.style.display = "flex";
                
                loaderWrapper.style.opacity = "0";
                
                loaderWrapper.offsetHeight; 

                loaderWrapper.classList.remove("loaded");
                loaderWrapper.classList.add("show-loader");
                loaderWrapper.style.opacity = "1";
            }

            messageEl.textContent = 'Login successful! Entering...';
            messageEl.style.color = '#4CAF50';
            setTimeout(() => {
                location.href = 'simulator/index.html';
            }, 2500);

        } else {
            messageEl.textContent = result.message;
            messageEl.style.color = '#ce1e1e';
        }
    });
}

// ========== REGISTER ==========
// Requirements Check
const signUpForm = document.getElementById('reg-form');
const resetForm = document.getElementById('reset-form');

if (signUpForm) {
    signUpForm.addEventListener('input', async function(e) {
        e.preventDefault();

        RequirementsCheck();
    });
} else if (resetForm) {
    resetForm.addEventListener('input', async function(e) {
        e.preventDefault();

        ResetRequirementsCheck();
    });
}

// Register Submit
function signUp() {
    const form = document.getElementById('reg-form');
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const username = document.getElementById('reg-user').value;
        const password = document.getElementById('reg-pass').value;
        const confirmPassword = document.getElementById('reg-confirm-pass').value;
        const messageEl = document.getElementById('message-su');
        const passNotMatch = document.getElementById('pass-not-message-su');

        if (password !== confirmPassword) {
            passNotMatch.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert-icon lucide-circle-alert"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <p>Passwords do not match</p>
            `;
            passNotMatch.style.color = '#ce1e1e';
            return;
        } else {
            passNotMatch.textContent = '';
        }

        if (username.length < 3) {
            messageEl.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert-icon lucide-circle-alert"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <p>Username must be at least 3 characters long</p>
            `;
            messageEl.style.color = '#ce1e1e';
            return;
        } else {
            messageEl.textContent = '';
        }

        const result = await validateRegistration(username, password, confirmPassword);

        if (result.success) {
            messageEl.textContent = 'Proceeding to recovery...';
            messageEl.style.color = '#4CAF50';
            setTimeout(() => {
                location.href = 'create-recovery/index.html';
                clearField();
                generateRecoveryWords();
            }, 1500);
        } else {
            messageEl.textContent = result.message;
            messageEl.style.color = '#ce1e1e';
        }
    });
};

// ========== RESET PASSWORD ==========
// Verify
function verify() {
    const recoveryForm = document.getElementById('recovery-form');

    // Verify
    recoveryForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const wordCount = 12;
        let wordValues = [];

        for (let i = 0; i < wordCount; i++) {
            const input = document.getElementById(`word-${i}`);
            if (input) {
                wordValues.push(input.value.trim());
            }
        }

        if (wordValues.some(word => word === "")) {
            statusEl.textContent = 'Please enter all 12 recovery words.';
            statusEl.style.color = '#ce1e1e';
            return;
        }

        const recoveryKey = wordValues.join(' ');
        const statusEl = document.getElementById('recovery-status');

        const result = await verifyRecoveryKey(recoveryKey);

        if (result.success) {
            sessionStorage.setItem('passwordResetUser', JSON.stringify({
                user_id: result.user.user_id,
                username: result.user.username
            }));

            statusEl.textContent = 'Verification successful! Redirecting...';
            statusEl.style.color = '#4CAF50';
            setTimeout(() => {
                container.classList.add("right-panel-active");
            }, 1500);
        } else {
            statusEl.textContent = result.message;
            statusEl.style.color = '#ce1e1e';
        }
    });
}

// Reset Submit
function resetPass() {
    const stored = JSON.parse(sessionStorage.getItem('passwordResetUser'));
    const username = stored.username;
    const form = document.getElementById('reset-form');

    form.onsubmit = async function(e) {
        e.preventDefault();

        const newPassword = document.getElementById('new-pass').value;
        const confirmNewPassword = document.getElementById('confirm-new-pass').value;
        const statusEl = document.getElementById('reset-status');

        // Check if new password is same as old password
        const hashedPassword = await hashPassword(newPassword);
        const stmt = db.prepare(`SELECT password FROM users WHERE username = ?`);
        stmt.bind([username]);

        let user = null;

        try {
            if (stmt.step()) {
                user = stmt.getAsObject();
            }
        } finally {
            stmt.free();
        }

        if (newPassword !== confirmNewPassword) {
            statusEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert-icon lucide-circle-alert"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <p>Passwords do not match</p>
            `;
            statusEl.style.color = '#ce1e1e';
            return;
        } else {
            statusEl.textContent = '';
        }

        if (user.password === hashedPassword) {
            statusEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-alert-icon lucide-circle-alert"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            <p>New password cannot be the same as the old password</p>
            `;
            statusEl.style.color = '#ce1e1e';
            return;
        } else {
            statusEl.textContent = '';
        }

        const result = await resetPasswordUser(username, newPassword, confirmNewPassword);

        if (result.success) {
            statusEl.textContent = 'Password reset successful! Redirecting...';
            statusEl.style.color = '#4CAF50';
            setTimeout(() => {
                location.href = '../index.html';
                sessionStorage.removeItem('passwordResetUser');
            }, 1500);
        } else {
            statusEl.textContent = result.message;
            statusEl.style.color = '#ce1e1e';
        }
    };
}

// ========== RECOVERY ==========
function getPendingRegistration() {
    const data = sessionStorage.getItem('pendingRegistration');
    return data ? JSON.parse(data) : null;
}

// Generate recovery words
function generateRecoveryWords() {
    const storedKeys = sessionStorage.getItem('recoveryKeys');
    if (storedKeys) {
        generatedRecoveryKeys = storedKeys;
        return;
    }

    // Generate recovery words
    const words = [];
    const cryptoObj = window.crypto || window.msCrypto;

    for (let i = 0; i < recoveryWordCount; i++) {
        const array = new Uint32Array(1);
        cryptoObj.getRandomValues(array);
        const randomIndex = array[0] % wordList.length;
        words.push(wordList[randomIndex]);
    }

    generatedRecoveryKeys = words.join(' ');
    sessionStorage.setItem('recoveryKeys', generatedRecoveryKeys);
    return generatedRecoveryKeys;
}

// Display recovery words
function display() {
    const pending = getPendingRegistration();

    if(!pending) {
        document.getElementById('register-first').style.display = 'block';
        document.getElementById('confirm-form').style.display = 'none';
        document.getElementById('copy').style.display = 'none';
        document.getElementById('download').style.display = 'none';
        return;
    }

    pendingUsername = pending.username;
    pendingPassword = pending.password;

    generateRecoveryWords();

    const wordsArray = generatedRecoveryKeys.split(' ');

    wordsArray.forEach((word, index) => {
        const wordElement = document.getElementById(`display-word-${index}`);
        if (wordElement) {
            wordElement.textContent = word;
        }
    });
};

// Copy to Clipboard
function copyToClipboard() {
    navigator.clipboard.writeText(generatedRecoveryKeys).then(() => {
        document.getElementById('status').textContent = 'Copied to clipboard!';
        document.getElementById('status').style.color = '#4CAF50';
    }).catch(err => {
        document.getElementById('status').textContent = 'Failed to copy: ' + err;
        document.getElementById('status').style.color = '#ce1e1e';
    });
}

// Download
function downloadKeys() {
    const blob = new Blob([generatedRecoveryKeys], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ovms-recovery-key.txt';
    document.body.appendChild(link);

    const status = document.getElementById('status');
    status.textContent = 'Downloading...';
    status.style.color = 'green';

    link.click();

    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setTimeout(() => {
        status.textContent = 'Downloaded';
    }, 1000);
}

// Handle submit
function handleSubmit() {
    const form = document.getElementById('confirm-form');
    
    if (form.dataset.hasListener === 'true') {return};
    form.dataset.hasListener = 'true';

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();

        if (isSubmitting) return;
        isSubmitting = true;

        const statusEl = document.getElementById('status-2');

        let wordValues = [];
        for (let i = 0; i < 12; i++) {
            const input = document.getElementById(`word-${i}`);
            wordValues.push(input ? input.value.trim().toLowerCase() : "");
        }

        const confirmInput = wordValues.join(' ');

        if (wordValues.includes("")) {
            statusEl.textContent = 'Please fill in all 12 words.';
            statusEl.style.color = '#ce1e1e';
            isSubmitting = false;
            return;
        }

        if (confirmInput !== generatedRecoveryKeys.toLowerCase()) {
            statusEl.textContent = 'Incorrect recovery words. Please try again.';
            statusEl.style.color = '#ce1e1e';
            isSubmitting = false;
            return;
        }

        const hashedRecoveryKey = await hashRecoveryKey(generatedRecoveryKeys);
        const result = await completeRegistration(pendingUsername, pendingPassword, hashedRecoveryKey);

        if (result.success) {
            statusEl.textContent = 'Registration successful! Redirecting...';
            statusEl.style.color = '#4CAF50';
            sessionStorage.removeItem('pendingRegistration');
            sessionStorage.removeItem('recoveryKeys');
            setTimeout(() => {
                location.href = '../index.html';
            }, 1500);
        } else {
            statusEl.textContent = result.message;
            statusEl.style.color = '#ce1e1e';
            isSubmitting = false;
        }
    });
}

document.getElementById('word-0').addEventListener('paste', (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().split(/\s+/);

    pasteData.forEach((word, index) => {
        const input = document.getElementById(`word-${index}`);
        if (input) {
            input.value = word;
        }
    });
});

// ========== ADMIN PANEL ==========
function checkAdminAccess() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser'));

    if (!currentUser) {
        alert("You must login first.");
        setTimeout(() => {
            window.location.href = "/index.html";
        });
        return;
    }

    if (currentUser.user_role !== "admin") {
        alert("Access denied. Admins only.");
        setTimeout(() => {
            window.location.href = "/simulator/index.html";
        });
        return;
    }
}

// ========== OTHER FUNCTIONS ==========
// Clear Field
function clearField() {
    document.getElementById('reg-user').value = '';
    document.getElementById('reg-pass').value = '';
    document.getElementById('reg-confirm-pass').value = '';
    document.getElementById('message-su').textContent = '';
    document.getElementById('pass-not-message-su').textContent = '';
    document.getElementById('req1-text-su').style.color = '#64748b';
    document.getElementById('req1-no-check-su').style.display = 'block';
    document.getElementById('req1-no-check-su').style.color = '#64748b';
    document.getElementById('req1-check-su').style.display = 'none';
    document.getElementById('req1-check-su').style.color = '#64748b';
    document.getElementById('req2-text-su').style.color = '#64748b';
    document.getElementById('req2-no-check-su').style.display = 'block';
    document.getElementById('req2-no-check-su').style.color = '#64748b';
    document.getElementById('req2-check-su').style.display = 'none';
    document.getElementById('req2-check-su').style.color = '#64748b';
    document.getElementById('req3-text-su').style.color = '#64748b';
    document.getElementById('req3-no-check-su').style.display = 'block';
    document.getElementById('req3-no-check-su').style.color = '#64748b';
    document.getElementById('req3-check-su').style.display = 'none';
    document.getElementById('req3-check-su').style.color = '#64748b';
    document.getElementById('req4-text-su').style.color = '#64748b';
    document.getElementById('req4-no-check-su').style.display = 'block';
    document.getElementById('req4-no-check-su').style.color = '#64748b';
    document.getElementById('req4-check-su').style.display = 'none';
    document.getElementById('req4-check-su').style.color = '#64748b';
}

// Check Requirements
function RequirementsCheck() {
    const usernameInput = document.getElementById('reg-user');
    const passwordInput = document.getElementById('reg-pass');
    const confirmPasswordInput = document.getElementById('reg-confirm-pass');
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const messageEl = document.getElementById('message-su');
    const passNotMessageEl = document.getElementById('pass-not-message-su');
    const req1T = document.getElementById('req1-text-su');
    const req1N = document.getElementById('req1-no-check-su');
    const req1C = document.getElementById('req1-check-su');
    const req2T = document.getElementById('req2-text-su');
    const req2N = document.getElementById('req2-no-check-su');
    const req2C = document.getElementById('req2-check-su');
    const req3T = document.getElementById('req3-text-su');
    const req3N = document.getElementById('req3-no-check-su');
    const req3C = document.getElementById('req3-check-su');
    const req4T = document.getElementById('req4-text-su');
    const req4N = document.getElementById('req4-no-check-su');
    const req4C = document.getElementById('req4-check-su');

    // Username at least 3 characters
    if (usernameInput.value.length >= 3) {
        messageEl.textContent = '';
    }

    // Password match
    if (password === confirmPassword) {
        passNotMessageEl.textContent = '';
    }

    [req1T, req1N, req1C, req2T, req2N, req2C, req3T, req3N, req3C, req4T, req4N, req4C].forEach(element => {
        element.style.color = '#64748b';
    });

    // At least 8 characters
    if (password.length >= 8 ) {
        req1N.style.display = 'none';
        req1C.style.display = 'block';
        req1C.style.color = '#4CAF50';
        req1T.style.color = '#4CAF50';
    } else if (password.length > 0) {
        req1N.style.display = 'block';
        req1C.style.display = 'none';
        req1N.style.color = '#ce1e1e';
        req1T.style.color = '#ce1e1e';
    } else {
        req1N.style.display = 'block';
        req1C.style.display = 'none';
    }

    // At least one number
    if (/[0-9]/.test(password)) {
        req2N.style.display = 'none';
        req2C.style.display = 'block';
        req2C.style.color = '#4CAF50';
        req2T.style.color = '#4CAF50';
    } else {
        req2N.style.display = 'block';
        req2C.style.display = 'none';
        if (password.length > 0) {
            req2N.style.color = '#ce1e1e';
            req2T.style.color = '#ce1e1e';
        }
    }

    // At least one uppercase and lowercase letter
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
        req3N.style.display = 'none';
        req3C.style.display = 'block';
        req3C.style.color = '#4CAF50';
        req3T.style.color = '#4CAF50';
    } else {
        req3N.style.display = 'block';
        req3C.style.display = 'none';
        if (password.length > 0) {
            req3N.style.color = '#ce1e1e';
            req3T.style.color = '#ce1e1e';
        }
    }

    // At least one special character
    if (/[@$!%*?&#]/.test(password)) {
        req4N.style.display = 'none';
        req4C.style.display = 'block';
        req4C.style.color = '#4CAF50';
        req4T.style.color = '#4CAF50';
    } else {
        req4N.style.display = 'block';
        req4C.style.display = 'none';
        if (password.length > 0) {
            req4N.style.color = '#ce1e1e';
            req4T.style.color = '#ce1e1e';
        }
    }
}

// Check Reset Requirements
function ResetRequirementsCheck() {
    const passwordInput = document.getElementById('new-pass');
    const confirmPasswordInput = document.getElementById('confirm-new-pass');
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    const status = document.getElementById('reset-status');

    const req1TR = document.getElementById('req1-text-res');
    const req1NR = document.getElementById('req1-no-check-res');
    const req1CR = document.getElementById('req1-check-res');
    const req2TR = document.getElementById('req2-text-res');
    const req2NR = document.getElementById('req2-no-check-res');
    const req2CR = document.getElementById('req2-check-res');
    const req3TR = document.getElementById('req3-text-res');
    const req3NR = document.getElementById('req3-no-check-res');
    const req3CR = document.getElementById('req3-check-res');
    const req4TR = document.getElementById('req4-text-res');
    const req4NR = document.getElementById('req4-no-check-res');
    const req4CR = document.getElementById('req4-check-res');

    [req1TR, req1NR, req1CR, req2TR, req2NR, req2CR, req3TR, req3NR, req3CR, req4TR, req4NR, req4CR].forEach(element => {
        element.style.color = '#64748b';
    });

    if (password === confirmPassword) {
        status.textContent = '';
    }

    // At least 8 characters
    if (password.length >= 8 ) {
        req1NR.style.display = 'none';
        req1CR.style.display = 'block';
        req1CR.style.color = '#4CAF50';
        req1TR.style.color = '#4CAF50';
    } else if (password.length > 0) {
        req1NR.style.display = 'block';
        req1CR.style.display = 'none';
        req1NR.style.color = '#ce1e1e';
        req1TR.style.color = '#ce1e1e';
    } else {
        req1NR.style.display = 'block';
        req1CR.style.display = 'none';
    }

    // At least one number
    if (/[0-9]/.test(password)) {
        req2NR.style.display = 'none';
        req2CR.style.display = 'block';
        req2CR.style.color = '#4CAF50';
        req2TR.style.color = '#4CAF50';
    } else {
        req2NR.style.display = 'block';
        req2CR.style.display = 'none';
        if (password.length > 0) {
            req2NR.style.color = '#ce1e1e';
            req2TR.style.color = '#ce1e1e';
        }
    }

    // At least one uppercase and lowercase letter
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) {
        req3NR.style.display = 'none';
        req3CR.style.display = 'block';
        req3CR.style.color = '#4CAF50';
        req3TR.style.color = '#4CAF50';
    } else {
        req3NR.style.display = 'block';
        req3CR.style.display = 'none';
        if (password.length > 0) {
            req3NR.style.color = '#ce1e1e';
            req3TR.style.color = '#ce1e1e';
        }
    }

    // At least one special character
    if (/[@$!%*?&#]/.test(password)) {
        req4NR.style.display = 'none';
        req4CR.style.display = 'block';
        req4CR.style.color = '#4CAF50';
        req4TR.style.color = '#4CAF50';
    } else {
        req4NR.style.display = 'block';
        req4CR.style.display = 'none';
        if (password.length > 0) {
            req4NR.style.color = '#ce1e1e';
            req4TR.style.color = '#ce1e1e';
        }
    }
}