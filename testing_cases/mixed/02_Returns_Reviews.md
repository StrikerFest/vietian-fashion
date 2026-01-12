# Test Cases: Returns & Reviews (User <-> Admin)

**Scope:** Storefront Account -> Admin Moderation
**Priority:** High

## Case 1: Return Request (RMA)
* **Objective:** Verify the return approval flow and inventory restocking.
* **Pre-requisites:** An Order in `Delivered` status (from previous test).
* **Steps (Storefront):**
    1. Go to **Tài khoản** -> **Lịch sử đơn hàng** (or Order Confirmation page).
    2. Select the Delivered order.
    3. Click **"Yêu cầu Trả hàng / Hoàn tiền"**.
    4. Select Item, Qty, Reason. Submit.
* **Steps (Admin):**
    1. Navigate to **Trả hàng** (Returns).
    2. Find the request.
    3. Click **"Chấp thuận"**. Ensure "Restock Inventory" is CHECKED.
* **Expected Result:**
    * Return Status -> `Approved`.
    * Order Status -> `Refunded` (or Partially Refunded).
    * **Inventory:** Stock count for that item should INCREASE by the returned quantity.

## Case 2: Product Review
* **Objective:** Verify reviews require approval.
* **Steps (Storefront):**
    1. Go to a Product Page.
    2. Submit a 5-star review "Great product!".
    3. **Verify:** Review should NOT appear immediately (or show as "Pending").
* **Steps (Admin):**
    1. Navigate to **Đánh giá** (Reviews).
    2. Find the review. Click **"Duyệt"** (Approve).
* **Steps (Storefront):**
    1. Refresh Product Page.
* **Expected Result:**
    * Review is now visible to public.
