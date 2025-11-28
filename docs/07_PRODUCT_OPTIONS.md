# Product Options & Customization

This feature enables custom inputs (Embroidery, Gift Wrap, Size specific info) injected dynamically into product pages.

## 1. Schema
* **`option_sets`**: Groups of options.
    * **`rules`**: JSON logic determining visibility (e.g., `IF Category = 'Shirts'`).
* **`product_options`**: The inputs.
    * **`type`**: `text`, `textarea`, `select`, `radio`, `checkbox_button`.
    * **`price_modifier`**: Base cost for this option.
    * **`values`**: JSON array for choices. Each choice can have its own `price_modifier` (e.g., "Premium Paper +$5").

## 2. Runtime Logic
**Frontend:** `components/product/ProductOptions.js`
1.  Fetches valid option sets based on the Product ID and Price.
2.  Renders inputs. Validates `is_required`.
3.  Calculates visual price: `Base Product + Option Base Modifier + Choice Modifier`.

**Backend:** `utils/server-pricing.js`
1.  Receives selected options during checkout.
2.  Fetches the Option definitions from DB.
3.  **Security**: Verifies that the option exists and the selected choice is valid.
4.  Re-calculates the total price serverside to prevent tampering.

## 3. Order Persistence
Selected options are stored in `order_items.custom_options` as a JSON blob:
```json
{
  "101": {
    "label": "Engraving",
    "value": "Happy Birthday",
    "priceModifier": 10.00
  }
}