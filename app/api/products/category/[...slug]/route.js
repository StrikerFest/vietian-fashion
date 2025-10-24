// app/api/products/category/[...slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url); // Get URL query parameters

    if (!slug || slug.length === 0) {
        return NextResponse.json({ error: 'Category slug is required.' }, { status: 400 });
    }

    const categorySlug = slug[slug.length - 1];

    // --- NEW: Parse Filter and Sort Parameters ---
    const sortBy = searchParams.get('sort'); // e.g., 'price-asc', 'price-desc', 'name-asc'
    const sizes = searchParams.getAll('size'); // Can have multiple: ?size=S&size=M
    const colors = searchParams.getAll('color'); // Can have multiple: ?color=Blue&color=Red

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
            return NextResponse.json({ category, products: [] });
        }
        const productIdsInCategory = productLinks.map(link => link.product_id);

        // --- Step 3: Build the Dynamic Product Query ---
        let productQuery = supabase
            .from('products')
            .select(`
                id, name, description,
                product_variants!inner (
                    id, sku, price, size, color,
                    inventory_levels!inner ( on_hand, committed )
                )
            `)
            .in('id', productIdsInCategory); // Filter by products in this category

        // --- Apply Variant Filters ---
        // Note: This requires filtering the product based on its variants
        if (sizes.length > 0 || colors.length > 0) {
            // We need products that have AT LEAST ONE variant matching the criteria
            productQuery = productQuery.filter('product_variants.id', 'not.is', null); // Ensure variants exist

            if (sizes.length > 0) {
                productQuery = productQuery.in('product_variants.size', sizes);
            }
            if (colors.length > 0) {
                productQuery = productQuery.in('product_variants.color', colors);
            }
        }

        // --- Apply Sorting ---
        // Sorting needs to happen on the base price of the variants
        // This is complex in Supabase JS, often easier done on the client or with RPC
        // For simplicity, we'll sort by product name or first variant price as a proxy
        if (sortBy) {
            const [field, direction] = sortBy.split('-');
            const ascending = direction === 'asc';
            if (field === 'name') {
                productQuery = productQuery.order('name', { ascending });
            } else if (field === 'price') {
                 // Ordering by variant price directly in the main query is tricky.
                 // We'll sort after fetching for simplicity here, but a DB function (RPC) is better for performance.
            }
        } else {
             productQuery = productQuery.order('created_at', { ascending: false }); // Default sort by newest
        }

        // Execute the query
        const { data: products, error: productsError } = await productQuery;
        if (productsError) throw productsError;

        // --- Post-fetch Sorting by Price (if requested) ---
        let sortedProducts = products;
        if (sortBy?.startsWith('price')) {
             const ascending = sortBy.endsWith('asc');
             sortedProducts.sort((a, b) => {
                 const priceA = a.product_variants[0]?.price || 0;
                 const priceB = b.product_variants[0]?.price || 0;
                 return ascending ? priceA - priceB : priceB - priceA;
             });
        }


        return NextResponse.json({ category, products: sortedProducts });

    } catch (error) {
        console.error('Error fetching filtered products by category:', error);
        return NextResponse.json({ error: 'Failed to fetch filtered products.', details: error.message }, { status: 500 });
    }
}