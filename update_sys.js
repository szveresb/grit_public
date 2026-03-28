const fs = require('fs');
const file = 'c:\\Users\\veres.sz\\Documents\\GitHub\\grit.hu\\SYSTEM_DESCRIPTION.md';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /\*\*RLS:\*\* Users can view\/insert\/delete own roles\. Admins can view\/insert\/delete all\. No UPDATE\./g,
  "**RLS:** Users can view own roles. Users can ONLY self-insert the `affected_person` role (strict equality check). Admins can view/insert/delete all. No UPDATE. **Users cannot delete their own roles**, eliminating vulnerability bypasses."
);

content = content.replace(
  /\*\*RLS:\*\* Users manage own answers \(validated via response ownership\)\./g,
  "**RLS:** Users manage own answers (validated via response ownership). No admin bypass.\n**Scoring Engine:** The system employs an `AFTER INSERT ON questionnaire_answers` PostgreSQL trigger (`calculate_answer_score()`) that parses the generic JSONB payload against the structure's `answer_scores` configuration. It computes the algorithmic weighted point value natively in the database, sequentially aggregating and isolating the `total_score` on the master `questionnaire_responses` row in O(1) time without trusting client-side arithmetic."
);

content = content.replace(
  /\*\*RLS:\*\* Users manage own subjects only\./g,
  "**RLS:** Users manage own subjects only.\n**Consent Gate:** The Subject creation process explicitly enforces a mandatory Observer Consent confirmation (a visual checkbox port from `ObserverConsentCard`). Users cannot register a relative without validating their consent to track and manage third-party metadata."
);

fs.writeFileSync(file, content);
