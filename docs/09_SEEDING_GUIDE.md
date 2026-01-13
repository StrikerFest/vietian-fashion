# Seeding Guide for Graduation Demo

This guide outlines the recommended data volume and strategy to make **Vietian Fashion** look like a live, operating e-commerce business during your defense.

**Target Vibe:** "A boutique fashion brand with active sales and a polished catalog."

---

## 1. Catalog Data (The Foundation)

**Target:** 15-20 Products across 3-4 Categories.

### Step 1: Taxonomy (Categories)
* **Navigate:** `Admin > Danh mục`
* **Create Roots (Catalog):**
    *   `Nam` (Men)
    *   `Nữ` (Women)
    *   `Unisex`
* **Create Children (Catalog):**
    *   `Áo thun` (T-Shirts) -> Parent: Unisex
    *   `Váy` (Dresses) -> Parent: Women
    *   `Quần Jeans` -> Parent: Unisex
* **Create Attributes (Filter):**
    *   `Chất liệu`: Cotton, Denim, Silk (Lụa).
    *   `Màu sắc`: Đen, Trắng, Be.

### Step 2: Product Guides (The "New Feature")
* **Navigate:** `Admin > Cài đặt > Bảng Size & Bảo quản`
* **Create Size Chart:** "Bảng size Áo Thun" linked to `Áo thun`.
* **Create Care Guide:** "Vải Cotton" linked to `Cotton`.

### Step 3: Products
* **Method A: Manual (High Quality)**
    *   Create 5 "Hero" products with high-res images.
    *   Tag them properly so Size Charts appear.
* **Method B: AI Bulk Import (Demo Feature)**
    *   Use the `Admin > Products > ✨ Nhập từ AI` feature.
    *   Upload 5-10 images at once.
    *   Let the AI generate names/descriptions.
    *   **Crucial:** Go back and set Stock > 0 for these so they are buyable.

---

## 2. Operational Data (The "Active Business" Look)

**Target:** 12-15 Orders, $50M - $100M VND Revenue.

### Step 1: Users
*   Create 1 extra account (e.g., `customer@demo.com`) to simulate a registered buyer.
*   Use "Guest Checkout" for the rest.

### Step 2: Orders History
*   **Action:** Perform ~10 checkouts on the Storefront.
    *   Vary the cart size (1 item vs 3 items).
    *   Use different Guest Emails (e.g., `user1@test.com`, `user2@test.com`).
*   **Admin Processing:**
    *   Go to `Admin > Orders`.
    *   Leave 2 orders as **Pending** (to demo processing).
    *   Mark 3 orders as **Shipping**.
    *   Mark the rest as **Delivered**.
    *   *Why?* This populates the **Sales Chart** and **Dashboard Stats**.

### Step 3: Returns
*   **Action:** Take one "Delivered" order and request a return from the Storefront (Account > Returns).
*   **Admin:** Go to `Admin > Trả hàng` and Approve it.
*   *Why?* Shows the full lifecycle loop.

---

## 3. Social Proof (Trust Signals)

**Target:** 5-8 Reviews.

### Step 1: Submit Reviews
*   Go to product pages of your "Hero" items.
*   Submit reviews (mix of 5-star and 4-star).
*   *Tip:* Use different browser incognito windows or guest names.

### Step 2: Moderation
*   Go to `Admin > Đánh giá`.
*   Approve them.

---

## 4. Marketing & Config

*   **Discounts:** Create code `GRADUATION2024` (20% Off). Use it in one order.
*   **Homepage:** Go to `Admin > Cài đặt > Giao diện Trang chủ`.
    *   Add a Hero Banner (upload a wide image).
    *   Configure "Featured Feed" to show "New Arrivals".

---

## Checklist Before Presentation

1.  [ ] **Dashboard:** Check if Sales Chart shows a curve (not a flat line).
2.  [ ] **Inventory:** Ensure no "Hero" product says "Out of Stock".
3.  [ ] **Frontend:** Click every link in Navbar/Footer to ensure no 404s.
4.  [ ] **Search:** Try searching "Winter" or "Blue" to test the AI search bar.
