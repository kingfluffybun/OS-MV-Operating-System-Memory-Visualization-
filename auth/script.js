const container = document.getElementById('container');
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const loginForm = document.getElementById('login-form');
const recoveryForm = document.getElementById('recovery-form');
const forgotForm = document.getElementById('forgot-form');

// Show Sign Up
signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
    toggleRecovery(false);
});

// Show Sign In
signInButton.addEventListener('click', () => {
    container.classList.remove("right-panel-active");
});

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

// recovery form
function toggleRecovery(show) {
    if(show) {
        loginForm.style.display = "none";
        recoveryForm.style.display = "flex";
        forgotForm.style.display = "none";
    } else {
        loginForm.style.display = "flex";
        recoveryForm.style.display = "none";
        forgotForm.style.display = "none";
    }
}

// forgot password form
function toggleForgot(show) {
    if(show) {
        recoveryForm.style.display = "none";
        forgotForm.style.display = "flex";
    } else {
        toggleRecovery(false);
    }
}

// Login
async function handleUrlLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    const urlPassword = urlParams.get('password');

    if (urlUsername && urlPassword) {
        document.getElementById('login-user').value = urlUsername;
        document.getElementById('login-pass').value = urlPassword;

        const messageEl = document.getElementById('message');
        const result = await login(urlUsername, urlPassword);

        if (result.success) {
            messageEl.textContent = 'Login successful! Redirecting...';
            messageEl.style.color = 'green';

            setTimeout(() => {
                location.href = '/';
            }, 1500);
        } else {
            messageEl.textContent = 'Login failed: ' + result.message;
            messageEl.style.color = 'red';
        }
    }
}

handleUrlLogin();

document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('login-user').value;
    const password = document.getElementById('login-pass').value;
    const messageEl = document.getElementById('message');

    const result = await login(username, password);

    if (result.success) {
        messageEl.textContent = 'Login successful! Redirecting...';
        messageEl.style.color = 'green';

        setTimeout(() => {
            location.href = '/';
        }, 1500);
    } else {
        messageEl.textContent = 'Login failed: ' + result.message;
        messageEl.style.color = 'red';
    }
});

// Register
// Requirements Check
document.getElementById('reg-form').addEventListener('input', async function(e) {
    e.preventDefault();

    const passwordInput = document.getElementById('reg-pass');
    const password = passwordInput.value;
    const req1T = document.getElementById('req1-text');
    const req1N = document.getElementById('req1-no-check');
    const req1C = document.getElementById('req1-check');
    const req2T = document.getElementById('req2-text');
    const req2N = document.getElementById('req2-no-check');
    const req2C = document.getElementById('req2-check');
    const req3T = document.getElementById('req3-text');
    const req3N = document.getElementById('req3-no-check');
    const req3C = document.getElementById('req3-check');
    const req4T = document.getElementById('req4-text');
    const req4N = document.getElementById('req4-no-check');
    const req4C = document.getElementById('req4-check');

    // At least 8 characters
    if (passwordInput.value.length >= 8) {
        req1N.style.display = 'none';
        req1C.style.display = 'block';
        req1C.style.color = '#4CAF50';
        req1T.style.color = '#4CAF50';
    } else if (passwordInput.value.length < 8 && passwordInput.value.length > 0) {
        req1N.style.display = 'block';
        req1C.style.display = 'none';
        req1N.style.color = '#ce1e1e';
        req1T.style.color = '#ce1e1e';
        req2N.style.color = '#ce1e1e';
        req2T.style.color = '#ce1e1e';
        req3N.style.color = '#ce1e1e';
        req3T.style.color = '#ce1e1e';
        req4N.style.color = '#ce1e1e';
        req4T.style.color = '#ce1e1e';
    } else {
        req1N.style.display = 'block';
        req1C.style.display = 'none';
        req1N.style.color = '#64748b';
        req1T.style.color = '#64748b';
        req2N.style.color = '#64748b';
        req2T.style.color = '#64748b';
        req3N.style.color = '#64748b';
        req3T.style.color = '#64748b';
        req4N.style.color = '#64748b';
        req4T.style.color = '#64748b';
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
    }

    // At least one special character
    if (/[@$!%*?&]/.test(password)) {
        req4N.style.display = 'none';
        req4C.style.display = 'block';
        req4C.style.color = '#4CAF50';
        req4T.style.color = '#4CAF50';
    } else {
        req4N.style.display = 'block';
        req4C.style.display = 'none';
    }
});

// Register Submit
document.getElementById('reg-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('reg-user').value;
    const password = document.getElementById('reg-pass').value;
    const confirmPassword = document.getElementById('reg-confirm-pass').value;
    const messageEl = document.getElementById('message');
    const nocheck = document.getElementById('no-check');
    const check = document.getElementById('check');

    if (password !== confirmPassword) {
        messageEl.textContent = 'Passwords do not match';
        messageEl.style.color = 'red';
        return;
    }

    if (username.length < 3) {
        messageEl.textContent = 'Username must be at least 3 characters';
        messageEl.style.color = 'red';
        return;
    }

    const result = await register(username, password, confirmPassword);

    if (result.success) {
        messageEl.textContent = result.message + 'Successful! Redirecting to login...';
        messageEl.style.color = 'green';
        setTimeout(() => {
            location.href = '/auth/';
        }, 1500);
    } else {
        messageEl.textContent = result.message;
        messageEl.style.color = 'red';
    }
});