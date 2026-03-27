# CarScout — GSD Methodology
# FILE LOCATION: C:\Users\Simon\carscout\docs\09-GSD-METHODOLOGY.md

## What GSD Is

Get Shit Done (GSD) is a spec-driven development methodology for AI-assisted coding.
It solves two problems:
1. Vibecoding — vague instructions produce vague code
2. Context rot — AI loses project history across sessions

The solution: write a precise spec before any AI touches code.
The spec is the context. The AI executes the spec. You verify against the spec.

---

## Folder Structure

```
specs/
  done/     Completed specs — never delete, this is your audit trail
  active/   Currently being worked on — maximum 2 at a time
  backlog/  Approved, not yet started
```

## The Spec Lifecycle

```
Write spec → move to backlog/ → move to active/ → execute → verify → move to done/
```

## How to Execute a Spec

1. Open Antigravity Manager Surface (new session)
2. Paste the full contents of the active spec
3. Say: "Execute this spec exactly. Ask me before deviating."
4. Review output against the "Done When" checklist
5. If it passes: move spec file to specs/done/, commit code, update docs listed in "Docs to Update"
6. If it fails: note what went wrong, retry

---

## The Spec Template

Copy this exactly when writing a new spec:

```markdown
# SPEC-[NUMBER]: [Title]

## Status
backlog

## Domain Objects Touched
List objects from docs/08-DOMAIN-MODEL.md this spec involves.

## Problem
One paragraph. What is broken or missing? Why does it matter?
Reference domain objects and specific file names.

## Approach
How we solve it. If creating new classes, define their interface here.

## Files to Create
- `path/to/file.ts` — what it contains

## Files to Modify
- `path/to/file.ts` — what changes and why

## Files NOT to Touch
Explicitly list files that must not be changed.
This prevents scope creep.

## Implementation Notes
Specific technical decisions, constraints, SQL if needed.
Use domain model naming from docs/08-DOMAIN-MODEL.md.

## Done When
Numbered, testable checklist. Each item verified in the browser or terminal.

1. [ ] Opening the site shows X
2. [ ] Clicking Y does Z
3. [ ] Database table contains expected rows

## Docs to Update
List which docs/ files need updating when this spec is done.
The AI must update these as part of executing the spec.

- `docs/02-CURRENT-STATE.md` — mark X as complete
- `docs/03-BUGS.md` — mark BUG-X as resolved
- `docs/06-SCHEMA.md` — add new table Y

## Dependencies
Specs that must be done first.

## Out of Scope
Explicitly list things this spec does NOT do.
```

---

## Naming Rules

Always use names from docs/08-DOMAIN-MODEL.md:

| Avoid | Use Instead |
|---|---|
| "car" | Listing (an offer) or Vehicle (physical car) |
| "price" | listing_price (sticker) or monthly_equivalent (TCO) |
| "result" | TcoScenario |
| "user" | session (until auth exists) |
| "save" | favorite (user action) or upsert (DB action) |

---

## Standing Rules for AI Executing Specs

1. Execute the spec exactly — do not add unrequested features
2. Update all files in "Docs to Update" as part of the task
3. Do not move spec to done/ — Simon does that after verifying
4. End with: "Spec complete. Verify: [list Done When items]"
