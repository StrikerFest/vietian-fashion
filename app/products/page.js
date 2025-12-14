// app/products/page.js
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import ProductCard from '@/components/ProductCard';
import QuickViewModal from '@/components/QuickViewModal';
import PaginationControls from '@/components/ui/PaginationControls';
import ProductListingPage from "@/components/ProductListingPage.js";

export default function ProductsPage() {
    return (
        <ProductListingPage
            fetchUrl="/api/products"
            pageType="Tất cả sản phẩm"
            defaultTitle="Bộ Sưu Tập Của Chúng Tôi"
            defaultDescription="Khám phá những mẫu thiết kế mới nhất, độc đáo và thời thượng tại Vietian Fashion."
        />
    );
}