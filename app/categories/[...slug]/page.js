// app/categories/[...slug]/page.js
'use client';

import ProductListingPage from '@/components/ProductListingPage'; // Import the new reusable component
import { metadata as rootMetadata } from '@/app/layout'; // Import root metadata for fallbacks

export default function CategoryPage(props) {
    const { slug } = props.params;

    // Guard against invalid/missing slugs
    if (!slug || slug.length === 0) {
        // You could return a 404 component here, but null works for now
        return null;
    }

    // Construct the specific API URL for this category
    const fetchUrl = `/api/products/category/${slug.join('/')}`; ///route.js]

    return (
        <ProductListingPage
            fetchUrl={fetchUrl}
            pageType="Category"
            defaultTitle={rootMetadata.title || "AI Fashion Store"}
            defaultDescription={rootMetadata.description || "Your next outfit, discovered by AI."}
        />
    );
}