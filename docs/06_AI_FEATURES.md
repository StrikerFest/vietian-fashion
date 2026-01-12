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
The system assists admins in digitizing products via `app/api/generate-tags` and `app/api/products/generate` (Bulk Import).

### Image Analysis
1.  **Input**: Admin uploads a raw product image.
2.  **Context**: The system feeds the image + current list of available attributes (e.g., Color, Material lists) to Gemini.
3.  **Prompting**: Uses `DEFAULT_TAGS_PROMPT` to instruct the AI to "Tag this image using ONLY the provided attribute lists where possible."
4.  **Result**: Returns a JSON object of tags (e.g., `{"Color": ["Blue"], "Material": ["Denim"]}`) which pre-fills the Admin Product Form.

## 4. Bulk Import (AI Agent)
* **Route**: `app/api/products/generate/route.js`.
* **Process**: Accepts a batch of images. For each image:
    1.  **Vision Analysis**: Gemini analyzes the visual content.
    2.  **Metadata Generation**: Generates Name, Description, and Price Estimate.
    3.  **Taxonomy Sync**: Automatically matches or creates Categories and Attributes based on the analysis.
    4.  **Creation**: Inserts the full product record into the database.

## 5. UX Enhancements (Perceived Performance)
Since Large Language Model (LLM) operations can take 5-15 seconds, the system employs psychological UX techniques to maintain engagement:
* **Simulated Progress Bars**: Custom `FalseProgressBar` components animate smoothly to 95% to mimic continuous activity.
* **Flavor Text ("Gaslighting")**: Displays technical status updates like *"Scanning visual cortex..."*, *"Vectorizing query..."*, and *"Syncing taxonomy..."* to reassure the user that complex processing is underway, masking the API latency.

## 6. Configuration
* **Prompt Tuning**: Prompts are stored in the database (`settings` table) or fallback to code constants in `utils/ai-prompts.js`. This allows admins to tweak the AI's "personality" without deploying code.
* **Limits**: The number of results returned by AI search is configurable via the `ai_search_limits` setting.