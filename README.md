# 🛡️ AssetDefender - AI-Powered Digital Asset Protection

AssetDefender is a professional-grade MVP designed to protect digital creators' assets using **Neural Fingerprinting**. It detects unauthorized usage and violations in real-time, providing an automated takedown and alert system.

## 🚀 Key Features
- **Neural Fingerprinting (AI/CV):** Uses perceptual hashing (dHash) to identify visually similar images, even if they are resized or edited.
- **Per-User Data Isolation:** Every user has their own secure vault and detection history, isolated by email.
- **Automated Alerts:** Integrated with **Resend API** to send instant email notifications when a violation is detected.
- **Dynamic Dashboard:** Switches between "Protect Mode" (vaulting assets) and "Scan Mode" (checking violations).
- **Session Persistence:** Remembers returning users for a seamless login experience.
- **Modern UI/UX:** Sleek dark-themed interface with glassmorphism and real-time scanning animations.

## 🛠️ Tech Stack
- **Frontend:** Vanilla HTML5, CSS3, JavaScript (ES6+), Lucide Icons.
- **Backend:** Node.js, Express.
- **Image Processing:** Sharp, Imghash.
- **Database:** Local JSON-based isolated storage.
- **Communication:** Resend API (Email Alerts).

## 📦 Setup & Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/AssetDefender-MVP.git
   cd AssetDefender-MVP
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Resend API Key:
   ```env
   PORT=3000
   RESEND_API_KEY=your_resend_api_key_here
   ```

4. **Run the Server:**
   ```bash
   node server.js
   ```

5. **Access the App:**
   Open `http://localhost:3000` in your browser.

## 🛡️ Security Note
All user data and fingerprints are stored locally in isolated directories. Passwords are salted and hashed using SHA-256 for secure authentication.

---
Built with ❤️ for the Hackathon.
