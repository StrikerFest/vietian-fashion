import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const now = new Date().toISOString();

        // 1. Fetch all public active categories
        // (Similar logic to GET /api/categories?mode=public)
        let { data: categories, error: catError } = await supabase
            .from('categories')
            .select('id, name, slug, parent_id, sort_order')
            .eq('type', 'catalog') // Navbar only uses catalog
            .is('deleted_at', null)
            .eq('is_active', true)
            .or(`start_date.is.null,start_date.lte.${now}`)
            .or(`end_date.is.null,end_date.gte.${now}`)
            .order('sort_order', { ascending: true })
            .order('name', { ascending: true });

        if (catError) throw catError;

        if (!categories || categories.length === 0) {
            return NextResponse.json([]);
        }

        // 2. Fetch Category IDs that have at least one ACTIVE product
        // We can't easily do a "JOIN" and "COUNT" in one go with simple PostgREST to filter PARENTS based on CHILDREN's products easily if structure is nested.
        // But we can fetch all `product_categories` where product is active.
        
        const { data: activeLinks, error: linkError } = await supabase
            .from('product_categories')
            .select('category_id, products!inner(status, deleted_at)')
            .eq('products.status', 'active')
            .is('products.deleted_at', null);

        if (linkError) throw linkError;

        // Create a Set of Category IDs that have direct products
        const activeCategoryIds = new Set(activeLinks.map(l => l.category_id));

        // 3. Filter Categories
        // A category is visible if:
        // A) It has active products directly (isInActiveSet)
        // OR
        // B) It has a CHILD that is visible (Recursive check)

        // First, build a map for easy tree traversal
        const categoryMap = {};
        categories.forEach(c => {
            c.children = [];
            categoryMap[c.id] = c;
        });

        // Build Tree structure (assign children)
        const roots = [];
        categories.forEach(c => {
            if (c.parent_id && categoryMap[c.parent_id]) {
                categoryMap[c.parent_id].children.push(c);
            } else {
                roots.push(c);
            }
        });

        // Recursive function to check visibility
        // Returns true if this node OR any descendant has active products
        const hasActiveProducts = (node) => {
            const hasDirect = activeCategoryIds.has(node.id);
            
            // Check children
            // We must filter the children array in place or create a new one
            // to remove empty branches from the UI
            const activeChildren = node.children.filter(child => hasActiveProducts(child));
            node.children = activeChildren; // Update children to only keep active ones

            const hasActiveChild = activeChildren.length > 0;

            return hasDirect || hasActiveChild;
        };

        // Filter roots
        const visibleRoots = roots.filter(root => hasActiveProducts(root));

        // Return flat list or tree? 
        // Navbar expects a specific structure. 
        // The original Navbar logic fetched flat list and built tree client-side.
        // But here we filtered the tree. 
        // Let's return the flattened list of ONLY visible items to keep frontend logic simple,
        // OR return the tree if Navbar can handle it.
        // Original Navbar:
        // data.forEach(item => ... itemMap ... if parent_id ... )
        
        // If we return the filtered flat list, the Navbar logic will rebuild the tree correctly
        // as long as we include parents of active children.
        // Our `hasActiveProducts` logic kept nodes if they have active children.
        
        // Let's re-flatten the `visibleRoots` to send back a format consistent with `/api/categories`.
        const flatten = (nodes) => {
            let flat = [];
            nodes.forEach(node => {
                const { children, ...rest } = node;
                flat.push(rest);
                if (children && children.length > 0) {
                    flat = [...flat, ...flatten(children)];
                }
            });
            return flat;
        };

        const result = flatten(visibleRoots);
        
        return NextResponse.json(result);

    } catch (error) {
        console.error('Error fetching categories with counts:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
