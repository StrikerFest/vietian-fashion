# Database Schema & Architecture

This document outlines the data model powering the AI Fashion Store. The database is hosted on **Supabase (PostgreSQL)** and utilizes relational integrity, custom SQL functions (RPC), and the `pgvector` extension for AI features.

## 1. Core Commerce Entities

### `products`
The central catalog entity.
* **`id`**: BigInt (PK).
* **`name`**, **`description`**: Text content.
* **`status`**: 'draft', 'active', 'archived'.
* **`image_url`**: Main product display image.
* **`position`**: Integer for custom sorting.
* **`seo_title` / `seo_description`**: SEO metadata.
* **`deleted_at`**: Timestamp for Soft Deletes.

### `product_variants`
Represents the sellable SKU.
* **`id`**: BigInt (PK).
* **`product_id`**: FK to `products`.
* **`sku`**: Unique identifier.
* **`price`**: Base price.
* **Note**: Stock is tracked in `inventory_levels`. Attribute values (e.g., Size: L) are linked via `variant_attributes`.

### `inventory_levels`
Decouples stock quantity from the variant definition.
* **`variant_id`**: FK to `product_variants`.
* **`on_hand`**: Physical stock available.
* **`committed`**: Stock reserved in active carts (future-proofing).

---

## 2. Unified Taxonomy & AI

### `categories`
Handles both Navigation and Attributes.
* **`type`**: Enum (`'catalog'` or `'attribute'`).
* **`display_style`**: 'list', 'swatch', 'pill'.
* **`embedding`**: `vector(768)` for Semantic Search (Google text-embedding-004).
* **`start_date` / `end_date`**: Time-fencing for automated visibility.

### `collections`
Marketing groupings.
* **`slug`**: URL-friendly ID.
* **`is_featured`**: Featured status for homepage.
* **`embedding`**: `vector(768)` for Semantic Search.

### `tags`
* **`name`**: Simple keyword tagging for products.

---

## 3. Product Options (Customization)

### `option_sets`
Groups of custom fields applied dynamically.
* **`rules`**: JSONB defining logic (e.g., "Show on Category X").
* **`priority`**: Rendering order.

### `product_options`
The actual input definitions.
* **`type`**: 'text', 'radio', 'select', etc.
* **`price_modifier`**: Base surcharge for selecting this option.
* **`values`**: JSONB choices (e.g., `[{ "label": "Red", "price_modifier": 5 }]`).

---

## 4. Sales & Users

### `users`
Synced with Supabase Auth.
* **`id`**: UUID matching `auth.users`.
* **`is_admin`**: Boolean role flag.

### `addresses`
User shipping destinations.
* **`is_default`**: Boolean flag.

### `orders`
* **`status`**: 'pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'.
* **`total_amount`**, **`subtotal`**: Financial snapshots.

### `order_items`
* **`price_at_purchase`**: Snapshot price.
* **`custom_options`**: JSONB storing user customization choices.

### `wishlists`
Junction table for saved items.
* **`user_id`**, **`product_id`**.

### `reviews`
User-generated feedback.
* **`is_approved`**: Boolean for moderation.

---

## 5. Operations

### `suppliers` & `purchase_orders`
ERP-lite features for restocking.
* **`purchase_orders`** status: 'draft' -> 'ordered' -> 'received'.

### `inventory_adjustments`
Audit log for all stock changes (Orders, POs, Returns).

### `return_requests` & `return_items`
RMA system.
* **`status`**: 'pending', 'approved', 'rejected'.
* **`should_restock`**: Boolean flag for inventory logic.

### `settings`
Key-Value store for app configuration (`homepage_config`, `ai_search_limits`).