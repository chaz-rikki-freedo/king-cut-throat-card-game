# UI vocabulary

> **Status.** The Flat (classic) table is removed: the Advanced table is the only one. The parts that only Flat drew no longer exist in `index.html`: the trump and hand chips, the status line, the action bar (prompt and hint), bid bubbles, discard notes, the Showdown banner, the kitty and outside piles as `.pile` (with `.tucked` and `.blocked-x`), the big trump symbol, the trick label and the who lines, the last-trick row, the side panel `aside.logpanel` (`#gameLog` now lives in `#logDrop`), the toasts (`#toasts`, `.toast`), the **This hand** box of a profile, and the Interface setting. Rows below that name them describe the removed table. When no game is loaded, the **About screen** (`#about`) replaces the empty table.

Each table lists the parts of one region. The terms are in the order in which they appear on the screen, from top to bottom and from left to right.

**Code anchor** is the `id`, class or `data-action` in `index.html` that draws or handles the part. **Kind** is the text kind of the part.

| Kind | Meaning |
|---|---|
| **C** | Control: a button, switch, list or card that you can use. |
| **L** | Label: a short name of a thing ("Kitty (3)", "Dealer"). |
| **D** | Descriptor: explains what a thing is or what it means. Tooltips and setting hints are descriptors. |
| **I** | Instruction: tells you what to do now ("Choose 3 cards to discard"). |
| **S** | Status: what is happening now ("West is playing…"). |
| **R** | Record: what happened before (log lines, last trick, stats). |

## 1. Top bar

Region: `header#topbar`. Always visible. It can wrap to two rows on a narrow screen.

| Term | Also called | Code anchor | Kind | What it is |
|---|---|---|---|---|
| Menu button | Hamburger | `data-action="menu"` | C | Opens the menu dialog. The game waits while the menu is open. |
| Brand | Title, logo | `.brand` | L | The game name, "King Cut-Throat". |
| Mode chip | Mode badge | `#modeChip`, `data-action="mode-results"` | C, L | "Wave *n* of 18" (gold) or "Free play" (blue). Opens the results dialog. Hidden when no game runs. In the replay viewer: "Replay ✕", which exits the viewer. |
| Trump chip | Trump badge | `#trumpChip` | S | "Trump: ♠ Spades", or "Trump: —" before trump is set. |
| Hand chip | Counter | `#handChip` | S | "Hand 3 · Trick 4/7", or "Showdown trick 2/5". |
| Speed picker | Speed menu | `#speedSel` in `.speed-pick` | C | Slow, Normal, Fast, Instant. Not saved. |
| Settings button | Gear, sliders | `data-action="toggle-settings"` | C | Opens and closes the settings panel. |

## 2. Table

Region: `main#table`. The class `showdown` on the table changes its color during a Showdown and the Showdown setup.

### 2.1 Bot seat (West, East)

Areas: `#seat1` (West, `.seat-west`) and `#seat2` (East, `.seat-east`). Both use the same parts.

