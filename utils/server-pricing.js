// utils/server-pricing.js

export async function calculateItemPrice(supabase, variantId, selectedOptions = {}) {
    // 1. Fetch Base Variant Price
    const { data: variant, error: variantError } = await supabase
        .from('product_variants')
        .select('price')
        .eq('id', variantId)
        .single();

    if (variantError || !variant) {
        throw new Error(`Variant definition not found for ID: ${variantId}`);
    }

    let finalPrice = Number(variant.price);

    // 2. Validate Options
    const optionIds = selectedOptions ? Object.keys(selectedOptions) : [];

    if (optionIds.length > 0) {
        const { data: optionsDefs, error: optionsError } = await supabase
            .from('product_options')
            // Fetch 'price_modifier' for the option itself (Fix 3)
            .select('id, type, values, label, price_modifier')
            .in('id', optionIds);

        if (optionsError) throw new Error(`Failed to validate options: ${optionsError.message}`);

        const optionsMap = new Map(optionsDefs.map(o => [o.id.toString(), o]));

        for (const [optId, selection] of Object.entries(selectedOptions)) {
            const def = optionsMap.get(optId.toString());

            // --- FIX 2: Security (Throw error if option deleted) ---
            if (!def) {
                throw new Error(`Selected option is no longer available. Please remove item and re-add.`);
            }

            // --- FIX 3: Text Input Pricing (Base Fee) ---
            // This allows charging $5 just for using a text field
            if (def.price_modifier) {
                finalPrice += Number(def.price_modifier);
            }

            // --- FIX 5: Support 'select' Dropdowns ---
            // Treat 'select' exactly like 'radio' for pricing
            if (['radio', 'checkbox_button', 'select'].includes(def.type) && Array.isArray(def.values)) {
                const match = def.values.find(v => v.label === selection.value);

                // Validate that the selected value actually exists in the allowed list
                if (!match && selection.value) {
                    throw new Error(`Invalid choice "${selection.value}" for option "${def.label}".`);
                }

                if (match && match.price_modifier) {
                    finalPrice += Number(match.price_modifier);
                }
            }
        }
    }

    return finalPrice;
}