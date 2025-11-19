// components/admin/ProductFilters.js
'use client';

export default function ProductFilters({
                                           searchQuery,
                                           setSearchQuery,
                                           filterCategory,
                                           setFilterCategory,
                                           filterCollection,
                                           setFilterCollection,
                                           filterTag,
                                           setFilterTag,
                                           filterStock,
                                           setFilterStock,
                                           sortOption,
                                           setSortOption,
                                           categories,
                                           collections,
                                           allTags
                                       }) {
    return (
        <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* 1. Search */}
                <div className="col-span-1 md:col-span-2 xl:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Search</label>
                    <input
                        type="text"
                        placeholder="Search by name or SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* 2. Category Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Category</label>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Categories</option>
                        {categories.filter(c => !c.parent_id).map(parent => (
                            <optgroup key={parent.id} label={parent.name}>
                                <option value={parent.id}>{parent.name}</option>
                                {categories.filter(c => c.parent_id === parent.id).map(child => (
                                    <option key={child.id} value={child.id}>&nbsp;&nbsp;{child.name}</option>
                                ))}
                            </optgroup>
                        ))}
                        {/* Categories with no parent that aren't already handled */}
                        {categories.filter(c => !c.parent_id && !categories.some(child => child.parent_id === c.id) ).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* 3. Collection Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Collection</label>
                    <select
                        value={filterCollection}
                        onChange={(e) => setFilterCollection(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Collections</option>
                        {collections.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* 4. Tag Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Tag</label>
                    <select
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Tags</option>
                        {allTags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>
                </div>

                {/* 5. Stock Status */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Stock Status</label>
                    <select
                        value={filterStock}
                        onChange={(e) => setFilterStock(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">All Stock</option>
                        <option value="in_stock">In Stock</option>
                        <option value="low_stock">Low Stock (&lt; 10)</option>
                        <option value="out_of_stock">Out of Stock</option>
                    </select>
                </div>

                {/* 6. Sort Order */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Sort By</label>
                    <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="newest">Newest Added</option>
                        <option value="oldest">Oldest Added</option>
                        <option value="name_asc">Name (A-Z)</option>
                        <option value="name_desc">Name (Z-A)</option>
                        <option value="price_asc">Price (Low-High)</option>
                        <option value="price_desc">Price (High-Low)</option>
                        <option value="stock_asc">Stock (Low-High)</option>
                        <option value="stock_desc">Stock (High-Low)</option>
                    </select>
                </div>
            </div>
        </div>
    );
}