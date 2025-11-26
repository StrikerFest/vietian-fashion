# Unified Catalog & Taxonomy System

Unlike traditional e-commerce platforms that separate "Categories" (Navigation) from "Attributes" (Filtering), this application uses a **Unified Taxonomy** stored in a single `categories` table.

This approach simplifies database management and allows the AI engine to query a single source of truth for semantic understanding.

## 1. The `categories` Table

The core of the system is the `categories` table, differentiated by a `type` column.

| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | BigInt | Unique Identifier. |
| `type` | Enum | **`catalog`** or **`attribute`**. Controls behavior. |
| `name` | Text | Display name (e.g., "Men", "Summer", "Red"). |
| `parent_id`| BigInt | Self-referencing FK. Defines hierarchy. |
| `slug` | Text | URL-friendly identifier (Unique). |
| `display_style` | Text | 'list', 'swatch', 'pill' (Mainly for Attributes). |
| `is_active` | Boolean | Hard toggle for visibility. |
| `start_date` | Timestamp | **Time-Fencing**: Auto-show after this date. |
| `end_date` | Timestamp | **Time-Fencing**: Auto-hide after this date. |

---

## 2. Type 1: Catalog Categories (`type = 'catalog'`)

These act as the **Navigation Structure** of the website (the "Menu").

* **Purpose:** Direct user navigation (e.g., Header links, Sidebar menus).
* **Hierarchy:**
    * **Root:** Items with `parent_id = NULL` (e.g., "Men", "Women").
    * **Children:** Items linking to a root (e.g., "Men" -> "Shirts", "Men" -> "Pants").
* **Frontend Behavior:**
    * Displayed in `Navbar.js` as dropdown menus.
    * Clicking a Catalog category navigates to `/categories/[slug]`.
* **Constraint:** A product usually belongs to **one** main Catalog Category for breadcrumb purposes, though the schema allows many-to-many.

## 3. Type 2: Attribute Categories (`type = 'attribute'`)

These act as **Product Filters** and **AI Tags**.

* **Purpose:** Filtering products (e.g., "Color", "Size", "Material", "Occasion").
* **Hierarchy:**
    * **Root (Group):** Defines the Filter Name (e.g., "Color", "Material").
    * **Children (Option):** Defines the selectable values (e.g., "Red", "Blue", "Cotton", "Silk").
* **AI Integration:**
    * The AI Recommendation Engine **only** looks at `type = 'attribute'`.
    * When a user searches "Red dress", the AI maps "Red" to the Attribute ID for "Red".
* **Display Styles:**
    * `list`: Standard checkbox list (Default).
    * `swatch`: Rendered as color circles (requires valid Hex in `value` column).
    * `pill`: Rendered as buttons (good for Sizes like S, M, L).

---

## 4. Collections (`collections` table)

Collections are **Marketing Groupings** completely separate from the Taxonomy.

* **Difference from Categories:**
    * *Categories* define **what** a product is (Shirt, Cotton).
    * *Collections* define **how** it is marketed (Summer Sale, Staff Picks, New Arrivals).
* **Behavior:**
    * Products can belong to infinite collections via `product_collections`.
    * Collections have their own SEO titles and descriptions.
    * **`is_featured`**: Flag to pin the collection to the Homepage Hero or Grid.
* **AI Integration:**
    * The AI can recommend a Collection if the user intent matches the Collection name/description (e.g., "Beach vibes" -> "Summer Collection").

---

## 5. Time-Fencing (Scheduling)

Both Categories and Attributes support automated visibility windows. This is critical for seasonal fashion retail.

**Logic (`app/api/categories/route.js`):**
The public API (`mode=public`) filters items using this logic:

```sql
WHERE is_active = true
AND (start_date IS NULL OR start_date <= NOW())
AND (end_date IS NULL OR end_date >= NOW())
```

Use Cases:

Flash Sale Category: Create a "Black Friday" category that automatically appears on Nov 24 and disappears on Nov 26.

Seasonal Filters: Create a "Winter Coats" catalog link that only exists from October to February.

6. Data Flow Example
Scenario: Admin creates a "Red Summer Dress".

Catalog: Admin assigns it to Women > Dresses (Type: Catalog).

Attributes:

Admin selects Color > Red (Type: Attribute).

Admin selects Season > Summer (Type: Attribute).

Admin selects Material > Linen (Type: Attribute).

Collection: Admin adds it to Summer 2025 (Collection).

User Search: "Linen dress for summer"

AI Analysis: Matches keywords "Linen" (Attribute), "Summer" (Attribute or Collection), "Dress" (Catalog keyword).

Result: Returns products intersecting these IDs.

# Note

- Check if the product variant connect to the variant_attributes and the product categories on the tag ( child of attribute ) being excess or redundant