const imghash = require('imghash');
const hamming = require('hamming-distance');
const sharp = require('sharp');

/**
 * FINGERPRINTING UTILITY (AI/CV)
 * 
 * Concept for Beginners:
 * Unlike a standard hash (like MD5), a "Perceptual Hash" doesn't change 
 * drastically if you resize or slightly edit an image. It looks at the 
 * "features" of the image to create a visual fingerprint.
 */

/**
 * Generate a visual fingerprint for an image
 * @param {Buffer|string} input - The image file path or buffer
 * @returns {Promise<string>} - The 64-bit binary hash
 */
async function generateFingerprint(input) {
    try {
        // We use imghash to generate a "Difference Hash" (dHash)
        // It's robust against scaling, aspect ratio changes, and brightness
        const hash = await imghash.hash(input, 16); // 16x16 bits for higher precision
        return hash;
    } catch (error) {
        console.error("Fingerprinting Error:", error);
        throw error;
    }
}

/**
 * Compare two fingerprints and return a similarity score
 * @param {string} hash1 - Original fingerprint
 * @param {string} hash2 - Suspicious fingerprint
 * @returns {number} - Similarity percentage (0 to 100)
 */
function calculateSimilarity(hash1, hash2) {
    // Hamming Distance counts how many bits are different
    // A distance of 0 means identical.
    const distance = hamming(hash1, hash2);
    
    // Total bits = 16 * 16 = 256 (since we used 16 in imghash.hash)
    const totalBits = 256;
    
    // Convert distance to similarity percentage
    const similarity = ((totalBits - distance) / totalBits) * 100;
    
    return parseFloat(similarity.toFixed(2));
}

module.exports = {
    generateFingerprint,
    calculateSimilarity
};
