// utils/inventory.js

/**
 * Updates inventory stock and records the transaction in the audit log.
 * * @param {Object} supabase - The Supabase client instance.
 * @param {Object} params - The parameters for the update.
 * @param {number} params.variantId - The ID of the product variant.
 * @param {number} params.quantityChange - The amount to change (positive adds, negative removes).
 * @param {string} params.reason - A description of why the change occurred.
 * @param {string|null} params.userId - The ID of the user initiating the change (optional).
 */
export async function updateInventory(supabase, { variantId, quantityChange, reason, userId = null }) {
    // 1. Get current stock
    const { data: currentInv, error: fetchError } = await supabase
        .from('inventory_levels')
        .select('on_hand')
        .eq('variant_id', variantId)
        .single();

    // If row missing, treat as 0 (or handle error if strict)
    // In this app, we'll assume 0 if missing and insert if needed.
    const currentOnHand = currentInv?.on_hand || 0;
    const newOnHand = currentOnHand + quantityChange;

    if (newOnHand < 0) {
        throw new Error(`Insufficient stock. Current: ${currentOnHand}, Requested change: ${quantityChange}`);
    }

    // 2. Update (or Insert) Inventory Level
    const { error: updateError } = await supabase
        .from('inventory_levels')
        .upsert({
            variant_id: variantId,
            on_hand: newOnHand
        }, { onConflict: 'variant_id' });

    if (updateError) throw new Error(`Failed to update inventory level: ${updateError.message}`);

    // 3. Insert Audit Log
    const { error: logError } = await supabase
        .from('inventory_adjustments')
        .insert({
            variant_id: variantId,
            user_id: userId,
            quantity_change: quantityChange,
            reason: reason
        });

    if (logError) {
        // Critical error: Inventory updated but log failed.
        // In a real app, we'd want a transaction here.
        console.error('CRITICAL: Failed to write inventory log:', logError);
    }

    return { newOnHand };
}