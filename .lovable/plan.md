## Goal
Allow editors to add **basic text formatting** (bold, italic, headings, bullet lists, links, paragraphs) to Library article excerpts, and render that formatting on the public Library list and Article detail pages.

## Approach
Use lightweight Markdown — no new dependencies, no rich-text editor. The project already ships `src/lib/simple-markdown.tsx`; we extend it with inline formatting and reuse it.

## Changes

### 1. Extend `src/lib/simple-markdown.tsx`
Add inline parsing to `renderSimpleMarkdown` for:
- `**bold**` → `<strong>`
- `*italic*` / `_italic_` → `<em>`
- `[label](url)` → `<a target="_blank" rel="noopener noreferrer">`
- Auto-link bare `https://` URLs
Keep existing block handling (`#`, `##`, `-`, blank lines). Add an optional `className` arg so the same renderer can output compact styling for cards vs. article body.

### 2. `src/pages/Article.tsx`
Replace the `whitespace-pre-line` `<div>` rendering `localizedExcerpt` with `renderSimpleMarkdown(localizedExcerpt)` wrapped in a `prose`-like div using existing tokens.

### 3. `src/components/ArticleCard.tsx`
Excerpt on cards stays short — strip Markdown to plain text for the truncated preview (add a tiny `stripMarkdown` helper in `simple-markdown.tsx`) so `**bold**` does not leak as raw asterisks.

### 4. `src/pages/ManageLibrary.tsx`
Above each excerpt `<Textarea>` (HU + EN), add a small formatting toolbar with buttons: **B**, *I*, H2, • List, 🔗 Link. Each button wraps/inserts Markdown around the current selection in that textarea. Add a one-line hint: "Markdown supported: **bold**, *italic*, ## heading, - list, [text](url)" — localized.

Also, in the manage list preview (line 215), keep the plain-text `line-clamp-2` but run it through `stripMarkdown` so admins see clean previews.

### 5. i18n (`src/i18n/{types,en,hu}.ts`)
Add to `manageLibrary`:
- `formatBold`, `formatItalic`, `formatHeading`, `formatList`, `formatLink`
- `markdownHint` — bilingual hint string
- `linkPromptUrl`, `linkPromptText` — for the link-insert prompt

## Out of scope
- No WYSIWYG editor, no images-in-body, no tables, no DB schema changes.
- Existing excerpts remain valid (plain text renders unchanged).

## Technical notes
- Inline parser: simple regex pass over each text segment, emitted as a React fragment array with stable keys. Order: links → bold → italic to avoid nesting conflicts.
- Toolbar uses `textareaRef.selectionStart/End` to wrap the selection; falls back to inserting placeholders at the caret.
- Sanitization: only anchor tags emitted from controlled regex; no `dangerouslySetInnerHTML`.
