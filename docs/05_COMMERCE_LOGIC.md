# Commerce Business Logic

## 1. Pricing Engine
The system enforces strict server-side pricing to prevent manipulation.

### Calculation Logic
* **Source**: `utils/server-pricing.js`
* **Base Price**: Derived directly from the `product_variants` table.
* **Option Modifiers**:
    * Products can have configurable options (Size, Material, Custom Text).
    * Each option value can carry a `price_modifier` (e.g., "+$5 for Gold Material").
    * **Security**: The server re-fetches all selected option definitions from the database during checkout to ensure the `price_modifier` is accurate and the option is still active.

## 2. Cart System
* **Client-Side Storage**: The cart is persisted in `localStorage` via `context/CartContext.js`.
* **Item Identification**: Items are uniquely identified by a composite key (`uniqueId`) generated from the `variantId` AND a hash of the selected `customOptions`. This allows the user to have the same Shirt in "Red" and "Blue" as separate line items.
* **Discounts**:
    * Logic: Fixed amount or Percentage based.
    * Validation: Handled via `/api/validate-discount`, checking `start_date`, `end_date`, and `is_active` status.

## 3. Checkout & Order Processing
The checkout process (`app/api/checkout/route.js`) is the most critical transaction in the system.

### A. Guest User ("Ghost Accounts")
To support guest checkout while maintaining data integrity, the system uses a "Ghost Account" strategy:
1.  **Check**: If the email exists, the order is linked to that email (without forcing login).
2.  **Create**: If the email is new, a Supabase Auth user is created silently with a randomized password and marked as `[!!GUEST]` in metadata.
3.  **Benefit**: This allows "Guests" to later use "Forgot Password" to claim their account and view order history.

### B. Inventory Locking
* **Verification**: Before payment, the system checks `inventory_levels.on_hand` for every item.
* **Atomic Update**: Stock is decremented using a database RPC function `decrement_inventory` to prevent race conditions (selling the same last item to two people).

### C. Post-Order Actions
* **Emails**: Transactional emails are sent via **Resend** API.
* **Notification**: If the payment method is VietQR, specific instructions are included in the email.

## 4. Shipping & Tax
* **Shipping**: Currently implements a simple flat-rate logic (Free shipping > 500,000đ, otherwise 30,000đ).
* **Tax**: Configurable via the Admin Settings, stored in the `settings` table.