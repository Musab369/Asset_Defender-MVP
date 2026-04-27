const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");

/**
 * Gemini AI Utility
 * Uses Gemini 1.5 Flash to analyze images for watermark detection and content description.
 */

/**
 * Converts local file information to a GoogleGenerativeAI.Part object.
 */
function fileToGenerativePart(path, mimeType) {
  return {
    inlineData: {
      data: Buffer.from(fs.readFileSync(path)).toString("base64"),
      mimeType,
    },
  };
}

/**
 * Analyzes an image using Gemini 1.5 Flash
 * @param {string} imagePath - Path to the image file
 * @param {string} mimeType - Mime type of the image
 * @returns {Promise<Object>} - Analysis results
 */
async function analyzeImage(imagePath, mimeType) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.error("[AI] Error: GEMINI_API_KEY is not defined in process.env");
            return { description: "AI analysis unavailable (Key missing)", hasWatermark: false };
        }

        // Initialize the Gemini API inside the call to ensure process.env is ready
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
        
        // Use the latest 2026 models available in the account
        const modelNames = ["gemini-3.1-flash-lite-preview", "gemini-3-flash-preview", "gemini-1.5-flash"];
        let model;
        let lastError;

        for (const name of modelNames) {
            try {
                console.log(`[AI] Attempting to use model: ${name}`);
                model = genAI.getGenerativeModel({ model: name });
                
                const prompt = `
                    Analyze this image for digital asset protection. 
                    1. Provide a brief 1-sentence description of the visual content.
                    2. Check for any visible watermarks, logos, or copyright text.
                    3. Rate the "Uniqueness" of this image from 1-10.
                    
                    Return the result in JSON format:
                    {
                        "description": "...",
                        "hasWatermark": true/false,
                        "watermarkDetail": "...",
                        "uniquenessScore": 8
                    }
                `;

                const imagePart = fileToGenerativePart(imagePath, mimeType);
                const result = await model.generateContent([prompt, imagePart]);
                const response = await result.response;
                const text = response.text();
                
                // If we got here, it worked!
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    return JSON.parse(jsonMatch[0]);
                }
                return { description: "AI analysis completed", hasWatermark: false, uniquenessScore: 5 };
                
            } catch (error) {
                lastError = error;
                console.warn(`[AI] Model ${name} failed:`, error.message);
                // Continue to next model
            }
        }

        throw lastError || new Error("All models failed");
    } catch (error) {
        console.error("[AI] Gemini Analysis Failed:", error.message);
        return { 
            description: "AI analysis unavailable", 
            error: error.message 
        };
    }
}

module.exports = { analyzeImage };
