# Product Options & Customization System

The Product Options feature allows store administrators to define custom input fields (text, choices, etc.) that are injected into product pages based on dynamic rules. This enables customizations like embroidery, engraving, or gift wrapping without cluttering the core `product_variants` SKU system.

## 1. Data Model

The feature introduces two new tables and modifies one existing table to store configuration and customer selections.

### `option_sets`
Defines a group of options and the rules for where they appear.
* **`title`**: Internal name (e.g., "T-Shirt Customization").
* **`priority`**: Integer. Higher numbers render first on the page.
* **`is_active`**: Master toggle.
* **`rules`**: JSONB array defining visibility logic.
    * Format: `[{ type: 'category', value: 12 }, { type: 'price', operator: 'gt', value: 50 }]`
    * Logic: If **ANY** rule matches the current product, the set is displayed.

### `product_options`
The actual input fields belonging to a set.
* **`type`**:
    * `text`: Simple input string.
    * `textarea`: Multi-line text.
    * `radio`: Single choice from a list.
    * `checkbox_button`: Selection buttons.
* **`values`**: JSONB array for choice-based types.
    * Format: `[{ label: "Red Thread", price_modifier: 5.00 }]`
* **`is_required`**: Boolean. Blocks adding to cart if empty.

### `order_items` (Modification)
* **`custom_options`**: New JSONB column.
    * Stores the snapshot of user choices at the time of purchase.
    * Format: `{"15": { "label": "Embroidery Text", "value": "Dad", "priceModifier": 0 }}`

---

## 2. Logic Flow

### Phase 1: Admin Configuration
Located in `/admin/options`.
1.  **Set Creation**: Admin creates a set (e.g., "Gift Wrapping").
2.  **Rule Assignment**: Admin assigns it to `Collection: Holiday` OR `Price > $100`.
3.  **Option Definition**: Admin adds a Radio button "Wrap Type" with values "Standard (+$0)" and "Premium (+$5)".

### Phase 2: Storefront Rendering
Located in `/app/products/[id]/page.js`.
1.  **Fetch**: The page calls `GET /api/product-options?productId=X&price=Y`.
2.  **Evaluation**: The API fetches all active sets and evaluates their `rules` against the product's metadata (Categories, Collections, Price).
3.  **Render**: Valid sets are rendered by the `ProductOptions` component.
4.  **Pricing**: The frontend calculates a `finalPrice`:
    ```javascript
    finalPrice = baseVariantPrice + sum(selectedOptionModifiers)
    ```

### Phase 3: Cart & Checkout
1.  **Unique Identity**: The `CartContext` generates a unique ID for the item by hashing the selected options.
    * *Result*: "Shirt (Option: A)" and "Shirt (Option: B)" are treated as separate line items in the cart.
2.  **Persistance**:
    * On `POST /api/checkout`, the selected options are validated.
    * They are inserted into the `order_items.custom_options` column.

---

## 3. Visibility & Fulfillment

### Customer History
* **Order Receipt**: The `OrderReceipt` component parses the JSONB `custom_options` to display the choices and specific surcharges paid.
* **Account History**: The `OrderHistory` component displays a summary of options inline with the item list.

### Admin Fulfillment
* **Order Details**: The Admin Modal (`OrderDetailsModal`) reads the `custom_options` field.
* **Use Case**: The fulfillment team sees exactly what custom text to print or which wrapping paper to use directly on the order card.

---

## 4. JSON Structures Reference

### Rule Object (in `option_sets`)
```json
{
  "type": "category", // or 'product', 'collection', 'price', 'all'
  "value": "15",      // ID or threshold value
  "operator": "eq"    // 'eq', 'gt', 'lt' (for price)
}