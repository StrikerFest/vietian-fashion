// app/api/products/category/[...slug]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function GET(request, context) {
    const params = await context.params;
    const { slug } = params;
    const { searchParams } = new URL(request.url);

    if (!slug || slug.length === 0) {
        return NextResponse.json({ error: 'Category slug is required.' }, { status: 400 });
    }

    const categorySlug = slug[slug.length - 1];
    const sortBy = searchParams.get('sort');
    const sizes = searchParams.getAll('size').filter(size => size);
    const colors = searchParams.getAll('color').filter(color => color);

    try {
        const { data: category, error: categoryError } = await supabase
            .from('categories')
            .select('id, name, description, seo_title, seo_description')
            .eq('slug', categorySlug)
            .is('deleted_at', null) // Ensure category itself is active
            .single();

        if (categoryError || !category) {
            return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
        }
        const categoryId = category.id;

        const { data: productLinks, error: linkError } = await supabase
            .from('product_categories')
            .select('product_id')
            .eq('category_id', categoryId);

        if (linkError) throw linkError;
        if (!productLinks || productLinks.length === 0) {
            return NextResponse.json({ category, products: [] });
        }
        const productIdsInCategory = productLinks.map(link => link.product_id);

        let productQuery = supabase
            .from('products')
            .select(`
                id, name, description,
                product_variants (
                    id, sku, price, size, color,
                    inventory_levels ( on_hand, committed )
                )
            `)
            .in('id', productIdsInCategory)
            .is('deleted_at', null); // --- NEW: Exclude archived products ---

        if (sizes.length > 0) {
            productQuery = productQuery.in('product_variants.size', sizes);
        }
        if (colors.length > 0) {
            productQuery = productQuery.in('product_variants.color', colors);
        }

        if (sortBy) {
            const [field, direction] = sortBy.split('-');
            const ascending = direction === 'asc';
            if (field === 'name') {
                productQuery = productQuery.order('name', { ascending });
            }
        } else {
            productQuery = productQuery.order('created_at', { ascending: false });
        }

        const { data: products, error: productsError } = await productQuery;

        if (productsError) throw productsError;

        let sortedProducts = products || [];
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