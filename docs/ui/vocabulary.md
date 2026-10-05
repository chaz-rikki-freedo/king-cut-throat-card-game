# UI vocabulary

Each table lists the parts of one region. The terms are in the order in which they appear on the screen, from top to bottom and from left to right.

**Code anchor** is the `id`, class or `data-action` in `index.html` that draws or handles the part. **Kind** is the text kind of the part. The UI levels use it to choose what to show (see [UI levels](levels.md)).

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
| Mode chip | Mode badge | `#modeChip`, `data-action="mode-results"` | C, L | "Wave *n* of 18" (gold) or "Free play" (blue). Opens the results dialog. Hidden when no game runs. |
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
| Kitty pile | Kitty, blind | `.pile` (first) | L, S | The kitty cards. "Kitty (3)". During bidding: "Kitty · turned 9♠", or "Kitty · Spades blocked". |
| Turned card | Upcard, flip | `.card.enter` in the kitty pile | S | The top kitty card, face up, in bidding round 1. |
| Blocked mark | Cross | `.tucked`, `.blocked-x` | S | The ✕ on the turned card in round 2: its suit cannot be named. |
| Outside pile | Discard pile | `.pile` (second) | L | "Outside pile (12)". The discards. Used again only in a Showdown. |
| Trump marker | Big trump | `.trump-big` | S | The large trump symbol with "Trump: Spades". |
| Turned-card note | — | `.pile` with "Turned card:" | R | "Turned card: 9♠", after the bidding. |
| Trick area | Trick, table center | `.trick` | S | The cards of the current trick, or of the trick that just ended. |
| Trick label | Trick title | `.trick-label` | S | "Trick 3 of 7", or "Showdown trick 2 of 5", with "Led: ♥". |
| Trick slot | Play spot | `.slot.slot-0` … `.slot-2` | — | One spot for each seat's card. `.win` marks the winning slot. |
| Slot caption | Who | `.who`, `.lead-mark` | L, S | The player's name, "(lead)", "— wins", or "· mediator". |
| Empty slot | — | `.empty` | — | A spot for a card that has not been played yet. |
| Hand summary | Result box | `.summary` | S, R | The box that replaces the trick area at the end of a hand. Variants: [2.5](#25-hand-summary-variants). |
| Call line | Meta line | `.meta` | R | "Trump ♠ Spades · named by West (round 2) · Dealer East". |
| Stats table | Hand table | `table.stats` in `.stats-wrap` | R | Tricks, SD tricks, hand points, King points and score for each player. |
| Status line | Status | `.status`, mirrored to `#liveStatus` | S | One sentence about what happens now. Screen readers hear only this line. |
| Last-trick strip | Last trick | `.lasttrick`, `.win-mini` | R | "Last trick (West won, +1 King):" and its three small cards. |

### 2.3 Your seat

Area: `#seat0` (`.me`). The bottom of the table.

| Term | Also called | Code anchor | Kind | What it is |
|---|---|---|---|---|
| Your head | My row | `.me-head` | — | The row with your name, tags, score, tricks line and bid bubble. |
| Seat toggle | Human tag, AI tag | `.tag.seat-toggle`, `data-action="toggle-autoplay"` | C, L | The Human/AI tag of your seat. A control only when **AI can play your seat** is on. |
| Playing-as note | — | `.playing-as` | S | "playing as Nora", with a face, while the AI plays your seat. |
| Action bar | Prompt bar | `.actionbar` | I, C | What you can do now. See [2.6 Action bar](#26-action-bar). |
| Hand | Your cards | `#hand`, `.hand` | C | Your cards, sorted by suit with trump first. |
| Hand note | — | `.hand .hint` | S | "No cards in hand", or "You are the mediator. Watch the Showdown." |

Card states in the hand:

| Term | Code anchor | What it is |
|---|---|---|
| Selectable card | `.selectable` | A card that you can pick for a discard. |
| Selected card | `.selected` | A card that you picked. It lifts. |
| Playable card | `.legal` | A card that you can play to the trick. |
| Unplayable card | `.illegal`, `disabled` | A card that you cannot play (you must follow suit). It is dimmed. |
| Idle card | `.idle` | Any card when it is not your turn. |

### 2.4 Seat tags

Class `.tag` in a seat head or your head.

| Term | Code anchor | Text | When it shows |
|---|---|---|---|
| Player-type tag | `.tag.you`, `.tag.ai` | Human, AI | Always. Your seat shows AI while the AI plays it. |
| Dealer tag | `.tag.dealer` | Dealer | The dealer of this hand. |
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
| Confirm button | Discard button | `confirm-discard`, `confirm-exchange`, `confirm-sd-discard` | C | "Discard 3", "Discard 1" or "Discard 2". Enabled when you picked enough cards. |
| Continue button | Next button | `data-action="continue"` | C | The button that moves past a hand summary. Its label is from `CONTINUE_LABEL`. |
| Skip button | — | `data-action="skip"` | C | "Skip ▶", during a Showdown between the two bots. |
| End buttons | Game-over buttons | `ui.endButtons` | C | The buttons after the game ends. See [3.6](#36-game-over-dialog). |
| Wait hint | — | `.actionbar .hint` with the status | S | The status line again, while another player acts. |

## 3. Dialog layer

Layer: `#overlay`. One dialog at a time, class `.modal`. The game waits while a dialog is open.

### 3.1 Menu dialog

`.modal.menu`. Opens at launch and from the menu button.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Welcome dialog | `showMenu(true)` | — | The menu at launch. Heading "Welcome back" when a game can resume, else "King Cut-Throat". |
| Menu heading | `.menu h2` | L | "Welcome back", "King Cut-Throat" or "Menu". |
| Update-loss note | `.wave-note` | S | Says that an update could not load your unfinished games. |
| Menu list | `.menu-list` | — | The list of menu items. |
| Menu item | `.menu-item` | C | A button with a title (`b`) and a subtitle (`small`). |
| Menu subtitle | `.menu-item small` | D | The line under the title, for example the saved game or "Coming soon". |
| Resume item | `resume-waves`, `resume-free` | C | "Resume Waves" or "Resume Free play", with the saved game line. |
| Wave picker | `.menu-wave`, `#waveSel` | C | The list of open waves, with each wave's West / East names. ✓ marks a cleared wave. |
| Play wave item | `play-wave` | C | Starts the picked wave. |
| New game item | `new-free` | C | Starts Free play with two random opponents. |
| Tutorial item | `tutorial` | C | Disabled: "Coming soon". |
| Install item | `install-app` | C | Shows only when the browser offers an install. |
| Rules item | `menu-rules` | C | Opens the rules dialog. |
| Just enter item | `just-enter` | C | At launch only: closes the menu and shows the empty table. |
| Close item | `close-menu` | C | From the menu button: closes the menu. |

### 3.2 Rules dialog

`showRules()`. Heading "King Cut-Throat — quick rules". A list of rules (D) and a **Back** button (`menu-back`) that returns to the menu.

### 3.3 Seat-swap dialog

`.modal.swap`, heading "Choose seats". Free play only, once, before the first discard.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Swap explanation | `.swap p` | I | "You may swap your two opponents now…" |
| Seat card | `.swap-seat` | L, D | Side label ("Your left · West"), portrait, name and the personality's hint. |
| Swap button | `.swap-btn`, `swap-preview` | C | "⇄": swaps West and East. The table behind redraws at once. |
| Play button | `swap-done` | C | Keeps the seats and starts the discard. |

### 3.4 Profile dialog

`.modal.persona`. Opens from a seat face.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Profile portrait | `.p-face` | — | The large portrait. |
| Profile name | `.persona h2` | L | The name, in its color. |
| Quote | `.p-quote` | D | The personality's saying. |
| Play hint | `.p-hint` | D | How the personality plays. |
| Dials | `.p-dials`, `.pips` | D | "Card sense" and "Nerve", 1 to 4 pips each. |
| Habit badge | `.habit` | D | "Set in their ways", for a personality with human habits. |

### 3.5 Results dialog

`.modal.results`. Opens from the mode chip.

| Term | Heading | Contents |
|---|---|---|
| Wave tries | "Wave tries" | One row for each open wave, newest first: wave, West / East, tries. ✓ marks a cleared wave. `.now` marks the current wave. |
| Free play wins | "Free play wins" | One row for each opponent: wins and games. |
| Results note | `.note` | D: what counts as a try or a game. |

### 3.6 Game-over dialog

Opens when a player reaches 10 points.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Winner headline | `.big` | S | "You win!" or "*Name* wins!" |
| End reason | first `p` | R | "The game ended at once, in hand 5, by …". |
| Final scores | `table` | R | Only when there are no hand stats. |
| Hand stats | `gameOverHandHTML` | R | "Hand *n* stats", or "Hand *n* so far" when the game ended mid-hand. |
| Wave note | `.wave-note` | S | Whether the game cleared the wave. |
| View table button | `close-overlay` | C | Closes the dialog. The end buttons stay in the action bar. |
| End buttons | `endButtonsHTML()` | C | Free play: **New Game**, **Replay Seed**, **Menu**. Waves: **Next wave** or **Try again**, **Replay Seed**, **Menu**. |

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
| Seat hand-over confirm | "Let the AI play your seat?" | Let the AI play / Keep my seat |

## 5. Settings panel

Panel: `#settingsPanel`. Opens from the settings button. The class `.set-off` dims a group that does not apply (in Waves, or with personalities on).

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Settings header | `.set-top` | — | The title "Settings" and the **✕ Close** button. |
| Setting section | `.set-section`, `.set-head` | L | A group with a heading. |
| Setting subgroup | `.set-group`, `.set-sub` | L | A smaller group inside a section. |
| Setting hint | `.k-hint` | D | The small text under a setting: defaults and effects. |
| Setting tooltip | `title` attribute | D | The text that shows when you hover over a setting. |

### 5.1 Bots section

`#setBots`.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Personalities switch | `#setPersonas` | C | "Each bot plays its own way". |
| Waves note | `#setWaveNote` | D | "Waves always use their personalities…". |
| Skill list | `#setTier` | C | Novice, Casual, Club player, Shark, Custom. |
| Bid courage list | `#setCourage` | C | Timid, Cautious, Normal, Bold. |
| Real table switch | `#setRealTable` | C | "Human habits". |

### 5.2 Advanced section

`details#setAdvanced`. Closed by default.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| AI thinking group | `#setThinking` | — | **Hunches** (`#setWorlds`, 1–200) and **Brain farts** (`#setSkill`, 0–100 %, readout `#setSkillOut`). |
| AI knowledge group | `#setKnowledge` | — | Six switches, `data-knowledge`: Spots voids, Remembers discards, Plans showdowns, Reads bids, Watches score, Tracks upcard. |

### 5.3 Your seat section

`details#setSeat`. Closed by default.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Seat AI switch | `#setSeatAI` | C | "AI can play your seat": makes the seat toggle work. |
| Seat personality list | `#setSeatPersona` | C | "From the seed", or one personality. |

### 5.4 Defaults row

`.set-actions`. The **Defaults** button (`settings-reset`) and its hint.

### 5.5 Tools section

`#setTools`.

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Logging switch | `#setEnable` | C | Turns the debug log on. |
| Seed readout | `#setSeed`, `.set-seed` | L | The seed of the current game. |
| Copy seed button | `copy-seed`, `#setCopied` | C | Copies the seed. "Copied" confirms it. |
| Local-copy note | `#setLocalNote` | D | Shows when the page was opened from a file. |
| Install group | `#setInstall`, `.install-check` | S | A checklist of why the app can or cannot install. |
| Check again button | `install-check` | C | Runs the install check again. |
| Install app button | `install-app`, `#setInstallBtn` | C | Shows when the browser offers an install. |

### 5.6 Debug area

| Term | Code anchor | Kind | What it is |
|---|---|---|---|
| Test results | `#setTests`, `.t-sum`, `.t-fail` | S | The self-test summary and failures. |
| Debug log | `#setLog` | R | The logger lines, when logging is on. |
| Settings footer | `.set-bottom` | C | **Run self-tests** (`run-tests`) and **Clear** (`clear-log`). |

## 6. Log panel

Region: `aside.logpanel`. The player name for it is **Latest Scroll**.

| Term | Also called | Code anchor | Kind | What it is |
|---|---|---|---|---|
| Log heading | — | `.logpanel h2` | L | "Latest Scroll". |
| Log | Game log, scroll | `#gameLog`, `.gamelog` | R | One line for each event of this game. Cleared at each new game. |
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
| Toast | Popup, flash message | `.toast`, `.toast.info`, `.toast.neg` | S | One short notice: trump calls, King points, score changes, "SHOWDOWN!", a refused save. |
| Update note | Update bar | `#updateNote` | S, C | "A new version is ready." with **Reload** (`update-reload`) and **Later** (`update-later`). Shows only between games. |
| Live status | Screen-reader status | `#liveStatus` | S | A hidden copy of the status line for screen readers. |

## 8. Card

The card is a part that many areas use. Code: `Render.cardHTML`.

| Term | Also called | Code anchor | What it is |
|---|---|---|---|
| Card face | Card | `.card` with `.red`, `.black`, `.joker` | A face-up card. `.trump` marks a trump card. |
| Corner index | Index | `.c-tl` (top left), `.c-br` (bottom right) | The rank and suit in the corners. |
| Center pip | Pip | `.c-mid` | The large suit symbol (★ for the Joker). |
| Joker label | — | `.c-joker` | "JOKER". |
| Role tag | Bower tag | `.c-tag` | "BEST" (Joker), "RIGHT" (Right Bower), "LEFT ♠" (Left Bower). Shows only when trump is set. |
| New badge | — | `.c-new` | "NEW" on the kitty cards that you just received. |
| Card back | Back | `.card.back` | A face-down card in a pile. |
| Mini back | — | `.mini-back` | A small back in a bot's card backs. |
| Enter motion | Deal-in | `.enter` | The motion of a card that has just been played or turned. |
