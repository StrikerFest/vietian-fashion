// components/cart/ShippingAddressSelector.js
'use client';

import Link from 'next/link';

// --- MODIFIED: Now accepts 'children' prop ---
export default function ShippingAddressSelector({
                                                    session,
                                                    addresses,
                                                    isLoading,
                                                    selectedAddressId,
                                                    onSelect,
                                                    onAddNew,
                                                    children // --- NEW ---
                                                }) {
    if (!session) {
        return (
            <div className="bg-gray-800 p-6 rounded-lg border border-yellow-600/30 bg-yellow-900/10">
                <div className="flex items-start gap-4">
                    <div className="text-3xl">🔒</div>
                    <div>
                        <h2 className="text-xl font-bold mb-2 text-yellow-500">Thanh toán khách vãng lai</h2>
                        <p className="text-gray-300 mb-4 text-sm">
                            Bạn đang thanh toán với tư cách là khách. Đăng nhập để lưu địa chỉ và theo dõi lịch sử đơn hàng.
                        </p>

                        {/* --- RENDER GUEST ADDRESS FORM --- */}
                        {children}
                        {/* --- END RENDER GUEST ADDRESS FORM --- */}

                        <Link
                            href="/login"
                            className="mt-4 inline-block bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-semibold transition-colors"
                        >
                            Đăng nhập / Đăng ký
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // --- REGISTERED USER FLOW ---
    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Địa chỉ giao hàng</h2>
                <button
                    onClick={onAddNew}
                    className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
                >
                    <span>+</span> Địa chỉ mới
                </button>
            </div>

            {isLoading ? (
                <p className="text-gray-400 text-center py-4">Đang tải địa chỉ...</p>
            ) : addresses.length === 0 ? (
                <div className="text-center p-6 border-2 border-dashed border-gray-700 rounded-lg hover:border-gray-600 transition-colors">
                    <p className="text-gray-400 mb-3">Chưa lưu địa chỉ nào.</p>
                    <button
                        onClick={onAddNew}
                        className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-md text-sm transition-colors"
                    >
                        Thêm địa chỉ đầu tiên của bạn
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map(addr => (
                        <div
                            key={addr.id}
                            onClick={() => onSelect(addr.id)}
                            className={`relative p-4 rounded-lg border cursor-pointer transition-all duration-200 ${
                                selectedAddressId === addr.id
                                    ? 'border-indigo-500 bg-indigo-900/20 shadow-[0_0_0_1px_rgba(99,102,241,1)]'
                                    : 'border-gray-600 hover:border-gray-500 bg-gray-700/30'
                            }`}
                        >
                            {/* Selection Indicator */}
                            <div className="flex justify-between items-start mb-2">
                                <span className={`text-sm font-bold ${selectedAddressId === addr.id ? 'text-indigo-400' : 'text-gray-300'}`}>
                                    {addr.address_line_1}
                                </span>
                                {selectedAddressId === addr.id && (
                                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-white text-xs">
                                        ✓
                                    </span>
                                )}
                            </div>

                            {/* Address Details */}
                            <div className="text-xs text-gray-400 space-y-0.5">
                                {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                                <p>{addr.city}, {addr.state_province_region} {addr.postal_code}</p>
                                <p>{addr.country}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}