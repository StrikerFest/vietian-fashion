// app/api/products/category/[...slug]/route.js
import { NextResponse } from 'next/server';
// @unchanged (import supabase remains the same)
import { supabase } from '@/lib/supabaseClient'; //

export async function GET(request, context) {
    // @unchanged (param and searchParam logic)
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
        // @unchanged (Step 1: Find the category)
        const { data: category, error: categoryError } = await supabase
            .from('categories') //
            .select('id, name, description, seo_title, seo_description') // Added SEO fields
            .eq('slug', categorySlug) //
            .single();
        if (categoryError || !category) {
            return NextResponse.json({ error: 'Category not found.' }, { status: 404 });
        }
        const categoryId = category.id;

        // @unchanged (Steps 2: Find product links)
        const { data: productLinks, error: linkError } = await supabase
            .from('product_categories') //
            .select('product_id') //
            .eq('category_id', categoryId); //
        if (linkError) throw linkError;
        if (!productLinks || productLinks.length === 0) {
            return NextResponse.json({ category, products: [] });
        }
        const productIdsInCategory = productLinks.map(link => link.product_id);

        // --- MODIFIED: Changed joins from !inner to !left (default) ---
        // This ensures products in the category are shown even if they have
        // no variants or inventory, matching the logic of /api/products
        let productQuery = supabase
            .from('products') //
            .select(`
                id, name, description,
                product_variants (
                    id, sku, price, size, color,
                    inventory_levels ( on_hand, committed )
                )
            `)
            .in('id', productIdsInCategory);

        // @unchanged (Apply filters)
        if (sizes.length > 0 || colors.length > 0) {
            // This filter correctly applies to the joined table
            if (sizes.length > 0) {
                productQuery = productQuery.in('product_variants.size', sizes); //
            }
            if (colors.length > 0) {
                productQuery = productQuery.in('product_variants.color', colors); //
            }
        }

        // @unchanged (Apply sorting)
        if (sortBy) {
// @unchanged (rest of sorting logic)
            const [field, direction] = sortBy.split('-');
            const ascending = direction === 'asc';
            if (field === 'name') {
                productQuery = productQuery.order('name', { ascending });
            }
        } else {
             productQuery = productQuery.order('created_at', { ascending: false });
        }

        // @unchanged (Execute query and post-fetch sorting)
        const { data: products, error: productsError } = await productQuery;
// @unchanged (rest of function)
        if (productsError) throw productsError;

        let sortedProducts = products;
        if (sortBy?.startsWith('price')) {
             const ascending = sortBy.endsWith('asc');
             sortedProducts.sort((a, b) => {
                 const priceA = a.product_variants[0]?.price || 0;
                 const priceB = b.product_variants[0]?.price || 0;
                 return ascending ? priceA - priceB : priceB - priceA;
             });
        }


        // Return category (now with SEO fields) and products
        return NextResponse.json({ category, products: sortedProducts });

    } catch (error) {
        console.error('Error fetching filtered products by category:', error);
        return NextResponse.json({ error: 'Failed to fetch filtered products.', details: error.message }, { status: 500 });
    }
}