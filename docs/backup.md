# Backup specification

Format version: **1**. Code: `Backup` in `index.html` (section 5e) and `App.backup`.

## 1. Purpose

A backup holds the full client state of the app: wave progress, results, saved games (also a game in progress, with its log), the last replay codes and the settings. With a backup, you can move your progress to another device or browser, or keep it safe when the browser clears its storage.

There is no UI yet. Use the console (section 7).

## 2. What a backup holds

A backup holds **every `localStorage` key that starts with `kct.`**, as the exact stored text. Thus a backup is lossless, also for keys that a later version adds.

| Key | Contents |
|---|---|
| `kct.waves` | Wave progress: unlocked wave, cleared waves, tries. |
| `kct.slots` | One unfinished game for each mode (Waves, Free play): the Engine state, seats, wave, the AI-seat flag and the saved log. |
| `kct.stats` | Results: per mode, per table, per opponent. |
| `kct.replays` | The replay codes of the last 20 finished games. |
| `kct.settings` | Settings: personalities, skill, bid courage, real table, AI thinking and knowledge, logging. (The app does not keep speed.) |

A backup does not hold:

- Data in memory that the app does not store: the debug logger lines, an update that waits.
- The app files in the service worker cache. They come from the network.
- Keys of other apps on the same site (keys that do not start with `kct.`).

**A game in progress.** The app saves the running game after each move. `App.backup.create()` saves it one more time before the export. Thus the backup holds the game at the current move. To get one fixed moment, open the menu first: the game waits while the menu is open.

## 3. Envelope

```js
{
  format: 'kct-backup',        // always this text
  v: 1,                        // backup format version
  createdAt: 1791168759453,    // ms
  meta: { rules: 1, saveFormat: 1, replay: 'KCT2' },   // information only; import ignores it
  data: { 'kct.slots': '{"waves":null,"free":{…}}', 'kct.waves': '{…}', … }  // key → stored text
}
```

Rules for a valid envelope (`Backup.check`):

1. `format` is `kct-backup`.
2. `v` is an integer from 1 to the app's version. A newer version is refused.
3. Each key in `data` starts with `kct.`.
4. Each value is text that is valid JSON.

`check` returns a clean copy: `createdAt` becomes `null` when it is not a valid date in ms, and `meta` becomes `{}` when it is not an object.

## 4. Two forms

| Form | How | Size (mid-game, 66 decisions) | Use |
|---|---|---|---|
| **File** | The envelope as JSON, in `king-cut-throat-backup-<date>.json` | about 25 KB | Save on the device, send by email or cloud drive. |
| **Text code** | `KCTS1-` + base64url(mode byte + body) | about 3.4 KB | Copy and paste between devices. |

Text code mode byte:

| Byte | Body |
|---|---|
| 1 | The envelope JSON, gzip-compressed (`CompressionStream`). The app uses this when the browser can. |
| 0 | The envelope JSON, not compressed. For a browser without `CompressionStream`. |
| 2–255 | Reserved. Refused. |

The digit after `KCTS` is the backup format version. A reader refuses a code with a newer version. A browser without `DecompressionStream` cannot read a mode 1 code; it must use the file.

`Backup.parse(text)` reads both forms: text that starts with `{` is a file, all other text is a code. Spaces and line breaks in a code are ignored.

## 5. Import

An import **replaces** all app data:

1. Read and check the backup. If it is not valid, stop. Nothing changes.
2. Stop the game timer and lock the storage gate (`StorageGate.locked`). While the gate is locked, the app writes nothing, so that a timer or a save cannot overwrite the imported data.
3. Remove each `kct.` key that the backup does not have. Write each key of the backup.
4. If a write fails (for example, the storage is full), write the old values back and stop with the error "import failed, old data kept". The import is all or nothing.
5. Write the key `kct-restored` (the time). This key does not start with `kct.`, so it is not in backups. Other open tabs of the app get a `storage` event for it: they stop their timer, lock their storage gate and reload. Without this step, an old tab would write its old game over the imported data at its next move.
6. Reload the page. The app starts with the imported data.

**There is no undo.** Keys of other apps are not changed.

> **TODO (UI):** before an import, show a warning: all progress, results, saved games and settings on this device are replaced, and there is no undo. Show the `describe` summary (section 7) in the warning.

A saved game from another `SAVE_FORMAT`, or one that fails the card audit, is dropped when the app starts, as for any saved game. The menu then says that the game was lost.

## 6. Versions

| Change | What to do |
|---|---|
| A new `kct.` key | Nothing. Backups hold all `kct.` keys. |
| A change in a key's contents | Handle it where the app loads that key, as for normal storage. |
| A change in the envelope or the code layout | Raise `Backup.VERSION` (`KCTS2-`). Keep a reader for version 1. |

## 7. Console

```js
KCT.App.backup.create()               // the envelope (saves the running game first)
KCT.App.backup.toJSON()               // the file text
await KCT.App.backup.toCode()         // the text code (KCTS1-…), gzip when the browser can
await KCT.App.backup.toCode({ plain: true })  // a code with no compression
KCT.App.backup.download()             // saves the .json file; returns the file name
await KCT.App.backup.inspect(x)       // summary of a file text, a File/Blob or a code; changes nothing
await KCT.App.backup.restore(x)       // REPLACES all data with the backup, then reloads the page
```

`inspect` and `restore` return a summary:

```js
{ createdAt, v, keys: ['kct.slots', …], bytes, wavesUnlocked, gamesPlayed, savedGames: ['free'], replays }
```

**Types.** The module has JSDoc types (`WebStore`, `BackupEnvelope`, `BackupSummary`). It passes `tsc --allowJs --checkJs --strict` with no errors on its lines.

The module `KCT.Backup` works on any Web Storage object (`length`, `key`, `getItem`, `setItem`, `removeItem`): `create(storage, meta)`, `check(env)`, `apply(storage, env)`, `describe(env)`, `toJSON(env)`, `toCode(env)`, `parse(text)`. The self-tests use it with a stand-in storage.
