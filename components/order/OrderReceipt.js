// components/order/OrderReceipt.js
'use client';

import Link from 'next/link';
import Image from 'next/image';
import VietQRDisplay from './VietQRDisplay';
import { formatCurrency } from '@/utils/format';

export default function OrderReceipt({ order }) {
    const appliedDiscount = order.order_discounts?.[0]?.discounts;
    const shippingAddress = order.addresses;

    // Fallbacks for legacy orders
    const taxAmount = order.tax_amount || 0;
    const shippingCost = order.shipping_cost || 0;

    let discountAmount = 0;
    if (appliedDiscount && order.subtotal) {
        if (appliedDiscount.type === 'percentage') discountAmount = (order.subtotal * Math.min(Math.max(appliedDiscount.value, 0), 100)) / 100;
        else if (appliedDiscount.type === 'fixed') discountAmount = Math.min(appliedDiscount.value, order.subtotal);
    }

    const renderAttributes = (variant) => {
        if (!variant) return null;
        if (variant.attributes && Object.keys(variant.attributes).length > 0) {
            return (
                <span className="text-sm text-gray-400">
                    {Object.entries(variant.attributes).map(([k, v]) => `${v}`).join(' / ')}
                </span>
            );
        }
        return <span className="text-sm text-gray-500">{variant.sku}</span>;
    };

    // --- LOGIC: Determine Payment Method from 'shipping_carrier' workaround ---
    // We check if the carrier string contains the payment method tag we saved earlier.
    const isVietQR = order.shipping_carrier?.includes('VIETQR');
    const isCOD = order.shipping_carrier?.includes('COD') || !order.shipping_carrier; // Default to COD if null

    // Show QR only if it's VietQR AND the order is still pending
    const showPaymentQR = order.status === 'pending' && isVietQR;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 border ${showPaymentQR ? 'bg-yellow-900/30 text-yellow-400 border-yellow-800' : 'bg-green-900/30 text-green-400 border-green-800'}`}>
                    {showPaymentQR ? (
                        <span className="text-3xl">⏳</span>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    )}
                </div>

                <h1 className="text-4xl font-extrabold text-white mb-2">
                    {showPaymentQR ? 'Chờ thanh toán' : 'Đặt hàng thành công!'}
                </h1>

                <p className="text-gray-400">
                    Đơn hàng <span className="font-mono text-indigo-400">#{order.id}</span> đã được {showPaymentQR ? 'khởi tạo' : 'tiếp nhận'}.
                </p>

                {/* COD Message */}
                {isCOD && order.status === 'pending' && (
                    <p className="text-gray-300 mt-2 bg-gray-800 inline-block px-4 py-2 rounded-lg border border-gray-700">
                        🚚 Bạn vui lòng chuẩn bị số tiền <strong>{formatCurrency(order.total_amount)}</strong> khi nhận hàng.
                    </p>
                )}
            </div>

            {/* --- VietQR Integration --- */}
            {showPaymentQR && (
                <div className="mb-12">
                    <VietQRDisplay order={order} />
                </div>
            )}

            <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700 shadow-2xl">
                <div className="p-6 md:p-8 border-b border-gray-700 bg-gray-800/50">
                    <h2 className="text-xl font-bold text-white mb-4">Tóm tắt đơn hàng</h2>
                    <div className="space-y-4">
                        {order.order_items.map((item, index) => {
                            const imageUrl = item.product_variants?.products?.image_url;
                            const productName = item.product_variants?.products?.name || 'Sản phẩm';

                            return (
                                <div key={index} className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="relative w-16 h-16 bg-gray-700 rounded-md overflow-hidden shrink-0 border border-gray-600">
                                            {imageUrl ? (
                                                <Image
                                                    src={imageUrl}
                                                    alt={productName}
                                                    fill
                                                    className="object-cover"
                                                    sizes="64px"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center w-full h-full text-xs text-gray-400">
                                                    No Img
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <p className="font-medium text-white">{productName}</p>
                                            {renderAttributes(item.product_variants)}
                                            {item.custom_options && Object.keys(item.custom_options).length > 0 && (
                                                <div className="mt-1 space-y-0.5">
                                                    {Object.entries(item.custom_options).map(([key, opt]) => (
                                                        <p key={key} className="text-xs text-gray-500">
                                                            <span className="font-semibold">{opt.label}:</span> <span className="text-gray-300">{opt.value}</span>
                                                            {opt.priceModifier > 0 && (
                                                                <span className="text-indigo-400 ml-1">(+{formatCurrency(opt.priceModifier)})</span>
                                                            )}
                                                        </p>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-white font-medium">{formatCurrency(item.price_at_purchase * item.quantity)}</p>
                                        <p className="text-xs text-gray-500">SL: {item.quantity}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Totals & Address Block */}
                <div className="grid grid-cols-1 md:grid-cols-2">
                    <div className="p-6 md:p-8 border-r border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Thông tin giao hàng</h3>
                        {shippingAddress ? (
                            <div className="text-white space-y-1">
                                <p>{shippingAddress.address_line_1}</p>
                                {shippingAddress.address_line_2 && <p>{shippingAddress.address_line_2}</p>}
                                <p>{shippingAddress.city}, {shippingAddress.state_province_region} {shippingAddress.postal_code}</p>
                                <p className="font-bold mt-2">{shippingAddress.country}</p>
                            </div>
                        ) : <p className="text-gray-500 italic">Thanh toán kỹ thuật số / Khách vãng lai</p>}

                        <div className="mt-6 pt-6 border-t border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Trạng thái</h3>
                            <div className="flex gap-2">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${showPaymentQR ? 'bg-yellow-900 text-yellow-200' : 'bg-green-900 text-green-200'}`}>
                                    {order.status}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300">
                                    {isVietQR ? 'Chuyển khoản' : 'COD'}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 md:p-8 bg-gray-700/10">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Chi tiết chi phí</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-gray-300"><span>Tạm tính</span><span>{formatCurrency(order.subtotal)}</span></div>
                            {appliedDiscount && <div className="flex justify-between text-green-400"><span>Giảm giá ({appliedDiscount.code})</span><span>-{formatCurrency(discountAmount)}</span></div>}

                            <div className="flex justify-between text-gray-300">
                                <span>Vận chuyển</span>
                                <span className={shippingCost === 0 ? "text-green-400" : "text-white"}>
                                    {shippingCost === 0 ? 'Miễn phí' : formatCurrency(shippingCost)}
                                </span>
                            </div>

                            <div className="flex justify-between text-gray-300">
                                <span>Thuế</span>
                                <span>{formatCurrency(taxAmount)}</span>
                            </div>

                            <div className="pt-4 mt-4 border-t border-gray-700 flex justify-between items-center"><span className="font-bold text-white text-lg">Tổng cộng</span><span className="font-bold text-white text-2xl">{formatCurrency(order.total_amount)}</span></div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-8 text-center">
                <Link href="/products" className="text-indigo-400 hover:text-indigo-300 font-semibold hover:underline">&larr; Tiếp tục mua sắm</Link>
            </div>
        </div>
    );
}