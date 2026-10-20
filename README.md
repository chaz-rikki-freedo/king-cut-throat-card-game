# King Cut-Throat

A browser game in one file, `index.html`. Open it in a browser to play, or install it as an app (see **Install and offline play**). This file covers the menu, waves, saved games, the app files and the settings panel.

## Menu

Each launch opens on the menu. To open it during a game, click **☰** in the header (the game waits).

The menu has a card for each mode, **Dynamic**, **Waves** and **Free play**, and a row of tools. Each card's name is the same colored chip as the mode chip in the header: Dynamic purple, Waves deep sea, Free play blue. Each card shows its game in two lines (who, then the hand and the scores), or **No saved game** and a short description of the mode. Every button stays in the same place whatever is saved or running. The menu has the same header as **Settings**: **King Cut-Throat** (at launch with a saved game, **Welcome back**), then **✕** to close it. On a phone it fills the screen.

The goal in the top right of each card (**Beaten 2 of 10**, **15 of 18 cleared**) opens **Your profile** for that mode. Its **✕** returns to the menu.

Your profile, a bot's profile, the results pop-up and Rules have the same header as **Settings**: the title, then **✕** to close. The header stays in view while the panel scrolls. On a phone (600 px wide or less), Your profile and Rules fill the screen, like the menu.

| Item | What it does |
|---|---|
| **Resume** (in each card) | Continues that mode's game: the one you are playing (the menu closes), or the saved one. Disabled when there is none. At launch, the last game played is the main button. |
| **New game** (Free play) | The seed picks two random opponents. If an unfinished Free play game has begun, the app asks first. |
| **New game** (Dynamic) | As in Free play, two random opponents, who ease off while you learn (see **Dynamic**). If an unfinished Dynamic game has begun, the app asks first. |
| **Play wave** (Waves) | Starts the wave chosen in the list (the highest open wave by default). A ✓ marks a cleared wave. If an unfinished Waves game has begun, the app asks first. From hand 2, leaving it counts as a try (see **Waves**). |
| **Rules** | The quick rules. **✕** returns to the menu. |
| **Tutorial** | Coming soon (disabled). |
| **Install** | Shown when the browser offers it: play from your home screen, also offline. |
| **✕** (header) | Closes the menu. At launch, it leaves the **About screen** (see below): the menu, Settings and the profiles work. |

## About screen

When no game is loaded, the About screen takes the table's place: at launch behind the menu, after **✕** closes the launch menu, and after **Discard game** ends the game being played. A card on the felt shows the game's name, a one-line description, **Menu** (opens the menu), **Rules** (the quick rules; **✕** returns to the About screen), the Settings icon, the credit **Original game design by C.R.F.B. 2009–2011**, and the build (the same text as at the foot of Settings). Behind the card, faint kings (🤴 and 👑) drift slowly up the felt, each swaying at its own pace. The system setting to reduce motion holds them still. Starting or resuming a game, or watching a replay, replaces the About screen with the table.

A link with `?replay=` and a replay code opens that game in the replay viewer (see **Watch a game**). A link with `?seed=` or `?wave=` starts that game without the menu. If that mode has an unfinished game that has begun, the app asks first, as **New game** does. The app then removes `seed`, `wave` and `replay` from the address, so a reload resumes the game instead of starting it again. A link with a seed that is not a whole number from 0 to 4294967295, or a wave that does not exist, starts nothing: the menu opens with a note.

## Header

The header stays at the top of the window, and the page scrolls under it. From left to right:

- **☰** opens the menu (games and Rules).
- The title (hidden on narrow phones) and the mode: **Wave N of 18**, **Free play** or **Dynamic**. The mode is a button that opens your results for that mode (see **Results pop-up**). With no game, the mode is not shown.
- The trump suit and the hand and trick number. Below 900 px, these move to a second row.
- The **speed** menu (Slow, Normal, Fast, Instant).
- **Settings** (the sliders icon).

### Free play and Dynamic: choose seats

In Free play and Dynamic, a new game opens on a dialog that shows your two opponents: West (your left) and East (your right). No one is the dealer yet and no card is dealt; the table says **Choosing seats**. **⇄** swaps them and **Play** draws the dealer and starts the deal. This is the only chance to swap. **Try again** and **New deal** offer it again. There is no dialog when the AI plays your seat at the start.

- **New opponents** seats two other random opponents (a new seed), neither of the two shown.
- **Back** (or **Esc**) does not start the game: the table empties and the menu opens. Your saved game of that mode, if any, stays as it was, because a game is saved only once **Play** is pressed.
- When you have finished a game of that mode, a line shows how the latest one ended: the winner and the three scores.

## Saved games, settings and results

The app keeps these in the browser (`localStorage`), so a closed tab loses nothing:

