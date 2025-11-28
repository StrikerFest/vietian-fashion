# AI Recommendation Engine Architecture

The search engine uses a **RAG (Retrieval-Augmented Generation)** pattern powered by Google Gemini and Supabase Vector Search.

## 1. The Pipeline

**Code Reference:** `app/api/recommendations/route.js`

1.  **Input Analysis**: User query (e.g., "Dress for a beach wedding") is received.
2.  **Embedding Generation**:
    * The query is sent to Google's **`text-embedding-004`** model.
    * Returns a 768-dimensional vector.
3.  **Vector Search (Retrieval)**:
    * The system calls `match_collections` and `match_categories` RPC functions in Supabase.
    * It finds the top 20 semantic matches from the database (e.g., matching "beach" to "Summer Collection" and "wedding" to "Formal").
4.  **Prompt Construction**:
    * The matched Categories and Collections are injected into a system prompt.
    * Example: *"Here are the available attributes: [ID: 5, Name: Summer], [ID: 9, Name: Formal]..."*
5.  **LLM Decision (Generation)**:
    * **Model**: **`gemini-2.5-flash`**.
    * The LLM selects the specific IDs that best match the intent and generates generic text tags.
6.  **Hybrid Filtering**:
    * The system executes a final SQL query:
        * Filter by `collection_id` IN (LLM selected IDs).
        * Filter by `category_id` IN (LLM selected IDs).
        * Keyword match on `products.name` using LLM generated tags.

## 2. Configuration (`settings` table)

Admins can tweak the engine without code changes via the `/admin/settings` page.

* **`ai_search_attributes`**: Controls which input fields appear in the UI modal (e.g., "Occasion", "Budget").
* **`ai_search_limits`**: Controls the result density.
    * `products`: Max products to return (Default: 8).
    * `collections`: Max collections to suggest.
    * `attributes`: Max filters to suggest.

## 3. Product Tagging & Description
* **Tagging**: `app/api/generate-tags` uses Gemini Vision to analyze product images and auto-assign attributes based on the defined taxonomy.
* **Description**: `app/api/generate-description` generates SEO-friendly copy based on the product image.