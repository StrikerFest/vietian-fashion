# Frontend Architecture (Next.js App Router)

This project is built on **Next.js 14** using the **App Router** architecture.

## 1. Folder Structure (`/app`)
* **`(shop)`**: The root route group. Contains public pages (`page.js`, `products/`, `cart/`).
* **`admin/`**: The Administrative portal. Protected by `AdminAuthGuard`.
* **`account/`**: Customer dashboard. Protected by standard `middleware`.
* **`api/`**: Next.js Route Handlers (The Backend API).

## 2. State Management (Contexts)
We use React Context for global client-side state, wrapped in `app/providers.js`.

* **`AuthContext`**: Wraps Supabase Auth. Provides `session` and `user` objects.
* **`AdminAuthContext`**: Specialized auth for the admin panel (Role verification + LocalStorage persistence).
* **`CartContext`**:
    * Manages local cart state (LocalStorage persistence).
    * Handles complex line items (Product + Variant + Custom Options).
    * Calculates totals and discounts client-side (for display).
* **`WishlistContext`**: Manages user favorites using Optimistic UI updates.
* **`ToastContext`**: Global notification system.

## 3. Key Components
* **`ProductCard`**: Reusable component for grids. Handles "Quick View" triggers.
* **`QuickViewModal`**: A portal-based modal fetching product details via AJAX.
* **`PaginationControls`**: Reusable component for server-side pagination (manages URL params `?page=X&limit=Y`).
* **`AdminSidebar`**: Navigation for the Admin panel.

## 4. Styling
* **Tailwind CSS**: Used for all styling (`app/globals.css`).
* **Responsive Design**: Mobile-first approach. Navbar includes a collapsible mobile menu.

## 5. Deployment
* **Vercel**: Optimized for Vercel deployment.
* **Environment Variables**:
    * `NEXT_PUBLIC_SUPABASE_URL`
    * `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    * `GEMINI_API_KEY` (Server-side only)
    * `RESEND_API_KEY` (Server-side only)