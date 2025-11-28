# Order & Inventory Lifecycle

## 1. The Checkout Transaction
**Endpoint:** `POST /api/checkout`

This is a critical, multi-step operation:
1.  **Stock Validation**: Checks `inventory_levels` for all items.
2.  **Price Recalculation**: Server validates all prices (see Commerce Logic).
3.  **Order Creation**: Creates `orders` record.
4.  **Item Snapshot**: Creates `order_items` with `price_at_purchase` and `custom_options` JSON.
5.  **Inventory Decrement**:
    * Calls `updateInventory()` helper.
    * Uses `RPC decrement_inventory` for atomic safety (prevents race conditions).
    * Logs to `inventory_adjustments`.
6.  **Email**: Sends confirmation via Resend.

## 2. Inventory Management
**File:** `utils/inventory.js`

* **Single Source of Truth**: All stock changes go through `updateInventory`.
* **Audit Trail**: Every change requires a `reason` (e.g., "Order #123", "Restock PO #50").
* **Restocking**:
    * **Purchase Orders**: Receiving a PO increments stock.
    * **Returns**: Admin approval triggers the `approve_return_request` RPC function.

## 3. Return Logic (RMA)
**Endpoint:** `api/returns/[id]`

The `approve_return_request` Database Function handles complex logic atomically:
1.  Updates Request Status -> `approved`.
2.  Loops through return items.
3.  If `should_restock` is true:
    * Increments `inventory_levels`.
    * Writes to `inventory_adjustments`.
4.  Updates `order_items.returned_quantity`.
5.  Calculates if the order is fully or partially refunded and updates `orders.status`.