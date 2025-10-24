// app/products/[id]/page.js
'use client';

import {useState, useEffect} from 'react';
import Link from 'next/link';
import {useCart} from '@/context/CartContext'; //

// @unchanged (StarRatingDisplay and StarRatingInput components)
function StarRatingDisplay({rating}) {
    const totalStars = 5;
    let stars = [];
    for (let i = 1; i <= totalStars; i++) {
        stars.push(
            <span key={i} className={`text-xl ${i <= rating ? 'text-yellow-400' : 'text-gray-600'}`}>
                ★
            </span>
        );
    }
    return <div className="flex">{stars}</div>;
}

function StarRatingInput({rating, setRating}) {
    const totalStars = 5;
    return (
        <div className="flex space-x-1">
            {[...Array(totalStars)].map((_, index) => {
                const starValue = index + 1;
                return (
                    <button
                        key={starValue}
                        type="button"
                        className={`text-3xl transition-colors ${
                            starValue <= rating ? 'text-yellow-400' : 'text-gray-600 hover:text-yellow-300'
                        }`}
                        onClick={() => setRating(starValue)}
                    >
                        ★
                    </button>
                );
            })}
        </div>
    );
}


export default function ProductDetailPage(props) {
    const {id} = props.params;
    const {addToCart} = useCart(); //

    const [product, setProduct] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState(null);

    // @unchanged (Reviews state)
    const [reviews, setReviews] = useState([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(true);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewComment, setReviewComment] = useState('');
    const [isSubmittingReview, setIsSubmittingReview] = useState(false);
    const [reviewMessage, setReviewMessage] = useState({type: '', text: ''});


    // @unchanged (Fetch Product Details effect)
    useEffect(() => {
        const initializeProduct = async () => {
            setIsLoading(true);
            try {
                if (!id) throw new Error("No ID provided");
                // API route already includes SEO fields via select('*')/route.js]
                const response = await fetch(`/api/products/${id}`);
                if (!response.ok) throw new Error('Product not found');
                const data = await response.json();
                setProduct(data);
                if (data.product_variants && data.product_variants.length > 0) {
                    setSelectedVariant(data.product_variants[0]);
                }
            } catch (error) {
                console.error("Failed to fetch product:", error);
                setProduct(null);
            } finally {
                setIsLoading(false);
            }
        };
        if (id) {
            initializeProduct();
        }
    }, [id]);

    // --- NEW: useEffect for updating SEO Meta Tags ---
    useEffect(() => {
        if (product) {
            // Set Title
            document.title = product.seo_title || `${product.name} | AI Fashion Store`; // Fallback to product name

            // Set Meta Description
            const metaDescriptionTag = document.querySelector('meta[name="description"]');
            const descriptionContent = product.seo_description || product.description || "Check out this product from AI Fashion Store."; // Fallback chain

            if (metaDescriptionTag) {
                metaDescriptionTag.setAttribute('content', descriptionContent);
            } else {
                // If the tag doesn't exist (less likely with Next.js layout), create it
                const newMetaTag = document.createElement('meta');
                newMetaTag.setAttribute('name', 'description');
                newMetaTag.setAttribute('content', descriptionContent);
                document.head.appendChild(newMetaTag);
            }
        }
        // Optional cleanup: Reset title/description when component unmounts or product changes
        // return () => {
        //     document.title = "AI Fashion Store"; // Reset to default
        //     const metaDescriptionTag = document.querySelector('meta[name="description"]');
        //     if (metaDescriptionTag) {
        //         metaDescriptionTag.setAttribute('content', "Your next outfit, discovered by AI."); // Reset to default
        //     }
        // };
    }, [product]); // Run this effect when the product data changes


    // @unchanged (Fetch Approved Reviews effect)
    useEffect(() => {
        const fetchReviews = async () => {
            if (!id) return;
            setIsLoadingReviews(true);
            try {
                const response = await fetch(`/api/reviews/product/${id}`);
                if (!response.ok) throw new Error('Failed to fetch reviews');
                const data = await response.json();
                setReviews(data || []);
            } catch (error) {
                console.error("Failed to fetch reviews:", error);
                setReviews([]);
            } finally {
                setIsLoadingReviews(false);
            }
        };
        fetchReviews();
    }, [id]);

    // @unchanged (Handle Review Submission)
    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (reviewRating === 0) {
            setReviewMessage({type: 'error', text: 'Please select a star rating.'});
            return;
        }
        setIsSubmittingReview(true);
        setReviewMessage({type: '', text: ''});
        try {
            const user_id = null; // Placeholder
            const response = await fetch('/api/reviews', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    product_id: parseInt(id), //
                    rating: reviewRating, //
                    comment: reviewComment, //
                    user_id: user_id //
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit review.');
            }
            setReviewMessage({type: 'success', text: data.message || 'Review submitted successfully! It will appear after moderation.'});
            setReviewRating(0);
            setReviewComment('');
        } catch (error) {
            console.error('Review submission error:', error);
            setReviewMessage({type: 'error', text: error.message || 'An error occurred. Please try again.'});
        } finally {
            setIsSubmittingReview(false);
        }
    };

    // @unchanged (handleAddToCart function)
    const handleAddToCart = () => {
        if (product && selectedVariant) {
            addToCart(product, selectedVariant); //
        }
    };

    // @unchanged (Loading/Not Found states)
    if (isLoading) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading product...</div>;
    }
    if (!product) {
        return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Product not found. <Link href="/products" className="ml-2 text-indigo-400">Go back</Link></div>;
    }

    // @unchanged (Image URL logic)
    const imageUrl = product.image_url || 'https://placehold.co/600x400/1F2937/FFFFFF?text=No+Image';

    // @unchanged (Inventory logic)
    const stockOnHand = selectedVariant?.inventory_levels?.[0]?.on_hand || 0;
    const isOutOfStock = stockOnHand <= 0;

    // @unchanged (Rest of the JSX rendering)
    return (
        <main className="min-h-screen bg-gray-900 text-white p-8">
            {/* --- Product Details Section --- */}
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                {/* ... image, product info, variants, add to cart ... */}
                <div>
                    <img src={imageUrl} alt={product.name} className="w-full rounded-lg shadow-lg"/>
                </div>
                <div>
                    <h1 className="text-4xl font-extrabold mb-2">{product.name}</h1>
                    <p className="text-2xl font-semibold text-indigo-400 mb-4">${selectedVariant?.price.toFixed(2)}</p>
                    <p className="text-gray-400 mb-6">{product.description}</p>

                    <div className="mb-6">
                        <h3 className="text-sm font-medium text-gray-300 mb-2">Select Variant:</h3>
                        <div className="flex flex-wrap gap-2">
                            {/* ... variant buttons ... */}
                            {product.product_variants.map(variant => (
                                <button
                                    key={variant.id}
                                    onClick={() => setSelectedVariant(variant)}
                                    className={`py-2 px-4 rounded-md border text-sm font-semibold transition-colors
                                        ${selectedVariant?.id === variant.id
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                                    }`}
                                >
                                    {variant.color} / {variant.size}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleAddToCart}
                        disabled={isOutOfStock || !selectedVariant}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                    >
                        {!selectedVariant ? 'Select a Variant' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    {selectedVariant && !isOutOfStock && <p className="text-xs text-gray-400 mt-2 text-center">{stockOnHand} in stock</p>}
                </div>
            </div>

            {/* --- Reviews Section --- */}
            <div className="max-w-4xl mx-auto mt-12 pt-8 border-t border-gray-700">
                {/* ... Review Form ... */}
                <div className="bg-gray-800 p-6 rounded-lg mb-8">
                    {/* ... form content ... */}
                    <h3 className="text-xl font-semibold mb-4">Leave a Review</h3>
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Your Rating</label>
                            <StarRatingInput rating={reviewRating} setRating={setReviewRating}/>
                        </div>
                        <div>
                            <label htmlFor="comment" className="block text-sm font-medium mb-1">Your Review (Optional)</label>
                            <textarea id="comment" value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows="4" placeholder="Tell us what you think..."
                                      className="w-full bg-gray-700 p-2 rounded-md border border-gray-600"></textarea>
                        </div>
                        {reviewMessage.text && (<p className={`text-sm ${reviewMessage.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>{reviewMessage.text}</p>)}
                        <div>
                            <button type="submit" disabled={isSubmittingReview || reviewRating === 0} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-5 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed">
                                {isSubmittingReview ? 'Submitting...' : 'Submit Review'}
                            </button>
                        </div>
                    </form>
                </div>
                {/* ... Display Existing Reviews ... */}
                {isLoadingReviews ? (<p className="text-gray-400">Loading reviews...</p>)
                    : reviews.length > 0 ? (
                        <div className="space-y-6">
                            {reviews.map(review => (
                                <div key={review.id} className="border-b border-gray-700 pb-4">
                                    <div className="flex items-center mb-2">
                                        <StarRatingDisplay rating={review.rating}/>
                                        <span className="ml-auto text-xs text-gray-500">{new Date(review.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-300">{review.comment || <span className="italic text-gray-500">No comment provided.</span>}</p>
                                </div>
                            ))}
                        </div>
                    ) : (<p className="text-gray-500">Be the first to review this product!</p>)}
            </div>
        </main>
    );
}