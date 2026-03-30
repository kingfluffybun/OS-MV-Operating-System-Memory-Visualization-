document.getElementById('regForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('reg-user').value;
    const password = document.getElementById('reg-pass').value;
    const confirmPassword = document.getElementById('reg-confirm-pass').value;
    const messageEl = document.getElementById('message');

    if (password !== confirmPassword) {
        messageEl.textContent = 'Error: Passwords do not match';
        messageEl.style.color = 'red';
        return;
    }

    if (password.length < 8) {
        messageEl.textContent = 'Error: Password must be at least 8 characters';
        messageEl.style.color = 'red';
        return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(password)) {
        messageEl.textContent = 'Error: Password must contain at least a number, one uppercase and lowercase letter, and one or more special characters';
        messageEl.style.color = 'red';
        return;
    }

    if (username.length < 3) {
        messageEl.textContent = 'Error: Username must be at least 3 characters';
        messageEl.style.color = 'red';
        return;
    }

    const result = await register(username, password);

    if (result.success) {
        messageEl.textContent = result.message + ' Redirecting to login...';
        messageEl.style.color = 'green';
        setTimeout(() => {
            location.href = '../login/';
        }, 1500);
    } else {
        messageEl.textContent = 'Error: ' + result.message;
        messageEl.style.color = 'red';
    }
});