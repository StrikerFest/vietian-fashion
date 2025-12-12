// app/categories/[...slug]/page.js
'use client';

import ProductListingPage from '@/components/ProductListingPage';
// Remove the rootMetadata import
// import { metadata as rootMetadata } from '@/app/layout';

export default function CategoryPage(props) {
    const { slug } = props.params;

    if (!slug || slug.length === 0) {
        return null;
    }

    const fetchUrl = `/api/products/category/${slug.join('/')}`; //

    return (
        <ProductListingPage
            fetchUrl={fetchUrl}
            pageType="Danh mục"
            // Hardcode the fallback values instead of importing
            defaultTitle="Cửa hàng Thời trang AI"
            defaultDescription="Trang phục tiếp theo của bạn, được khám phá bởi AI."
        />
    );
}