async function handleUrlLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlUsername = urlParams.get('username');
    const urlPassword = urlParams.get('password');

    if (urlUsername && urlPassword) {
        document.getElementById('username').value = urlUsername;
        document.getElementById('password').value = urlPassword;

        const messageEl = document.getElementById('message');
        messageEl.textContent = 'Attempting login with URL parameters...';

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

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
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