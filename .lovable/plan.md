

# Content Management Engine -- Enhancement Plan

## Overview
This plan addresses gaps, a bug, and missing features across the four content surfaces: Library, Questionnaire Engine, Journal, and the Landing Page.

---

## 1. Bug Fix: Self-Check creation gated to wrong role
**Problem**: `SelfChecks.tsx` line 20 checks `hasRole('observer')` instead of `admin`/`editor`. Observers should not create questionnaires.
**Fix**: Change the guard to `hasAnyRole('admin', 'editor')`.

---

## 2. Library Article Enhancements

### 2a. Add an external URL field
Add a `url` column to `library_articles` so editors can link articles to their original source. The landing page cards become clickable, opening the link in a new tab.

### 2b. Search and category filter on Manage Library
Add a text search input and a category dropdown filter above the articles list so editors can quickly find content.

### 2c. Research Summaries driven by database
The landing page "Research Summaries" section is currently hardcoded. Instead, filter `library_articles` where `category = 'Research'` or `category = 'Study Summary'` to populate that section dynamically.

---

## 3. Questionnaire Engine Enhancements

### 3a. Edit and delete questionnaires
Allow editors to edit a questionnaire's title, description, and published status, and delete questionnaires (with confirmation dialog). Also allow editing/reordering/deleting individual questions.

### 3b. Draft/Publish toggle
Add an `is_published` toggle to the questionnaire creation and editing form so editors can save drafts before making them available to users.

---

## 4. Journal Enhancements

### 4a. Add "Self-Anchor" field
Per the project specification, journal entries should include a "Self-Anchor" -- a grounding statement of personal validity. Add a `self_anchor` text column to `journal_entries` and a corresponding field in the journal form.

### 4b. Edit and delete journal entries
Allow users to edit and delete their own entries (with confirmation dialog for delete).

### 4c. Search and date filter
Add a search bar and date-range picker above the journal entries list.

---

## Technical Details

### Database Migration
A single migration will:
1. Add `url TEXT` column to `library_articles` (nullable, default null).
2. Add `self_anchor TEXT` column to `journal_entries` (nullable, default null).

No RLS changes needed -- existing policies cover the new columns.

### Files Modified
| File | Changes |
|---|---|
| `src/pages/SelfChecks.tsx` | Fix role check bug; add edit/delete/publish toggle for questionnaires and questions |
| `src/pages/ManageLibrary.tsx` | Add URL field to form; add search + category filter |
| `src/pages/Journal.tsx` | Add self-anchor field; add edit/delete; add search + date filter |
| `src/pages/Index.tsx` | Make library cards clickable (open URL); replace hardcoded Research Summaries with database query |

### Sequencing
1. Database migration (add columns)
2. Bug fix (`SelfChecks.tsx` role check)
3. Library enhancements (URL field, filters, dynamic Research Summaries)
4. Journal enhancements (self-anchor, edit/delete, search)
5. Questionnaire enhancements (edit/delete, draft toggle)

