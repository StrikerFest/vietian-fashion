# Test Cases: Cart & Checkout

**Scope:** `app/cart`, `app/checkout`
**Priority:** Critical

## Case 1: Cart Management
* **Objective:** Verify cart persistence and calculations.
* **Steps:**
    1. Add Product A ($100k) and Product B ($200k) to Cart.
    2. Go to `/cart`.
    3. Update Product A quantity to `2`.
    4. **Verify:** Subtotal updates to $400k.
    5. Remove Product B.
    6. **Verify:** Item disappears, Total updates.

## Case 2: Discount Codes
* **Objective:** Verify coupon validation.
* **Pre-requisites:** Create code `TEST10` (10%) in Admin.
* **Steps:**
    1. In Cart, enter `TEST10` -> Apply.
    2. **Verify:** Discount line appears, Total reduces by 10%.
    3. Remove Discount.
    4. **Verify:** Total reverts to original.
