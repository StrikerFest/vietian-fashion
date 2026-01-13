import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

console.log('🚀 Starting EXTENDED Seeding Process...');

const IDS = {
    users: [],
    categories: {},
    suppliers: [],
    products: []
};

// --- Helpers ---
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seedUsers() {
    console.log('👤 Seeding 20 Users...');
    
    // 1. Admin
    const admins = [{ email: 'admin@demo.com', password: 'password123', role: 'admin', first: 'Admin', last: 'User' }];
    
    // 2. Customers
    const customers = [];
    for (let i = 1; i <= 20; i++) {
        customers.push({
            email: `customer${i}@demo.com`,
            password: 'password123',
            role: 'customer',
            first: `Customer`,
            last: `${i}`
        });
    }

    const allUsers = [...admins, ...customers];

    for (const u of allUsers) {
        const { data: { users: found } } = await supabase.auth.admin.listUsers();
        let userId = found.find(user => user.email === u.email)?.id;

        if (!userId) {
            const { data, error } = await supabase.auth.admin.createUser({
                email: u.email,
                password: u.password,
                email_confirm: true,
                user_metadata: { first_name: u.first, last_name: u.last }
            });
            if (error) {
                console.error(`Failed to create user ${u.email}:`, error.message);
                continue;
            }
            userId = data.user.id;
        }

        IDS.users.push({ id: userId, email: u.email, role: u.role });

        // Ensure user_roles
        if (u.role === 'admin') {
            await supabase.from('user_roles').upsert({ user_id: userId, role: 'admin' });
        }
        // Sync public.users (triggers often do this, but safe to upsert)
        await supabase.from('users').upsert({
            id: userId,
            email: u.email,
            first_name: u.first,
            last_name: u.last
        });
    }
    console.log(`✅ Seeded ${IDS.users.length} users.`);
}

