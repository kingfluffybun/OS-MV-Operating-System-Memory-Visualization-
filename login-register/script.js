const container = document.getElementById('container');
const signUpButton = document.getElementById('signUp');
const signInButton = document.getElementById('signIn');
const loginForm = document.getElementById('login-form');
const forgotForm = document.getElementById('forgot-form');

// Show Sign Up
signUpButton.addEventListener('click', () => {
    container.classList.add("right-panel-active");
    toggleForgot(false);
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

function toggleForgot(show) {
    if(show) {
        loginForm.style.display = "none";
        forgotForm.style.display = "flex";
    } else {
        loginForm.style.display = "flex";
        forgotForm.style.display = "none";
    }
}

async function handleUrlLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    const urlPassword = urlParams.get('password');

    if (urlUsername && urlPassword) {
        document.getElementById('login-user').value = urlUsername;
        document.getElementById('login-pass').value = urlPassword;

        const messageEl = document.getElementById('message');
        messageEl.textContent = 'Attempting login with URL parameters...';
        messageEl.style.color = 'green';

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

// Login
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
document.getElementById('reg-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('reg-user').value;
    const password = document.getElementById('reg-pass').value;
    const confirmPassword = document.getElementById('reg-confirm-pass').value;
    const messageEl = document.getElementById('message');

    if (password !== confirmPassword) {
        messageEl.textContent = 'Passwords do not match';
        messageEl.style.color = 'red';
        return;
    }

    if (password.length < 8) {
        messageEl.textContent = 'Password must be at least 8 characters';
        messageEl.style.color = 'red';
        return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
        messageEl.textContent = 'Password must contain at least an uppercase and lowercase letter, a number, and one or more special characters';
        messageEl.style.color = 'red';
        return;
    }

    if (username.length < 3) {
        messageEl.textContent = 'Username must be at least 3 characters';
        messageEl.style.color = 'red';
        return;
    }

    const result = await register(username, password);

    if (result.success) {
        messageEl.textContent = result.message + ' Redirecting to login...';
        messageEl.style.color = 'green';
        setTimeout(() => {
            location.href = '/login-register/';
        }, 1500);
    } else {
        messageEl.textContent = result.message;
        messageEl.style.color = 'red';
    }
});