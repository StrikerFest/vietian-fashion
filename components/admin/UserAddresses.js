// components/admin/UserAddresses.js
export default function UserAddresses({ addresses }) {
    return (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 h-full">
            <h2 className="text-xl font-semibold mb-4 text-white">Addresses</h2>

            {addresses && addresses.length > 0 ? (
                <div className="space-y-4">
                    {addresses.map(addr => (
                        <div key={addr.id} className="bg-gray-900/50 p-4 rounded border border-gray-700 text-sm relative group hover:border-gray-600 transition-colors">
                            {addr.is_default && (
                                <span className="absolute top-3 right-3 text-[10px] uppercase font-bold bg-green-900 text-green-200 px-2 py-0.5 rounded-full">
                                    Default
                                </span>
                            )}
                            <div className="text-gray-300 space-y-1 pr-12">
                                <p className="font-semibold text-white">{addr.address_line_1}</p>
                                {addr.address_line_2 && <p>{addr.address_line_2}</p>}
                                <p>{addr.city}, {addr.state_province_region} {addr.postal_code}</p>
                                <p>{addr.country}</p>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="text-gray-500 text-sm">No addresses saved.</p>
                </div>
            )}
        </div>
    );
}