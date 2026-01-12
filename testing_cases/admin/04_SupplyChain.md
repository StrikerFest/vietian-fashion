# Test Cases: Supply Chain

**Scope:** `app/admin/inventory`, `app/admin/purchase-orders`
**Priority:** Medium

## Case 1: Manual Inventory Adjustment
* **Objective:** Verify manual stock changes are logged.
* **Steps:**
    1. Navigate to **Nhật ký tồn kho** (Inventory).
    2. Switch to **"Điều chỉnh"** tab.
    3. Select a Variant (search by SKU).
    4. Enter Quantity: `+5`.
    5. Reason: "Found extra stock".
    6. Submit.
* **Expected Result:**
    * Success Toast.
    * Switch to **"Nhật ký"** tab: A new entry "+5" with reason "Found extra stock" should appear at the top.

## Case 2: Purchase Order Cycle (B2B)
* **Objective:** Verify receiving a PO automatically increases stock.
* **Pre-requisites:** A Supplier exists.
* **Steps:**
    1. Navigate to **Đơn nhập hàng** -> **"+ Tạo Đơn Nhập Hàng"**.
    2. Select Supplier.
    3. Add Item: Select a Product Variant, Qty `100`, Cost `50000`.
    4. Save as **Draft**.
    5. In the list, click the Order ID to view details.
    6. Click **"Đánh dấu Đã nhận hàng"** (Status -> Received).
* **Expected Result:**
    * Order Status updates to `Received`.
    * Navigate to **Inventory Logs**: A new entry "+100" with reason "Purchase Order #..." should exist.
