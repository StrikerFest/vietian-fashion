# Test Cases: Discovery & Products

**Scope:** `app/page.js`, `app/search`, `app/products/[id]`
**Priority:** High

## Case 1: Homepage & Navigation
* **Objective:** Verify dynamic configuration and menu.
* **Steps:**
    1. Load Homepage.
    2. Check **Hero Banner** (should load from settings).
    3. Click a Category in **Navbar**.
    4. **Verify:** Redirects to correct Category Page. Top Loading Bar should appear during transition.

## Case 2: AI Semantic Search
* **Objective:** Verify the AI search gaslighting and results.
* **Steps:**
    1. Click Search Icon.
    2. Enter complex query: "Winter wedding outfit".
    3. Press Enter.
    4. **Observe:**
        *   **Top Loading Bar** appears.
        *   **Status Text** cycles: "Initializing semantic engine..." -> "Vectorizing query...".
    5. **Result:** Relevant products or collections appear.

## Case 3: Product Detail & Guides
* **Objective:** Verify the new "Size & Care Guide" feature.
* **Pre-requisites:** A product tagged with "Áo thun" (or configured guide category).
* **Steps:**
    1. Navigate to the Product Page.
    2. Scroll below the main info.
    3. **Observe:** "Bảng quy đổi kích cỡ" tab should be visible.
    4. Click **"Hướng dẫn bảo quản"** tab.
    5. **Result:** Correct text/table displays based on product attributes.
