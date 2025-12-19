// components/product/PriceDisplay.js
import { formatCurrency } from '@/utils/format';
import { getProductStockStatus } from '@/utils/product-helper';

export default function PriceDisplay({ product, className = "text-md font-medium text-indigo-400" }) {
    const { isOutOfStock, availableVariants } = getProductStockStatus(product);

    if (isOutOfStock) {
        return (
            <p className="mt-1 text-md text-red-500 font-medium">
                Hết hàng
            </p>
        );
    }

    // Calculate Price Range based on AVAILABLE variants
    const prices = availableVariants.map(v => v.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);

    return (
        <p className={`mt-1 ${className}`}>
            {minPrice === maxPrice
                ? formatCurrency(minPrice)
                : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`
            }
        </p>
    );
}