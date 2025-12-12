import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { generateEmbedding } from '@/utils/ai-server';

// Helper to process a batch of items
async function processBatch(table, items) {
    let updated = 0;
    for (const item of items) {
        const textToEmbed = `${item.name} ${item.description || ''}`;

        try {
            const embedding = await generateEmbedding(textToEmbed);
            if (embedding) {
                const { error } = await supabase
                    .from(table)
                    .update({ embedding })
                    .eq('id', item.id);

                if (!error) updated++;
            }
        } catch (e) {
            console.error(`Failed to embed ${table} ${item.id}:`, e);
        }
    }
    return updated;
}

export async function POST() {
    try {
        // 1. Fetch Collections without embeddings (or just fetch all to sync)
        const { data: collections } = await supabase
            .from('collections')
            .select('id, name, description');

        // 2. Fetch Attribute Categories
        const { data: categories } = await supabase
            .from('categories')
            .select('id, name, description')
            .eq('type', 'attribute');

        // 3. Process
        const collectionsUpdated = await processBatch('collections', collections || []);
        const categoriesUpdated = await processBatch('categories', categories || []);

        return NextResponse.json({
            message: 'Cập nhật embeddings thành công.',
            stats: {
                collectionsProcessed: collectionsUpdated,
                categoriesProcessed: categoriesUpdated
            }
        });

    } catch (error) {
        console.error('Embedding generation error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}