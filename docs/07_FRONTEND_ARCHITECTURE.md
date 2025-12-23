# Frontend Architecture

## 1. Core Framework & Principles
The application is built on **Next.js 15.5** using the **App Router** architecture. It strictly adheres to modern React 19 patterns.

* **Rendering Strategy**:
    * **Server Components (RSC)**: Used by default for all "Page" components (`page.js`, `layout.js`) to fetch data directly from Supabase/APIs. This ensures fast First Contentful Paint (FCP) and SEO.
    * **Client Components**: Marked with `'use client'`. Used only for interactive islands (Carousels, Add to Cart buttons, Forms).
* **Styling**: **Tailwind CSS 4** is used for utility-first styling. Global styles and animations are defined in `app/globals.css`.

## 2. Directory Structure & Routing
The `app/` directory uses Route Groups and Dynamic Segments to organize the application:

### Route Groups
* **(public)**: The storefront (Home, Products, Cart). These pages share the main `Navbar` and `Footer`.
    * `app/page.js`: Landing page.
    * `app/products/[id]/page.js`: Dynamic product detail page (SSR).
* **admin**: The dashboard. Uses a distinct layout (`app/admin/layout.js`) that replaces the public Navbar with the `AdminSidebar`.
* **account**: Authenticated customer area. Protected by Middleware.

### Dynamic Routing
* `[slug]`: Used for Collections (e.g., `/collections/summer-sale`).
* `[...slug]`: Catch-all route for hierarchical Categories (e.g., `/categories/men/shirts`).

## 3. Component Hierarchy (`/components`)

### Atomic Design Approach
* **`ui/`**: Base elements.
    * `PaginationControls.js`: Reusable pagination logic.
* **`shared/`**: Business-agnostic complex components.
    * `VietnamAddressForm.js`: Handles the logic for City/District/Ward selection.
* **`product/`**: Product-specific display logic.
    * `ProductCard.js`: The primary display unit in grids.
    * `ProductGallery.js`: Interactive image slider (Client Component).
    * `VariantSelector.js`: Handles complex Option/Variant logic (Size, Color).
* **`cart/`**: Shopping cart specific components.
    * `CartItemList.js` & `CartSummary.js`: Break down the cart page logic.

## 4. State Management

### Server State
Data fetching is primarily handled in Server Components using `await supabase...` directly. This eliminates the need for `useEffect` data fetching in most cases.

### Client State (Context API)
Global client-side state is managed via React Context providers, wrapped in `app/providers.js`:

1.  **`AuthContext`**: Wraps Supabase Auth. Provides `user`, `loading`, and `signOut`.
2.  **`CartContext`**:
    * Persists cart data to `localStorage`.
    * Calculates totals (Subtotal, Discount, Grand Total).
    * **Key Feature**: Generates unique IDs for items based on `VariantID + Hash(SelectedOptions)` to allow different configurations of the same product.
3.  **`WishlistContext`**: Syncs liked items between LocalStorage (guest) and Database (user).
4.  **`ToastContext`**: Provides a global `addToast()` function for non-blocking notifications.

## 5. Performance Optimizations
* **Fonts**: `next/font/google` (Inter) automatically optimizes and hosts font files.
* **Images**: `next/image` is used for all product photos to handle lazy loading and format conversion (WebP).
* **Suspense**: Used in loading states (e.g., `loading.js` files) to show skeletons while data fetches.