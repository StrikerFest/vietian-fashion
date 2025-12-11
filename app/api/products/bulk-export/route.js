// app/api/products/bulk-export/route.js
import {NextResponse} from 'next/server';
import {createRouteHandlerClient} from '@supabase/auth-helpers-nextjs'; // Use dynamic client
import {cookies} from 'next/headers';
import Papa from 'papaparse';

export async function GET(request) {
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({cookies: () => cookieStore});

    // [SECURITY PATCH] ADMIN ONLY
    const {data: {session}} = await supabase.auth.getSession();
    if (!session) {
        return NextResponse.json({message: "Unauthorized"}, {status: 401});
    }
    // ----------------------------

    try {
        const {searchParams} = new URL(request.url);
        const idsQuery = searchParams.get('ids');

        let idArray = null;
        if (idsQuery) {
            idArray = idsQuery.split(',')
                .map(id => parseInt(id.trim(), 10))
                .filter(id => !isNaN(id));
        }

        // Fetch products with the Unified Taxonomy
        let query = supabase
            .from('products')
            .select(`
                *,
                product_variants (
                    *,
                    inventory_levels (*),
                    variant_attributes (
                        attribute_value:categories (
                            name, parent:parent_id ( name )
                        )
                    )
                )
            `)
            .is('deleted_at', null)
            .order('name', {ascending: true});

        if (idArray && idArray.length > 0) {
            query = query.in('id', idArray);
        }

        const {data: products, error} = await query;

        if (error) throw error;

        if (!products || products.length === 0) {
            return NextResponse.json({message: "No active products found to export."}, {status: 200});
        }

        const flattenedData = [];
        for (const product of products) {
            if (!product.product_variants || product.product_variants.length === 0) {
                flattenedData.push({
                    'product_name': product.name,
                    'description': product.description || '',
                    'seo_title': product.seo_title || '',
                    'seo_description': product.seo_description || '',
                    'sku': '', 'price': '', 'on_hand': '', 'dynamic_attributes': ''
                });
                continue;
            }

            for (const variant of product.product_variants) {
                // Build Dynamic Attribute String
                const attrStrings = [];

                if (variant.variant_attributes) {
                    variant.variant_attributes.forEach(va => {
                        if (va.attribute_value?.parent?.name) {
                            attrStrings.push(`${va.attribute_value.parent.name}: ${va.attribute_value.name}`);
                        }
                    });
                }

                flattenedData.push({
                    'product_name': product.name,
                    'description': product.description || '',
                    'seo_title': product.seo_title || '',
                    'seo_description': product.seo_description || '',
                    'sku': variant.sku,
                    'price': variant.price,
                    'on_hand': variant.inventory_levels?.[0]?.on_hand ?? 0,
                    'dynamic_attributes': attrStrings.join('; ')
                });
            }
        }

        const csv = Papa.unparse(flattenedData, {header: true});
        const headers = new Headers();
        headers.set('Content-Type', 'text/csv');
        headers.set('Content-Disposition', 'attachment; filename="products_export.csv"');

        return new Response(csv, {headers});

    } catch (error) {
        console.error('Error exporting products:', error);
        return NextResponse.json({error: 'Failed to export products.', details: error.message}, {status: 500});
    }
}