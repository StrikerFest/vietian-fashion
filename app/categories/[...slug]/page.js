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
            pageType="Category"
            // Hardcode the fallback values instead of importing
            defaultTitle="AI Fashion Store"
            defaultDescription="Your next outfit, discovered by AI."
        />
    );
}