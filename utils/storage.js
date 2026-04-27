const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '../data');

// Ensure the base data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

/**
 * Convert an email to a safe directory name (SHA-256 hash prefix + sanitized email)
 */
function emailToFolderName(email) {
    const hash = crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex').substring(0, 8);
    const safe = email.toLowerCase().trim().replace(/[^a-z0-9@._-]/g, '_');
    return `${hash}_${safe}`;
}

/**
 * Get the data file paths for a given user email
 */
function getUserPaths(email) {
    const folderName = emailToFolderName(email);
    const userDir = path.join(DATA_DIR, folderName);

    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
    }

    return {
        dir: userDir,
        assetsFile: path.join(userDir, 'assets.json'),
        detectionsFile: path.join(userDir, 'detections.json'),
    };
}

/**
 * Initialize a user's data files if they don't exist (fresh profile)
 */
function initUserIfNew(email) {
    const paths = getUserPaths(email);

    if (!fs.existsSync(paths.assetsFile)) {
        fs.writeFileSync(paths.assetsFile, JSON.stringify([], null, 2));
        console.log(`[STORAGE] New user profile created for: ${email}`);
    }
    if (!fs.existsSync(paths.detectionsFile)) {
        fs.writeFileSync(paths.detectionsFile, JSON.stringify([], null, 2));
    }

    return paths;
}

/**
 * Load all data for a specific user
 */
function loadData(email) {
    if (!email) {
        console.warn('[STORAGE] loadData called without email — returning empty');
        return { assets: [], detections: [] };
    }

    const paths = initUserIfNew(email);

    try {
        const assets = JSON.parse(fs.readFileSync(paths.assetsFile, 'utf-8'));
        const detections = JSON.parse(fs.readFileSync(paths.detectionsFile, 'utf-8'));
        return { assets, detections };
    } catch (error) {
        console.error(`[STORAGE] Error loading data for ${email}:`, error);
        return { assets: [], detections: [] };
    }
}

/**
 * Add a new asset to a user's protected library
 */
function addAsset(email, asset) {
    if (!email) throw new Error('Email required to save asset');

    const paths = initUserIfNew(email);
    const assets = JSON.parse(fs.readFileSync(paths.assetsFile, 'utf-8'));

    assets.push({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...asset
    });

    fs.writeFileSync(paths.assetsFile, JSON.stringify(assets, null, 2));
    console.log(`[STORAGE] Asset saved for ${email}: ${asset.name}`);
}

/**
 * Remove a specific asset from a user's vault
 */
function removeAsset(email, assetId) {
    if (!email) throw new Error('Email required to remove asset');

    const paths = initUserIfNew(email);
    let assets = JSON.parse(fs.readFileSync(paths.assetsFile, 'utf-8'));

    assets = assets.filter(a => a.id !== assetId);

    fs.writeFileSync(paths.assetsFile, JSON.stringify(assets, null, 2));
    console.log(`[STORAGE] Asset removed for ${email}: ${assetId}`);
}

/**
 * Log a violation detection for a user
 */
function addDetection(email, detection) {
    if (!email) throw new Error('Email required to save detection');

    const paths = initUserIfNew(email);
    const detections = JSON.parse(fs.readFileSync(paths.detectionsFile, 'utf-8'));

    detections.push({
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        ...detection
    });

    fs.writeFileSync(paths.detectionsFile, JSON.stringify(detections, null, 2));
    console.log(`[STORAGE] Detection saved for ${email}: ${detection.filename}`);
}

/**
 * Remove a specific detection for a user
 */
function removeDetection(email, detectionId) {
    if (!email) throw new Error('Email required to remove detection');

    const paths = initUserIfNew(email);
    let detections = JSON.parse(fs.readFileSync(paths.detectionsFile, 'utf-8'));

    detections = detections.filter(d => d.id !== detectionId);

    fs.writeFileSync(paths.detectionsFile, JSON.stringify(detections, null, 2));
    console.log(`[STORAGE] Detection removed for ${email}: ${detectionId}`);
}

module.exports = {
    loadData,
    addAsset,
    removeAsset,
    addDetection,
    removeDetection,
    initUserIfNew,
};
