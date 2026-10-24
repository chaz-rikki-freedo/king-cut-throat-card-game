# Defaults

What the app starts with on a device that has never run it, or after its data is cleared. The README describes each setting; this page lists only where it starts and whether it is kept.

**Kept** says how long a change lasts:

- **Settings**: kept between visits, in `kct.settings`, and so also in a backup.
- **Progress**: kept between visits in its own key (see [backup.md](backup.md)), and in a backup.
- **Page load**: a reload sets it back to the default. Not in a backup or a replay code.
- **Saved game**: kept with that mode's unfinished game, and so also in a backup. A new game starts at the default.

`tests/defaults.js` opens the app with empty storage and checks every row of the table below: the **Value** in the page at **Key** (a path under `window.KCT`) must equal the **Value** column (JSON). Change a default, and you change this table with it.

## Settings and progress

| Setting | Where | Default | Kept | Key | Value |
|---|---|---|---|---|---|
| Felt | Settings → Game → Theme | **Classic** | Settings | `App.app.ui.felt` | `"classic"` |
| Color-blind safe colors | Settings → Game → Theme | Off | Settings | `App.app.ui.colors` | `""` |
| Table memory: Trumps played | Settings → Game → Table memory | Off | Settings | `App.app.ui.memory.trumps` | `false` |
| Table memory: Kings not played | Settings → Game → Table memory | Off | Settings | `App.app.ui.memory.kings` | `false` |
| Table memory: Turned card | Settings → Game → Table memory | Off | Settings | `App.app.ui.memory.turned` | `false` |
| Table memory: Voids | Settings → Game → Table memory | Off | Settings | `App.app.ui.memory.voids` | `false` |
| Mediator picks the Showdown lead | Settings → Game → House rules | On | Settings | `App.app.houseRules.mediatorLead` | `true` |
| Turned-up Joker | Settings → Game → House rules | **Redeal** | Settings | `App.app.houseRules.jokerFlip` | `""` |
| Polite Play | Settings → Game → House rules | On | Settings | `App.app.houseRules.politePlay` | `true` |
| AI can play your seat | Settings → Game → Your seat | Off | Page load | `App.app.ui.allowSeatAI` | `false` |
| The AI plays your seat (the **HUMAN** tag) | Your seat | Off: you play. Each new game starts with you in your seat. | Saved game | `App.app.ui.autoplay` | `false` |
| Game speed | Header (the gauge icon) | **Normal** | Page load | `App.app.ui.speed` | `"normal"` |
| West: Who sits | Settings → Bots → West | **From the seed** | Settings | `App.app.seats[1].who` | `""` |
| East: Who sits | Settings → Bots → East | **From the seed** | Settings | `App.app.seats[2].who` | `""` |
| Your seat: Who sits | Settings → Bots → Your seat | **From the seed** | Settings | `App.app.seats[0].who` | `""` |
| West: every other seat setting | Settings → Bots → West | **Its own** | Settings | `App.app.seats[1].tune` | `null` |
| East: every other seat setting | Settings → Bots → East | **Its own** | Settings | `App.app.seats[2].tune` | `null` |
| Your seat: every other seat setting | Settings → Bots → Your seat | **Its own** | Settings | `App.app.seats[0].tune` | `null` |
| Event log | Settings → Tools | Off | Settings | `Logger.enabled` | `false` |
| Highest open wave | Menu → New game → Waves | Wave 1 | Progress | `Waves.progress().unlocked` | `1` |
| Cleared waves | Menu → New game → Waves | None | Progress | `Waves.progress().cleared` | `[]` |

**Its own** means the bot plays that part as its personality does. Each personality's own values are in the README (**Opponents**).

## Not settings

These start the same way every time, and nothing changes them for good:

- **Game speed** and **AI can play your seat** are for the page load only (see the table).
- **Defaults: Reset** (Settings → Bots) sets every seat back to **From the seed** and **Its own**. It does not change the Game tab.
- A game keeps the house rules it started with. A changed house rule applies from your next game.
