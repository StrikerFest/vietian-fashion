// app/api/admin/analytics/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET() {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

    try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ error: 'Không có quyền truy cập' }, { status: 401 });
        }

        // 1. Basic Stats
        const { count: totalOrders } = await supabase
            .from('orders')
            .select('id', { count: 'exact', head: true });

        const { data: revenueData } = await supabase
            .from('orders')
            .select('total_amount, created_at');

        const totalRevenue = (revenueData || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);

        // 2. Sales Trend
        const salesByDate = {};
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        revenueData.forEach(order => {
            const date = new Date(order.created_at);
            if (date >= thirtyDaysAgo) {
                const dateStr = date.toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' });
                salesByDate[dateStr] = (salesByDate[dateStr] || 0) + order.total_amount;
            }
        });

        const salesChartData = Object.entries(salesByDate).map(([name, sales]) => ({ name, sales }));

        // 3. Top Selling Products
        const { data: bestSellers } = await supabase
            .from('order_items')
            .select(`
                quantity,
                product_variants (
                    product_id,
                    products ( name )
                )
            `)
            .order('quantity', { ascending: false })
            .limit(50);

        const productSales = {};
        bestSellers.forEach(item => {
            const pName = item.product_variants?.products?.name || 'Không xác định';
            const pId = item.product_variants?.product_id;
            if (!productSales[pId]) productSales[pId] = { name: pName, id: pId, sold: 0 };
            productSales[pId].sold += item.quantity;
        });

        const topProducts = Object.values(productSales)
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 5);

        // 4. Low Stock Alerts
        const { data: lowStockData } = await supabase
            .from('inventory_levels')
            .select(`
                on_hand,
                product_variants (
                    sku,
                    products ( id, name ),
                    variant_attributes (
                        attribute_value:categories ( name )
                    )
                )
            `)
            .lt('on_hand', 10)
            .limit(5);

        const lowStockItems = lowStockData.map(item => {
            const v = item.product_variants;

            // Construct label purely from dynamic attributes
            let variantLabel = '';
            if (v.variant_attributes && v.variant_attributes.length > 0) {
                variantLabel = v.variant_attributes
                    .map(va => va.attribute_value?.name)
                    .filter(Boolean)
                    .join(' / ');
            } else {
                variantLabel = v.sku;
            }

            return {
                id: v.products.id,
                name: v.products.name,
                variant: variantLabel || 'Tiêu chuẩn',
                stock: item.on_hand
            };
        });

        return NextResponse.json({
            totalOrders: totalOrders ?? 0,
            totalRevenue: totalRevenue ?? 0,
            salesChartData,
            topProducts,
            lowStockItems
        });

    } catch (error) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json({ error: 'Lỗi tải phân tích.' }, { status: 500 });
    }
}