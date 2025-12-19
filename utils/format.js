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