'use client';

import { useState, useEffect } from 'react';

const emptyVariant = { sku: '', price: '', size: '', color: '', quantity: '' };

export default function AdminPage() {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [productName, setProductName] = useState('');
    const [productDescription, setProductDescription] = useState('');
    const [variants, setVariants] = useState([{ ...emptyVariant }]);

    useEffect(() => {
        const fetchProducts = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/products');
                const data = await response.json();
                setProducts(data);
            } catch (error) {
                console.error("Failed to fetch products:", error);
            }
            setIsLoading(false);
        };
        fetchProducts();
    }, []);

    const handleVariantChange = (index, field, value) => {
        const updatedVariants = [...variants];
        updatedVariants[index] = { ...updatedVariants[index], [field]: value };
        setVariants(updatedVariants);
    };

    const addVariant = () => {
        setVariants([...variants, { ...emptyVariant }]);
    };



    const removeVariant = (index) => {
        if (variants.length > 1) {
            const updatedVariants = variants.filter((_, i) => i !== index);
            setVariants(updatedVariants);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const newProductData = {
            name: productName,
            description: productDescription,
            variants: variants.map(v => ({
                ...v,
                price: parseFloat(v.price) || 0,
                quantity: parseInt(v.quantity, 10) || 0
            }))
        };

        try {
            const response = await fetch('/api/products', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newProductData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create product');
            }

            const createdProduct = await response.json();

            setProducts(prevProducts => [createdProduct, ...prevProducts]);

            setProductName('');
            setProductDescription('');
            setVariants([{ ...emptyVariant }]);
            setShowForm(false);

            alert('Product created successfully!');

        } catch (error) {
            console.error('Submission failed:', error);
            alert(`Error: ${error.message}`);
        }
    };

    const allVariantsFlat = products.flatMap(p =>
        (p.product_variants || []).map((v, index) => ({
            ...v,
            productName: p.name,
            isFirstVariant: index === 0
        }))
    );


    return (
        <div className="min-h-screen bg-gray-900 text-white p-8">
            <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

            <div className="mb-6">
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                >
                    {showForm ? 'Cancel' : '+ Add New Product'}
                </button>

                {showForm && (
                     <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg mt-4 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label htmlFor="productName" className="block text-sm font-medium mb-1">Product Name</label>
                                <input
                                    type="text"
                                    id="productName"
                                    value={productName}
                                    onChange={(e) => setProductName(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="productDescription" className="block text-sm font-medium mb-1">Description</label>
                                <textarea
                                    id="productDescription"
                                    value={productDescription}
                                    onChange={(e) => setProductDescription(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-indigo-500"
                                    rows="3"
                                ></textarea>
                            </div>
                        </div>

                        <h3 className="text-lg font-semibold mb-2">Product Variants</h3>
                        {variants.map((variant, index) => (
                            <div key={index} className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-3 p-3 bg-gray-900 rounded-md">
                                <input type="text" placeholder="SKU" value={variant.sku} onChange={(e) => handleVariantChange(index, 'sku', e.target.value)} className="bg-gray-700 p-2 rounded-md" required />
                                <input type="number" step="0.01" placeholder="Price" value={variant.price} onChange={(e) => handleVariantChange(index, 'price', e.target.value)} className="bg-gray-700 p-2 rounded-md" required />
                                <input type="text" placeholder="Size" value={variant.size} onChange={(e) => handleVariantChange(index, 'size', e.target.value)} className="bg-gray-700 p-2 rounded-md" required />
                                <input type="text" placeholder="Color" value={variant.color} onChange={(e) => handleVariantChange(index, 'color', e.target.value)} className="bg-gray-700 p-2 rounded-md" required />
                                <input type="number" placeholder="Quantity" value={variant.quantity} onChange={(e) => handleVariantChange(index, 'quantity', e.target.value)} className="bg-gamma-700 p-2 rounded-md" required />
                                <button type="button" onClick={() => removeVariant(index)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-md disabled:bg-gray-500 disabled:cursor-not-allowed" disabled={variants.length === 1}>
                                    Remove
                                </button>
                            </div>
                        ))}

                        <div className="flex items-center gap-4 mt-4">
                           <button type="button" onClick={addVariant} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md">
                                Add Variant
                            </button>
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md">
                                Save Product
                            </button>
                        </div>
                    </form>
                )}
            </div>

            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-semibold mb-4">Manage Products</h2>
                {isLoading ? (
                    <p>Loading products...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900">
                                <tr className="border-b border-gray-600">
                                    <th className="p-3">Product Name</th>
                                    <th className="p-3">SKU</th>
                                    <th className="p-3">Color</th>
                                    <th className="p-3">Size</th>
                                    <th className="p-3">Price</th>
                                    <th className="p-3">Stock</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allVariantsFlat.map(variant => (
                                    <tr key={variant.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="p-3 font-medium">{variant.isFirstVariant ? variant.productName : ''}</td>
                                        <td className="p-3">{variant.sku}</td>
                                        <td className="p-3">{variant.color}</td>
                                        <td className="p-3">{variant.size}</td>
                                        <td className="p-3">${variant.price}</td>
                                        <td className="p-3">{variant.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
