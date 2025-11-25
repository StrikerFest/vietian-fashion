# AI Recommendation Engine Architecture

The core differentiator of this platform is its **Semantic Search Engine**. Instead of relying on strict keyword matching (like standard SQL `LIKE %query%`), it uses Generative AI (Gemini) to understand *intent* and map it to the store's specific inventory structure.

## 1. Architecture Overview

The recommendation flow follows a **RAG-lite (Retrieval-Augmented Generation)** pattern. We don't just ask the AI "What should I buy?"; we give it a map of our store first.

### The Pipeline
1.  **User Input:** User types "Beach wedding outfit" (or selects constraints via UI).
2.  **Context Fetching:** Server fetches active **Collections** and **Attribute Categories** from the DB.
3.  **Prompt Assembly:** Server constructs a prompt containing:
    * The User's Query.
    * The list of available Collections (ID + Name).
    * The list of available Attributes (ID + Name + Group).
4.  **AI Analysis (Gemini):** The model analyzes the input against the provided lists.
5.  **Structured Response:** Gemini returns a JSON object containing:
    * `searchTags`: A list of keywords for fuzzy product matching.
    * `collectionIds`: IDs of the most relevant collections.
    * `attributeIds`: IDs of the most relevant filter categories.
6.  **Data Resolution:**
    * **Products:** Fetched via `search_products_by_tags` (RPC).
    * **Entities:** Full Collection/Attribute objects fetched by ID.
7.  **Response:** Frontend receives a unified payload of Products + Recommended Categories.

---

## 2. Prompt Engineering Strategy

The system instruction (in `app/api/recommendations/route.js`) is critical. It forces the LLM to act as a **Classifier**, not just a text generator.

### Key Prompt Elements:
* **Role Definition:** "You are a smart fashion shopping assistant."
* **Constraint Injection:** "Specific Constraints: Season: Summer". This ensures UI filters are respected.
* **Dynamic Context:** We inject the *actual* database IDs into the prompt:
    ```text
    Available Collections:
    ID: 10, Name: "Summer Vibes"
    ID: 12, Name: "Office Wear"
    ```
* **Output Enforcement:** "Return ONLY valid JSON". This prevents markdown chatter ("Here are your results...").

---

## 3. The `search_products_by_tags` Function

While Collections and Attributes are matched by ID (exact match), individual products are matched via **Semantic Tagging**.

**Logic:**
1.  The AI generates tags: `['summer', 'linen', 'formal']`.
2.  The database function (`RPC`) joins products to their **Attributes**.
3.  It performs a case-insensitive match (`ILIKE ANY`) between the AI tags and the Attribute Names.
4.  **Ranking:** Products are ordered by the *count* of matching attributes. A product that matches "Summer" AND "Linen" ranks higher than one matching only "Summer".

```sql
-- Simplified Logic
SELECT p.*, COUNT(c.id) as matches
FROM products p
JOIN product_categories pc ON p.id = pc.product_id
JOIN categories c ON pc.category_id = c.id
WHERE c.type = 'attribute' AND c.name ILIKE ANY(ai_generated_tags)
GROUP BY p.id
ORDER BY matches DESC;

```

4. Configuration & Limits
   To prevent the AI from hallucinating too many results or overwhelming the UI, the system is governed by dynamic settings stored in the settings table.

ai_search_limits
A JSON object controlling the response size.

products: Max number of products to return (Default: 8).

collections: Max number of collections to suggest (Default: 1).

attributes: Max number of category filters to suggest (Default: 1).

Why dynamic? You can tweak these numbers in the Admin > Settings panel without deploying new code. For example, during a sale, you might want to show 12 products instead of 8.

ai_search_attributes
A JSON array defining which "Prompt Fields" appear in the Frontend AI Modal.

Example: ['Season', 'Occasion', 'Budget'].

This allows the Admin to define what "dimensions" the AI should pay attention to.

5. Nuances & Edge Cases
   "Zero Results" Handling
   If the AI returns tags that don't match any database attributes (e.g., "Cyberpunk" when you sell "Cottagecore"), the RPC function will return 0 products.

Frontend Fallback: The UI displays the matched Collections or Categories even if product results are empty, ensuring the user doesn't hit a dead end.

Token Limits
We send the entire list of Attributes and Collections to Gemini.

Current Scale: With < 500 categories, this is negligible cost/token usage.

Future Scale: If you have 10,000 categories, this approach will break context limits. Solution: Implement a Vector Store (Embeddings) search for categories first, then pass only top candidates to the LLM.

Synonym Handling
Gemini handles synonyms automatically.

User Input: "Joggers"

DB Attribute: "Sweatpants"

Result: Gemini sees "Sweatpants" in the list and correctly maps "Joggers" to the ID for "Sweatpants" because it understands they are semantically related.