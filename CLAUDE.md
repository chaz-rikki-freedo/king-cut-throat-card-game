# Agent Rules

## Scope
- Edit only the files listed in your active task and in `worktree-map.md`.
- Never create new files, helpers, or modules unless the task explicitly
  authorizes the new path.
- Never fix unrelated failures. Never reformat out-of-scope code.
- Never overwrite human changes. If `git status` shows unexpected
  modifications, stop and move the task to `coordination/blocked/`.

## Session start ritual
On opening this window, in order:
1. Read `CLAUDE.md`.
2. Read `PRINCIPLES.md`.
3. Read `worktree-map.md`.
4. Read your assigned task file in `coordination/active/`.
5. Call `mcp__thoughtageous__retrieve` with the task's Goal as the query.
   Read every returned clause. These are your binding decisions of record.
6. If any returned clause is a `question` edged `blocks` to your task,
   stop and move the task to `coordination/blocked/`. Do not improvise.
Then begin work. Do not skip steps.

## Completion

Read the task file's `risk:` frontmatter field. Follow exactly one of the
three subsections below. If the field is missing, treat it as `standard`.
If you believe the tier is wrong, do not reclassify — block the task with
reason `risk-misclassified` (per §Blocking) and let the drafter re-issue.

### Completion (risk: low)
- Run every command in the task's `Done when:` block. All must exit 0.
- Move the task file from `coordination/active/` to `coordination/review/`
  in the **same commit** as your final code change.
- Write one `observation` clause to thoughtageous edged `about` the task
  clause, summarizing what shipped, any in-task decisions made under
  ambiguity, and anything noticed-but-not-fixed (inline; no separate
  question clauses).
- No separate review-summary file. No separate decision/question clauses.
  No QA handoff — the operator merges directly.

### Completion (risk: standard)
- Run every command in the task's `Done when:` block. All must exit 0.
- Write a summary (diffs touched, decisions made, anything surprising) to
  `coordination/review/<task-id>.md`.
- Write an `observation` clause to thoughtageous summarizing what shipped,
  what was decided under ambiguity, and anything noticed-but-not-fixed.
  Edge it `about` the task clause.
- For each decision made during work, write a `decision` clause. If it
  overrules a prior decision, edge `contradicts` and `supersedes` the
  prior clause. Edge `part_of` the project.
- For each noticed-but-not-fixed item, write a `question` clause edged
  `about` the task clause.
- Move the task file from `coordination/active/` to `coordination/review/`
  in the **same commit** as your final code change.

### Completion (risk: high)
All of Completion (risk: standard), plus:
- **Pre-flight decision clause.** Before the first code edit, write a
  `decision` clause naming the approach chosen and the alternatives
  rejected. Edge it `part_of` the project.
- **Mid-task traverse.** At every architectural fork, call
  `mcp__thoughtageous__traverse` from the task clause before committing
  to a fork. Record which traversals were performed in the closing
  observation.
- **Closing decision clause.** In addition to the standard observation,
  write a `decision` clause summarizing the final shape.
- **QA mandatory** even if `Done when` passes locally.

### After completion (all tiers)
Once the §Completion steps above have run (Done-when passes, file moved
to `coordination/review/`, closing observation written):

- Report done in one line: what shipped + the review-file path. Stop.
- Do not propose next steps. The Head Gardener decides whether to
  review, merge, dispatch the next task, or converge — from the
  orchestrator window, not here.
- Do not invoke `/converge` or suggest it. Convergence runs from the
  canonical worktree only, by the Head Gardener at wave boundaries
  (SPEC §13). From a worker worktree it would halt anyway.
- Do not merge your own branch or open a PR. The polymath approves
  merges (SPEC §0).

## Blocking
If you hit ambiguous requirements, environment errors, or a scope conflict:
- Move the task file to `coordination/blocked/`.
- Append a one-line reason at the bottom of the file.
- Write a `question` clause edged `blocks` to the task clause.
- Stop. Do not improvise.

## Session hygiene
- Compact or restart your Claude session between tasks, never mid-task.
- Prefer minimal diffs.
- If a git command fails with an index lock, wait 3 seconds and retry once.

## Stack
- <fill in for your project>
- No new runtime dependencies without human approval. Dev/test the same.

## Coding
See `PRINCIPLES.md` — apply the relevant axiom(s) to each design decision.