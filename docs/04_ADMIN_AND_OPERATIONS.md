# Admin Panel & Operations

## 1. Dashboard Overview
The Admin Panel is located at `/admin` and is built using a dedicated layout (`app/admin/layout.js`). It provides a centralized hub for managing the entire e-commerce lifecycle.
* **Navigation**: `components/admin/AdminSidebar.js` provides access to Products, Orders, Customers, Inventory, and Settings.
* **Analytics**: The dashboard home (`app/admin/page.js`) features high-level metrics (Total Sales, Orders) and visualizes data using `components/admin/SalesChart.js`.

## 2. Inventory Management
The system uses a transactional inventory model rather than simple static counters.

### Core Logic
* **Tracking**: `inventory_levels` table tracks `on_hand` and `committed` stock for every variant.
* **Adjustments**: Stock is never just "overwritten". All changes are logged via the `inventory_adjustments` table (Audit Trail).
* **Operations**:
    * **Manual Adjustment**: Admins can manually add/remove stock via `components/admin/InventoryAdjustForm.js`, which requires a "Reason" for the audit log.
    * **Purchase Orders**: The system supports a B2B flow (`app/admin/purchase-orders`) to order stock from `suppliers`. When a Purchase Order is "Received", inventory increases automatically.
    * **Sales**: Stock is committed/decremented upon order placement (handled via API/SQL triggers).

## 3. Order Processing
* **Lifecycle**: Orders move through `pending` -> `paid` -> `shipped` -> `delivered`.
* **Management**:
    * **View**: `components/admin/OrderDetailsModal.js` shows line items, customer info, and payment status.
    * **Export**: `components/admin/OrderExport.js` allows dumping order data to CSV for external accounting.
* **Returns (RMA)**:
    * Admins manage returns via `app/admin/returns/page.js`.
    * **Approval Logic**: The database function `approve_return_request` is a critical operational tool. When an admin approves a return with `should_restock = true`:
        1.  Inventory is automatically incremented.
        2.  An audit log entry is created.
        3.  The Order status is updated to `refunded` or `partially-refunded`.

## 4. Product & Catalog Operations
* **CRUD**: Full management via `components/admin/ProductForm.js` including multi-image uploads and variant generation.
* **Bulk Operations**:
    * **Import/Export**: `app/api/products/bulk-import` and `bulk-export` allow for mass updates using CSV files, managed by `components/admin/ProductImportExport.js`.
* **Option Sets**: Admins define reusable size/color charts in `app/admin/options/page.js`. These are dynamically applied to products based on matching rules (e.g., "Apply 'Adult Sizes' to all items in category 'Shirts'").

## 5. System Settings
Configuration is managed dynamically without code changes via `app/admin/settings/page.js`, which writes to the `settings` table:
* **Tax**: Configure rates and rules.
* **Shipping**: Manage carriers and costs.
* **AI Prompts**: Tune the system prompts used for product description generation.