const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, '../data/users.json');

/**
 * USER UTILITY
 * Handles user storage and password security.
 */

let userCache = null;
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
}

function loadUsers() {
    if (userCache) return userCache;
    try {
        const content = fs.readFileSync(USERS_FILE, 'utf-8');
        userCache = JSON.parse(content);
        return userCache;
    } catch (e) {
        userCache = [];
        return userCache;
    }
}

function saveUsers(users) {
    userCache = users;
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

/**
 * Securely hash a password using SHA-256 with a salt
 */
function hashPassword(password, salt) {
    const hash = crypto.createHmac('sha256', salt);
    hash.update(password);
    return hash.digest('hex');
}

/**
 * Register a new user
 */
function registerUser(email, password) {
    const users = loadUsers();
    if (users.find(u => u.email === email)) {
        throw new Error('User already exists');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hashedPassword = hashPassword(password, salt);

    users.push({
        email,
        password: hashedPassword,
        salt,
        createdAt: new Date().toISOString()
    });

    saveUsers(users);
    return { email };
}

/**
 * Authenticate a user
 */
function authenticateUser(email, password) {
    const users = loadUsers();
    const user = users.find(u => u.email === email);

    if (!user) {
        throw new Error('Invalid email or password');
    }

    const checkHash = hashPassword(password, user.salt);
    if (checkHash !== user.password) {
        throw new Error('Invalid email or password');
    }

    return { email: user.email };
}

module.exports = {
    registerUser,
    authenticateUser
};