async function seedCategories() {
    console.log('📂 Seeding Categories...');
    
    const catalogs = [
        { name: 'Nam', slug: 'nam', type: 'catalog' },
        { name: 'Nữ', slug: 'nu', type: 'catalog' },
        { name: 'Phụ kiện', slug: 'phu-kien', type: 'catalog' },
        { name: 'Unisex', slug: 'unisex', type: 'catalog' }
    ];

    for (const cat of catalogs) {
        const { data, error } = await supabase.from('categories').upsert(cat, { onConflict: 'slug' }).select().single();
        if (error) throw error;
        IDS.categories[cat.slug] = data.id;
    }

    const attributeTypes = [
        { name: 'Màu sắc', slug: 'mau-sac', values: ['Đen', 'Trắng', 'Xanh', 'Đỏ', 'Vàng', 'Be', 'Xám', 'Nâu'] },
        { name: 'Kích thước', slug: 'kich-thuoc', values: ['S', 'M', 'L', 'XL', 'XXL', 'Free Size'] },
        { name: 'Chất liệu', slug: 'chat-lieu', values: ['Cotton', 'Jean', 'Lụa', 'Len', 'Da', 'Polyester'] }
    ];

    for (const attr of attributeTypes) {
        const { data: parent, error } = await supabase.from('categories')
            .upsert({ name: attr.name, slug: attr.slug, type: 'attribute' }, { onConflict: 'slug' })
            .select().single();
        if (error) throw error;
        IDS.categories[attr.slug] = parent.id;

        for (const val of attr.values) {
            const valSlug = `${attr.slug}-${val.toLowerCase()}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-');
            const { data: valData } = await supabase.from('categories')
                .upsert({ 
                    name: val, slug: valSlug, type: 'attribute', parent_id: parent.id, display_style: 'pill'
                }, { onConflict: 'slug' })
                .select().single();
            if (valData) IDS.categories[valSlug] = valData.id;
        }
    }
    console.log('✅ Categories seeded.');
}

async function seedSuppliers() {
    console.log('🏭 Seeding Suppliers...');
    const suppliers = ['VinaTextile', 'FashionGlobal', 'LocalBrand Supply', 'Hanoi Garment', 'Saigon Silk'];
    for (const name of suppliers) {
        const { data } = await supabase.from('suppliers').upsert({ name }, { onConflict: 'name' }).select().single();
        if (data) IDS.suppliers.push(data.id);
    }
}

async function seedProducts() {
    console.log('👕 Seeding 50 Products...');
    
    const adjectives = ['Cao Cấp', 'Thoáng Mát', 'Vintage', 'Hàn Quốc', 'Basic', 'Streetwear', 'Mùa Hè', 'Mùa Đông', 'Chống Nước', 'Form Rộng'];
    const types = ['Áo Thun', 'Áo Sơ Mi', 'Quần Jean', 'Quần Short', 'Váy', 'Đầm', 'Áo Khoác', 'Hoodie', 'Blazer'];
    const catalogKeys = ['nam', 'nu', 'unisex'];
    
    // Helper to generate
    const generateProduct = (i) => {
        const type = randomItem(types);
        const adj = randomItem(adjectives);
        const cat = randomItem(catalogKeys);
        const name = `${type} ${adj} ${randomInt(100, 999)}`;
        const price = randomInt(10, 150) * 10000; // 100k - 1.5m
        
        let img = 'https://placehold.co/600x800/EEE/31343C?text=Product';
        if (type.includes('Áo')) img = 'https://placehold.co/600x800/EFEFEF/333?text=Shirt';
        if (type.includes('Quần')) img = 'https://placehold.co/600x800/333/EEE?text=Pants';
        if (type.includes('Váy') || type.includes('Đầm')) img = 'https://placehold.co/600x800/FFF0F5/333?text=Dress';

        return {
            name,
            description: `Mô tả chi tiết cho ${name}. Sản phẩm chất lượng cao, phù hợp mọi lứa tuổi.`,
            price,
            cat,
            img,
            status: i < 5 ? 'draft' : 'active' // 10% draft
        };
    };

    for (let i = 0; i < 50; i++) {
        const p = generateProduct(i);

        // 1. Product
        let productId;
        const { data: existing } = await supabase.from('products').select('id').eq('name', p.name).single();
        if (existing) {
            productId = existing.id;
        } else {
            const { data } = await supabase.from('products').insert({
                name: p.name,
                description: p.description,
                image_url: p.img,
                status: p.status,
                position: i
            }).select().single();
            productId = data.id;
        }
        IDS.products.push(productId);

        // 2. Link Catalog
        if (IDS.categories[p.cat]) {
            await supabase.from('product_categories').upsert({
                product_id: productId,
                category_id: IDS.categories[p.cat]
            }, { onConflict: 'product_id, category_id' });
        }

        // 3. Variants (Random Sizes)
        const sizes = ['S', 'M', 'L', 'XL'];
        const selectedSizes = sizes.slice(0, randomInt(1, 4));
        
        for (const size of selectedSizes) {
            const sku = `${p.name.substring(0, 3).toUpperCase()}-${size}-${randomInt(1000, 9999)}`;
            const sizeSlug = `kich-thuoc-${size.toLowerCase()}`;
            
            let variantId;
            const { data: existVar } = await supabase.from('product_variants').select('id').eq('sku', sku).single();
            if (existVar) variantId = existVar.id;
            else {
                const { data: newVar } = await supabase.from('product_variants').insert({
                    product_id: productId, sku, price: p.price
                }).select().single();
                variantId = newVar.id;
            }

            // Inventory (Random)
            await supabase.from('inventory_levels').upsert({
                variant_id: variantId, on_hand: randomInt(0, 100) // Some 0 for out of stock
            }, { onConflict: 'variant_id' });

            // Attribute Link
            if (IDS.categories[sizeSlug]) {
                await supabase.from('variant_attributes').upsert({
                    variant_id: variantId, attribute_value_id: IDS.categories[sizeSlug]
                }, { onConflict: 'variant_id, attribute_value_id' });
            }
        }
    }
    console.log(`✅ Seeded ${IDS.products.length} products.`);
}

async function seedOrders() {
    console.log('📦 Seeding 100 Orders...');
    const customers = IDS.users.filter(u => u.role === 'customer');
    if (!customers.length) return;

    const statuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
    const now = new Date();

    for (let i = 0; i < 100; i++) {
        const customer = randomItem(customers);
        const status = randomItem(statuses);
        
        // Random date in last 3 months to make chart look good
        const date = new Date(now.getTime() - randomInt(0, 90 * 24 * 60 * 60 * 1000));
        
        const { data: order } = await supabase.from('orders').insert({
            user_id: customer.id,
            status: status,
            subtotal: 0, total_amount: 0,
            created_at: date.toISOString(), // Backdate
            shipping_address_id: null // Skipping address details for speed
        }).select().single();

        if (!order) continue;

        let subtotal = 0;
        const numItems = randomInt(1, 5);
        for (let j = 0; j < numItems; j++) {
            const pid = randomItem(IDS.products);
            const { data: variants } = await supabase.from('product_variants').select('id, price').eq('product_id', pid).limit(1);
            if (!variants?.length) continue;
            
            const v = variants[0];
            const qty = randomInt(1, 3);
            await supabase.from('order_items').insert({
                order_id: order.id, variant_id: v.id, quantity: qty, price_at_purchase: v.price
            });
            subtotal += v.price * qty;
        }

        await supabase.from('orders').update({
            subtotal: subtotal,
            total_amount: subtotal // keeping simple
        }).eq('id', order.id);
    }
    console.log('✅ Orders seeded.');
}

async function seedReviews() {
    console.log('⭐ Seeding Reviews...');
    const customers = IDS.users.filter(u => u.role === 'customer');
    if (!customers.length) return;

    const comments = [
        "Sản phẩm rất tuyệt!", "Chất vải đẹp, mặc mát.", "Giao hàng nhanh.", 
        "Hơi rộng so với bảng size.", "Tuyệt vời, sẽ ủng hộ tiếp.", 
        "Màu sắc giống hình.", "Đóng gói cẩn thận."
    ];

    for (let i = 0; i < 30; i++) {
        const user = randomItem(customers);
        const product = randomItem(IDS.products);
        const rating = randomInt(3, 5);
        
        await supabase.from('reviews').insert({
            user_id: user.id,
            product_id: product,
            rating: rating,
            comment: randomItem(comments),
            is_approved: Math.random() > 0.2 // 80% approved
        });
    }
    console.log('✅ Reviews seeded.');
}

async function seedDiscounts() {
    console.log('🏷️ Seeding Discounts...');
    const codes = [
        { code: 'WELCOME10', type: 'percentage', value: 10 },
        { code: 'SUMMER25', type: 'percentage', value: 25 },
        { code: 'FREESHIP', type: 'fixed', value: 30000 }
    ];

    for (const d of codes) {
        await supabase.from('discounts').upsert({
            code: d.code,
            type: d.type,
            value: d.value,
            is_active: true
        }, { onConflict: 'code' });
    }
    console.log('✅ Discounts seeded.');
}

async function main() {
    try {
        await seedUsers();
        await seedCategories();
        await seedSuppliers();
        await seedProducts();
        await seedOrders();
        await seedReviews();
        await seedDiscounts();
        console.log('🎉 Extended Seeding Complete!');
    } catch (e) {
        console.error('❌ Seeding Failed:', e);
    }
}

main();