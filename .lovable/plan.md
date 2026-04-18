
The user wants to: (1) collect beta signup requests publicly, and (2) send invite codes by email to people on the waitlist.

**Current state:**
- `waitlist_emails` table exists (anon insert allowed) — good for signups
- `invite_codes` table exists (admin-only) — good for codes
- `redeem_invite_access` RPC is wired into `BetaGate.tsx`
- `ManageUsers.tsx` has "Generate Code" but no way to send/share it
- No public signup form, no email infrastructure yet

## Plan

### 1. Public beta signup form
Add a "Request Beta Access" section on the landing (`src/pages/Index.tsx`) via a new `BetaSignupForm.tsx` component. Captures email + optional name → inserts into `waitlist_emails`. Confirmation toast. HU/EN strings.

Schema tweak (migration): add `name`, `locale`, `status` (`pending`/`invited`), `invited_at` columns to `waitlist_emails`.

### 2. Admin: review signups + send codes
Extend `ManageUsers.tsx` with a "Beta Signups" section:
- List entries (email, name, date, status)
- Per-row "Generate & Send Code" → creates `invite_codes` row, calls `send-transactional-email`, updates signup to `invited`

### 3. Email infrastructure (Lovable Cloud)
Set up sender domain `notify.grit.hu` (you add 2 NS records at registrar), provision queue + dispatcher + suppression + unsubscribe.

### 4. Branded invite-code template
Create `beta-invite-code.tsx` — bilingual (uses signup's stored locale, default HU), Grit.hu styling (white body, primary color CTA, warm clinical-but-human tone). Shows the code and a "Redeem now" button linking to `/beta-gate?code=…`.

### 5. Unsubscribe page
`/unsubscribe` route + page (HU/EN), required for compliance.

### Files

**New:**
- Migration: add columns to `waitlist_emails`
- `src/components/BetaSignupForm.tsx`
- `src/pages/Unsubscribe.tsx` + route in `src/App.tsx`
- `supabase/functions/_shared/transactional-email-templates/beta-invite-code.tsx`
- (scaffold-generated) `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `process-email-queue`, `registry.ts`

**Modified:**
- `src/pages/Index.tsx` — embed signup form
- `src/pages/ManageUsers.tsx` — Beta Signups section + send action
- `src/i18n/en.ts` + `src/i18n/hu.ts`

### Out of scope
- Receiving mail at `hello@grit.hu` (needs external provider on root MX — independent of this work)
- Auth email branding (separate request)

### Two quick decisions

**Approval flow:**
1. **Manual review, one-click send (recommended)** — signups go to admin, you click "Send code" per person
2. **Automatic on signup** — code generated and emailed instantly, no gatekeeping
3. **Bulk approve** — select multiple in admin, send at once

**Sender address:**
1. **`notify@notify.grit.hu`** (default Lovable subdomain)
2. **`noreply@grit.hu`** (sends through subdomain, but From: shows root — more polished)
3. **Custom subdomain** (e.g. `beta.grit.hu`)

Reply with your picks (e.g. "1 and 2") and I'll proceed.
