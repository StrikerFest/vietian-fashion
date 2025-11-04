// app/collections/[slug]/page.js
'use client';

import ProductListingPage from '@/components/ProductListingPage'; // Import the new reusable component
import { metadata as rootMetadata } from '@/app/layout'; // Import root metadata for fallbacks

export default function CollectionPage(props) {
    const { slug } = props.params;

    // Guard against invalid/missing slugs
    if (!slug) {
        return null;
    }

    // Construct the specific API URL for this collection
    const fetchUrl = `/api/products/collection/${slug}`; ///route.js]

    return (
        <ProductListingPage
            fetchUrl={fetchUrl}
            pageType="Collection"
            defaultTitle={rootMetadata.title || "AI Fashion Store"}
            defaultDescription={rootMetadata.description || "Your next outfit, discovered by AI."}
        />
    );
}