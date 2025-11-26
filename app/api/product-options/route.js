import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const productPrice = parseFloat(searchParams.get('price') || '0');

    if (!productId) {
        return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
    }

    try {
        // 1. Fetch Product Metadata (Categories & Collections) for Rule Matching
        const [catRes, colRes] = await Promise.all([
            supabase.from('product_categories').select('category_id').eq('product_id', productId),
            supabase.from('product_collections').select('collection_id').eq('product_id', productId)
        ]);

        const categoryIds = new Set(catRes.data?.map(c => c.category_id) || []);
        const collectionIds = new Set(colRes.data?.map(c => c.collection_id) || []);

        // 2. Fetch All Active Option Sets
        const { data: optionSets, error } = await supabase
            .from('option_sets')
            .select(`
                *,
                product_options (
                    id, type, label, is_required, position, values
                )
            `)
            .eq('is_active', true)
            .is('deleted_at', null)
            .order('priority', { ascending: false });

        if (error) throw error;

        // 3. Filter Sets based on Rules
        const applicableSets = optionSets.filter(set => {
            if (!set.rules || set.rules.length === 0) return false; // No rules = no display (safer default)

            // OR Logic: If *any* rule matches, the set applies
            return set.rules.some(rule => {
                switch (rule.type) {
                    case 'all':
                        return true;
                    case 'product':
                        return rule.value == productId; // Loose equality for string/int mismatch
                    case 'category':
                        return categoryIds.has(parseInt(rule.value));
                    case 'collection':
                        return collectionIds.has(parseInt(rule.value));
                    case 'price':
                        const limit = parseFloat(rule.value);
                        if (rule.operator === 'gt') return productPrice > limit;
                        if (rule.operator === 'lt') return productPrice < limit;
                        return false;
                    default:
                        return false;
                }
            });
        });

        // 4. Sort Options within Sets
        const result = applicableSets.map(set => ({
            ...set,
            product_options: set.product_options.sort((a, b) => a.position - b.position)
        }));

        return NextResponse.json(result);

    } catch (error) {
        console.error('Option fetch error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}