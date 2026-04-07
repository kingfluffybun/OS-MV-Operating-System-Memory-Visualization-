// ========== DB SETUP ==========
const SQL_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
const SQL_JS_WASM = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm';

let SQL = null;
let db = null;
const DB_NAME = 'OSMV_db';
const STORAGE_KEY = 'OSMV_db_data';
const ADMIN_CREATED = 'admin_created';

// ========== SQL.JS SETUP ==========
async function initSQL() {
    if (SQL) return SQL;

    await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SQL_JS_URL;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });

    SQL = await initSqlJs({
        locateFile: () => SQL_JS_WASM
    });

    return SQL;
}

// ========== DB SETUP ==========
async function initDB() {
    if (db) return db;
    await initSQL();

    const savedData = localStorage.getItem(STORAGE_KEY);

    if (savedData) {
        const binaryString = atob(savedData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        db = new SQL.Database(bytes);
    } else {
        db = new SQL.Database();
        createTables();
        saveDB();
    }
    return db;
}

function createTables() {
    console.log('Creating tables if they do not exist...');

    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            recovery_key TEXT,
            user_role TEXT DEFAULT 'user' CHECK(user_role IN ('user', 'admin')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
}

function saveDB() {
    if (!db) return;
    const data = db.export();
    const binaryString = String.fromCharCode(...data);
    const base64String = btoa(binaryString);
    localStorage.setItem(STORAGE_KEY, base64String);
}

// ========== HASHING ==========
async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashRecoveryKey(recoveryKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(recoveryKey.toLowerCase().trim());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// ========== ADMIN ACCOUNT ==========
async function checkAdmin() {
    await initDB();

    // Check if admin exists in database
    const checkStmt = db.prepare('SELECT user_id FROM users WHERE user_role =?');
    checkStmt.bind(['admin']);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
        localStorage.setItem(ADMIN_CREATED, "true");
        return false;
    }

    console.log('Creating admin account...');

    const adminData = await createAdminAcc();

    localStorage.setItem(ADMIN_CREATED, "true");

    sessionStorage.setItem('tempAdminData', JSON.stringify({
        username: adminData.username,
        password: adminData.password,
        recoveryKey: adminData.recoveryKey,
        showOnce: true
    }));

    await new Promise(resolve => setTimeout(resolve, 1000));

    return true; //Admin was created
}

async function createAdminAcc() {
    const username = 'admin';
    const password = generateRandomPassword();
    const recoveryKey = generateRecoveryWords();
    const hashedPassword = await hashPassword(password);
    const hashedRecoveryKey = await hashRecoveryKey(recoveryKey);

    const stmt = db.prepare(`
        INSERT INTO users (username, password, recovery_key, user_role, created_at, updated_at)
        VALUES (?, ?, ?, 'admin', datetime('now'), datetime('now'));
    `);
    stmt.run([username, hashedPassword, hashedRecoveryKey]);
    stmt.free();
    saveDB();

    return {
        username: username,
        password: password,
        recoveryKey: recoveryKey
    };
}

// Generate a random password for admin
function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    const cryptoObj = window.crypto || window.msCrypto;

    for (let i = 0; i < 12; i++) {
        const array = new Uint32Array(1);
        cryptoObj.getRandomValues(array);
        password += chars[array[0] % chars.length];
    }
    return password;
}

// ========== RECOVERY ==========
async function verifyRecoveryKey(recoveryKey) {
    await initDB();

    const hashedRecoveryKey = await hashRecoveryKey(recoveryKey);

    const stmt = db.prepare(`SELECT user_id, username FROM users WHERE recovery_key = ?`);
    stmt.bind([hashedRecoveryKey]);
    
    let user = null;
    let hasResult = false;

    try {
        hasResult = stmt.step();
        if (hasResult) {
            user = stmt.getAsObject();
        }
    } catch (e) {
        console.error('Error during recovery:', e);
    } finally {
        stmt.free();
    }

    if (hasResult && user) {
        return {
            success: true,
            user: user
        };
    } else {
        return {
            success: false,
            message: 'Invalid recovery key.'
        };
    }
}

async function resetPassword(username, newPassword, confirmNewPassword) {
    await initDB();

    if  (newPassword.length < 8) {
        return {success: false};
    }
    
    if (newPassword !== confirmNewPassword) {
        return {success: false};
    }
    
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword)) {
        return {success: false};
    }
    
    if (!/[0-9]/.test(newPassword)) {
        return {success: false};
    }
    
    if (!/[@$!%*?&#]/.test(newPassword)) {
        return {success: false};
    }

    const hashedPassword = await hashPassword(newPassword);

    try {
        const stmt = db.prepare(`UPDATE users SET password = ?, updated_at = datetime('now') WHERE username = ?`);
        stmt.run([hashedPassword, username]);
        stmt.free();
        saveDB();

        return {
            success: true,
            message: 'Password reset successful! Redirecting...'
        };
    } catch (e) {
        return {
            success: false,
            message: 'Password reset failed: ' + e.message
        };
    }
}

