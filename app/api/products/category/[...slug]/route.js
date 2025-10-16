// app/api/products/category/[...slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;

    if (!slug || slug.length === 0) {
        return NextResponse.json({ error: 'Category slug is required.' }, { status: 400 });
    }

    // The last part of the slug array is the category we are looking for.
    // e.g., for /tops/t-shirts, the slug is ['tops', 't-shirts'], and we want 't-shirts'.
    const categorySlug = slug[slug.length - 1];

    try {
        // Step 1: Find the category ID from its slug.
        const { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('id, name, description')
            .eq('slug', categorySlug)
            .single();

        if (categoryError || !category) {
            return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
        }

        const categoryId = category.id;

        // Step 2: Find all product IDs linked to this category.
        const { data: productLinks, error: linkError } = await supabase
            .from('product_categories')
            .select('product_id')
            .eq('category_id', categoryId);

        if (linkError) throw linkError;

        if (!productLinks || productLinks.length === 0) {
            // It's not an error if a category is empty, so we return the category info.
            return NextResponse.json({ category, products: [] });
        }

        const productIds = productLinks.map(link => link.product_id);

        // Step 3: Fetch all products that match the found IDs.
        const { data: products, error: productsError } = await supabase
            .from('products')
            .select(`
                *,
                product_variants (
                    *,
                    inventory_levels (*)
                )
            `)
            .in('id', productIds);

        if (productsError) throw productsError;

        return NextResponse.json({ category, products });

    } catch (error) {
        console.error('Error fetching products by category:', error);
        return NextResponse.json({ error: 'Failed to fetch products for this category.', details: error.message }, { status: 500 });
    }
}