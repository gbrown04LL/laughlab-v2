## Claude Code Prompt: Unblock Report Display (Supabase Fallback)

**Goal:** Implement the final logic necessary to ensure the `/report` page successfully retrieves analysis data from Supabase if it is not found in the local Zustand store. This resolves the current "infinite loading" state when accessing reports from the new History page.

**Context:**
*   **Supabase Client:** Exists in `src/lib/supabase.ts`.
*   **Zustand Store:** `useAnalysisStore` exists in `src/lib/store.ts`.
*   **Current Issue:** The `/report` page currently only checks `localStorage` (via Zustand persist). When a user clicks a link on the new History page, the local store is empty, causing the page to get stuck in a loading loop or redirect prematurely.

---

### 1. Core Task: Implement Supabase Fallback in Report Page

**File:** `src/app/report/page.tsx`

**Action:** Modify the main `useEffect` guard to include a Supabase fetch as a fallback.

**Logic Flow:**

1.  **Check 1 (Local Store):** If `currentAnalysis` is **not null**, render the report immediately.
2.  **Check 2 (Hydration Guard):** If `currentAnalysis` is **null** AND `hasHydrated` is **true**:
    a.  **Identify ID:** Extract the `id` of the report to load. This ID should be stored in the Zustand store (e.g., `useAnalysisStore((state) => state.currentAnalysisId)`).
    b.  **Supabase Fallback:** Call the new function `fetchAnalysisById(id)` (see Task 2).
    c.  **Success:** If data is returned from Supabase, update the Zustand store (`useAnalysisStore.setState({ currentAnalysis: fetchedAnalysis })`) and stop the loading state.
    d.  **Failure:** If no data is returned, *then* redirect to `/analyze`.

---

### 2. Core Task: Create Supabase Fetch Function

**File:** `src/lib/supabase.ts`

**Action:** Add a new function to securely fetch a single report.

**Function Signature:**
```typescript
export async function fetchAnalysisById(id: string): Promise<FullAnalysis | null> { ... }
```

**Implementation Details:**
*   Query the `reports` table where the `id` column matches the input `id`.
*   Select the full `analysis_data` column.
*   Return the parsed `analysis_data` (which is of type `FullAnalysis`) or `null` if not found.

---

### 3. Environment Verification

**Action:** Ensure the code uses the environment variables correctly.

*   Verify that `src/lib/supabase.ts` correctly uses `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

### Acceptance Criteria

*   **Success Path:** A user clicks a link on the History page, is taken to `/report`, and the report renders successfully after a brief loading period, even if their local storage is empty.
*   **Failure Path:** A user manually navigates to `/report` with an invalid or non-existent ID, and the page correctly redirects to `/analyze`.
