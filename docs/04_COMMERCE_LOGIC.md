# Commerce Business Logic

## 1. Discounts
**Reference:** `app/api/validate-discount`, `context/CartContext.js`

* **Types**: Percentage (`%`) or Fixed Amount (`$`).
* **Validation**:
    * Code match (Case-insensitive).
    * `is_active` flag must be true.
    * Current time must be within `start_date` and `end_date`.
* **Application**: Applied to the subtotal before shipping. Only one code allowed per order.

## 2. Product Reviews
**Reference:** `app/api/reviews`, `app/admin/reviews`

* **Submission**: Authenticated users can submit reviews (Rating 1-5 + Comment).
* **Moderation**:
    * Default status: `is_approved = false`.
    * Reviews **do not** appear on product pages until an Admin approves them via the Dashboard.
* **Public API**: The `GET` route filters strictly for `is_approved = true`.

## 3. Wishlist & Notifications
**Reference:** `app/api/admin/notify-wishlist`

* **Logic**: A one-to-many relationship between Users and Products.
* **Marketing Engine**: Admins can trigger a "Wishlist Sale" email.
    * 1. Admin selects a product.
    * 2. System finds all users who have wishlisted it.
    * 3. System compiles an email using the `wishlist_sale` template.
    * 4. Sends via **Resend** API.

## 4. Secure Pricing
**Reference:** `utils/server-pricing.js`

The frontend Cart calculates prices for display, but the Backend **never trusts** the client.
* On Checkout, the server fetches the base price of the `variant`.
* It iterates through selected `custom_options`.
* It looks up the `price_modifier` for each option in the DB.
* `Final Price = Base + Σ(Option Modifiers)`.