// utils/format.js

export const formatCurrency = (amount) => {
    // Convert to number if string to avoid errors
    const num = Number(amount);
    if (isNaN(num)) return '0 ₫';

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(num);
};