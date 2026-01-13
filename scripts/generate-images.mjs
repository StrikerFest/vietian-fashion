import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !geminiApiKey) {
    console.error('Error: Missing environment variables (SUPABASE_URL, SERVICE_KEY, or GEMINI_API_KEY).');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function generateImage(prompt, outputPath) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-fast-generate-001:predict?key=${geminiApiKey}`;
    
    const payload = {
        instances: [
            { prompt: prompt }
        ],
        parameters: {
            sampleCount: 1,
            aspectRatio: "3:4" 
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API Error ${response.status}: ${errText}`);
        }

        const data = await response.json();
        const base64Image = data.predictions?.[0]?.bytesBase64Encoded;

        if (!base64Image) {
            throw new Error('No image data returned from API.');
        }

        const buffer = Buffer.from(base64Image, 'base64');
        fs.writeFileSync(outputPath, buffer);
        return true;
    } catch (error) {
        console.error('  ❌ Image generation failed:', error.message);
        return false;
    }
}

async function main() {
    console.log('🎨 Starting Product Image Generation...');

    // 1. Fetch products with placeholder images
    const { data: products, error } = await supabase
        .from('products')
        .select('id, name, description, image_url')
        .ilike('image_url', '%placehold.co%');

    if (error) {
        console.error('Database error:', error);
        process.exit(1);
    }

    if (!products || products.length === 0) {
        console.log('No products with placeholder images found.');
        return;
    }

    console.log(`Found ${products.length} products to update.`);

    // 2. Process
    for (const [index, p] of products.entries()) {
        console.log(`[${index + 1}/${products.length}] Processing: ${p.name}`);

        const prompt = `High quality e-commerce product photography, professional studio lighting, clean white background. Fashion item: ${p.name}. Description: ${p.description}. Detailed, realistic, 4k.`;
        const fileName = `${p.id}.jpeg`;
        const localPath = path.resolve(__dirname, `../public/products/${fileName}`);
        const publicUrl = `/products/${fileName}`;

        // Check if file already exists (skip if so, to save quota/time if re-running)
        if (fs.existsSync(localPath)) {
            console.log('  ⏭️  Image already exists locally. Updating DB URL only.');
        } else {
            console.log('  Generating image...');
            const success = await generateImage(prompt, localPath);
            if (!success) {
                console.log('  Skipping DB update for this product due to generation failure.');
                continue;
            }
        }

        // 3. Update Supabase
        const { error: updateError } = await supabase
            .from('products')
            .update({ image_url: publicUrl })
            .eq('id', p.id);

        if (updateError) {
            console.error('  Failed to update database:', updateError.message);
        } else {
            console.log('  ✅ Database updated.');
        }

        // Small delay to be nice to the API
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('✨ Done!');
}

main();
