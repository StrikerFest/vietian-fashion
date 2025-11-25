# Admin Panel & System Configuration

This document details the administrative infrastructure, including the custom authentication implementation, dynamic system settings, and email template management.

## 1. Admin Authentication Architecture

The application uses a **Dual-Auth Strategy** to strictly separate Customer sessions from Admin sessions.

### The Security Model
* **Customers:** Use standard Supabase Auth cookies (`sb-access-token`) managed by the `AuthContext`.
* **Admins:** Use a custom `AdminAuthContext` that layers on top of Supabase Auth but relies on **Local Storage** for session persistence.

### The Login Flow (`context/AdminAuthContext.js`)
1.  **Credentials Check:** Admin submits email/password to `supabase.auth.signInWithPassword`.
2.  **Role Verification:**
    * Immediately calls the database function `get_user_role()` (RPC).
    * Checks the `user_roles` table.
    * **Constraint:** If the role is NOT `'admin'`, the system immediately signs the user out and throws an "Access Denied" error.
3.  **Session Isolation:**
    * If valid, the session token is stored in `localStorage` under `supabase.admin.session`.
    * **Critical:** The system calls `supabase.auth.signOut()` on the global scope to prevent this admin session from interfering with the storefront (Customer) context. This allows an Admin to test the store as a "Guest" in the same browser while logged into the Admin panel.

### Route Protection (`app/admin/layout.js`)
* The Admin Layout wraps all children in `AdminAuthGuard`.
* It checks `localStorage` on mount. If no valid admin session is found, it redirects to `/admin/login`.
* `middleware.js` provides a secondary layer of protection for API routes starting with `/api/admin`.

---

## 2. Dynamic System Settings

To avoid code deployments for simple configuration changes, the system uses a persistent `settings` table.

### Schema (`public.settings`)
* **`key`** (Text, PK): Unique identifier (e.g., `ai_search_limits`).
* **`value`** (JSONB): The configuration data.
* **`description`**: Context for other developers/admins.

### Key Configurations
1.  **`ai_search_attributes`**:
    * **Type:** Array of Strings.
    * **Purpose:** Defines which Attribute Groups (e.g., "Season", "Material") appear as input fields in the AI Search Modal on the homepage.
    * **Managed via:** Admin > Settings > Recommendation Tab.

2.  **`ai_search_limits`**:
    * **Type:** JSON Object (`{ products: 8, collections: 2, attributes: 2 }`).
    * **Purpose:** Controls the "Density" of the search results page. Determines how many products vs. category suggestions are returned by the AI.

### Usage Pattern
* **Frontend:** Fetches settings via `GET /api/settings?key=...`.
* **Backend:** API routes read these keys to adjust logic dynamically (e.g., limiting the SQL query result size).

---

## 3. Email Template System

The system includes a built-in CMS for transactional emails, allowing copy changes without engineering support.

### Schema (`public.email_templates`)
* **`type`** (Text): The trigger identifier (e.g., `order_confirm`, `wishlist_sale`).
* **`subject`** (Text): Email subject line.
* **`body_html`** (Text): Full HTML content.
* **`is_active`** (Boolean): Master toggle.

### Variable Injection System
Templates support handlebars-style variable replacement `{{variable_name}}`.

| Template Type | Trigger Source | Available Variables |
| :--- | :--- | :--- |
| **`order_confirm`** | Checkout Success | `{{customer_name}}`, `{{order_id}}`, `{{total_amount}}` |
| **`wishlist_sale`** | Admin Product Page | `{{customer_name}}`, `{{product_name}}`, `{{discount_text}}` |
| **`marketing`** | Manual Campaigns | `{{customer_name}}` |

### Sending Infrastructure
* **Provider:** **Resend** (via `resend` Node.js SDK).
* **API Route:** `app/api/admin/notify-wishlist` (example).
* **Logic:**
    1.  Fetch template from DB.
    2.  Perform string replacement on `body_html`.
    3.  Dispatch via Resend.

---

## 4. Access Control Summary

| Area | Access Level | Mechanism |
| :--- | :--- | :--- |
| **Storefront** | Public / Customer | Standard Supabase Cookie Auth |
| **`/admin/*` Pages** | Admin Only | `AdminAuthContext` (LocalStorage + Role Check) |
| **`/api/admin/*`** | Admin Only | Middleware + Session Role Verification |
| **`/api/account/*`** | Customer Only | Session User ID Match |