# SOP Proposal: Writing Development Requests (User Stories) with INVEST in Agile

## Document Purpose
Define a consistent way to write, review, and maintain user stories so development and testing are faster, clearer, and aligned on business value.

## Scope
Applies to everyone involved in creating, specifying, implementing, or testing development requests:
- Product Owner (PO)
- Business Analyst (BA)
- Developers
- Testers / QA
- Other delivery stakeholders

## Tooling Context
- Jira: task and backlog management
- Confluence: specification and traceable documentation

## Process Overview
1. Capture the business need and target user outcome.
2. Draft the user story in a concise, user-centered form.
3. Define clear acceptance criteria.
4. Validate the story against INVEST.
5. Refine with delivery team input.
6. Prioritize in backlog (and under Epic when relevant).
7. Implement and test against acceptance criteria.
8. Document outcome and traceability in Jira/Confluence.

## Roles and Responsibilities
### PO / BA
- Define development requests with clear business value.
- Collaborate with stakeholders to collect requirements.
- Prioritize stories.
- Define and document acceptance criteria.

### Developers / QA
- Review and clarify story details with PO/BA.
- Provide implementation feasibility input.
- Confirm acceptance criteria are testable and sufficiently specific.
- Create and execute test cases from acceptance criteria.

## User Story Writing Standard
Use this pattern:

`As a <user role>, I want <capability/outcome>, so that <business value>.`

Guidelines:
- Use plain user language, avoid unnecessary jargon.
- Keep focus on user outcome and value.
- Keep implementation details out of story description.
- If a story is too broad, split it.

## Minimum Required Story Content
Every story must include:
- Title
- Description (story statement)
- Acceptance criteria
- Notes/links/dependencies
- Test case references (or clear QA approach)

## INVEST Quality Gate
Before a story is ready, confirm:

1. `Independent`
- Delivers value without tight coupling to other stories where possible.

2. `Negotiable`
- Treated as a collaboration artifact, not a fixed technical specification.

3. `Valuable`
- States explicit business/user value.

4. `Estimable`
- Contains enough detail to estimate effort and complexity.

5. `Small`
- Small enough for short-cycle delivery (target: ideally 2-3 days of implementation effort).

6. `Testable`
- Acceptance criteria are objective and verifiable.

## Acceptance Criteria Standard
- Define criteria together with story finalization (PO/BA + dev team).
- Criteria must be unambiguous and measurable.
- Prefer concrete thresholds over vague terms.
  - Example: use `loads within 3 seconds`, not `loads quickly`.
- Keep to about 3-4 criteria.
- If more are needed, split the story.
- Prioritize criteria by business impact where relevant.

## Story Hierarchy Rule
- User story is the smallest business-meaningful specification unit.
- Developer sub-tasks may exist under a story, but sub-tasks are not standalone business requests.
- Group related stories under Epics for prioritization and sequencing.

## Review and Continuous Improvement
Review the SOP usage regularly (for example in Sprint Retrospective or equivalent cadence):
- Is story quality improving?
- Is delivery/testing efficiency improving?
- Are stakeholders and users giving actionable feedback?
- What should be adjusted in the workflow?

## Documentation and Compliance
- Maintain historical traceability of story lifecycle in Jira/Confluence.
- Apply this SOP consistently across all contributors.
- Record SOP updates with version and date.

## Suggested Jira User Story Template
```md
Title:

As a <role>,
I want <capability/outcome>,
so that <business value>.

Acceptance Criteria:
1.
2.
3.

Notes / Dependencies:

Test Cases / QA Notes:
```

## INVEST Checklist (Quick Control)
- [ ] Independent
- [ ] Negotiable
- [ ] Valuable
- [ ] Estimable
- [ ] Small
- [ ] Testable

## Source
Based on:
`Szabványos működési eljárás (SOP) javaslat fejlesztési igények (felhasználói történetek) írására INVEST elv használatával Agilis környezetben-220526-143254.pdf`
