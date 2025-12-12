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
                                           allTags // This now receives Attributes names
                                       }) {

    // Filter Categories to only show Catalog types (Menus), excluding Attributes (Filters)
    const catalogCategories = categories.filter(c => c.type === 'catalog');

    return (
        <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* 1. Search */}
                <div className="col-span-1 md:col-span-2 xl:col-span-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Tìm kiếm</label>
                    <input
                        type="text"
                        placeholder="Tìm theo tên hoặc SKU..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* 2. Category Filter (Catalog Only) */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Danh mục</label>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Tất cả danh mục</option>
                        {catalogCategories.filter(c => !c.parent_id).map(parent => (
                            <optgroup key={parent.id} label={parent.name}>
                                <option value={parent.id}>{parent.name}</option>
                                {catalogCategories.filter(c => c.parent_id === parent.id).map(child => (
                                    <option key={child.id} value={child.id}>&nbsp;&nbsp;{child.name}</option>
                                ))}
                            </optgroup>
                        ))}
                        {/* Categories with no parent that aren't already handled */}
                        {catalogCategories.filter(c => !c.parent_id && !catalogCategories.some(child => child.parent_id === c.id) ).map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* 3. Collection Filter */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Bộ sưu tập</label>
                    <select
                        value={filterCollection}
                        onChange={(e) => setFilterCollection(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Tất cả bộ sưu tập</option>
                        {collections.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {/* 4. Attribute Filter (formerly Tag) */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Thuộc tính / Bộ lọc</label>
                    <select
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">Tất cả thuộc tính</option>
                        {allTags.map(tag => (
                            <option key={tag} value={tag}>{tag}</option>
                        ))}
                    </select>
                </div>

                {/* 5. Stock Status */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Trạng thái kho</label>
                    <select
                        value={filterStock}
                        onChange={(e) => setFilterStock(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="all">Tất cả</option>
                        <option value="in_stock">Còn hàng</option>
                        <option value="low_stock">Sắp hết hàng (&lt; 10)</option>
                        <option value="out_of_stock">Hết hàng</option>
                    </select>
                </div>

                {/* 6. Sort Order */}
                <div>
                    <label className="block text-xs font-medium text-gray-400 mb-1">Sắp xếp theo</label>
                    <select
                        value={sortOption}
                        onChange={(e) => setSortOption(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="newest">Mới nhất</option>
                        <option value="oldest">Cũ nhất</option>
                        <option value="name_asc">Tên (A-Z)</option>
                        <option value="name_desc">Tên (Z-A)</option>
                        <option value="price_asc">Giá (Thấp-Cao)</option>
                        <option value="price_desc">Giá (Cao-Thấp)</option>
                        <option value="stock_asc">Kho (Thấp-Cao)</option>
                        <option value="stock_desc">Kho (Cao-Thấp)</option>
                    </select>
                </div>
            </div>
        </div>
    );
}