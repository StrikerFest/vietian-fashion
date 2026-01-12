# Test Cases: System Settings

**Scope:** `app/admin/settings`
**Priority:** Low (Setup once)

## Case 1: Product Guides Configuration
* **Objective:** Verify Size Charts and Care Instructions can be created and linked.
* **Steps:**
    1. Navigate to **Cài đặt** -> Tab **"Bảng Size & Bảo quản"**.
    2. **Size Chart:**
        * Click **"+ Tạo Bảng Size Mới"**.
        * Name: "Test Chart".
        * Select Category: "Áo thun" (or any existing catalog).
        * Edit a cell in the table grid.
        * Click **"Lưu Bảng Size"**.
    3. **Care Instruction:**
        * Switch to **"Bảo quản"** tab.
        * Click **"+ Tạo Hướng Dẫn Mới"**.
        * Name: "Test Cotton".
        * Select Attribute: "Cotton".
        * Content: "Wash warm."
        * Click **"Lưu Hướng Dẫn"**.
* **Expected Result:**
    * Settings are saved without error.
    * **Verification:** Go to the Frontend Product Page for a "Cotton T-Shirt". The "Size Guide" and "Care Instructions" tabs should appear below the product info.
