# Test Cases: Taxonomy Management

**Scope:** `app/admin/categories`, `app/admin/collections`
**Priority:** Medium

## Case 1: Category Management (Tree View)
* **Objective:** Verify hierarchical category creation.
* **Steps:**
    1. Navigate to **Danh mục**.
    2. Click **"+ Thêm Danh mục"**.
    3. Name: "Men", Type: `Catalog`. Save.
    4. Click **"+ Thêm Danh mục"** again.
    5. Name: "Shirts", Parent: "Men". Save.
* **Expected Result:**
    * "Men" appears as a root item.
    * "Shirts" is nested under "Men" (click arrow to expand if needed).

## Case 2: Attribute Creation
* **Objective:** Verify creation of filterable attributes.
* **Steps:**
    1. Navigate to **Danh mục**.
    2. Switch Filter Dropdown to **"Attribute (Bộ lọc)"**.
    3. Create new: Name "Material", Type `Attribute`.
    4. Create child: Name "Cotton", Parent "Material".
* **Expected Result:**
    * These attributes should now be selectable in the **Product Form** -> "Thuộc tính / Thẻ" section.

## Case 3: Collection Management
* **Objective:** Verify collections group products correctly.
* **Steps:**
    1. Navigate to **Bộ sưu tập** -> **"+ Thêm Bộ sưu tập Mới"**.
    2. Name: "Summer Sale".
    3. Save.
    4. Go to **Products** -> Edit a product -> Check "Summer Sale" in the Collection list.
* **Expected Result:**
    * On the Frontend, `/collections/summer-sale` should display the selected product.
