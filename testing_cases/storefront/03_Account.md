# Test Cases: User Account

**Scope:** `app/account/*`
**Priority:** Medium

## Case 1: Profile Update (New Feature)
* **Objective:** Verify user can update their name.
* **Steps:**
    1. Log in.
    2. Go to **Tài khoản**.
    3. Enter "New Name" in the First Name field.
    4. Click **"Cập nhật hồ sơ"**.
    5. **Verify:** Success Toast appears.
    6. Refresh Page.
    7. **Verify:** Name persists (fetched from DB).

## Case 2: Address Book
* **Objective:** Verify CRUD for addresses.
* **Steps:**
    1. Click **"+ Thêm địa chỉ mới"**.
    2. Fill form (use realistic Vietnam data). Save.
    3. **Verify:** Address appears in list.
    4. Delete the address.
    5. **Verify:** Address disappears.

## Case 3: Wishlist
* **Objective:** Verify wishlist toggling.
* **Steps:**
    1. Go to Product Page. Click "Heart" icon.
    2. Go to **Tài khoản** -> **Danh sách yêu thích**.
    3. **Verify:** Product is listed.
    4. Remove from Wishlist.
