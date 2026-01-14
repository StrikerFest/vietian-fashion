import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SERVICE_KEY || !ANON_KEY) {
    console.error("❌ Missing env vars.");
    process.exit(1);
}

// 1. Admin Client (God Mode)
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

// 2. Anon Client (Public User / Hacker)
const anonClient = createClient(SUPABASE_URL, ANON_KEY);

async function runSecurityTests() {
    console.log("🛡️  Starting Security & Edge Case Tests...\n");
    let testProductId = null;
    const testSku = `SEC-SKU-${Date.now()}`;

    try {
        // --- TEST 1: UNAUTHORIZED WRITE (RLS) ---
        console.log("🧪 Test 1: Unauthorized Product Creation (Anon User)");
        const { error: anonError } = await anonClient.from('products').insert({
            name: "HACKER PRODUCT",
            status: "active"
        });

        if (anonError) {
            console.log(`  ✅ Blocked as expected: ${anonError.message}`);
        } else {
            throw new Error("❌ FAILURE: Anon user was able to create a product!");
        }


        // --- TEST 2: DUPLICATE SKU (Constraint) ---
        console.log("\n🧪 Test 2: Duplicate SKU Validation");
        
        // Step A: Create valid product
        const { data: p1, error: e1 } = await adminClient.from('products').insert({
            name: "[SEC] Original Product",
            status: "draft",
            image_url: "http://placehold.co/100"
        }).select().single();
        if (e1) throw new Error(`Setup failed: ${e1.message}`);
        testProductId = p1.id;

        const { error: v1Err } = await adminClient.from('product_variants').insert({
            product_id: p1.id,
            sku: testSku,
            price: 100
        });
        if (v1Err) throw new Error(`Setup variant failed: ${v1Err.message}`);

        // Step B: Try to create another variant with SAME SKU
        const { error: dupError } = await adminClient.from('product_variants').insert({
            product_id: p1.id, // Can be same or different product
            sku: testSku,
            price: 200
        });

        if (dupError && dupError.message.includes('duplicate key')) {
            console.log(`  ✅ Blocked as expected: ${dupError.message}`);
        } else {
            throw new Error(`❌ FAILURE: Duplicate SKU was allowed!`);
        }


        // --- TEST 3: NEGATIVE INVENTORY (Logic) ---
        console.log("\n🧪 Test 3: Insufficient Stock Protection");
        
        // Setup: Get variant ID
        const { data: variant } = await adminClient.from('product_variants').select('id').eq('sku', testSku).single();
        // Init stock to 10
        await adminClient.from('inventory_levels').insert({ variant_id: variant.id, on_hand: 10 });

        // Try to decrement 100
        const { error: stockError } = await adminClient.rpc('decrement_inventory', {
            p_variant_id: variant.id,
            p_quantity: 100
        });

        if (stockError && stockError.message.includes('Insufficient stock')) {
            console.log(`  ✅ Blocked as expected: ${stockError.message}`);
        } else {
            throw new Error("❌ FAILURE: Allowed decrementing below zero!");
        }


        console.log("\n✨ All Security Tests Passed!");

    } catch (error) {
        console.error(`\n❌ TEST SUITE FAILED: ${error.message}`);
    } finally {
        // Cleanup
        if (testProductId) {
            await adminClient.from('product_variants').delete().eq('product_id', testProductId); // Manual cascade if needed
            await adminClient.from('products').delete().eq('id', testProductId);
            console.log("\n🧹 Cleanup complete.");
        }
    }
}

runSecurityTests();
