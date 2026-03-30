async function handleUrlLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    const urlPassword = urlParams.get('password');

    if (urlUsername && urlPassword) {
        document.getElementById('login-user').value = urlUsername;
        document.getElementById('login-pass').value = urlPassword;

        const messageEl = document.getElementById('message');
        messageEl.textContent = 'Attempting login with URL parameters...';

        const result = await login(urlUsername, urlPassword);

        if (result.success) {
            messageEl.textContent = 'Login successful! Redirecting...';

            setTimeout(() => {
                location.href = '/';
            }, 1500);
        } else {
            messageEl.textContent = 'Login failed: ' + result.message;
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
    }
});