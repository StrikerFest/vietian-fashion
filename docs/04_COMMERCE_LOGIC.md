# Commerce Business Logic

This document outlines the specific rules governing Discounts, Product Reviews, and the Wishlist Notification engine. It explains how these features interact with the database and external services.

## 1. Discount Engine

The system supports a code-based discount mechanism used during the checkout process.

### Data Model
* **`discounts` Table**:
    * **`code`**: Unique string (case-insensitive storage, uppercased).
    * **`type`**:
        * `'percentage'`: Deducts a % from the subtotal (e.g., 20 = 20% off).
        * `'fixed'`: Deducts a flat dollar amount (e.g., 20 = $20 off).
    * **`value`**: The numeric amount.
    * **`start_date` / `end_date`**: Optional validity window.
    * **`is_active`**: Master toggle.

### Validation Flow (`/api/validate-discount`)
When a user attempts to apply a code in the Cart:
1.  **Normalization**: Input is converted to uppercase.
2.  **Existence Check**: DB lookup by `code`.
3.  **Status Check**: Is `is_active` true?
4.  **Time Check**:
    * Is `NOW()` > `start_date`?
    * Is `NOW()` < `end_date`?
5.  **Response**: Returns the discount object to the client context if valid.

### Calculation Logic (`CartContext.js`)
Logic is computed client-side for the UI, and re-verified server-side during Checkout (`/api/checkout`).

* **Percentage**: `(Subtotal * (Value / 100))`
* **Fixed**: `Math.min(Value, Subtotal)` (Prevents negative totals).
* **Constraint**: Only **one** discount can be applied per order.

---

## 2. Product Reviews & Moderation

The review system uses a **Strict Moderation** workflow. User-generated content does not appear publicly until explicitly approved by an administrator.

### The Lifecycle
1.  **Submission** (`POST /api/reviews`)
    * User (authenticated) submits rating (1-5) and comment.
    * Database stores the review with `is_approved = false`.
    * Review is **not** visible on the product page yet.

2.  **Moderation** (`/admin/reviews`)
    * Admin views list of `pending` reviews.
    * **Action: Approve**: Calls `PUT` endpoint -> sets `is_approved = true`.
    * **Action: Delete**: Calls `DELETE` endpoint -> soft deletes the record.

3.  **Public Display** (`GET /api/reviews/product/[id]`)
    * The endpoint specifically filters: `WHERE product_id = [id] AND is_approved = true`.
    * This ensures visitors never see spam or inappropriate content.

---

## 3. Wishlist & Price Drop Alerts

The Wishlist acts as both a "Save for Later" feature and a targeted marketing channel.

### Core Wishlist
* **Table**: `wishlists` (Junction table: `user_id` + `product_id`).
* **Constraints**: Unique constraint on `(user_id, product_id)` prevents duplicate entries.
* **Privacy**: Row Level Security (RLS) ensures users can only read/modify their own wishlist items.

### "Wishlist Sale" Notification System
This is a powerful marketing tool located in the Admin Panel (conceptually triggered from Product details).

**Workflow (`/api/admin/notify-wishlist`):**
1.  **Trigger**: Admin selects a product (e.g., "Red Dress") and defines a message (e.g., "Now 20% off!").
2.  **Audience Lookup**: System queries the `wishlists` table to find all Users who have saved this specific Product ID.
3.  **Template Resolution**:
    * Fetches the `email_templates` record where `type = 'wishlist_sale'`.
    * Validates the template exists and is active.
4.  **Variable Injection**:
    * `{{customer_name}}`: Replaced with User's first name.
    * `{{product_name}}`: Replaced with Product Name.
    * `{{discount_text}}`: Replaced with Admin's custom message.
5.  **Batch Sending**:
    * Uses **Resend** API to dispatch emails to the identified list.
    * *Note: Current implementation sends individually in a map loop; for high scale, Resend's batch endpoint should be optimized.*

### Email Templates
Templates are stored in the database (`email_templates`), allowing Admins to update wording/HTML without deploying code.
* **Types**:
    * `order_confirm`: Sent automatically after checkout.
    * `wishlist_sale`: Sent manually via the notification tool.
    * `marketing`: General purpose (newsletter style).