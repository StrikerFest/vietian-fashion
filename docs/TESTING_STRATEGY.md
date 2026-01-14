# Comprehensive Testing Strategy

This document outlines the systematic approach to validating the **Vietian Fashion** application. The testing strategy is divided into three phases, ranging from static code analysis to complex API integration simulations.

---

## Phase 1: Structural Integrity (The Foundation)
**Goal:** Ensure the codebase is syntactically correct, dependencies are valid, and the application builds successfully for production.

1.  **Linting & Static Analysis**
    *   **Action:** Run `npm run lint`.
    *   **Purpose:** Identify syntax errors, unused variables, missing dependencies, and potential React hooks issues.
    *   **Success Criteria:** Zero errors (warnings are acceptable but should be noted).

2.  **Production Build**
    *   **Action:** Run `npm run build`.
    *   **Purpose:** Verify that Next.js can compile all pages, API routes, and components. This catches errors that only appear during optimization (e.g., dynamic route misconfigurations, `generateStaticParams` issues).
    *   **Success Criteria:** Build completes with a "Compiled successfully" message.

---

## Phase 2: Unit Testing (Critical Logic)
**Goal:** Isolate and verify the accuracy of core utility functions without external dependencies (database/API).

1.  **Target Utilities**
    *   `utils/format.js`: Currency formatting (VND), Date formatting.
    *   `utils/product-helper.js`: Stock calculation logic (handling masked vs. raw inventory data).

2.  **Implementation**
    *   Create a standalone script `scripts/test-units.mjs`.
    *   Define test cases (inputs vs. expected outputs).
    *   **Success Criteria:** All assertions pass (e.g., `formatCurrency(50000)` returns `"50.000 ₫"`).

---

## Phase 3: Automated Integration Testing (The Robot User)
**Goal:** Simulate a complete user journey by interacting directly with the API endpoints. This tests the database connections, API logic, and data flow.

**Script:** `scripts/test-integration.mjs`

### Test Scenarios

#### 1. Authentication & Setup
*   **Action:** Authenticate as an Admin (using Service Role or mocked session).
*   **Verification:** Receive valid session/token.

#### 2. Product Lifecycle
*   **Create Product:** POST `/api/products` with test data.
    *   *Check:* Returns 200 OK and valid Product ID.
*   **Update Product:** PUT `/api/products/[id]` (e.g., update price).
    *   *Check:* Database reflects the new price.
*   **AI Tag Generation:** Trigger the batch tag generator for this specific ID.
    *   *Check:* Tags are added to `product_categories`.

#### 3. Commerce Flow
*   **Search:** Query `/api/recommendations` for the new product.
    *   *Check:* Product appears in results.
*   **Create Order:** POST `/api/checkout` (or orders API) to create a pending order.
    *   *Check:* Order created, Inventory deducted (if applicable).

#### 4. Teardown (Cleanup)
*   **Action:** Delete the test Order and test Product.
*   **Purpose:** Ensure the database is left in its original state.

---

## Execution Order
1.  **Run Phase 1** immediately to confirm stability.
2.  **Report** results to the user.
3.  **Await Confirmation** before proceeding to code Phase 2 & 3 scripts.
