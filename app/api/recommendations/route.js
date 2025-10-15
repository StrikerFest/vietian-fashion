// app/api/recommendations/route.js
import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/lib/supabaseClient';

// Initialize the Google AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function POST(request) {
    try {
        const { query } = await request.json();

        if (!query) {
            return NextResponse.json({ error: 'Query is required.' }, { status: 400 });
        }

        // === Step 1: Use AI to extract tags from the user's query ===
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const prompt = `You are a helpful shopping assistant for an online clothing store. Analyze the user's request and extract key product tags. Focus on item type, style, season, color, and material. Return ONLY a clean JSON array of lowercase strings. For example, for the query 'a formal black shirt for work', you would return ["shirt", "formal", "black", "work"]. User query: "${query}"`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        const cleanedText = text.replace(/```json|```/g, '').trim();
        const tags = JSON.parse(cleanedText);

        if (!tags || tags.length === 0) {
            return NextResponse.json({ products: [] }); // Return empty if no tags were found
        }

        // === Step 2: Query the database to find products matching these tags ===
        // This is a more advanced query. We are calling a 'database function' or RPC.
        // It's a cleaner way to perform the complex JOIN and COUNT logic.
        // We will create this function in Supabase next.
        const { data: products, error } = await supabase.rpc('search_products_by_tags', {
            tag_names: tags
        });

        if (error) {
            console.error('Database RPC error:', error);
            throw new Error(error.message);
        }

        return NextResponse.json({ products });

    } catch (error) {
        console.error('Recommendation API error:', error);
        return NextResponse.json({ error: 'Failed to get recommendations.', details: error.message }, { status: 500 });
    }
}