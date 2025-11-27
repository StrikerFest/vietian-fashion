// utils/inventory.js

/**
 * Updates inventory stock and records the transaction in the audit log.
 * Handles atomic decrements to prevent race conditions.
 * * @param {Object} supabase - The Supabase client instance.
 * @param {Object} params - The parameters for the update.
 * @param {number} params.variantId - The ID of the product variant.
 * @param {number} params.quantityChange - The amount to change (positive adds, negative removes).
 * @param {string} params.reason - A description of why the change occurred.
 * @param {string|null} params.userId - The ID of the user initiating the change (optional).
 */
export async function updateInventory(supabase, { variantId, quantityChange, reason, userId = null }) {
    // Case 1: Decrementing Stock (Checkout) - Use Atomic RPC
    if (quantityChange < 0) {
        const qtyToRemove = Math.abs(quantityChange);

        const { data: newOnHand, error: rpcError } = await supabase.rpc('decrement_inventory', {
            p_variant_id: variantId,
            p_quantity: qtyToRemove
        });

        if (rpcError) {
            // If the RPC throws 'Insufficient stock', it comes back here
            throw new Error(`Inventory update failed: ${rpcError.message}`);
        }
    }
        // Case 2: Incrementing Stock (Returns, Restock) - Standard Read-Write is acceptable
    // (or you could write an increment_inventory RPC too, but it's less critical)
    else {
        const { data: currentInv, error: fetchError } = await supabase
            .from('inventory_levels')
            .select('on_hand')
            .eq('variant_id', variantId)
            .single();

        const currentOnHand = currentInv?.on_hand || 0;
        const newOnHand = currentOnHand + quantityChange;

        const { error: updateError } = await supabase
            .from('inventory_levels')
            .upsert({
                variant_id: variantId,
                on_hand: newOnHand
            }, { onConflict: 'variant_id' });

        if (updateError) throw new Error(`Failed to update inventory level: ${updateError.message}`);
    }

    // 3. Always Insert Audit Log
    const { error: logError } = await supabase
        .from('inventory_adjustments')
        .insert({
            variant_id: variantId,
            user_id: userId,
            quantity_change: quantityChange, // Store the signed value (+/-)
            reason: reason
        });

    if (logError) {
        console.error('CRITICAL: Failed to write inventory log:', logError);
        // We don't throw here to avoid rolling back the successful stock change,
        // but in a real production DB, this should be in a transaction block.
    }

    return { success: true };
}