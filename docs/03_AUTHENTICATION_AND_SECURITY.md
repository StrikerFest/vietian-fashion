# Authentication & Security

## 1. Authentication Strategy
The application uses **Supabase Auth** as the identity provider, supporting both traditional email/password logins and OAuth providers (Google).

### Client-Side Authentication
* **User Context**: Managed via `context/AuthContext.js`. It provides the `user` object and `signOut` methods to the storefront.
* **Admin Context**: Managed via `context/AdminAuthContext.js`. This acts as a separate layer to ensure admin sessions are verified against the `user_roles` table immediately upon loading.
* **Ghost/Guest Users**: The system supports guest checkout. A specialized route `app/api/auth/claim-ghost` exists to convert a guest's temporary session/data into a permanent account.

### Server-Side Authentication
* **Middleware Protection**: `middleware.js` intercepts every request.
    * **Refresh**: It ensures the Supabase session is active.
    * **Route Guards**:
        * `/admin/*`: Strictly checks if the user exists AND if `get_user_role()` returns 'admin'.
        * `/account/*`: Checks if the user is logged in.
    * **Redirects**: Unauthorized users are redirected to the appropriate login page (`/login` or `/admin/login`).

## 2. Role-Based Access Control (RBAC)
The system implements a strict separation between "Customers" and "Admins" using a custom RBAC implementation on top of Supabase Auth.

### Database Roles
* **Table**: `public.user_roles`
* **Function**: `get_user_role()` is a security-definer function (runs with elevated privileges) used by the Middleware and RLS policies to verify if the current user is an admin.

### Row Level Security (RLS) Policies
Data security is enforced at the database level. Even if the API is exposed, data remains secure.
* **Admin Full Access**: Policies like "Admin full access products" or "Admin full access orders" grant `ALL` privileges (SELECT, INSERT, UPDATE, DELETE) to users with the 'admin' role.
* **User Privacy**:
    * **Orders**: `Users view own orders` ensures users can only SELECT rows where `user_id` matches their Auth UID.
    * **Addresses**: `Users manage addresses` allows full control only over their own address records.
* **Public Data**: Products, Categories, and approved Reviews are readable by `anon` (unauthenticated) users.

## 3. Data Integrity & Privacy
* **User Synchronization**: A database trigger `handle_new_user` automatically copies new Supabase Auth users into the public `users` table, ensuring the application always has a profile record to link orders to.
* **Secure API Routes**: All API handlers in `app/api/admin/*` perform a secondary check of the user's role before processing any data, acting as a second line of defense behind the Middleware.