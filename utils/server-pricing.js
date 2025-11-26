// utils/server-pricing.js

/**
 * Calculates the authoritative price for a line item server-side.
 * Use this in Checkout and Order creation to verify client payloads.
 *
 * @param {Object} supabase - Supabase client instance
 * @param {string|number} variantId - The ID of the product variant
 * @param {Object} selectedOptions - The options selected by the user (key: optionId)
 * @returns {Promise<number>} - The final calculated unit price
 */
export async function calculateItemPrice(supabase, variantId, selectedOptions = {}) {
    // 1. Fetch Base Variant Price from Database
    // We do NOT trust the price sent by the client
    const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('price')
        .eq('id', variantId)
        .single();

    if (variantError || !variant) {
        throw new Error(`Variant definition not found for ID: ${variantId}`);
    }

    let finalPrice = Number(variant.price);

    // 2. Calculate Option Modifiers
    // selectedOptions format from Cart: { "101": { label: "Color", value: "Red", priceModifier: 5 } }
    // We ignore the client's 'priceModifier' and fetch the real one from DB.
    const optionIds = selectedOptions ? Object.keys(selectedOptions) : [];

    if (optionIds.length > 0) {
        const { data: optionsDefs, error: optionsError } = await supabase
            .from('product_options')
            .select('id, type, values')
            .in('id', optionIds);

        if (optionsError) throw new Error(`Failed to validate options: ${optionsError.message}`);

        // Create Map for O(1) lookup: "101" -> Option Object
        const optionsMap = new Map(optionsDefs.map(o => [o.id.toString(), o]));

        for (const [optId, selection] of Object.entries(selectedOptions)) {
            const def = optionsMap.get(optId.toString());

            // If option set was deleted/hidden, we might choose to ignore or throw.
            // Here we ignore to allow purchase if the base variant is valid.
            if (!def) continue;

            // Only 'radio' and 'checkbox_button' types have price modifiers in the schema
            if (['radio', 'checkbox_button'].includes(def.type) && Array.isArray(def.values)) {
                // Find the matching value definition in DB
                // selection.value is the label (e.g. "Red Thread") selected by user
                const match = def.values.find(v => v.label === selection.value);

                if (match && match.price_modifier) {
                    finalPrice += Number(match.price_modifier);
                }
            }
        }
    }

    return finalPrice;
}