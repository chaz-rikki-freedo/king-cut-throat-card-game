---
risk: standard
---
# Task NNN: <one-line summary>

<!--
SPEC §7 task-file template. Copy this file to
`coordination/backlog/<NNN>-<slug>.md` and fill in each section.
Filename slug MUST match the paired `task` clause slug in
thoughtageous (SPEC §4, §7 — 1:1 pairing).

The `risk:` frontmatter field is REQUIRED. Allowed values:
`low | standard | high` (SPEC §7.1). The drafter assigns the tier;
the worker reads it and follows the matching §5 Completion subsection.
Uniform `standard` defaulting is an anti-pattern (SPEC §18).

DO NOT add a Context block. Context is hydrated by the worker's
session-start ritual via `mcp__thoughtageous__retrieve` (SPEC §11.3).
A pasted Context block fossilizes what was known at drafting time.
-->

## Goal

<One paragraph. What this task accomplishes and where. Be specific —
name the files, the function, the behavior. Avoid "refactor X" or
other open-ended framings.>

## Files allowed

- <relative path>
- <relative path>

## Files forbidden

<Everything else, with one explicit example of a tempting-but-banned
new path. Workers honor this verbatim per CLAUDE.md §Scope.>

## Done when

<!--
Executable commands. All must exit 0 from the worktree root.
This is the worker's verification block (CLAUDE.md §Completion).
Be concrete: actual lint/test/build invocations scoped to the
files this task touched.
-->

Run these commands from the worktree root. All must exit 0:

1. `<command>`
2. `<command>`
3. `<command>`

## Deliverable

Move this file to `coordination/review/<NNN>-<slug>.md`. Write the
observation clause described in CLAUDE.md §Completion, edged
`about` the paired task clause.
