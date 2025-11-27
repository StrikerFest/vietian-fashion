import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generates a vector embedding for a given text string.
 * Uses Google's text-embedding-004 model.
 *
 * @param {string} text - The text to embed.
 * @returns {Promise<number[]>} - An array of 768 numbers representing the vector.
 */
export async function generateEmbedding(text) {
    if (!text) return null;

    // Clean text: remove newlines to improve embedding quality
    const cleanText = text.replace(/\n/g, ' ');

    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(cleanText);

    return result.embedding.values;
}