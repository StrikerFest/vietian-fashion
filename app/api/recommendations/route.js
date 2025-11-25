// app/api/recommendations/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
    try {
        const body = await request.json();

        // Support both old (string) and new (object) formats
        let userQuery = "";
        let attributes = {};

        if (typeof body.query === 'string') {
            userQuery = body.query;
        } else {
            userQuery = body.generalPrompt || "";
            attributes = body.attributes || {}; // { Season: "Summer", Occasion: "Wedding" }
        }

        if (!userQuery && Object.keys(attributes).length === 0) {
            return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
        }

        // Construct a rich prompt for Gemini
        let promptContext = `User Search: "${userQuery}".\n`;
        if (Object.keys(attributes).length > 0) {
            promptContext += "Specific Constraints:\n";
            for (const [key, value] of Object.entries(attributes)) {
                if (value) promptContext += `- ${key}: ${value}\n`;
            }
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const systemInstruction = `
            You are a fashion shopping assistant. 
            Analyze the user's search context and constraints.
            Extract key search tags that match the item type, style, season, color, material, and occasion.
            
            Important:
            1.  Prioritize the specific constraints provided (e.g., if Season is Summer, include "Summer").
            2.  Expand on the general prompt (e.g., "beach wedding" -> "formal", "beach", "linen", "summer").
            3.  Return ONLY a clean JSON array of lowercase strings.
            
            Example Input: "Something for a party", Constraints: Season: Winter, Color: Red.
            Example Output: ["party", "winter", "red", "dress", "evening", "warm"]
        `;

        const result = await model.generateContent([systemInstruction, promptContext]);
        const response = await result.response;
        const text = response.text();

        const cleanedText = text.replace(/```json|```/g, '').trim();
        const tags = JSON.parse(cleanedText);

        if (!tags || tags.length === 0) {
            return NextResponse.json({ products: [] });
        }

        // Call the UPDATED RPC function
        const { data: products, error } = await supabase.rpc('search_products_by_tags', {
            tag_names: tags
        });

        if (error) throw error;

        return NextResponse.json({ products, generatedTags: tags });

    } catch (error) {
        console.error('Recommendation API error:', error);
        return NextResponse.json({ error: 'Failed to get recommendations.', details: error.message }, { status: 500 });
    }
}