- **One unfinished game per mode** (`kct.slots`), saved after every action, with its Latest Scroll (last 1500 lines). Starting a new game in a mode replaces that mode's game; the menu asks first if it has begun. A finished game is not kept.
- **Wave progress** (`kct.waves`): open waves, cleared waves and tries per wave.
- **Settings** (`kct.settings`): the seat settings (who sits in each seat, and each seat's changes), Logging, and the Game tab's settings. Speed and the Your seat switch are not kept: each load starts at Normal, with the switch off.
- **Results** (`kct.stats`): played and won, per mode, per table (West/East), per opponent, and per opponent in each mode. A game where the AI played your seat adds no results.

- **Replay codes** (`kct.replays`): the last 20 finished games (see **Replay a game**).
- **Dynamic profile** (`kct.profile`): your bidding and discards across games, which set where a Dynamic game starts (see **Dynamic**). A game where the AI played your seat adds nothing. Resetting results (`KCT.App.stats.reset()`) does not clear it.

If the browser refuses to save any of these (storage full or blocked), a note says so once per page load. The data then lasts until the page closes.

**Backup.** One backup file holds all of this, also a game in progress. In **Settings → Tools → Your data**, **Save file** saves a `.kct` file, and **Restore** (**Choose file…**) reads one back on any device. Before it replaces anything, a confirm shows this device and the backup side by side (when saved, waves unlocked, games played, saved games, replays); **Replace all data** replaces all the data on the device, with no undo. Older `.json` backups still restore. See [docs/backup.md](docs/backup.md).

**One tab.** Only one tab of the game can play and save. Each new tab (or reload) becomes the active tab. An older tab of the game then stops, writes nothing more, and shows **Another tab is more current**, with two buttons only: **Update** loads the newest data in that tab (the other tab then stops), and **Quit** closes it. If the browser does not let the page close the tab, the tab stays stopped and says that you can close it. The tab checks before each save, when another tab opens, and when the tab shows again. The mark of the active tab (`kct-tab`) is not in a backup.

If a new version cannot load a saved game, the game is dropped and the menu says so once. Wave progress and results are kept. Change `SAVE_FORMAT` in `index.html` when the Engine state changes shape.

The app does not trust saved data, because a backup can come from another person. At each load, it rebuilds a saved game from its seed and its moves. If the result is not the same as the saved game, the app drops the game. A game saved before the app kept the moves cannot be rebuilt, so the app drops it too. The Latest Scroll is saved as text, not as HTML. Results keep only counts that make sense.

## Results pop-up

Click the mode in the header.

- **Waves: Wave tries.** Newest wave first. Each wave, its two opponents and your tries. A try is a game that counts for the wave (see **Waves**). For a cleared wave (✓), the tries are the games it took to clear it, and the number does not change after that. For the open wave that is not cleared, the tries are the games so far. Locked waves are not listed, so their opponents stay a surprise: a line says how many more waves there are. The current wave is highlighted.
- **Free play: Free play wins.** For each of the ten bots: the Free play games you won and played with that bot at the table. Waves games do not count here.
- **Dynamic: Dynamic wins.** The same table, for Dynamic games.
- Progress saved before tries were kept gets a random number of tries, 1 to 4, for each cleared wave. Free play wins count from this version on.

## Settings panel

Click **Settings** (the sliders icon) in the header, or add `?settings=1` to the URL (this opens the Tools tab and turns on the event log). Settings fills the screen and has three tabs: **Game**, **Bots** and **Tools**. Each setting is one row: its name and a one-line description, then its control. On/off settings are switches; a click anywhere on the row toggles one. **✕** or **Esc** closes Settings, and the arrow keys move between the tabs. The tab you used last opens next time. While Settings is open, the page behind it cannot be clicked or reached with Tab. A setting that does not apply at the moment is dimmed and cannot be changed, by click or keyboard.

### Game: Theme

The first setting in the Game tab.

| Setting | What it does |
|---|---|
| **Felt** | The color of the table, the page and the panels: **Classic** (the green felt, the default), **Spring** (lilac), **Summer** (sea teal), **Fall** (russet, with a navy Showdown felt) or **Winter** (slate). Each tile shows its felt. The change is at once, and the browser bar takes the felt's color. |
| **Color-blind safe colors** | Off by default. On, the names, the mode chips and the selection take colors that stay apart with red-green color blindness (deuteranopia and protanopia), with any felt. The bots and the modes change color; their names and labels do not change. |

The theme is kept with the settings (and so in a backup), and is applied before the page draws, so the Classic felt never flashes first.

### Game: Table

| Setting | What it does |
|---|---|
| **Table memory** | Off by default. Shows what every player at the table has seen this hand, never a card someone holds unseen. Every strip cell, seat tag, score and hand of backs opens a popup that explains it; with this on, the popups add the trumps and Kings played and not seen yet, where the turned card went, and the suits each bot has shown void in. Your own discards and the turned card count as seen. |

The setting is kept after a reload. **Defaults** (Bots tab) does not change them.

### Game: House rules

| Setting | What it does |
|---|---|
| **Mediator picks the Showdown lead** | On by default. After the Showdown discards, the mediator picks which Showdown player leads the first trick. A bot mediator picks by its personality (see **Opponents**). Off: the Showdown player who won the latest main trick leads. A game keeps the rule it started with: a change applies from your next game, and the Settings panel and the Showdown summary say so while the running game differs. |
| **Turned-up Joker** | **Redeal** by default: when the dealer turns up the Joker, the hand is void and the same dealer deals again. Set a suit (**Spades**, **Hearts**, **Diamonds** or **Clubs**) or **Random**, to save a deal: the Joker then offers that suit for trump, as if a card of that suit was turned up. **Random** draws the suit when the Joker is turned up. Bidding goes on as usual: accept that suit in round 1 (the Joker goes to the player left of the caller), or pass, and the suit is blocked in round 2. Only in that hand, the Joker shows its suit under its corner star; it is still the Best Bower in every suit. A game keeps the rule it started with: a change applies from your next game, and the Settings panel says so while the running game differs. |
| **Polite Play** | On by default. A click on a player's trick circles shows the tricks they won this hand. Off: the circles only count, and you keep track of the tricks yourself. This is table manners, not a game rule, so a change applies at once. |

All three settings are kept after a reload. A change to **Mediator picks the Showdown lead** or **Turned-up Joker** applies from your next game: a game keeps the rules it started with, so its replay code gives the same game. **Polite Play** is not part of a game or its replay code.

### Game: Your seat

**AI can play your seat** (off by default): on, the **HUMAN** tag on your seat works (see **AI plays your seat**). Off, the tag is a label only, so a stray click cannot hand over your seat. Turning it off while the AI has your seat gives you the seat back at once. Like speed, the switch is for this page load only: a reload turns it off, and it is not in the settings, a backup or a replay code.

Who the AI plays as in your seat, and how it plays, is set in **Settings → Bots → Your seat**.

### Bots

The Bots tab has one group for each seat: **West**, **East** and **Your seat** (used when the AI plays your seat). Each group is collapsed; its header shows who sits there and how many changes it has. Inside, **Who sits** comes first, then three collapsed groups: **Skill**, **Style** and **Knowledge**.

- **Who sits** (default **From the seed**): the seed's pick, or always this bot. West and East can't both choose the same bot: the other seat goes back to the seed's pick. For your seat, a bot already at the table means the seed picks one that isn't.
- Every other setting starts at **Its own**: the bot plays that part as its personality does. When the seat has a chosen bot, **Its own** names that bot's value, for example **Its own (Bold)**. Any other choice changes that one thing, and a gold dot marks the row.
- A game takes the seat settings when it starts (your seat's when the AI first takes it), and keeps them. A change applies from your next game; under a seat, a note says what the running game seats there when it differs.
- A setting stays with its bot: swapping West and East before a game swaps the bots with their changes.
- West and East apply in Free play only. Waves and Dynamic seat their own bots, playing as themselves; the tab says so in those games. Your seat applies in every mode.
- **Results:** a bot with any change is not itself, so a game against it counts for the mode, but not for that bot or for the table. Your profile marks such a game **(tuned)**.
- **Reset this seat** sets one seat back to the seed's pick, playing as itself. **Defaults: Reset**, at the bottom of the tab, does so for every seat.
- The seat settings are kept after a reload. Settings from before this version carry over: your seat's AI personality becomes its **Who sits**, and with **Personalities** off, the one set of bot settings becomes the changes for West and East.

| Group | Settings |
|---|---|
| **Skill** | **Skill** sets hunches, brain farts and knowledge together, and shows **Custom** when they match no tier. **Hunches** and **Brain farts** fine-tune it (see below). |
| **Style** | **Bid courage**, **Real table** and **Showdown pick** (see below and **Opponents**). |
| **Knowledge** | The six knowledge switches (see below), each **Its own**, **On** or **Off**. |

Skill tiers, weakest first:

| Tier | Hunches | Brain farts | Knowledge on |
|---|---|---|---|
| **Novice** | 3 | 60% | none |
| **Casual** (default) | 10 | 30% | Watches score |
| **Club player** | 20 | 10% | Spots voids, Remembers discards, Plans showdowns, Watches score |
| **Shark** | 40 | 0% | all |

Stronger tiers think longer before each move.

Bid courage: **Timid**, **Cautious**, **Normal**, **Bold**. When a bot plans a bid, courage adds a fixed amount to the win chance of a call: −10%, −5%, 0, +5%. When a bot bids by rule (Real table, and the bots' model of the other seats), courage changes the hand value needed to call: +1.0, +0.5, 0, −0.4. In a test of 15 Casual games, the bots passed 72%, 64%, 61% and 48% of their bids.

**Real table:**

- The bot passes more in both bidding rounds: it bids by a rule instead of planning the bid, and bid courage sets the hand value it needs.
- In the first discard, they pitch their lowest cards. Jacks and the Joker stay. On equal rank, the card from the shorter suit goes first.
- When the bots read bids and play hands out in their heads, they expect the other seats to play the same way.

On, the bots are weaker.

### Skill in detail: thinking and knowledge

These fine-tune **Skill** for one seat (Settings → Bots → a seat → **Skill** and **Knowledge**).

**AI thinking.** Both settings change how long the bots think.

- **Hunches** (1–200, default 10): how many guesses about the hidden cards the bots make for each decision. Fewer hunches make them sloppier. More than 40 adds no measured strength.
- **Brain farts** (0–100%, default 30%): how often the bots imagine a random card when they replay a hand in their heads. More brain farts make them judge moves less well. 0% is the strongest setting.

**AI knowledge.** Each switch turns one kind of knowledge on or off. All on, with 40 hunches and 0% brain farts (Shark), is the strongest AI. The switches are listed by measured effect on bot strength, largest first.

| Switch | Off means the bots… |
|---|---|
| **Spots voids** | ignore which suits each player is out of |
| **Remembers discards** | forget the cards they put in the outside pile |
| **Plans showdowns** | always try to take tricks |
| **Reads bids** | treat bids as meaningless |
| **Watches score** | play for points only. On, the bots watch the race to 10 more and more as the leading score passes 5 (6: 25%, 7: 50%, 8: 75%, 9: 100%). |
| **Tracks upcard** | lose track of the turned card after the bidding |

### Tools

| Control | What it does |
|---|---|
| **Event log** | Starts the timestamped event log (public information only), shown below it. `KCT.App.explain(n)` adds a line for each bot decision of a finished game (see **Console**). |
| **Install** | What this browser needs to install the app: secure page, manifest, icons, service worker, whether the storage is persistent, and whether the browser offers an install. **Install app** shows when it does (also in the menu). **Check again** runs the check again. |
| **Self-tests: Run** | Runs the built-in tests one area at a time, so the page stays usable, and shows a summary by area, with any failures listed. |
| **Clear log** | Clears the log and the test results. |

## King points

Each time a King wins a trick, a large green **+1** appears at the center of the screen, over everything. It is tilted at random (up to 15° either way), has a green stroke and a weathered, chipped finish, and fades from green (80% opaque) at the top to clear at the bottom. It hangs for a moment. Your own +1 then drops and dissolves; a bot's flies into that bot's seat and shrinks into its score, so you can see who scored. The bot's score changes, with a flash, when the +1 lands. A seat scrolled out of view: the +1 goes to the window's edge on that side. It shows every time, and lasts longer at slower speeds.

## The table

The game is drawn as a minimal table with no instructions, for players who know the rules (the earlier Flat table, with its status line, action bar, toasts and side panel, is gone). The game still enforces every rule: cards you cannot play stay dimmed, and a confirm button waits for enough cards.

- **Seats.** The name, the score as a number, and tags in one fixed order as they come up: **Human** or **AI**, **Dealer**, **Namer**, **Kitty**, **Turn**, **Led**, then **MED** (Mediator) or **SD** (Showdown). All tags have the same size, in the bot seats and in yours. **Led** stays on through the pause after a trick, while its cards are still in the center. A bot's hand shows as small backs. Circles fill as tricks are won: 7 in a hand; a Showdown player counts Showdown tricks (5). Click the circles to see the cards of each trick that player won this hand: one column per player, headed by their name and starting with that player, with the card that led the trick ringed. With the house rule **Polite Play** off, the circles only count. During a Showdown, a Showdown player's list shows their Showdown tricks. During a Showdown, the **Dealer** tag moves to the mediator, who deals it.
- **Information strip** (the bottom row of the header, so it stays in view when you scroll): **Trump**, **Hand** and the trick number (outside trick play, the stage of the hand: Discard, Bidding, Exchange, Result or Showdown), the **Latest** line (see below), **Turned up** (**Blocked** in round 2) and **Outside** (the outside pile's count; in a Showdown, a small card per discard, yours face up). Click **Outside** to see what the pile is and the cards you put in it.
- **Play area.** Before the first trick, the kitty lies spread so you can count it, with the turned card face up on top. When everyone passes in round 1, the turned card slides out to the left and back under the kitty: tucked at the bottom, partly shown, as at a real table, its place marks its suit as blocked. In round 2, the blocked suit's button is dimmed: click it to see why it can't be selected. On your call, click a card in your hand to see which button names its suit. During the discard, the kitty lies beside the outside pile. The trick is in 3D: each bot card faces your space, the cards stack in play order, and the winning card lifts with a white edge. Every **King** has a **KING** tag. All action buttons sit at the bottom of the play area; round 2 names a suit with its symbol. When it is your move, a few words just above the buttons say what to do (**Name trump.**, **Lead a card.** or **Play a card.**), always in the same spot. Every discard says the same thing: **Reduce to 7.** (in a Showdown, **Reduce to 5.**, one card per trick), and its button says how many cards that takes (**Discard 3**, **Discard 2** or **Discard 1**). It shows once the table is still, after the cards in flight have landed. Your empty trick space has no outline. **Skip** moves to the header.
- **Information popups.** Click any strip cell (**Trump**, **Hand**, **Turned up**, **Outside**), any seat tag, a score or a hand of backs to see what it means: the trump order, who dealt and who leads, what the turned card did, a player's points this game and this hand, and so on. **Table memory** (Settings → Game) adds the counts a careful player keeps: trumps and Kings played and still out, where the turned card went, and on a bot's hand of backs, **Void of** with the suits it has shown void in (could not follow suit). With Table memory off, a bot's hand of backs shows only a note that Table memory shows them. A bot's profile (tap its figure) stays about who it is. On your move, before you pick a card, the play area explains itself too: click a trick slot to see who led, what is winning so far and what you must follow; the kitty to see what happens to it when trump is made; the outside pile in the middle to see what it is and your discards; and a dimmed card to see why you can't play it. At other times these only show, and once you pick a card a click does what it always did. A popup opens under what you clicked, or above it when it would not fit, and always inside the window.
- **Latest line and Latest Scroll.** The table has no toasts and no side panel. Each new line of the Latest Scroll drops in from above the window, exactly the size of the Latest cell, and becomes the Latest line (at most two lines; trick headings are left out). When one move adds several lines (an accept and the kitty card it moves, a trick's winner and a King point), they show together, at most two, so the first stays readable; a card played is left out then, since it is on the table. On a phone (720 px wide or less) the Latest line keeps to one line: a line too long for it shows a short form ("Hand 4: Lou deals."), and a move's second line drops in after a short pause instead. The Latest Scroll keeps the full text. When lines come faster than they can fall, the newest wins: a line still falling lands at once. Click the Latest cell (**▾**) to open the Latest Scroll under the strip, about six lines high; it pushes the table down. Oldest first, and it opens at the newest line. Click the cell again (**▴**) or press **Esc** to close it. A note from the app, such as a refused save, drops in the same way but is not added to the scroll.
- **Motion** shows each move: the deal goes round the table from the dealer's left in packets, as at a real table (3 to each player, 3 to the kitty, 4 to each, then 3 to each), the discards slide onto the outside pile (no one discards before the deal ends) and the pile then drops through a slot in the table, the dealer turns up the top kitty card, the kitty splits when trump is set (the receiver's cards go to the receiver, the rest drop through the table), Exchange and Showdown discards go to the middle of the table and drop through it, each trick card comes from its player's seat (yours rises from where it was in your hand, and your hand closes up), and the trick sweeps to the winner's circles. A thrown-in hand (all pass, or the Joker turned up) goes back to the dealer before the new deal. A Joker redeal keeps its hand number, as **Hand 1 (redeal)**; a hand that everyone passed counts as played, and the next deal is the next hand. The Outside count changes when cards drop through the table, and the circles change when the trick lands. Each step waits for the motion before it to end: a bot's move, the next trick or the next stage shows only once the cards in flight have landed, and a move you make while cards are still moving shows when they land. The empty outside pile's outline shows once the deal has landed. A card never flies off screen: when its target is out of view, it goes to the window's edge on that side. Motion follows the game speed; **Instant**, or the system setting to reduce motion, turns it off.
- **Fit to the window.** The cards get smaller, down to 40 px wide, until the table fits under the header, so a phone needs no scrolling. The hand always keeps room for 10 cards, and while the window keeps its size the cards only get smaller, so they keep one size through a game. On a window too short even then (a small phone, or a phone on its side), the page scrolls.

## Opponents

Ten named bots: Vex, Doc, Ace, Mei, Gus, Lou, Viv, Tex, Kit and Zen. Each game seats two of them, West and East. The seed picks them, unless Settings → Bots chooses who sits there (Free play), and a replay meets the same two.

- Each bot has its own color. The name has that color on the board, and the log shows it as a colored tag. You are teal.
- Tap a bot's figure to see its profile: a quote, a hint, and two bars. **Card sense** and **Nerve** go up to 4. **Set in their ways** marks a bot with human habits.
- Tap your own figure (the silhouette) to see **Your profile**: games, wins, win rate and streak, a chart of your last 20 games, and your results against each opponent and each table. Select a column header to sort. All, Free play, Dynamic and Waves filter everything below them. **Your bidding** shows how many of your calls you made and your usual hand at a call, from every game you played yourself. The results stay in this browser, and games where the AI played your seat are not counted.
- Each bot plays its own skill tier, bid courage, Real table setting and Showdown pick. In Free play, Settings → Bots can choose who sits West and East and change how each plays (see **Bots**).

| Bot | Skill | Bid courage | Real table | Showdown pick |
|---|---|---|---|---|
| Vex | Shark | Bold | | Impulsive |
| Doc | Shark | Cautious | | Shrewd |
| Ace | Club player | Bold | | Fair |
| Mei | Shark | Normal | | Shrewd |
| Gus | Casual | Bold | on | Impulsive |
| Lou | Novice | Timid | | Fair |
| Viv | Club player | Cautious | | Shrewd |
| Tex | Novice | Bold | | Impulsive |
| Kit | Novice | Cautious | on | Fair |
| Zen | Casual | Normal | on | Fair |

**Showdown pick** is how a bot picks the Showdown leader when it mediates (house rule, Settings → Game):

- **Shrewd**: the Showdown player with the lower score leads, which works against the player closer to 10. On equal scores, as Fair.
- **Fair**: the Showdown player who won the latest main trick leads, as without the house rule.
- **Impulsive**: a random Showdown player leads.

- **Auto** (Settings → Bots only): Shrewd when the bot's **Watches score** is on, Fair when it is off.

## Waves

Eighteen fixed tables, easiest first. Each wave seats two personalities, West and East. Start a wave from the menu, the URL or the console.

- The seat order is part of the wave. East gives you the trump gift when East calls, so a bold bot is easier on your right (East) than on your left (West).
- A wave always seats its own bots, playing as themselves: the West and East seat settings apply in Free play only.
- A win clears the wave. A win on the highest open wave opens the next one. A loss changes nothing except the tries.
- Each counted game on a wave that is not cleared yet adds one try. Click **Wave N of 18** in the header to see your tries.
- Leaving a game also counts as a try from hand 2 on: a new game, another wave, a `?wave=` link or discarding the game. The question before you leave says so. During hand 1 you can leave for free: you have seen one deal and no one has scored. By hand 2, restarting whenever you fall behind would raise your win rate by about 6 percentage points, and by hand 7 by about 13 (3,000 bot games, waves 1 and 7). A game whose win would not count also costs no try. A reload resumes the game.
- A win does not count when the wave was locked at the start, or when the AI played your seat at any time in the game. The first time you hand your seat to the AI in a wave that can still be cleared, the game asks first.
- A win with **Try again** counts too.
- At the end of a wave: the end buttons (see **End of a game**); after a win that opens the next wave, also **Next wave**. **New deal** plays the same wave with new cards.
- Progress is kept in the browser (`localStorage`, key `kct.waves`). Without storage, it lasts until the page reloads.

**Your win** is the win rate of a human-style bot (Casual, Real table) in your seat, from 150 bot games per table. A real first-time player wins less. A rematch is an earlier wave with the seats swapped. For how real tables differ from this bot, see [docs/human-play.md](docs/human-play.md).

| Wave | West | East | Your win | Rematch of |
|---|---|---|---|---|
| 1 | Kit | Tex | 61% | |
| 2 | Kit | Gus | 51% | |
| 3 | Zen | Tex | 51% | |
| 4 | Lou | Gus | 49% | |
| 5 | Lou | Zen | 47% | |
| 6 | Viv | Tex | 47% | |
| 7 | Kit | Zen | 46% | |
| 8 | Mei | Tex | 40% | |
| 9 | Kit | Ace | 37% | |
| 10 | Viv | Gus | 37% | |
| 11 | Lou | Vex | 35% | |
| 12 | Doc | Ace | 29% | |
| 13 | Tex | Mei | 24% | 8 |
| 14 | Ace | Doc | 21% | 12 |
| 15 | Vex | Lou | 18% | 11 |
| 16 | Tex | Viv | 18% | 6 |
| 17 | Mei | Doc | 12% | |
| 18 | Vex | Doc | 7% | |

Start a wave: `index.html?wave=3` (add `&seed=123` to fix the deals too).

```js
KCT.App.newGame(undefined, 3)      // play wave 3 with a new seed
KCT.Waves.progress()               // { unlocked, cleared, tries, total, complete }
KCT.Waves.isUnlocked(5)
KCT.Waves.tries(5)                 // games it took to clear wave 5 (or games so far)
KCT.Waves.unlockAll()              // open every wave (for testing)
KCT.Waves.reset()                  // back to wave 1
KCT.WAVES                          // the table above, with a purpose line for each wave
KCT.App.app.wave                   // { n, open, result } for the current game
KCT.App.stats.get()                // results per mode, table and opponent
KCT.App.stats.reset()              // clear all results and the last games (no undo)
KCT.App.slots.get('free')          // the saved Free play game ('dynamic', 'waves'), or null
KCT.App.newGame(undefined, undefined, { mode: 'dynamic' })   // a new Dynamic game
KCT.App.profile.get()              // the Dynamic profile
KCT.App.app.dyn.e                  // the easing of the running Dynamic game: 0 (normal) to 1 (the floor)
```

## Dynamic

A mode for new players: the bots ease off while you learn, and tighten back to normal as you improve. They never play harder than their own personalities. The design and the measurements behind it are on [issue #117](https://github.com/chaz-rikki-freedo/king-cut-throat-card-game/issues/117) and in [docs/human-play.md](docs/human-play.md).

- **Opponents:** two random bots, as in Free play, with the same seat dialog.
- **What eases:** strength only. Mainly fewer hunches; then the knowledge switches go off together; near the floor, more brain farts. A bot's style (bid courage, Real table, Showdown pick) never changes, so each bot still plays like itself. Both bots use the same easing amount. At most, each bot eases to the floor: 1 hunch, no knowledge, 60% brain farts.
- **What the bots read during a game:** only what the table saw. After each hand, a hand where you were neither caller nor receiver shows all 7 cards you kept, because you played them. Weak hands there (2 of the last 3) ease the bots off fast. Your score share and your failed calls ease them slowly. A bot may say so, in its own words, once a game.
- **Bluffing stays a real tactic.** The bots read your bids as they always do, in every mode.
- **After a game:** the app reviews your discards and bids with the whole deal, and updates your profile (`kct.profile`). The next Dynamic game starts from it. The review runs after the end-of-game box shows, never during play, and no bot reads it. Games from every mode feed it; your score share counts only from Dynamic games. Games where the AI played your seat never count.
- **Try again** plays the same game again from the profile that the game started from. The replay code keeps that starting point in its META (see [docs/replay-code.md](docs/replay-code.md), 4.4).
- **Results:** Dynamic has its own results. Dynamic wins never clear or open waves.

## AI plays your seat

Turn on **Settings → Game → AI can play your seat**, then click the **HUMAN** tag on your seat. It changes to **AI**, and the AI plays for you, with only your seat's information. Click the tag again to take your seat back. The first time, your seat gets the bot from **Settings → Bots → Your seat → Who sits**, or one that the seed picks, with that seat's changes. It keeps them for the rest of the game, however often you switch.

The AI in your seat is repeatable: with the same seed, the same personality and the same hand-overs at the same moves, **Try again** gives the same game. A different personality, a hand-over at a different move, a move you make yourself, or a different seat swap in Free play gives a different game.

The hand-over is for that game only. The next game starts with you in your seat, also after **Try again** or **New deal**. A saved game resumed with the Your seat switch off (always so after a reload) gives you your seat back; the game stays assisted.

## Replay a game

The same seed gives the same deals: `index.html?seed=123456`. No seed or code shows as text. To get one, use **Export** at the end of a game (see **End of a game**). In **Your profile**, each row of the last games table has two icons: **Watch** (an eye) opens the game in the replay viewer, and **Try again** (a counter-clockwise arrow) plays that table again, with the same mode, wave, opponents, deals and house rules. The plan for these parts: [docs/ui/plan.md](docs/ui/plan.md).

### End of a game

The Latest Scroll's last line congratulates the winner. The results dialog and the action bar show the same end buttons in every mode:

| Button | What it does |
|---|---|
| **Watch** | Watch the game again in the replay viewer. |
| **Try again** | The same deal again: the same table, cards and house rules. |
| **New deal** | New cards at the same table: the same wave, or in Free play and Dynamic, the same two opponents in the same seats. |
| **Export** | Copy the seed (the deals) or the replay code (the whole game). |
| **Next wave** | Only after a win that opens the next wave. |

**✕** (Back) in the dialog's top right returns to the table. The menu is the **☰** button in the header.

### Watch a game

The replay viewer plays a finished game again, from your seat, at the game speed. The header shows **Replay ✕**: select it to exit. It is read only: it saves nothing, records no results and runs no bots. A game you were playing waits behind it.

| Control | What it does |
|---|---|
| **Previous hand** and **Next hand** | Previous hand goes to the start of this hand, or of the hand before when you are at a hand's start. Next hand goes to the next hand's deal, or to the game's end in the last hand. A redeal is the same hand. |
| **Back** and **Forward** | One move (a play, a bid, a discard, or a step of the table such as a deal). The Left and Right arrow keys do the same. A discard by the seat at the bottom takes two steps: its cards rise first, then go to the pile. Back while they are raised lowers them. |
| **Play** or **Pause** | Plays the moves at the game speed. Space or Enter does the same. Raised discards stay up for a trick's wait before they go. Play at the end starts again from the start. |
| **Replay ✕** (header) | Exit: returns to where you were: the results dialog, Your profile, or the menu. Escape does the same. |

To see a bot's side of the game, tap its figure or name (a small circular arrow follows the name). Its seat moves to the bottom with its own hand face up; the other two hands show as backs, as that bot saw them, and you sit where the seating order puts you. Tap your own seat to come back. The log stays the same from every seat.

A game where the AI played your seat shows your seat as **AI**, with the personality it played as.

The seed is one 32-bit number. It sets the bots (Free play and Dynamic), the first dealer and the shuffles. It cannot hold more data. A **replay code** holds the full game: the seed, the mode and wave, the seats, every player decision (discards, bids, plays), the result, and the AI settings that the bots used as generic variables: the Settings-panel values (tier, courage, real table, hunches, brain farts and each knowledge switch) when a bot played with them, and a flag when a bot played as its personality (see [docs/replay-code.md](docs/replay-code.md), 4.4). The Engine keeps the decisions in `state.decisions`. System steps (deal, flip, advance) are not kept, because the state sets them. A code is about 950 to 2,200 characters, for example `KCT3-AwEGBJIhAgMA…`.

The format has room to grow: optional sections that old readers skip, a generic key/value section, notes (MARK) in the decision stream, and a rules version. The full spec is [docs/replay-code.md](docs/replay-code.md). The format holds at least 20 hands with a showdown in each hand (about 2,850 characters). Codes from the first release (`KCT1-`) still read.

The app keeps the codes of the last 20 finished games in this browser (`kct.replays`). There is no replay UI yet. Use the console:

```js
KCT.App.replayCode()                        // the current (or just finished) game as a code
KCT.App.replays.list()                      // [{ code, mode, wave, west, east, winner, scores, assisted, at }], newest first
KCT.Replay.decode(code)                     // { v, rules, seed, mode, wave, seats, decisions, result, flags, endedAt, meta, unknown }
KCT.Replay.run(code)                        // { ok, finished, state, steps } or { ok: false, error }
const c = KCT.Replay.cursor(code)           // step-by-step player
c.step()                                    // { action, events } for one Engine step, or null at the end
c.seek(40); c.state                         // go to step 40 (forward or back) and read the state
```

`run` and `cursor` take seat names as a second argument (for example `['You', 'Vex', 'Doc']`). Without them, the seats are You, West and East. A game resumed from a save made before replay codes has no decision list, so it has no code.

## Console

`KCT.App.setSeat(p, { who, tune })` sets seat `p` (0: your seat, 1: West, 2: East) as Settings → Bots does, and returns it. `who` is a bot id, or `''` for the seed's pick. `tune` replaces the seat's changes: any of `courage`, `realTable`, `leadPick`, `worlds` (hunches), `playoutSkill` (1 minus brain farts) and `knowledge` (some or all of its switches); `null` clears them. The panel follows, and the settings are kept after a reload.

```js
KCT.SelfTest.run({ games: 500 })            // tests, with 500 simulated games (default 40)
KCT.App.setSeat(1, { who: 'vex', tune: { courage: 'timid', worlds: 5 } })   // West: always Vex, timid, 5 hunches
KCT.App.setSeat(2, { who: '', tune: null })  // East: the seed's pick, playing as itself
KCT.App.newGame(123456)                     // new game with a given seed
KCT.Engine.audit(KCT.App.app.state)         // [] means all 33 cards are accounted for
await KCT.App.backup.download()             // save all app data (also a game in progress) as a .kct file
await KCT.App.backup.toCode()               // the same as a text code (KCTS1-…)
await KCT.App.backup.inspect(codeOrFile)    // what a backup holds; changes nothing
await KCT.App.backup.restore(codeOrFile)    // REPLACES all app data on this device, then reloads (no undo)
KCT.App.habits()                            // habit rates from the finished games in Your profile: yours and each bot's
KCT.App.explain(0)                          // each bot decision of your latest finished game, made again, with its options
```

`KCT.App.habits()` and `KCT.App.explain(n)` read only finished games, the last 20 in Your profile. They never read the running game.

- `habits()` counts how each seat leads, follows, trumps in, throws off when void, plays its Kings and bids. `labels` names each rate in plain words. Your column leaves out games where the AI played your seat, a bot's column leaves out games where it had changes from Settings → Bots, and every column leaves out the Showdown's tricks.
- `explain(n)` plays game `n` again (0 is the latest) and asks each bot to decide again, with the settings it played with. In Dynamic, the easing moves after each hand as it did in the game. Each decision lists how the bot decided (`plan`: play-outs, `forced`: one choice, `rule`: a fixed rule), its options with their value (its chance to win the game) and best plan, and `match`. A bot decides from what it could see and its settings alone, so `match` is true unless the Settings panel changed during a Free play game (`changed`). With the event log on, each decision is also one `AI_DECISION` line.

`KCT.App.app.state` holds every hand, so use it for testing only.

## Install and offline play

The game is a PWA (installable web app). On GitHub Pages (HTTPS), the browser offers **Install** or **Add to Home Screen**. It then opens in its own window, as **Cut-Throat**, with the keycap 3 icon, and plays offline.

| File | What it is |
|---|---|
| `manifest.webmanifest` | App name, colors and icons. |
| `sw.js` | Service worker: offline play and the update prompt. |
| `icons/` | `icon.svg` and `icon-maskable.svg` are the sources of the PNG icons. |

**Updates.** The app opens from its cache, then checks the network for a changed `index.html`. If it finds one, a note says **A new version is ready**. A page that loads but is not the game, such as a Wi-Fi sign-in page, is never offered. It shows only between games (or on the menu at launch). **Reload** loads the new version; **Later** asks again after the next game. A new version needs no version number: publish the changed `index.html`. To see which build is loaded, look at the line at the bottom of **Settings**, for example `Build edf93c8 · 2026-10-12`: the `main` commit and its date. A copy that was not published (a local file or a test run) shows `Build dev`. The check ignores changes that ad blockers make to the page, such as removed `<link>` tags, so turning one on or off is not a new version. Change `sw.js` only to change how caching works. The manifest and icons also open from the cache, and the app fetches them again in the background each time, so a changed icon arrives on the next load.

**Persistent storage.** At start-up (on HTTPS), the app asks the browser to keep its storage (`navigator.storage.persist()`), so that progress, results, saved games and replay codes are not cleared when the disk is low. It asks only while the storage is not persistent yet. Chrome and Safari decide without a prompt, and they usually agree for an installed app. Firefox asks you one time. **Settings → Install** shows the result. A Safari tab that is not installed can lose its storage after 7 days without a visit, so install the app on iPhone and iPad.

The service worker does not run from `file://`. The game still works there, without install or offline play. In a local copy, Settings says that its progress is separate from the hosted game, and the install check shows one line instead of the checks that do not apply.

## Publishing

GitHub Pages serves the `gh-pages` branch. To publish, run `tools/publish.sh` from a clean checkout:

```sh
tools/publish.sh --dry-run "0.6.35: the build shows in Settings"   # check first; nothing is pushed
tools/publish.sh "0.6.35: the build shows in Settings"
```

The script copies `index.html`, `manifest.webmanifest`, `sw.js`, `icons/` and `.nojekyll` from `origin/main` to `gh-pages`. It writes the short `main` commit and that commit's date into the `BUILD` constant in the published `index.html`, removes every comment from the published `index.html` (HTML, CSS and JavaScript, with `tools/strip-comments.js` from `main`; the code itself is not changed), commits as `Publish 0.6.35 (main edf93c8): the build shows in Settings` and pushes. The source on `main` keeps its comments. Keep `BUILD` at `{ commit: 'dev', date: '' }` on `main`: the script stops if it does not find that line. `BUILD` is not related to `RULES_VERSION` or the replay-code `VERSION`.

## Tests

The `tests/` folder has browser tests: the self-tests, two full games through the controls, stress tests for the Engine, replays, saves, backups and the AI, and a long soak. They are not part of the published app. See [tests/README.md](tests/README.md).

## Colors

Every color is a token in `:root`, registered with its family and job in `docs/ui/palette.json`. `tests/palette.js` checks that no two colors with different meanings can be mistaken for each other, also with color blindness simulated, and runs on every pull request. Read [docs/ui/colors.md](docs/ui/colors.md) before adding or changing a color.
