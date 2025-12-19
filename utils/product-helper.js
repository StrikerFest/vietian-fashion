// utils/product-helper.js

/**
 * Calculates the stock status for a single variant.
 * Handles both public (masked) and admin (raw) data structures.
 */
export function getVariantStockStatus(variant) {
    if (!variant) return { count: 0, isOutOfStock: true };

    // Case 1: Boolean flag (often used in public API responses)
    if (typeof variant.in_stock === 'boolean') {
        return {
            count: variant.stock_display || 0,
            isOutOfStock: !variant.in_stock
        };
    }

    // Case 2: Raw inventory levels (admin or full detail responses)
    const rawStock = variant.inventory_levels?.[0]?.on_hand || 0;
    return {
        count: rawStock,
        isOutOfStock: rawStock <= 0
    };
}

/**
 * Calculates the overall stock status for a product.
 * Returns true if NO variants are available.
 */
export function getProductStockStatus(product) {
    if (!product || !product.product_variants || product.product_variants.length === 0) {
        return { isOutOfStock: true, availableVariants: [] };
    }

    // Filter variants that have stock
    const availableVariants = product.product_variants.filter(v => {
        const { isOutOfStock } = getVariantStockStatus(v);
        return !isOutOfStock;
    });

    return {
        isOutOfStock: availableVariants.length === 0,
        availableVariants
    };
}