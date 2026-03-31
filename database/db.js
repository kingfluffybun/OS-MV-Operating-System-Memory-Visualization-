// 
// DB SETUP
// 

const SQL_JS_URL = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.js';
const SQL_JS_WASM = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/sql-wasm.wasm';

let SQL = null;
let db = null;
const DB_NAME = 'OVMS_db';
const STORAGE_KEY = 'OVMS_db_data';

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
            recovery_key TEXT NOT NULL,
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

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 
// REGISTRATION WITH RECOVERY
// 

let pendingRegistration = null;

function storeTempRegistration(username, password) {
    tempRegistration = {username, password};
    sessionStorage.setItem('tempRegistration', JSON.stringify(tempRegistration));
}

function getTempRegistration() {
    const data = sessionStorage.getItem('tempRegistration');
    return data ? JSON.parse(data) : null;
}

function clearTempRegistration() {
    tempRegistration = null;
    sessionStorage.removeItem('tempRegistration');
}

async function validateRegistration(username, password, confirmPassword) {
    if (username.length < 3) {
        return {
            success: false,
            message: '1'
        };
    }
    
    if  (password.length < 8) {
        return {
            success: false,
            message: '2'
        };
    }
    
    if (password !== confirmPassword) {
        return {
            success: false,
            message: '3'
        };
    }
    
    if (!/[A-Z]/.test(password) && /[a-z]/.test(password)) {
        return {
            success: false,
            message: '4'
        };
    }
    
    if (!/[0-9]/.test(password)) {
        return {
            success: false,
            message: '5'
        };
    }
    
    if (!/[@$!%*?&]/.test(password)) {
        return {
            success: false,
            message: '6'
        };
    }
    
    await initDB();
    const checkStmt = db.prepare(`SELECT user_id from users WHERE username = ?`);
    checkStmt.bind([username]);
    const exists = checkStmt.step();
    checkStmt.free();

    if (exists) {
        return {
            success: false,
            message: '7'
        };
    }

    return {
        success: true,
        message: ''
    };
}

async function registerWithRecovery(recoveryKey) {
    const temp = getTempRegistration();
    if (!temp) {
        return {
            success: false,
            message: 'No pending registration found'
        };
    }

    if (!recoveryKey || recoveryKey.length < 3) {
        return {
            success: false,
            message: 'Recovery key must be at least 3 characters'
        };
    }

    await initDB();

    const hashedPassword = await hashPassword(temp.password);
    const hashedRecoveryKey = await hashPassword(recoveryKey);

    try {
        const stmt = db.prepare(`INSERT INTO users (username, password, recovery_key, created_at, updated_at) VALUES (?, ?, ?, datetime('now'), datetime('now'))`);
        stmt.run([temp.username, hashedPassword, hashedRecoveryKey]);
        stmt.free();
        saveDB();

        clearTempRegistration();

        return {
            success: true,
            message: 'Registration successful! Redirecting...'
        };
    } catch(e) {
        if (e.message.includes('UNIQUE constraint failed')) {
            return {
                success: false,
                message: 'Username already exists'
            };
        }

        return {
            success: false,
            message: e.message
        };
    }
}

async function verifyRecoveryKey(username, recoveryKey) {
    await initDB();

    if (!username || !recoveryKey) {
        return {
            success: false,
            message: 'Username and recovery key are required'
        };
    }

    const hashedRecoveryKey = await hashPassword(recoveryKey);
    const stmt = db.prepare(`SELECT user_id FROM users WHERE username = ? AND recovery_key = ?`);
    stmt.bind([username, hashedRecoveryKey]);

    let valid = false;
    if (stmt.step()) {
        valid = true;
    }
    stmt.free();

    return {
        success: valid,
        message: valid ? 'Recovery Key verified' : 'Invalid Recovery Key'
    };
}

async function resetPassword(username, recoveryKey, newPassword, confirmNewPassword) {
    if (newPassword.length < 8) {
        return {
            success: false,
            message: 'Password must be at least 8 characters'
        };
    }

    if (newPassword !== confirmNewPassword) {
        return {
            success: false,
            message: 'Passwords do not match'
        };
    }

    const verify = await verifyRecoveryKey(username, recoveryKey);

    if (!verify.success) {
        return verify;
    }

    const hashedPassword = await hashPassword(newPassword);
    const stmt = db.prepare(`UPDATE users SET password = ?, updated_at = datetime('now') WHERE username = ?`);
    stmt.run([hashedPassword, username]);
    stmt.free();
    saveDB();

    return {
        success: true,
        message: 'Password reset successful! Redirecting...'
    }
}

// Login
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

function getCurrentUser() {
    const userData = sessionStorage.getItem('currentUser');
    return userData ? JSON.parse(userData) : null;
}