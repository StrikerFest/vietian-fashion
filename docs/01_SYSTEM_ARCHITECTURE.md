# System Architecture & Tech Stack

## 1. Project Overview
**Vietian Fashion** is a modern e-commerce platform built with a focus on AI-driven discovery and a robust Next.js App Router architecture. It features a comprehensive customer storefront, a secure admin dashboard, and integrated inventory management.

## 2. Technology Stack

### Core Framework
* **Framework**: Next.js 15.5 (App Router)
* **UI Library**: React 19.1
* **Styling**: Tailwind CSS 4
* **Language**: JavaScript (ES6+ Modules)

### Backend & Database
* **Platform**: Supabase (BaaS)
* **Database**: PostgreSQL
* **Auth**: Supabase Auth (with SSR helpers)
* **Vector Search**: `pgvector` extension for AI capabilities

### AI & Integration
* **AI Model**: Google Generative AI (`@google/generative-ai`)
* **Utilities**: `papaparse` (CSV handling), `recharts` (Analytics charts), `date-fns` (Date formatting).

## 3. Directory Structure

The project follows the standard Next.js App Router structure:

* **`app/`**: Contains all route segments and pages.
    * **`(public)`**: Standard storefront routes (`/`, `/cart`, `/products`).
    * **`admin/`**: Protected administration panel (`/admin/dashboard`, `/admin/inventory`).
    * **`account/`**: Authenticated customer user area.
    * **`api/`**: Server-side route handlers for backend logic.
* **`components/`**: Reusable UI blocks.
    * **`admin/`**: Components specific to the dashboard (e.g., `SalesChart`, `ProductForm`).
    * **`home/`**: Landing page sections (`HeroCarousel`, `FeedSection`).
    * **`product/`**: Product display logic (`ProductGallery`, `VariantSelector`).
    * **`ui/`**: Generic UI elements (`PaginationControls`).
* **`context/`**: React Context providers for global state.
    * `AuthContext`, `CartContext`, `WishlistContext`, `ToastContext`.
* **`lib/`**: External client initializations (e.g., `supabaseClient.js`).
* **`utils/`**: Helper functions for specific domains (AI prompts, inventory logic, formatting).

## 4. Key Application Layers

### Frontend Layer
Built on **React Server Components (RSC)** where possible for performance, with Client Components used for interactivity (forms, cart management). The root layout uses a client-side `Providers` wrapper to handle context while maintaining server-side metadata.

### Data Layer (Supabase)
* **Direct Access**: The frontend interacts directly with Supabase for public read operations (fetching products).
* **API Routes**: Sensitive write operations (Checkout, Admin updates) are handled via Next.js API routes (`app/api/*`) to enforce stricter validation and business logic.

### AI Layer
The system utilizes vector embeddings stored in the `categories` and `collections` tables to power recommendation engines and semantic search, interfaced via Google's Generative AI SDK.