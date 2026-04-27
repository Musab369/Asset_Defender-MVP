const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

const { generateFingerprint, calculateSimilarity } = require('./utils/fingerprint');
const { addAsset, addDetection, loadData, removeDetection, removeAsset } = require('./utils/storage');
const { registerUser, authenticateUser } = require('./utils/users');
const { analyzeImage } = require('./utils/ai');


// Helper: Load .env variables manually
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) process.env[key.trim()] = value.trim();
    });
}

const app = express();

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname)));

// Ensure required directories exist
const dirs = ['uploads', 'data'];
dirs.forEach(dir => {
    const p = path.join(__dirname, dir);
    if (!fs.existsSync(p)) fs.mkdirSync(p);
});
// Serve root files like audio

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

/**
 * API: AUTHENTICATION
 */
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = registerUser(email, password);

        // AUTOMATED WELCOME EMAIL
        const subject = "Welcome to AssetDefender!";
        const body = `Hello,\n\nWelcome to your new digital asset protection vault. Your account (${email}) is now active.\n\nSecurely,\nAssetDefender Team`;
        sendResendEmail(email, subject, body).catch(e => console.error("[AUTOMATION] Welcome email failed:", e));

        res.json({ success: true, user });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/login', (req, res) => {
    try {
        const { email, password } = req.body;
        const user = authenticateUser(email, password);
        res.json({ success: true, user });
    } catch (error) {
        res.status(401).json({ success: false, error: error.message });
    }
});

app.post('/api/auth/google', async (req, res) => {
    try {
        const { credential } = req.body;
        
        // Verify token with Google's API
        const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
        const payload = await response.json();

        if (!response.ok || payload.aud !== process.env.GOOGLE_CLIENT_ID) {
            throw new Error('Invalid Google Token');
        }

        console.log(`[AUTH] Google Login Success: ${payload.email}`);
        
        // In a real app, you'd find or create the user in your database here
        res.json({ 
            success: true, 
            user: { email: payload.email, name: payload.name, picture: payload.picture } 
        });
    } catch (error) {
        console.error('[AUTH] Google Login Failed:', error.message);
        res.status(401).json({ success: false, error: error.message });
    }
});

/**
 * API: REGISTER NEW ASSET
 * Use this to protect your original media.
 */
