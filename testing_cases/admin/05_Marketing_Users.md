# Test Cases: Marketing & Users

**Scope:** `app/admin/discounts`, `app/admin/users`
**Priority:** Low

## Case 1: Discount Code Creation
* **Objective:** Verify discount logic validation.
* **Steps:**
    1. Navigate to **Mã giảm giá**.
    2. Create New: Code `TEST10`, Type `Percentage`, Value `10`.
    3. Save.
* **Expected Result:**
    * Discount appears in list.
    * (Cross-Check): Use `TEST10` in Checkout (requires Mixed testing).

## Case 2: User Management
* **Objective:** Verify user lookup and archiving.
* **Steps:**
    1. Navigate to **Khách hàng**.
    2. Search for a known email (e.g., your own).
    3. Click **"Archive"** icon (trash can).
    4. Confirm dialog.
* **Expected Result:**
    * Toast: "Đã lưu trữ người dùng thành công".
    * User should no longer be able to log in (Mixed testing).
