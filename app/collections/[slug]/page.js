// app/collections/[slug]/page.js
'use client';

import ProductListingPage from '@/components/ProductListingPage';
// Remove the rootMetadata import
// import { metadata as rootMetadata } from '@/app/layout';

export default function CollectionPage(props) {
    const { slug } = props.params;

    if (!slug) {
        return null;
    }

    const fetchUrl = `/api/products/collection/${slug}`; //

    return (
        <ProductListingPage
            fetchUrl={fetchUrl}
            pageType="Bộ sưu tập"
            // Hardcode the fallback values instead of importing
            defaultTitle="Cửa hàng Thời trang AI"
            defaultDescription="Trang phục tiếp theo của bạn, được khám phá bởi AI."
        />
    );
}