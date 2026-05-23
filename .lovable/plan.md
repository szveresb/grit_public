## Goal

Remove the "Privát napló" / "Önellenőrző kérdőívek" cards that currently appear at the top of `/manage-content` (ManageLanding). They are admin-irrelevant — a content editor shouldn't see personal journal shortcuts on a content management page.

## Root cause

`DashboardLayout` renders `<ContextAwareToolPanel />` whenever its `showContextToolPanel` prop is truthy. The prop defaults to `true`, and `src/pages/ManageLanding.tsx` does not override it, so the self/observer journal+questionnaire cards bleed into the admin view.

## Change

Single edit in `src/pages/ManageLanding.tsx`:

```tsx
<DashboardLayout showContextToolPanel={false}>
```

No other admin pages are touched — `ManageLibrary`, `ManageUsers`, `ManageFeedback`, `ManageQuestionnaires` are out of scope for this request and can be addressed separately if the user wants the same cleanup there.

## Files

- `src/pages/ManageLanding.tsx` (edit)