app.post('/api/register', upload.single('asset'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const userEmail = req.body.userEmail;
        if (!userEmail) return res.status(400).json({ error: 'User email is required' });

        console.log(`[SYSTEM] Registering asset for ${userEmail}: ${req.file.originalname}`);
        
        // 1. Generate the unique fingerprint (AI logic)
        const fingerprint = await generateFingerprint(req.file.path);
        
        // 2. Perform AI Analysis (Google Gemini)
        console.log(`[AI] Analyzing ${req.file.originalname} with Gemini...`);
        const aiAnalysis = await analyzeImage(req.file.path, req.file.mimetype);

        // 3. Store it under this user's profile
        const asset = {
            name: req.file.originalname,
            filename: req.file.filename,
            fingerprint: fingerprint,
            aiAnalysis: aiAnalysis, // Save AI results
            type: req.file.mimetype,
            timestamp: new Date().toISOString()
        };
        addAsset(userEmail, asset);

        res.json({ 
            success: true, 
            message: 'Asset protected successfully', 
            fingerprint: fingerprint 
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * API: CHECK FOR UNAUTHORIZED USAGE
 * Use this to scan a suspicious image against your library.
 */
app.post('/api/check', upload.single('asset'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        const userEmail = req.body.userEmail;
        if (!userEmail) return res.status(400).json({ error: 'User email is required' });

        console.log(`[SCANNER] ${userEmail} checking suspicious file: ${req.file.originalname}`);
        
        // 1. Generate fingerprint for the suspicious file
        const suspiciousFingerprint = await generateFingerprint(req.file.path);
        
        // 2. Compare against THIS USER'S stored original assets only
        const data = loadData(userEmail);
        const matches = data.assets.map(original => {
            const similarity = calculateSimilarity(original.fingerprint, suspiciousFingerprint);
            return {
                originalName: original.name,
                similarity: similarity,
                match: similarity > 85 // Threshold for detection
            };
        }).filter(m => m.match);

        // 3. Log detections under this user's profile if matches found
        if (matches.length > 0) {
            addDetection(userEmail, {
                filename: req.file.originalname,
                matches: matches,
                timestamp: new Date().toISOString()
            });

            // AUTOMATED ALERT
            const alertEmail = process.env.ALERT_RECEIVER_EMAIL;
            
            if (alertEmail && alertEmail !== 'your-email@example.com') {
                const subject = `[URGENT] Violation Detected: ${req.file.originalname}`;
                const body = `AssetDefender Alert System:\n\nMatch found for: ${req.file.originalname}\nPrimary Match: ${matches[0].originalName}\nSimilarity Score: ${matches[0].similarity}%\n\nRequested by: ${userEmail}\n\nPlease check your dashboard for details.\n\nSecurely,\nAssetDefender Robot`;
                sendResendEmail(alertEmail, subject, body).catch(e => console.error("[AUTOMATION] Auto-alert failed:", e));
            }
        }

        res.json({
            success: true,
            fingerprint: suspiciousFingerprint,
            matches: matches
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * API: GET DATA
 * Retrieve the dashboard stats and lists.
 */
app.get('/api/dashboard', (req, res) => {
    const userEmail = req.query.userEmail;
    if (!userEmail) {
        return res.status(400).json({ error: 'User email is required' });
    }
    const data = loadData(userEmail);
    res.json(data);
});

/**
 * API: SEND ALERT EMAIL
 * Silently sends an email notification about a violation.
 */
/**
 * Helper: Send Real Email via Resend
 */
async function sendResendEmail(to, subject, body) {
    const apiKey = process.env.RESEND_API_KEY || 're_V4oBr6Dm_K1d8VG9UZNUTUa3y1hygYJcK';
    
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            from: 'AssetDefender <onboarding@resend.dev>', // Use verified domain or onboarding address
            to: to,
            subject: subject,
            text: body
        })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Resend API Error');
    return result;
}
/**
 * API: UNPROTECT
 * Remove an asset from the user's vault
 */
app.post('/api/unprotect', (req, res) => {
    try {
        const { userEmail, assetId } = req.body;
        if (!userEmail || !assetId) {
            return res.status(400).json({ error: 'userEmail and assetId are required' });
        }
        
        removeAsset(userEmail, assetId);
        res.json({ success: true, message: 'Asset removed from vault' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * API: TAKEDOWN
 * Remove a violation from the active list
 */
app.post('/api/takedown', (req, res) => {
    try {
        const { userEmail, detectionId } = req.body;
        if (!userEmail || !detectionId) {
            return res.status(400).json({ error: 'userEmail and detectionId are required' });
        }
        
        removeDetection(userEmail, detectionId);
        res.json({ success: true, message: 'Detection removed successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * API: SEND ALERT EMAIL
 * Now uses Resend for real delivery.
 */
app.post('/api/send-alert', async (req, res) => {
    try {
        const { to, subject, body } = req.body;
        console.log(`[EMAIL] Attempting real delivery to: ${to}`);

        const result = await sendResendEmail(to, subject, body);
        console.log(`[EMAIL] Success! ID: ${result.id}`);

        res.json({
            success: true,
            message: "Real email sent successfully",
            id: result.id
        });

    } catch (error) {
        console.error("Error sending email:", error);
        res.status(500).json({ error: error.message });
    }
});

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`
=========================================
🛡️  AssetDefender Backend is Running!
🚀 Server: http://localhost:${PORT}
📁 Uploads: ${path.join(__dirname, 'uploads')}
=========================================
    `);
});
