# Notes for Claude

## Which tests to run

Run the lowest tier that covers what you changed, then stop. The **Checks** workflow runs T2 on every pull request, so
it catches what a lower tier misses. Don't run a higher tier "to be safe".

All commands run in `tests/`. Times are on a warm machine.

| Tier | Run it for | Command | Time |
|---|---|---|---|
| **T0: Static** | Text and wording (popups, notes, labels, the log), CSS, comments, docs | `npm run t0` (`typecheck.js` and `palette.js`) | about 5 s |
| **T1: Targeted** | UI behavior, one setting, one screen or popup's logic, the measuring code (Habits, Tally, Awards) | `npm run t1 -- <area>`, then the one UI script for that screen (map below) | 10 to 40 s |
| **T2: Core** | Rules, RNG, Engine, Replay, View, Waves, Memory, Backup, AI, personalities, Dynamic, Boot | `npm run t2`, then that section's UI script, if it has one | about 1 min, more with the UI script |
| **T3: Full** | The replay-code format, what a save holds, an RNG sequence, a change across many sections, before a major release tag | `npm run t3` (`npm test`) | several minutes |

- A docs-only change (`*.md` files) needs no test run.
- `npm run t1 -- <area>` runs the type check, the color check and the self-test areas named. `node selftest.js --list`
  lists the areas and the groups (`rules`, `ai`, `data` and `ui`). With no area, all of them run (about 2 s).
- Each section banner in `index.html` ends with a `Tests:` line that gives its tier and scripts. Read the banner of each
  section you changed. When a change spans sections, the highest tier among them applies.
- If you add a section, an area or a UI script, update its `Tests:` line and the map below.

### UI scripts by screen (section 8, the Controller)

Section 8 is large, so its tier depends on the part you changed.

| Part changed | Script |
|---|---|
| Text alone | none (T0) |
| Settings rows and their values | `settings.js` |
| Reset this tab, Erase | `resets.js` |
| Theme, felt, Color-blind safe colors | `theme.js` |
| Your data: Save file, restore | `backup-ui.js` |
| Replay viewer, Watch, `?replay=` links | `watch.js` |
| Your profile, the games list | `profile.js` |
| Install checklist, updates, service worker | `sw.js` |
| Waves tries, Discard, Play wave | `forfeit.js` |
| Forced plays | `forced.js` |
| Dynamic mode's menu card, seat dialog, end | `dynamic.js` |
| Reload and resume, a full restart | `restart.js` |
| Game flow, the questions, the end of a game, results | T2, then `scenarios.js` (2 to 5 min) |

### Never by default

These scripts measure the design and print numbers. They are not checks. Run one only when asked:
`soak.js`, `roundrobin.js`, `showdown.js`, `handvalue.js`, `gamelength.js`, `levers.js`, `habits.js`, `waves.js`,
`review.js`, `pace.js`, `career.js`, `tally.js`, `awards.js` and `dynamic.js rates`.

See [tests/README.md](tests/README.md) for what each script checks.