| Term | Also called | Code anchor | Kind | What it is |
|---|---|---|---|---|
| Seat head | Name row | `.seat-head` | — | The row with the face, name and tags. |
| Seat face | Portrait, avatar | `.seat-face`, `data-action="persona"` | C | The personality's portrait. Opens the profile dialog. |
| Seat name | Bot name | `.seat-name` | L | The personality's name, in its own color. |
| Seat tags | Badges, chips | `.tag` | L | The role tags of the seat. See [2.4 Seat tags](#24-seat-tags). |
| Score readout | Score | `.score`, `.flash` | S | "7 / 10". Flashes when the score changes. Capped at 10 on the board. |
| Tricks line | Trick count | `.tricks` | S | "Tricks this hand: 2". In a Showdown: "Showdown tricks: 1 · main: 3", or "Mediating · main hand: 1". |
| Card backs | Hand count | `.backs`, `.mini-back` | S | One small back for each card in the bot's hand. |
| Discard note | — | `.discard-note` | S | "Choosing 3 discards…", then "Discarded 3 ✓". Also for the Showdown discard (1). |
| Bid bubble | Speech bubble | `.bubble.pass`, `.bubble.call` | S | The seat's latest bid in this round: "Pass", "Accepts ♠", "Names ♥ Hearts". |
| Turn highlight | Active seat | `.seat.turn` | S | The seat glows while it is that player's turn. |
| Sit-out dim | Out | `.seat.out` | S | The mediator's seat is dimmed during a Showdown. |

### 2.2 Center

Area: `#center`. The middle of the table.

| Term | Also called | Code anchor | Kind | What it is |
|---|---|---|---|---|
| Showdown banner | — | `.banner` | S | "SHOWDOWN", with "*A* vs *B* · mediator: *C*". |
| Piles row | Piles | `.piles` | — | The kitty, the outside pile, the trump marker and the turned-card note. |
| Kitty pile | Kitty, blind | `.pile` (first) | L, S | The kitty cards. "Kitty (3)". During bidding: "Kitty · turned 9♠", or "Kitty · Spades blocked". In the Advanced UI (`.kpile`), on your discard or bid, a click opens what happens to the kitty (`adv-info`, kind `kitty`); the outside pile beside it (`.outpile`) opens your discards. |
| Turned card | Upcard, flip | `.card.enter` in the kitty pile | S | The top kitty card, face up, in bidding round 1. |
| Blocked mark | Cross | `.tucked`, `.blocked-x` | S | The ✕ on the turned card in round 2: its suit cannot be named. The Advanced UI has no ✕: the turned card lies tucked under the kitty (`.tuck`), the leftmost card. |
| Outside pile | Discard pile | `.pile` (second) | L | "Outside pile (12)". The discards. Used again only in a Showdown. |
| Trump marker | Big trump | `.trump-big` | S | The large trump symbol with "Trump: Spades". |
| Turned-card note | — | `.pile` with "Turned card:" | R | "Turned card: 9♠", after the bidding. |
| Trick area | Trick, table center | `.trick` | S | The cards of the current trick, or of the trick that just ended. |
| Trick label | Trick title | `.trick-label` | S | "Trick 3 of 7", or "Showdown trick 2 of 5", with "Led: ♥". |
| Trick slot | Play spot | `.slot.slot-0` … `.slot-2` | — | One spot for each seat's card. `.win` marks the winning slot. In the Advanced UI, on your play turn, a click opens what the slot means now (`adv-info`, kind `slot`): who led, what is winning so far, what you must follow. |
| Slot caption | Who | `.who`, `.lead-mark` | L, S | The player's name, "(lead)", "— wins", or "· mediator". |
| Empty slot | — | `.empty` | — | A spot for a card that has not been played yet. The Advanced UI draws it with no outline. |
| Move label | Your move | `.yourmove` | I | Advanced UI only: what you do now, in a few words ("Name trump.", "Reduce to 7.", "Reduce to 5.", "Lead a card.", "Play a card."), just above the action buttons. Shown only while it is your move. Every discard shows its goal, one card per trick to come; its button says how many cards that takes. |
| Hand summary | Result box | `.summary` | S, R | The box that replaces the trick area at the end of a hand. Variants: [2.5](#25-hand-summary-variants). |
| Call line | Meta line | `.meta` | R | "Trump ♠ Spades · named by West (round 2) · Dealer East". |
| Stats table | Hand table | `table.stats` in `.stats-wrap` | R | Tricks, SD tricks, hand points, King points and score for each player. |
| Status line | Status | `.status`, mirrored to `#liveStatus` | S | One sentence about what happens now. Screen readers hear only this line. |
| Last-trick strip | Last trick | `.lasttrick`, `.win-mini` | R | "Last trick (West won, +1 King):" and its three small cards. |

### 2.3 Your seat

Area: `#seat0` (`.me`). The bottom of the table.

| Term | Also called | Code anchor | Kind | What it is |
|---|---|---|---|---|
| Your head | My row | `.me-head` | — | The row with your face, name, tags, score, tricks line and bid bubble. |
| Your face | Your avatar | `.seat-face`, `data-action="me-profile"` | C | A silhouette on a white circle. Opens Your profile on the mode of the game at the table, or All with no game. While the AI plays your seat, the bot's face shows instead. |
| Seat toggle | Human tag, AI tag | `.tag.seat-toggle`, `data-action="toggle-autoplay"` | C, L | The Human/AI tag of your seat. A control only when **AI can play your seat** is on. |
| Action bar | Prompt bar | `.actionbar` | I, C | What you can do now. See [2.6 Action bar](#26-action-bar). |
| Hand | Your cards | `#hand`, `.hand` | C | Your cards, sorted by suit with trump first. |
| Hand note | — | `.hand .hint` | S | "No cards in hand", or "You are the mediator. Watch the Showdown." |

Card states in the hand:

| Term | Code anchor | What it is |
|---|---|---|
| Selectable card | `.selectable` | A card that you can pick for a discard. |
| Selected card | `.selected` | A card that you picked. It lifts. |
| Playable card | `.legal` | A card that you can play to the trick. |
| Unplayable card | `.illegal`, `disabled` | A card that you cannot play (you must follow suit). It is dimmed. In the Advanced UI it is `aria-disabled` instead, so a click opens why you can't play it (kind `illegal`); the click never plays it. |
| Idle card | `.idle` | Any card when it is not your turn. |

### 2.4 Seat tags

Class `.tag` in a seat head or your head.

| Term | Code anchor | Text | When it shows |
|---|---|---|---|
| Player-type tag | `.tag.you`, `.tag.ai` | Human, AI | Always. Your seat shows AI while the AI plays it. |
| Dealer tag | `.tag.dealer` | Dealer | The dealer of this hand, also during a Showdown (the mediator deals the Showdown and has the Mediator tag). |
| Namer tag | `.tag.caller` | Namer | The player who accepted or named trump. Code name: caller. |
| Kitty tag | `.tag.receiver` | Kitty | The player left of the namer, who got the kitty cards. Code name: receiver. |
| Mediator tag | `.tag.mediator` | Mediator | The 1-trick player in a Showdown. |
| Showdown tag | `.tag.duelist` | Showdown | The two tied players in a Showdown. Code name: duelist. |

### 2.5 Hand summary variants

| Term | Heading | Continue button |
|---|---|---|
| Abandoned summary | "Hand *n* abandoned" | Next deal |
| Joker-void summary | "The Joker was turned up" | Redeal |
| Hand result | "Hand *n* result" | Next hand |
| Showdown setup | "Hand *n*: Showdown!" | Deal the Showdown |
| Showdown result | "Hand *n*: Showdown result" | Next hand |

### 2.6 Action bar

Area: `.actionbar`. Its parts depend on the game moment (see [Game moments](moments.md)).

| Term | Also called | Code anchor | Kind | What it is |
|---|---|---|---|---|
| Prompt | Question | `.prompt` | I | The main line: what to decide or do. Includes a counter such as "(2/3)". |
| Hint | Help line | `.actionbar .hint` | I, D | The line under the prompt: the effect of a choice, or a rule reminder. |
| Bid buttons | — | `data-action="bid-accept"`, `"bid-pass"` | C | Round 1: "Accept ♠" and "Pass". |
| Suit buttons | Name buttons | `.btn.suit`, `data-action="name-suit"`, `"name-pass"` | C | Round 2: one button for each suit, and "Pass". The blocked suit is disabled. |
| Lead button | Showdown lead pick | `sd-lead` (`data-seat`) | C | "Mei leads": the mediator's pick of the Showdown leader (house rule). |
| Confirm button | Discard button | `confirm-discard`, `confirm-exchange`, `confirm-sd-discard` | C | "Discard 3", "Discard 1" or "Discard 2". Enabled when you picked enough cards and, for the opening and Showdown discards, it is your turn. |
| Continue button | Next button | `data-action="continue"` | C | The button that moves past a hand summary. Its label is from `CONTINUE_LABEL`. |
| Skip button | — | `data-action="skip"` | C | "Skip ▶", in a live game with you in your seat, while the two bots play their Showdown (its lead set). One press plays the rest of it at Instant, up to its result; then it is gone until the next Showdown. |
| End buttons | Game-over buttons | `ui.endButtons` | C | The buttons after the game ends. See [3.6](#36-game-over-dialog). |
| Replay controls | Viewer controls | `ui.watch`, `.watch-ctl` | C | In the replay viewer, in place of every other button: five icon buttons, Play in the middle: **Previous hand** (`watch-prev`), **Back** (`watch-back`), **Play** or **Pause** (`watch-play`), **Forward** (`watch-fwd`) and **Next hand** (`watch-next`). Exit is the mode chip. |
| Seat button | Sit button | `.seat-sit`, `data-action="watch-seat"`, `data-seat`, `.sit-ico` | C | In the replay viewer, a side seat's figure, name and a small circular arrow: watch from that seat. It moves to the bottom with its own view. |
| Wait hint | — | `.actionbar .hint` with the status | S | The status line again, while another player acts. |

## 3. Dialog layer

Layer: `#overlay`. One dialog at a time, class `.modal`. The game waits while a dialog is open.

### 3.1 Menu

`showMenu()`, `.menu.menu-stage` in `#overlay`. Opens at launch and from the menu button. The menu is the About card: the felt fills the window, kings, crowns and suit pips drift up it (`driftHTML()`), and one card (`.about-card.menu-card`) holds the menu. The card shows one view at a time (`.mview`, `data-view`, `setMenuView()`); every view but home has **‹ Back** (`.mback`). Escape goes back one view (`MENU_PARENT`), and at home closes the menu (at launch, to the About screen). Opening the menu starts at home; a redraw (a question answered, Your profile closed) keeps the view. Settings opens over it.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Menu view | `.mview`, `data-view`, `menuView` | — | `home`, `new`, `mode-dynamic`, `mode-waves`, `mode-free`, `rules`, `lore` or `code`. |
| Menu line | `.mlist button`, `menu-view`, `data-view` | C | A plain line between thin rules: a name, a short note and ›. Opens a view. |
| Update-loss note | `.wave-note` | S | Says that an update could not load your unfinished games. |

**Home** (`menuHomeHTML()`):

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Menu title | `#menuTitle` | L | "King Cut-Throat", under the four suits. |
| Epigraph | `.mepi` | D | A line of the lore: "It seems the Joker knew the conflict was intentional all along…" |
| Big button | `.mgo` | C | **Continue**, with the game in two short lines: the game being played (`close-menu`) or the last one saved (`resume-<mode>`). With no game, **New game**, which opens the New game view. |
| Home lines | `.mlist` | C | **New game** (when the big button is Continue), **How to play** and **Lore**. |
| Small links | `.mfoot` | C | **Your profile** (`menu-profile`, all modes), **Load a code**, **Settings** (`toggle-settings`), and **Install** (`install-app`) when the browser offers it. |
| Credit and build | `.about-credit`, `.about-build` | D | As on the About screen. While a dev cap is set or awards are on, the build line ends with the dev mark (`.dev-mark`): **DEV**, then the caps and `awards`. |

**New game** (`menuNewHTML()`): a line per mode with its color bar (`.mdot`) and a note: "Playing now", "Saved game", or the mode's goal.

**A mode's view** (`menuModesHTML()`, `.mview.mcard`, `data-mode`):

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Mode title | `.mtop .mode-chip` | L | The mode's chip: **Dynamic**, **Waves** or **Free play**. |
| Scoreboard | `.mboard`, `.mcap`, `.mscores` | S | The game: a caption (**Playing now**, the wave, the hand), then each player's name in their color (You in `--name0`, a bot in its `--bot-<id>`) over their score, seated as at the table: West, You, East. Without a game, **No saved game** and the mode's tagline, in the same height. |
| Mode goal | `.mtail`, `.mmeter` | C | "Beaten 6 of 10" (Dynamic, Free play) or "15 of 18 cleared" (Waves), with a gold meter and ›. Opens Your profile for the mode. |
| Wave picker | `#waveSel` | C | The open waves (and the open Shark run tables), with each table's West / East names. ✓ marks a cleared wave. |
| Discard game icon | `.mdel`, `discard-<mode>` | C | A faint trash icon on the right of the heading, only with an unfinished game. Asks first, then clears that mode's saved game without starting another. Not a result: no loss, and wave progress stays. |
| Resume button | `resume-<mode>` | C | Continues that mode's game. The main (gold) button, and the focus, when there is a game; disabled when there is none, and then **New game** (**Play wave**) is the main button. |
| Play wave button | `play-wave` | C | Starts the picked wave. **Play table** once the Shark run is open. |
| New game button | `new-free`, `new-dynamic` | C | Starts a game of that mode. |

**How to play** (`menuRulesHTML()`): the **Tutorial** row (`tutorial`, disabled: "Coming soon"), **Quick rules** (`.mrules`, `QUICK_RULES`: The game, Deck and deal, Trump order, Discard, Naming trump rounds 1 and 2, Play, Scoring, Showdown), and **Full rules** ("coming soon").

**Lore** (`menuLoreHTML()`, `.mlore`, `LORE`): the game's story: the Kings of the valleys, the three Bowers and the Joker.

**Load a code** (`menuCodeHTML()`, `#menuCode`):

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Code field | `#codeIn` | C | One line. Takes a replay code, a seed, or a `?replay=` or `?seed=` link. Nothing is read while you type; an edit clears the last reading. Enter loads. It also takes dev commands, such as `!dev awards=on` (see [tests/README.md](../../tests/README.md#dev-commands)). |
| Code reading | `#codeRead`, `readCode()` | S | Empty until **Load** or Enter. Then, for a seed, which one it is, and while a wave is open, that a wave played from it is practice (no clear, no try); for a backup, to restore it in Settings; else why it cannot load. A replay code opens the viewer. |
| Play it in | `#codeWhere`, `#codeMode` | C | Shown when a seed is loaded: Free play, Dynamic, or an open wave. A link's wave is picked when it is open. |
| Load button | `code-load` | C | **Load**, always on. It becomes **Play** once a seed is loaded; **Play** starts the seed in the chosen mode. |
| Backup hint | `.mnote` | D | "A backup is not a game code: restore it in Settings → Tools → Your data." |

### 3.3 Seat-swap dialog

`.modal.swap`, heading "Choose seats". Free play and Dynamic, once, before the dealer is drawn.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Swap explanation | `.swap p` | I | "You may swap your two opponents now…" |
| Seat card | `.swap-seat` | L, D | Side label ("Your left · West"), portrait, name and the personality's hint. |
| Swap button | `.swap-btn`, `swap-preview` | C | "⇄": swaps West and East. The table behind redraws at once. |
| Play button | `swap-done` | C | Keeps the seats, draws the dealer and starts the deal. |
| New opponents button | `swap-new` | C | Two other random opponents (a new seed). |
| Back button | `.swap-back`, `swap-back` | C | **‹ Back** in the top left, beside the centered title. Does not start the game: the table empties and the menu opens. **Esc** does the same. |
| Dynamic note | `.swap-note` | I | Dynamic only. Opponents are picked at random from those appropriate for you right now, not in turn, and the Shark limit for now: the Sharks sit out, at most one sits, or any two bots can sit. |
| Last game line | `.swap-last` | I | "Last game: Doc won · You 7 · Ace 4 · Doc 10", the latest finished Free play game. |

### 3.4 Profile dialog

`.modal.persona`. Opens from a seat face.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Profile portrait | `.p-face` | — | The large portrait. |
| Profile name | `.persona h2` | L | The name, in its color. |
| Quote | `.p-quote` | D | The personality's saying. |
| Play hint | `.p-hint` | D | How the personality plays. |
| Dials | `.p-dials`, `.pips` | D | "Card sense", "Nerve", "Reads you" and "Feints", 0 to 4 pips each. |
| Habits line | `.p-ways` | D | The bot's card habits in a few words, such as "Leads trump · wins big · Kings early". |
| Habit badge | `.habit` | D | "Set in their ways", for a personality with human habits. |

### 3.4a Your profile

`.modal.profile`. Opens from your face. It shows your results in this browser. Games where the AI played your seat are not counted.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Profile filter | `.pf-filter`, `data-action="profile-mode"` | C | All, Free play, Dynamic or Waves. Scopes every part below it. Every tab has the same order: the tiles, the chart and the insights (open), then **Lists** (collapsed). |
| Figure tiles | `.pf-tiles`, `.pf-tile` | S | Games, Wins, Win rate, Streak (from the last games), Beaten (Free play and Dynamic: the opponents beaten at least once, as the mode goal counts them), and Waves cleared (All and Waves). |
| Last games chart | `.pf-chart`, `.pf-col` | S | A column per game, up to the last 20 of the mode (under All, the latest 20 of every mode), oldest first: your final score, W or L, and a line at the best opponent score. Hover or focus a column for its tooltip (`.pf-tip`). |
| Lists | `.pf-list` | C | Collapsed rows under **Lists**, each its name and a short count: **Games** (`.pf-games`), in Free play and Dynamic **Beaten** (`.pf-beaten`: the opponents beaten, named, then those still to beat; a mode goal on the menu opens it), **By opponent** (`.pf-opps`), **By table** (`.pf-tables`) and, in Waves, **Shark tries** and **Wave tries** (`.pf-tries`). |
| Games list | `.pf-glist` | S | The same games, newest first. Each game takes two lines on a phone (one when wide): Won or Lost, the game, West / East and the scores; then when, and its actions (`.pf-acts`). |
| Watch icon | `.tiny-btn`, `data-action="replay-watch"`, `data-at` | C | An eye on a Last games row: opens the game in the replay viewer. Exit returns to Your profile. Missing when the code has a newer rules version. |
| Try again icon | `.tiny-btn`, `data-action="replay-seed"`, `data-at` | C | A counter-clockwise arrow on a Last games row: plays the same table again (mode, wave, opponents, deals and house rules). Missing when this app cannot play the game again. |
| Export icon | `.tiny-btn`, `data-action="replay-export"`, `data-at` | C | Two sheets on a Last games row: opens the Export dialog for that game, with its seed shown, **Copy seed** and **Copy replay code**. |
| Opponent table | `data-table="opp"` | C, S | In **By opponent**: games, wins, losses and win rate against each opponent. A column header sorts it (`data-action="profile-sort"`). |
| Table list | `.pf-tables` | C, S | In **By table**: the same columns for each West / East pair, in the mode shown. Per-mode tables count games from the version that added them; older games count under All only. |

### 3.5 Results dialog

`.modal.results`. Opens from the mode chip.

| Term | Heading | Contents |
|---|---|---|
| Wave tries | "Wave tries" | In Your profile, a collapsed list (`.pf-tries`): the count in its row, the summary and the table inside. One row for each open wave, newest first: wave, West / East, tries. ✓ marks a cleared wave. `.now` marks the current wave. |
| Free play wins | "Free play wins" | One row for each opponent: wins and games. |
| Results note | `.note` | D: what counts as a try or a game. |

### 3.6 Game-over dialog

Opens when a player reaches 10 points. While awards are on (`!dev awards=on`), it also opens in the replay viewer at the last move of a finished game, without the wave note or the end buttons; **‹ Back** returns to the viewer.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Winner headline | `.big` | S | "You win!" or "*Name* wins!" |
| End reason | first `p` | R | "The game ended at once, in hand 5, by …". |
| Final scores | `table` | R | Only when there are no hand stats. |
| Hand stats | `gameOverHandHTML` | R | "Hand *n* stats", or "Hand *n* so far" when the game ended mid-hand. |
| Wave note | `.wave-note` | S | Whether the game cleared the wave, or that it was practice: played from a seed you entered, so no clear and no try. |
| Back button | `.mback`, `close-overlay` | C | **‹ Back** in the top left, beside the centered title. Closes the dialog. **Esc**, or a tap outside the box, does the same. The end buttons stay in the action bar. |
| Award stroke | `.modal.gameover.award`, `data-award`, `--award0` to `--award6`, `awardBox()` | S | A dev feature, only while awards are on: a heavy stroke around the dialog in the color of your seat's award band, emerald neon green (band 6, the best) through gold (band 3) to neon red (band 0, the worst). It fades in once the grade is worked out (about 0.2 s). The stroke is the whole feature: no words, numbers or hover text explain it to the player. Not your score: see [Awards](../human-play.md#awards-how-you-did-with-your-cards-2026-10-31). |
| End buttons | `endButtonsHTML()`, `.end-btns` | C | The same in every mode, each a text label: **Watch** (`replay-watch`; dimmed for a game with no replay code), **Try again** (`replay-seed`), **New deal** (`new-deal`) and **Export** (`export`). After a win that opens the next wave, also **Next wave** (`next-wave`). |
| Export dialog | `#askLayer`, `export-seed`, `export-code`, `.export-copied` | C | **Copy seed** and **Copy replay code**. "Copied." confirms it. **‹ Back**, Escape or a click outside closes it. |

## 4. Confirm layer

Layer: `#askLayer`. Class `.modal.ask`, role `alertdialog`. Above the dialog layer. Escape or a click outside it answers Cancel.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Confirm dialog | `ask()` | — | A yes/no question. The game waits while it is open. |
| Confirm title | `#askTitle` | I | The question. |
| Confirm text | `#askText` | D | What happens if you say yes. |
| Cancel button | `ask-cancel` | C | The safe answer. |
| OK button | `ask-ok` | C | The answer that acts. It has the focus. |

Instances:

| Term | Title | OK / Cancel |
|---|---|---|
| Replace-game confirm | "Start a new Waves game?" or "Start a new Free play game?" | Start new game / Keep it |
| Discard-game confirm | "Discard your Waves game?" or "Discard your Free play game?" | Discard / Keep it |
| Seat hand-over confirm | "Let the AI play your seat?" | Let the AI play / Keep my seat |
| Tab reset confirm | "Reset the Table tab?" or "Reset the Bots tab?" | Reset / Cancel |
| Erase confirm | "Erase Waves progress?", "Erase all progress?" and so on | Erase … / Cancel |

## 5. Settings panel

Panel: `#settingsPanel`. Opens from the settings button. The class `.set-off` dims a group that does not apply (in Waves, or with personalities on).

Three tabs, `.set-tab` with `data-tab`: **Table** (`#setTabTable`, `#setPaneTable`), **Bots** (`#setTabBots`) and **Tools** (`#setTabTools`). The Table tab was called Game; a saved `kct.setTab` of `"Game"` opens Table.

Two rules keep the controls apart:

- **Reset or Erase.** **Reset this tab** ends the Table and Bots tabs: it sets that tab's settings back to their defaults, at once, and keeps all progress. **Erase**, in Tools → Your data, is the only control that deletes progress, and it reloads the page. No other control resets or deletes more than one setting.
- **House rule or Table memory.** A house rule is what the players at a real table agree on, such as Polite Play: won tricks kept face up, so anyone may count them. Table memory helps with what the rules make you remember yourself, such as your own discards: you may not look in the pile, because it holds other players' discards too. A house rule applies from your next game; a Table memory aid applies at once.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Settings header | `.set-top` | — | **‹ Back** on the left, the title "Settings" in the middle, and the tabs under them. |
| Setting section | `.set-section`, `.set-head` | L | A group with a heading. |
| Setting subgroup | `.set-group`, `.set-sub` | L | A smaller group inside a section. |
| Setting hint | `.k-hint` | D | The small text under a setting: defaults and effects. |
| Setting tooltip | `title` attribute | D | The text that shows when you hover over a setting. |

### 5.0 Table tab

`#setPaneTable`. In order: **Table memory** (`#setInterface`: Help level `#setMemPreset`, then the aids), **House rules** (`#setHouseRules`), **Theme** (`#setTheme`, below) and **Table defaults**.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| House rule switches | `#setMediatorLead`, `#setJokerFlip`, `#setPolitePlay` | C | Each applies from your next game: the game, its save and its replay code keep the rules it started with. |
| House rule notes | `#setMediatorNow`, `#setJokerNow`, `#setPoliteNow` | D | "This game started with …": shown while the running game's rule differs from the setting. |
| Table reset | `#setTableDefaults`, `table-reset` | C | **Reset this tab**: Table memory, House rules and Theme back to their defaults, after a confirm. Progress stays. |

### 5.0.1 Theme section

`#setTheme`, the last settings card of the Table tab, before Table defaults.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Felt tiles | `#setFelt`, `.felt-tile`, `.felt-radio` | C | One radio for each felt pack (Classic, Spring, Summer, Fall, Winter), drawn in that felt (`--tile-felt`, `--tile-edge`). |
| Color-blind switch | `#setColorBlind` | C | Lays the `colorblind` color pack over the felt. |
| Theme packs | `#themePacks` | — | The packs, as JSON in the head: `felts` and `colors`. Each sets only tokens. |
| Theme boot | `#themeBoot`, `window.kctTheme` | — | Applies the saved theme before the page draws; `apply(felt, colors)` changes it. |

### 5.1 Bots section

`#setBots`.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Waves note | `#setWaveNote` | D | "In Waves and Dynamic, only Your seat applies.". |
| Seat groups | `#setSeats` | — | One collapsed group per seat, `details#setSeat1` (West), `#setSeat2` (East), `#setSeat0` (Your seat). Its summary names the seat and `#setSeatSum<p>`: who sits and how many changes. |
| Seat game note | `#setSeatNow<p>` | D | What the running game seats there, when it differs from the settings. |
| Who sits list | `#seat<p>-who` | C | "From the seed", or one personality. |
| Seat subgroups | `details.seat-sub` | — | **Skill** (`#seat<p>-tier`, `-worlds`, `-playoutSkill`), **Style** (`-courage`, `-realTable`, `-leadPick`), **Knowledge** (`-k-voids` and the other five). Each control has `data-seat` and `data-field`; its first choice is **Its own**. |
| Changed row | `.set-row.changed` | D | A gold dot after the setting's name. |
| Seat AI switch | `#setSeatAI`, in `#setSeat0` | C | "AI can play your seat": first in the Your seat group; makes the seat toggle work. |
| Forced plays switch | `#setForced`, in `#setSeat0`; `#panelForced` in the Human tag's popup | C | "Forced plays": under the Seat AI switch, and in the popup of your Human tag (`.pswitch`). On, your only legal card in a trick plays itself. Kept. |
| Reset this seat | `seat-reset` | C | One seat back to the seed's pick, playing as itself. |
| Bots reset | `#setBotDefaults`, `settings-reset` | C | **Reset this tab**, under **Bot defaults**: every seat back to the seed's pick, after a confirm. Progress stays. |

### 5.2 Advanced section

Removed: its settings are in each seat's **Skill** and **Knowledge** groups.

### 5.3 Your seat section

Removed: **AI can play your seat** is in Bots → Your seat (see 5.1).

### 5.4 Defaults row

Removed: each settings tab ends with **Reset this tab** (see 5.0 and 5.1).

### 5.5 Tools section

`#setTools`.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Logging switch | `#setEnable` | C | Turns the debug log on. |
| Local-copy note | `#setLocalNote` | D | Shows when the page was opened from a file. |
| Install group | `#setInstall`, `.install-check` | S | A checklist of why the app can or cannot install. |
| Check again button | `install-check` | C | Runs the install check again. |
| Install app button | `install-app`, `#setInstallBtn` | C | Shows when the browser offers an install. |

#### Your data

`#setData`, last in Tools, under Diagnostics: Back up, Restore, then Erase.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Save file button | `backup-save` | C | Saves a backup as a `.kct` file. |
| Choose file button | `backup-restore`, `#backupFile` | C | Picks a backup file, then opens the restore confirm. |
| Data note | `#setDataNote` | D | Says what happened: the file saved, or a file that is not a backup (nothing changed). |
| Restore confirm | `ask` with `danger`, `table.data-cmp` | D | **Replace all data?**: this device and the backup side by side, no undo. **Cancel** has the focus; **Replace all data** is red (`.btn.danger`). |
| Erase list | `#setClientReset` | C | What to delete, from one mode to everything: Waves progress, Dynamic progress, Free play history, All progress, Progress + settings, Everything + game files. |
| Erase button | `client-reset` | C | **Erase…**: asks first, then deletes and reloads the page. |

### 5.6 Debug area

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Test results | `#setTests`, `.t-sum`, `.t-fail` | S | The self-test summary and failures. |
| Debug log | `#setLog` | R | The logger lines, when logging is on. |
| Settings footer | `.set-bottom` | C | **Run self-tests** (`run-tests`) and **Clear** (`clear-log`). |

## 6. Log panel

Region: `aside.logpanel`. The player name for it is **Latest Scroll**. In the Advanced UI, `#gameLog` moves into the dropdown `#logDrop` under the information strip, and the panel is hidden.

| Term | Also called | Code anchor | Kind | What it is |
|---|---|---|---|---|
| Log heading | — | `.logpanel h2` | L | "Latest Scroll". |
| Log | Game log, scroll | `#gameLog`, `.gamelog` | R | One line for each event of this game. Cleared at each new game. |
| Winner line | — | `li.end` | S | The last event of a game: it congratulates the winner. At the game's end the Latest cell shows only this line. |
| Hand line | Blue line | `li.h` | R | Deals, trump calls and hand results. |
| Showdown line | Pink line | `li.s`, `li.sd` | R | Showdown events, indented. |
| King line | Gold line | `li.k` | R | "♔ +1 to West…". |
| Trick head line | — | `li.trick-head` | R | "Hand 2 · Trick 3/7", with the leader on trick 1. |
| Play line | — | `li.play` | R | One card played. |
| Detail line | Indent | `li.ind` | R | A line under the previous line. |
| Game-end line | Win line | `li.w.end` | R | The winner, in large green text. |
| Line gap | — | `li.gap` | — | Extra space before a new hand or a Showdown. |
| Phrase highlight | Highlight | `.hl-trick`, `.hl-trump`, `.hl-sd`, `.hl-discard`, `.hl-deal`, `.hl-pass`, `.hl-turn`, `.hl-blocked`, `.hl-joker`, `.hl-loss` | — | The color of a key phrase in a line. |
| Name chip | Player color | `.p0`, `.p1`, `.p2` | — | A player's name on that seat's color. |
| Card tag | Inline card | `.card-tag`, `.rank`, `.pip-red`, `.pip-black` | — | A card such as "10♥" inside a line. |

## 7. Notices

| Term | Also called | Code anchor | Kind | What it is |
|---|---|---|---|---|
| Toast stack | Toasts | `#toasts` | — | Notices under the top bar. They fade by themselves. |
| Toast | Popup, flash message | `.toast`, `.toast.info`, `.toast.neg` | S | One short notice: trump calls, King points, score changes, "SHOWDOWN!", a refused save. Not in the Advanced UI. |
| Latest cell | Latest line | `#latestCell`, `#latestLine` | S, C | Advanced UI. The newest log line, trick headings left out. One line on a phone: a short form when the full line does not fit (`shortLine`). Opens and closes the Latest Scroll dropdown (`toggle-log`). |
| Drop-in | Toast (Advanced UI) | `.latest-drop` | S | Advanced UI. A new log line, or an app note, falling from above the window into the Latest cell. |
| Update note | Update bar | `#updateNote` | S, C | "A new version is ready." with **Reload** (`update-reload`) and **Later** (`update-later`). Shows only between games. |
| Live status | Screen-reader status | `#liveStatus` | S | A hidden copy of the status line for screen readers. |

## 8. Card

The card is a part that many areas use. Code: `Render.cardHTML`.

| Term | Also called | Code anchor | What it is |
|---|---|---|---|
| Card face | Card | `.card` with `.red`, `.black`, `.joker` | A face-up card. `.trump` marks a trump card. |
| Corner index | Index | `.c-tl` (top left), `.c-br` (bottom right) | The rank and suit in the corners. The Joker has a star at top left only. |
| Suit art | Suit | `.c-suit` (card), `.m-suit` (micro card), `.t-suit` (text) | Every suit is drawn (`SUIT_SVG`), at the same width for each suit. In text, `SuitText` draws each ♠♥♦♣ and keeps the symbol, hidden, for screen readers and copy. A select option keeps the plain symbol. |
| Joker suit | — | `.c-suit` in `.c-tl` | House rule **Turned-up Joker**: the suit a turned-up Joker took, drawn under its corner star. Only in that hand. Every suit is drawn at the same width. |
| Center pip | Pip | `.c-mid` | The large suit symbol (★ for the Joker). |
| Joker label | — | `.c-joker` | "JOKER". |
| Role tag | Bower tag | `.c-tag` | "BEST" (Joker), "RIGHT" (Right Bower), "LEFT ♠" (Left Bower). Shows only when trump is set. |
| New badge | — | `.c-new` | "NEW" on the kitty cards that you just received. |
| Card back | Back | `.card.back` | A face-down card in a pile. |
| Mini back | — | `.mini-back` | A small back in a bot's card backs. |
| Enter motion | Deal-in | `.enter` | The motion of a card that has just been played or turned. |
