import { formatCurrency, generateSlug } from '../utils/format.js';
import { getProductStockStatus, getVariantStockStatus } from '../utils/product-helper.js';

// Simple Test Runner
function describe(name, fn) {
    console.log(`\n🧪 Testing: ${name}`);
    fn();
}

function it(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
    } catch (e) {
        console.error(`  ❌ ${name}`);
        console.error(`     Error: ${e.message}`);
    }
}

function expect(actual) {
    return {
        toBe: (expected) => {
            if (actual !== expected) {
                throw new Error(`Expected "${expected}" but got "${actual}"`);
            }
        },
        toEqual: (expected) => {
            const actualStr = JSON.stringify(actual);
            const expectedStr = JSON.stringify(expected);
            if (actualStr !== expectedStr) {
                throw new Error(`Expected ${expectedStr} but got ${actualStr}`);
            }
        },
        toBeTruthy: () => {
            if (!actual) throw new Error(`Expected truthy but got ${actual}`);
        },
        toBeFalsy: () => {
            if (actual) throw new Error(`Expected falsy but got ${actual}`);
        }
    };
}

// --- TESTS ---

describe('utils/format.js', () => {
    it('formatCurrency should format VND correctly', () => {
        // Note: The output depends on locale, environment might output '100.000 ₫' (nbsp) or '100.000 ₫' (space)
        // We will just check if it contains the number structure
        const result = formatCurrency(100000);
        if (!result.includes('100.000')) throw new Error(`Expected to contain 100.000, got ${result}`);
    });

    it('formatCurrency should handle 0', () => {
        const result = formatCurrency(0);
        if (!result.includes('0')) throw new Error(`Expected to contain 0, got ${result}`);
    });

    it('generateSlug should handle Vietnamese characters', () => {
        expect(generateSlug('Áo Thun Cổ Tròn')).toBe('ao-thun-co-tron');
    });

    it('generateSlug should handle special chars d/D', () => {
        expect(generateSlug('Đầm Dạ Hội')).toBe('dam-da-hoi');
    });

    it('generateSlug should remove special symbols', () => {
        expect(generateSlug('Áo Thun #1 (Mới)')).toBe('ao-thun-1-moi');
    });
});

describe('utils/product-helper.js', () => {
    it('getVariantStockStatus should handle boolean in_stock', () => {
        const variant = { in_stock: true, stock_display: 10 };
        const status = getVariantStockStatus(variant);
        expect(status.isOutOfStock).toBeFalsy();
        expect(status.count).toBe(10);
    });

    it('getVariantStockStatus should handle raw inventory_levels array', () => {
        const variant = { inventory_levels: [{ on_hand: 5 }] };
        const status = getVariantStockStatus(variant);
        expect(status.isOutOfStock).toBeFalsy();
        expect(status.count).toBe(5);
    });

    it('getVariantStockStatus should handle 0 stock', () => {
        const variant = { inventory_levels: [{ on_hand: 0 }] };
        const status = getVariantStockStatus(variant);
        expect(status.isOutOfStock).toBeTruthy();
    });

    it('getProductStockStatus should identify out of stock product', () => {
        const product = {
            product_variants: [
                { inventory_levels: [{ on_hand: 0 }] },
                { inventory_levels: [{ on_hand: 0 }] }
            ]
        };
        const status = getProductStockStatus(product);
        expect(status.isOutOfStock).toBeTruthy();
        expect(status.availableVariants.length).toBe(0);
    });

    it('getProductStockStatus should identify in stock product', () => {
        const product = {
            product_variants: [
                { id: 1, inventory_levels: [{ on_hand: 0 }] },
                { id: 2, inventory_levels: [{ on_hand: 5 }] }
            ]
        };
        const status = getProductStockStatus(product);
        expect(status.isOutOfStock).toBeFalsy();
        expect(status.availableVariants.length).toBe(1);
        expect(status.availableVariants[0].id).toBe(2);
    });
});
