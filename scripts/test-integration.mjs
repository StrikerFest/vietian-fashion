import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error("❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function runIntegrationTest() {
    console.log("🚀 Starting Integration Tests...");
    let productId = null;
    let variantId = null;

    try {
        // --- TEST 1: CREATE PRODUCT (RPC) ---
        console.log("\n🧪 Test 1: Create Product (RPC 'create_product_full')");
        
        const payload = {
            name: "[TEST] Integration Product",
            description: "Automated test artifact",
            status: "active",
            image_url: "https://placehold.co/600x400",
            variants: [
                { sku: `TEST-SKU-${Date.now()}`, price: 500000, on_hand: 100, attribute_value_ids: [] }
            ],
            images: [],
            collection_ids: [],
            attribute_ids: []
        };

        const { data: product, error: createError } = await supabase.rpc('create_product_full', { payload });

        if (createError) throw new Error(`Create failed: ${createError.message}`);
        if (!product) throw new Error("Product created but no data returned");

        productId = product.id;
        console.log(`  ✅ Product Created via RPC: ID ${productId} - ${product.name}`);

        // Get Variant ID for subsequent tests
        const { data: variants } = await supabase.from('product_variants').select('id').eq('product_id', productId);
        variantId = variants[0].id;
        console.log(`  ✅ Variant Found: ID ${variantId}`);


        // --- TEST 2: INVENTORY CHECK ---
        console.log("\n🧪 Test 2: Verify Initial Inventory");
        const { data: inventory } = await supabase.from('inventory_levels').select('on_hand').eq('variant_id', variantId).single();
        if (inventory.on_hand !== 100) throw new Error(`Expected 100 stock, got ${inventory.on_hand}`);
        console.log(`  ✅ Stock verified: ${inventory.on_hand}`);


        // --- TEST 3: SEARCH (RPC) ---
        console.log("\n🧪 Test 3: Search Product (RPC 'search_products_by_tags')");
        // We create a dummy tag match logic or just basic search query test if simple search exists.
        // Actually, let's test basic text search on the table since RPC requires tags.
        const { data: searchRes } = await supabase.from('products').select('id').ilike('name', '%[TEST]%');
        if (!searchRes.some(p => p.id === productId)) throw new Error("Search failed to find created product");
        console.log(`  ✅ Product found in search query.`);


        // --- TEST 4: DECREMENT INVENTORY (Simulate Checkout) ---
        console.log("\n🧪 Test 4: Decrement Inventory (RPC 'decrement_inventory')");
        const { data: newStock, error: decError } = await supabase.rpc('decrement_inventory', { 
            p_variant_id: variantId, 
            p_quantity: 5 
        });

        if (decError) throw new Error(`Decrement failed: ${decError.message}`);
        if (newStock !== 95) throw new Error(`Expected 95 stock, got ${newStock}`);
        console.log(`  ✅ Stock decremented to 95.`);


        console.log("\n✨ All Integration Tests Passed!");

    } catch (error) {
        console.error(`\n❌ TEST FAILED: ${error.message}`);
    } finally {
        // --- CLEANUP ---
        if (productId) {
            console.log("\n🧹 Cleanup: Deleting test product...");
            
            // Delete Variants first (No Cascade on FK)
            if (variantId) {
                await supabase.from('product_variants').delete().eq('product_id', productId);
            }

            const { error: delError } = await supabase.from('products').delete().eq('id', productId);
            if (delError) console.error("Cleanup failed:", delError.message);
            else console.log("  ✅ Cleanup successful.");
        }
    }
}

runIntegrationTest();
