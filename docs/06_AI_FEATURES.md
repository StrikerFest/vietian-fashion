# AI & Vector Search Architecture

## 1. Overview
Vietian Fashion uses a hybrid search approach combining traditional keyword matching with semantic vector search. The AI core is built on **Google Generative AI (Gemini)** and **Supabase Vector**.

## 2. Semantic Search Engine
The search API (`app/api/recommendations/route.js`) handles complex user queries (e.g., "Outfit for a winter wedding").

### Step 1: Embedding
* **Model**: `text-embedding-004`.
* **Process**: The user's query (and selected attributes) is converted into a 768-dimensional vector.

### Step 2: Vector Retrieval (RAG)
* **Target**: The system searches `collections` and `categories` (attributes) tables using Cosine Similarity (`<=>`).
* **Threshold**: A low threshold (`0.15`) is used to gather a broad pool of "Candidate" collections/attributes that *might* be relevant.

### Step 3: LLM Filtering (The "Reasoning" Layer)
* **Model**: `gemini-2.5-flash`.
* **Logic**: The system constructs a prompt containing the User Query and the list of Candidate Collections/Attributes.
* **Task**: The LLM decides which candidates are actually relevant based on semantic understanding (e.g., mapping "winter" to "Jackets" and "Coats").
* **Output**: A structured JSON object containing refined `searchTags`, `collectionIds`, and `attributeIds`.

### Step 4: Product Resolution
* **Function**: `search_products_by_tags`.
* **Execution**: The refined tags from the LLM are used to query the Product Catalog using Postgres full-text search and attribute matching.

## 3. Generative Content (Computer Vision)
The system assists admins in digitizing products via `app/api/generate-tags/route.js`.

### Image Analysis
1.  **Input**: Admin uploads a raw product image.
2.  **Context**: The system feeds the image + current list of available attributes (e.g., Color, Material lists) to Gemini.
3.  **Prompting**: Uses `DEFAULT_TAGS_PROMPT` to instruct the AI to "Tag this image using ONLY the provided attribute lists where possible."
4.  **Result**: Returns a JSON object of tags (e.g., `{"Color": ["Blue"], "Material": ["Denim"]}`) which pre-fills the Admin Product Form.

## 4. Configuration
* **Prompt Tuning**: Prompts are stored in the database (`settings` table) or fallback to code constants in `utils/ai-prompts.js`. This allows admins to tweak the AI's "personality" without deploying code.
* **Limits**: The number of results returned by AI search is configurable via the `ai_search_limits` setting.