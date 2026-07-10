# Survey Category Backlog
Timestamp: 2026-07-10 14:57 CEST

## Summary

This backlog keeps the implementation small:

- one primary category per survey
- shared admin-managed survey categories
- category selector in survey create/edit
- category management entry point in survey admin
- grouped and filterable surveys in `/surveys`
- backend schema coverage for storage, reads, validation, and deletion safety

Use the current admin surface at `/admin/questionnaires` as the implementation target, even if the product language informally calls it `/survey-admin`.

## Epic 1: Survey Category Foundation

### Story 1. Create a reusable survey category model
**As an admin,  
I want survey categories stored as shared records,  
so that the same category list can be reused across all surveys and public filters.**

**Acceptance Criteria**
1. A backend schema exists for survey categories with at least `id`, `name_hu`, `name_en`, `sort_order`, `is_active`, `created_at`, and `updated_at`.
2. The questionnaire schema stores a nullable or required `category_id` reference to the survey category record.
3. The relationship between questionnaire and category supports exactly one category per questionnaire.
4. The generated Supabase types expose the new category entity and questionnaire relation.

**Notes / Dependencies**
- Keep the schema simple. No slug, no hierarchy, no multi-select, no descriptions unless needed later.
- This story is the dependency for all other stories in this backlog.

**Test Cases / QA Notes**
- Verify category rows can be created and queried.
- Verify a questionnaire can reference one category.
- Verify the foreign key prevents invalid `category_id` values.

### Story 2. Protect category data integrity
**As an admin,  
I want category rules enforced in the backend,  
so that survey filtering does not break from invalid or orphaned data.**

**Acceptance Criteria**
1. A questionnaire cannot reference a non-existent category.
2. Category deletion is blocked when at least one questionnaire still uses that category, or the system clearly reassigns/removes usage according to the chosen implementation.
3. Inactive categories remain valid for already-linked questionnaires unless explicitly reassigned.
4. Category queries used by admin and public survey screens can fetch only active categories by default.

**Notes / Dependencies**
- Prefer delete protection over cascade delete. It is safer and simpler.
- Do not introduce background migrations or automatic remapping logic.

**Test Cases / QA Notes**
- Attempt to delete a category in use and verify the backend rejects it.
- Mark a category inactive and confirm linked questionnaires remain readable.
- Verify public filter queries can exclude inactive categories.

## Epic 2: Survey Admin Category Management

### Story 3. Manage survey categories from survey admin
**As an admin,  
I want a category management action inside survey admin,  
so that I can create, edit, and delete the category list without leaving the questionnaire management workflow.**

**Acceptance Criteria**
1. The `/admin/questionnaires` page includes a visible action to open survey category management.
2. The category management UI supports create, edit, and delete for survey categories.
3. Category create and edit require both Hungarian and English names.
4. The category list is shown in a predictable order using `sort_order` or current list order.

**Notes / Dependencies**
- Keep this as a lightweight admin panel, modal, or side sheet inside the existing questionnaire admin page.
- Do not build a separate admin route unless there is already a strong pattern for it.

**Test Cases / QA Notes**
- Create a category and verify it appears in the management list.
- Edit both localized names and verify the changes persist.
- Delete an unused category and verify it is removed from the selector list.

### Story 4. Assign a category when creating or editing a survey
**As an admin,  
I want a category selector in the survey create/edit form,  
so that every survey can be organized consistently for public filtering.**

**Acceptance Criteria**
1. The survey create/edit form on `/admin/questionnaires` includes a category selector populated from active survey categories.
2. When editing a survey, the currently assigned category is preselected.
3. Saving a survey persists the selected `category_id`.
4. Publishing a survey is blocked if no category is selected.

**Notes / Dependencies**
- This is the story that implements the requested category selector in survey create/edit.
- Keep the selector single-select.

**Test Cases / QA Notes**
- Create a survey with a category and verify the saved record contains the expected `category_id`.
- Edit a survey and change its category.
- Attempt to publish without a category and verify the validation message appears.

## Epic 3: Public Survey Discovery

### Story 5. Filter surveys by category in `/surveys`
**As a user,  
I want to filter surveys by category,  
so that I can quickly find questionnaires relevant to my current need.**

**Acceptance Criteria**
1. The `/surveys` UI shows a category filter sourced from active survey categories.
2. Selecting a category limits the displayed surveys to questionnaires assigned to that category.
3. The category filter works together with the existing `All`, `Due now`, `Completed`, frequency, and sort controls.
4. If no surveys match the selected category and current filters, the user sees a localized empty state.

**Notes / Dependencies**
- Do not create multi-dimensional advanced filtering.
- Keep the category filter lightweight and visible.

**Test Cases / QA Notes**
- Select each category and verify only matching surveys appear.
- Combine category plus `Due now` and verify the result set is correct.
- Verify both HU and EN labels display correctly.

### Story 6. Group survey cards by category in `/surveys`
**As a user,  
I want surveys visually grouped by category,  
so that the page feels organized even before I start filtering.**

**Acceptance Criteria**
1. When no specific category filter is selected, the `/surveys` page groups surveys under category headings.
2. Group headings use the localized category name for the active language.
3. Categories with no visible surveys are not rendered as empty groups.
4. When a specific category filter is selected, the UI can fall back to a single filtered list instead of repeated grouped sections.

**Notes / Dependencies**
- Keep the grouping logic simple.
- Reuse the existing self and third-party sections; category grouping happens inside each section, not across them.

**Test Cases / QA Notes**
- Verify grouped rendering with multiple active categories.
- Verify filtered rendering when a single category is selected.
- Verify self and third-party sections remain separate.

## Epic 4: Localization And Query Wiring

### Story 7. Localize and wire category data end to end
**As a user,  
I want category names to appear correctly in my language across admin and survey screens,  
so that the categorization feels native and understandable.**

**Acceptance Criteria**
1. Admin screens display category names in a way that makes both HU and EN values editable and reviewable.
2. The public `/surveys` UI shows the localized category name based on the active language.
3. Survey list queries fetch category data together with questionnaire data needed for rendering and filtering.
4. Generated frontend types cover the category relation without using `any`.

**Notes / Dependencies**
- This story covers the remaining backend/frontend integration surface without expanding scope.
- Do not hardcode category labels in the survey UI.

**Test Cases / QA Notes**
- Switch language and verify filter labels, group headings, and card labels update correctly.
- Verify typed query results include category data.
- Verify no fallback to raw IDs appears in the UI.

## Delivery Order

1. Story 1
2. Story 2
3. Story 3
4. Story 4
5. Story 7
6. Story 5
7. Story 6

## Scope Guardrails

- One category per survey only.
- Category management lives inside the existing survey admin flow.
- No category hierarchy.
- No category descriptions.
- No user-personalized saved filters.
- No extra public routes for category landing pages.
