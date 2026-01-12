# Test Cases: Product Management

**Scope:** `app/admin/products`
**Priority:** High

## Case 1: Create New Product (Manual)
* **Objective:** Verify a product can be created with variants and images.
* **Pre-requisites:** Logged in as Admin. At least one Category exists.
* **Steps:**
    1. Navigate to **Sản phẩm** -> Click **"+ Thêm Sản phẩm mới"**.
    2. Enter Name: "Test Shirt".
    3. Upload an Image.
    4. Click **"✨ Auto-Write"** (Verify Progress Bar appears).
    5. Select a Category (Catalog) and some Attributes (Tags).
    6. **Variants:** Add a variant (e.g., SKU: `TEST-001`, Price: `100000`, Stock: `10`).
    7. Click **"Lưu sản phẩm"**.
* **Expected Result:**
    * Success Toast appears.
    * Redirects to Product List.
    * "Test Shirt" appears in the list.

## Case 2: AI Bulk Import
* **Objective:** Verify the Vision AI agent processes images correctly.
* **Steps:**
    1. On Product List, click **"✨ Nhập từ AI"**.
    2. Upload 2 distinct clothing images.
    3. **Observe:** Each card should show a "Processing..." bar with flavor text ("Vision Processing...").
    4. Wait ~15 seconds per item.
    5. **Observe:** Status changes to ✅.
    6. Close Modal.
    7. Switch to **"✨ Bản nháp AI"** tab.
* **Expected Result:**
    * Two new products appear starting with `[AI]`.
    * They have generated Names, Descriptions, and Categories.

## Case 3: Edit Product & Inventory
* **Objective:** Verify the "0 Stock" bug is fixed and updates persist.
* **Steps:**
    1. Click **"Sửa"** on any product.
    2. Scroll to Variants.
    3. Change "Tồn kho" from `10` to `50`.
    4. Click **"Lưu sản phẩm"**.
    5. Navigate back to the list.
* **Expected Result:**
    * The "Tổng tồn kho" column in the list should reflect the increase.
