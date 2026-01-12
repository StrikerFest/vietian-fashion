# Test Cases: Order Lifecycle (E2E)

**Scope:** Storefront Checkout -> Admin Order Processing
**Priority:** Critical

## Case 1: Standard Checkout & Fulfillment
* **Objective:** Complete a full order flow from guest checkout to delivery.
* **Pre-requisites:** At least 1 active product with stock > 0.
* **Steps (Storefront):**
    1. Go to Storefront. Add product to Cart.
    2. Proceed to Checkout.
    3. Fill **Guest Info** (Email: `test@demo.com`).
    4. Choose Payment: **COD** (simplest for demo).
    5. Place Order.
    6. **Verify:** Redirected to Confirmation Page. Note Order ID (e.g., `#15`).
* **Steps (Admin):**
    1. Log in as Admin.
    2. Navigate to **Đơn hàng**.
    3. Find Order `#15` (Status should be `Pending`).
    4. Click to View.
    5. Update Status: `Pending` -> `Shipping` -> `Delivered`.
* **Expected Result:**
    * Admin status updates persist.
    * (Optional): Check email inbox for status update emails (if Resend API is active).

## Case 2: Inventory Deduction
* **Objective:** Verify stock drops automatically after checkout.
* **Pre-requisites:** Product A has Stock = 10.
* **Steps:**
    1. Buy 2 units of Product A via Storefront.
    2. Go to **Admin > Products**.
* **Expected Result:**
    * Product A Stock should be `8`.
