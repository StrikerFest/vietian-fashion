# Order & Inventory Lifecycle

This document traces the complete lifecycle of a transaction, detailing how the system maintains inventory integrity through checkouts, cancellations, and returns.

## 1. The Checkout Process

The checkout flow ensures we never oversell items. It is handled atomically in `app/api/checkout/route.js`.

### Step 1: Validation
When the frontend calls `POST /api/checkout`:
1.  **Stock Check:** The server queries `inventory_levels` for all requested Variant IDs.
2.  **Calculation:** It calculates `Available = on_hand - committed`.
3.  **Constraint:** If `Available < Quantity Requested`, the request is rejected immediately with a 400 error listing the specific item that is out of stock.

### Step 2: Transaction
If validation passes:
1.  **Order Creation:** A new record is inserted into `orders` with status `paid`.
2.  **Line Items:** Records are inserted into `order_items` snapshotting the `price_at_purchase`.
3.  **Inventory Decrement:**
    * The system iterates through items and calls `updateInventory()`.
    * **Action:** `inventory_levels.on_hand` is reduced by the quantity.
    * **Audit:** A record is added to `inventory_adjustments` with reason "Order #123 placed".

---

## 2. Inventory Management Strategy

We use a **Perpetual Inventory System** where `on_hand` reflects the physical reality in the warehouse.

### The `updateInventory` Helper (`utils/inventory.js`)
This utility function is the single gateway for all stock changes to ensure audit trails are never missed.

* **Inputs:** `variantId`, `quantityChange` (+/-), `reason`, `userId`.
* **Logic:**
    1.  Fetches current level.
    2.  Calculates new level.
    3.  Performs `UPSERT` on `inventory_levels`.
    4.  `INSERT` into `inventory_adjustments`.

### Inbound Stock (Purchase Orders)
Located in `app/api/admin/purchase-orders/[id]/route.js`.
1.  Admin creates a PO (Status: `draft`).
2.  Admin marks PO as `ordered` (No stock change).
3.  Admin marks PO as `received`:
    * The system iterates through PO items.
    * Calls `updateInventory` with **positive** quantity.
    * Audit Reason: "Purchase Order #5 received".

---

## 3. Returns & Refunds (RMA)

The return process involves a state machine that governs both the financial and physical status of an order.

### Phase 1: Request (Customer)
* **Endpoint:** `POST /api/returns`
* **Action:** User selects specific items from a delivered order.
* **Result:** Creates `return_requests` (Status: `pending`) and `return_items`. Inventory is **unchanged**.

### Phase 2: Adjudication (Admin)
* **Endpoint:** `PUT /api/returns/[id]`
* **Action:** Admin reviews the request and reason.

#### Option A: Reject
* Updates `return_requests.status` to `rejected`.
* End of workflow.

#### Option B: Approve
This triggers the `approve_return_request` Database Function (RPC) defined in `schema.sql`. This ensures data integrity within a single transaction block.

**The RPC Logic:**
1.  **Status Update:** Sets request to `approved`.
2.  **Restocking Loop:**
    * Checks `return_items.should_restock` (Admin configurable boolean).
    * If `true`: Increments `inventory_levels.on_hand`.
    * Writes to `inventory_adjustments` (Reason: "Return Request #9").
3.  **Order Update:**
    * Increments `order_items.returned_quantity`.
    * Calculates if the *entire* order was returned.
    * Sets parent `orders.status` to `refunded` (full) or `partially-refunded`.

---

## 4. Order Cancellation

An admin (or potentially a user, if enabled) can cancel an order *before* it is shipped.

* **Endpoint:** `PUT /api/orders/[id]`
* **Condition:** Status must be `pending` or `paid` (not `shipped`).
* **Logic:**
    1.  Sets `orders.status` = `cancelled`.
    2.  **Restock:** Iterates order items and calls `updateInventory` to add the items back.
    3.  **Audit:** Log reason "Order #123 cancelled".

---

## 5. Data Integrity Summary

| Action | Inventory Impact | Audit Log Reason |
| :--- | :--- | :--- |
| **Checkout** | Decrement (-) | "Order #ID placed" |
| **Cancel Order** | Increment (+) | "Order #ID cancelled" |
| **Receive PO** | Increment (+) | "Purchase Order #ID received" |
| **Approve Return**| Increment (+) | "Return Request #ID" |
| **Manual Adjust**| +/- | "Damaged", "Audit", etc. (Admin input) |