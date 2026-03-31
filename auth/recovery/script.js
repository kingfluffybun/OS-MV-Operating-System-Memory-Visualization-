const tempReg = getTempRegistration();

if (!tempReg) {
    document.body.innerHTML = '<h2>Session Expired</h2><p>Please start registration again.</p><a href="/auth/">Go to Register</a>';
}

document.getElementById('recovery-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const recoveryKey = document.getElementById('recovery-key').value;
    const confirmRecoveryKey = document.getElementById('confirm-recovery-key').value;
    const messageEl = document.getElementById('message');

    if (recoveryKey !== confirmRecoveryKey) {
        messageEl.textContent = 'Recovery keys do not match';
        messageEl.style.color = 'red';
        return;
    }

    if (recoveryKey.length < 3) {
        messageEl.textContent = 'Recovery key must be at least 3 characters';
        messageEl.style.color = 'red';
        return;
    }

    const result = await registerWithRecovery(recoveryKey);

    if (result.success) {
        messageEl.textContent = 'Registration successful! Redirecting...';
        messageEl.style.color = 'green';
        setTImeout(() => {
            location.href = '/auth/';
        }, 1500);
    } else {
        messageEl.textContent = result.message;
        messageEl.style.color = 'red';
    }
});