// ========== REGISTRATION ==========
// Validate Registration
async function validateRegistration(username, password, confirmPassword) {
    if (username.length < 3) {
        return {success: false};
    }
    
    if  (password.length < 8) {
        return {success: false};
    }
    
    if (password !== confirmPassword) {
        return {success: false};
    }
    
    if (!/[A-Z]/.test(password) || !/[a-z]/.test(password)) {
        return {success: false};
    }
    
    if (!/[0-9]/.test(password)) {
        return {success: false};
    }
    
    if (!/[@$!%*?&]/.test(password)) {
        return {success: false};
    }
    
    await initDB();
    const checkStmt = db.prepare(`SELECT user_id from users WHERE username = ?`);
    checkStmt.bind([username]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
        return {
            success: false,
            message: 'Username already exists'
        };
    }

    const hashedPassword = await hashPassword(password);
    sessionStorage.setItem('pendingRegistration', JSON.stringify({
        username: username,
        password: hashedPassword
    }));

    return {success: true};
}

// Complete Registration
async function completeRegistration(username, hashedPassword, hashedRecoveryKey) {
    await initDB();

    const checkStmt = db.prepare(`SELECT user_id from users WHERE username = ?`);
    checkStmt.bind([username]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
        return {
            success: false,
            message: 'Username already exists'
        };
    }

    try {
        const stmt = db.prepare(`
            INSERT INTO users (username, password, recovery_key, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'));
        `);
        stmt.run([username, hashedPassword, hashedRecoveryKey]);
        stmt.free();
        saveDB();

        return {
            success: true,
            message: ''
        };
    } catch (e) {
        return {
            success: false,
            message: 'Registration failed: ' + e.message
        };
    }
}

// ========== Login ==========
async function login(username, password) {
    await initDB();

    if (!username || !password) {
        return {
            success: false,
            message: 'Username and password are required'
        };
    }

    const hashedPassword = await hashPassword(password);

    const stmt = db.prepare(`
        SELECT * FROM users WHERE username = :username AND password = :password;
    `);
    stmt.bind({
        ':username': username,
        ':password': hashedPassword
    });

    let user = null;
    let hasResult = false;

    try {
        hasResult = stmt.step();
        if (hasResult) {
            user = stmt.getAsObject();
        }
    } catch (e) {
        console.error('Error during login:', e);
    } finally {
        stmt.free();
    }

    if (hasResult && user && user.user_id && user.user_id > 0) {
        if (user.username === username) {
            sessionStorage.setItem('currentUser', JSON.stringify(user));
            return {
                success: true,
                user: user
            };
        } else {
            return {
                success: false,
                message: 'Invalid username or password'
            };
        }
    } else {
        return {
            success: false,
            message: 'Invalid username or password'
        };
    }
}

function isLoggedIn() {
    return sessionStorage.getItem('currentUser') !== null;
}

function logout() {
    sessionStorage.removeItem('currentUser');
}

// ========== Admin Panel ==========
function loadUsers() {
    const tableBody = document.getElementById('user-table-body');
    const db = JSON.parse(localStorage.getItem("OVMS_db_data"));

    if (!db || !db.users) {
        tableBody.innerHTML = `<tr><td colspan="5">No users found</td></tr>`;
    }

    tableBody.innerHTML = "";

    db.users.forEach(user => {
        const row = document.createElement('tr');
        const isOnline = user.lastSession === "Active Now";

        row.innerHTML = `
            <td class="username-cell>${user.username}</td>
            <td>${formatDate(user.created_at)}</td>
            <td>
                < class="badge ${isOnline ? "Online" : "Offline"}">
                    ${user.lastSession || "Offline"}
                </
        `;
    })
}

// ========== Auto Initizialze Database ==========
(function autoInit() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();

async function initApp() {
    const needsAdmin = await checkAdmin();
    if (needsAdmin) {
        window.location.href = './admin-dashboard/admin-setup/index.html';
    }
}