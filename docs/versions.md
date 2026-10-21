# Versions

This page lists each number or ID that the app uses as a version, what it covers, and when to change it. It also lists the things that have no version, and why.

**Load a code** shows the two versions that decide whether a replay code plays back: `Replay KCT3 · Engine 5`.

The event log (**Settings → Tools → Event log**) lists all of them in its first line, after the log is turned on or cleared:

```
VERSIONS engine=5 replay=KCT3 save=1 backup=KCTS1 profile=1 build=dev
```

The log keeps its last 1,500 lines, so a very long log loses that line. After **Clear log**, the line comes back with the next event.

## Versions in the app

| Name | Where | Now | What it covers | Change it when |
|---|---|---|---|---|
| Engine version | `Engine.RULES_VERSION` in `index.html` | 5 | How a seed and a list of decisions become a game: the rules, the deal and the random-number streams. Replay codes and saved games carry it (the `rules` field). A replay plays by its own Engine version and refuses a newer one. | The same seed and decisions would give a different game. |
| Replay code version | `Replay.VERSION` in `index.html` | 3 | The layout of a replay code: the `KCT3-` prefix, the sections and their fields. See [replay-code.md](replay-code.md). The app also reads versions 1 and 2. | The byte layout changes in a way that an older reader can't skip. A new optional section doesn't need a new version. |
| Save format | `SAVE_FORMAT` in `index.html` | 1 | The unfinished game kept for each mode (`kct.slots`). A save in another format is dropped, and the app says so once. | A saved Engine state from an older app can't be resumed. |
| Backup version | `Backup.VERSION` in `index.html` | 1 | The backup envelope (`format: 'kct-backup'`) and its code prefix, `KCTS1-`. See [backup.md](backup.md). A backup newer than the app is refused. | The envelope changes. The data inside it is the `kct.` keys as stored, so it doesn't need its own version. |
| Profile version | `Dynamic.PROFILE_VERSION` in `index.html`, kept as `v` in `kct.profile` | 1 | The Dynamic mode profile. A profile with another `v` starts again from blank. | The profile's fields change meaning. |
| Build | `BUILD` in `index.html` | `dev` on `main` | The published copy: the `main` commit and its date. `tools/publish.sh` writes it, and Settings and About show it. The service worker uses it to tell the game page from other pages. | Never by hand. The publish script sets it. |

## Release number

A release number such as `0.6.35` appears only in the publish commit message on `gh-pages` (see **Publishing** in the README). The app doesn't read it or show it.

## Not versions

| Item | Why it has no version |
|---|---|
| Seed | A plain 32-bit number, 0 to 4294967295, with no format of its own. What a seed produces depends on the Engine version. |
| Random-number generator | mulberry32, in `RNG`. A change to it, or to how the Engine draws from it, raises the Engine version. |
| `state.version` | A step counter in each game, not a format: it goes up by one with each action. |
| Settings, wave progress, results, replay list | `kct.settings`, `kct.waves`, `kct.stats` and `kct.replays` have no version. The app checks each value when it loads and drops what doesn't make sense. |
| Service worker cache | No number by design. A changed page on the server is the new version (see the comment at the top of `sw.js`). |
| Web app manifest | No version field. The browser checks it again on its own. |

## Naming

In the code and in replay codes, the Engine version is still called `RULES_VERSION` and `rules`. The name is older than its meaning. The version goes up for a change to the deal or the random-number streams as well as to the rules. The app shows it as **Engine** so that it isn't confused with the card game's ruleset, which hasn't changed.
