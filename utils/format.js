// utils/format.js
export function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
    }).format(amount);
}

export function formatDate(dateString) {
    if (!dateString) return '';
    // [MODIFIED] Enforce Vietnam Timezone explicitly
    return new Date(dateString).toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh' // Forces GMT+7 regardless of user location
    });
}

export function formatDateTime(dateString) {
    if (!dateString) return '';
    // [MODIFIED] Enforce Vietnam Timezone for full timestamps
    return new Date(dateString).toLocaleString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh'
    });
}

/**
 * Generates a URL-safe slug from a string, supporting Vietnamese characters.
 * Example: "Áo Thun Cổ Tròn" -> "ao-thun-co-tron"
 */
export function generateSlug(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        // 1. Normalize: Decompose combined chars (e.g., "á" becomes "a" + accent)
        .normalize("NFD")
        // 2. Remove Diacritics: Strip the accent marks
        .replace(/[\u0300-\u036f]/g, "")
        // 3. Handle Special Vietnamese Chars (đ/Đ)
        .replace(/[đĐ]/g, 'd')
        // 4. Clean up: Remove anything that isn't a word char, space, or hyphen
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        // 5. Format: Replace spaces with hyphens
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}
