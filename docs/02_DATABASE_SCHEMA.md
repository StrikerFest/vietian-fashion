# Database Schema & Data Models

## 1. Overview
The database is hosted on PostgreSQL via Supabase. It utilizes modern extensions like `pgvector` for AI features and `pg_graphql`. Security is managed via Row Level Security (RLS) policies.

## 2. Core Entities

### Product Catalog
* **`products`**: The central entity containing base details (name, description, SEO).
* **`product_variants`**: specific SKUs associated with a product (price, SKU).
* **`categories`**: Hierarchical structure. Supports two types:
    * `catalog`: Standard navigation categories.
    * `attribute`: Used for filtering (e.g., "Material", "Style") and AI matching.
* **`option_sets`** & **`product_options`**: Defines configurable options (Size, Color) and rules for when they apply.
* **`collections`**: Curated groups of products (featured, seasonal).

### Inventory & Supply Chain
* **`inventory_levels`**: Tracks `on_hand` and `committed` stock per variant.
* **`suppliers`**: Vendor information.
* **`purchase_orders`** & **`purchase_order_items`**: Manages stock replenishment from suppliers.
* **`inventory_adjustments`**: Audit log for all stock changes (Manual adjustments, Returns).

### Sales & Orders
* **`orders`**: Main transactional record. Statuses: `pending`, `paid`, `shipped`, `delivered`, `cancelled`, `refunded`.
* **`order_items`**: Line items linked to specific variants. Snapshots `price_at_purchase`.
* **`return_requests`** & **`return_items`**: Handles the RMA process. Linked to specific order items.

### User Management
* **`users`**: Extends the default Supabase `auth.users` with profile data (first name, last name).
* **`user_roles`**: Defines permissions (e.g., 'admin').
* **`addresses`**: User shipping/billing addresses.
* **`wishlists`**: Saved products for users.

## 3. Key Stored Procedures

The database handles complex business logic directly via PL/pgSQL functions to ensure data integrity:

* **`approve_return_request(request_id, notes)`**:
    * Validates the return request.
    * Updates the return status to 'approved'.
    * Automatically restocks inventory if `should_restock` is true.
    * Logs the adjustment in `inventory_adjustments`.
    * Updates the parent order status (Refunded/Partially Refunded).
* **`get_applicable_option_sets(product_id, variant_id)`**:
    * Dynamic logic to find which Size/Color charts apply to a product based on its category, collection, or price rules.
* **`search_products_by_tags(tag_names)`**:
    * Performs an advanced search by matching input tags against `attribute` type categories.
* **`handle_new_user()`**:
    * Trigger that automatically creates a public profile in `public.users` whenever a new user signs up via Supabase Auth.

## 4. Vector & AI Integration
* **Embeddings**: The `categories` and `collections` tables contain an `embedding` column (vector type, 768 dimensions).
* **Matching**: Functions `match_categories` and `match_collections` allow for semantic similarity search using cosine distance (`<=>` operator).

## 5. Security Policies (RLS)
* **Public Read**: Catalog data (Products, Categories, Reviews) is generally readable by everyone.
* **Admin Full Access**: Policies restrict `INSERT/UPDATE/DELETE` on core catalog and inventory tables to users with the 'admin' role in `user_roles`.
* **User Privacy**: Users can only view/edit their own Addresses, Orders, and Wishlists.