// components/account/AddressBook.js
'use client';

export default function AddressBook({ addresses, isLoading, onAdd, onDelete }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg h-fit border border-gray-700 shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Địa chỉ của tôi</h2>
                <button
                    onClick={onAdd}
                    className="text-sm bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-3 rounded-md font-semibold transition-colors shadow-sm"
                >
                    + Thêm mới
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                </div>
            ) : addresses.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="text-gray-500 text-sm">Chưa có địa chỉ nào được lưu.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {addresses.map((addr) => (
                        <div key={addr.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 relative group hover:border-indigo-500/50 transition-colors">
                            {addr.is_default && (
                                <span className="absolute top-3 right-3 bg-teal-900/80 text-teal-200 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-teal-700">
                                    Mặc định
                                </span>
                            )}

                            <div className="text-sm text-gray-300 pr-8">
                                <p className="font-semibold text-white mb-1 text-base">{addr.address_line_1}</p>
                                {addr.address_line_2 && <p className="mb-1">{addr.address_line_2}</p>}
                                <p>{addr.city}, {addr.state_province_region} {addr.postal_code}</p>
                                <p className="mt-1 text-gray-400 uppercase text-xs font-bold">{addr.country}</p>
                            </div>

                            <div className="mt-4 pt-3 border-t border-gray-700 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => onDelete(addr.id)}
                                    className="text-red-400 hover:text-red-300 text-xs font-bold uppercase tracking-wide hover:underline"
                                >
                                    Xóa địa chỉ
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}