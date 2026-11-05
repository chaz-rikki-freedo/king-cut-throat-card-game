# Table depth

Table depth makes the table read as a physical card table: each card sits at a height over the felt, and the shadow it
casts comes from that height. It changes how the table looks, never how the game plays. The code is section 7d
(`DEPTH` and `Depth`) of `index.html`.

## Goals

- Keep the composition, proportions, colors, type and information hierarchy as they are.
- Spend the effect on the played cards, your hand, card shadows and height.
- Keep informational parts (the info strip, tags, scores) still.
- Work by touch first. Don't depend on hover.
- Prefer small depth cues over large movement. Never make a card harder to read.

## The planes

| Plane | What it holds | Height in Still |
|---|---|---|
| Table | The felt | 0 |
| Panels | The seats and your panel | `panelLift` |
| Played cards | The trick | `trickZ`, and `winZ` for the winner |
| Your hand | Your cards | `handRest`, more as you touch or select one |
| Light | The shadows of everything above | From each height |

The light is fixed above the table. A shadow falls `shadowReach × height` below its card and blurs
`shadowBase + shadowBlur × height`, so a higher card casts a longer, softer shadow.

## The setting

Settings → Table → Theme → **Table depth**:

- **Still** (the default): the depth rules apply. A card in your hand lifts while you touch it. With a mouse, it
  lifts while the pointer is over it.
- **Tilt**: everything in Still, and the table also shifts a little as you tilt your phone. On a computer, the mouse
  gives the same input. See [Tilt](#tilt).
- **Off**: the classic table, exactly as before Table depth.

The setting is kept with the other settings (`kct.settings`, `depth`), so a backup holds it. **Reset this tab** sets
it back to Still.

## Tilt

Tilt turns the device's angle, or the mouse's place on a computer, into one vector from -1 to 1 on each axis. Each
plane moves by its own share of it, over its parent's:

| Plane | At full tilt | Value |
|---|---|---|
| Table and info strip | Stay | None |
| Panels | Shift | `panelShift` |
| Trick area | Shift | `trickShift` |
| Played cards | Shift over the trick area; the winner, higher, shifts more (`cardShift × winZ / trickZ`) | `cardShift` |
| Your hand | Moves with its panel | None |

A negative value moves a plane the other way. Shadows stay as they are.

### Cost

Tilt has to stay cheap on a phone, so each frame touches as little as possible:

- The script writes each plane's `translate` on that element alone (`#seat1`, `#seat2`, `#seat0`, the trick, and
  the winner's slot), never a custom property on an ancestor, which would restyle the whole table. Every layer moved
  costs the frame, so your hand moves with its panel and the played cards with the trick area.
- Each plane is its own layer (`will-change: translate`), so a move needs no paint and no raster.
- The planes move on the screen's own frames, `tiltHz` times a second (60: every frame; a timer would drift against
  the frames and step unevenly). A plane that moved less than half a pixel isn't touched.
- No transition or animation carries a plane between updates: the browser ticks either on the page every frame,
  which costs more than the write itself.
- Shadows don't follow the tilt: a changing shadow repaints its card.
- FX's wait for a still table (`busyFor`) ignores `box-shadow` transitions, so a shadow never holds up your turn.

Measured in Chromium with the CPU slowed 4 times, over 3 s of steady small tilts on your turn:

| | First Tilt | 15 a second | 60 a second (now) |
|---|---|---|---|
| Style, layout, paint and commit | 2,553 ms | about 240 ms | about 445 ms |
| Raster | 901 ms | 0 ms | 0 ms |
| Paints | 576 | 30 | 0 |

15 a second was cheapest but stepped visibly on a phone, so the default is every frame. 30 a second costs about
340 ms.

How a reading becomes the vector:

1. **Level.** The angle when Tilt starts, or when the page shows again, is level. Level then follows the grip over
   `driftSec`, so a new grip settles back to flat and only a quick tilt moves the table. **Level** in the tuning strip
   makes the present angle level at once.
2. **Dead zone and full tilt.** A tilt within `deadZone` degrees of level reads 0, so a steady hand keeps the table
   still. At `tiltRange` degrees, the tilt is full.
3. **Smoothing.** The table follows the vector over `smoothMs`, which also removes sensor jitter.
4. **Rest.** The vector eases back to 0, and the updates stop, when:
   - the sensor stops,
   - speed is Instant or the system asks for reduced motion,
   - a menu, Settings or a dialog covers the table,
   - the page is hidden.
5. **Hold.** While a finger touches the table, the vector holds, so a card never moves under the finger.
6. **Calm.** While cards move (a deal, a play, a sweep), the vector eases down to `motionCalm` of itself (a third),
   and back once they land. The moving cards have the stage, and the page's time goes to them and their sounds. FX
   says how long the motion runs after each draw (`busyFor`).

The sensor is read only in Tilt. A browser that asks before a page reads motion (iOS) is asked when you choose Tilt.
If it asks only from a tap, the game explains first, and the browser's question comes from the tap on **Continue**.
On a later visit, the first tap asks again; the browser usually remembers the answer. If motion is refused, the
setting stays as it was, and a note under the row says how to allow it.

`orientationOn` and `pointerOn` turn each input off, and `pointerRange` sets how far the mouse reaches.

## Motion

The table's motion (FX, section 7b) keeps its own paths and times; depth adds height only, as separate animations of
`--lift` (registered with `@property`, so it animates) and `scale`. The sound and vibration beats keep their times.

| Moment | What depth adds | Values |
|---|---|---|
| A card is played | It rises on its way to the trick, highest at 45% of the slide, grows a little, and comes down onto the trick. Its shadow grows and tightens with it. | `playArc`, `playGrow` |
| A trick is won | Each card lifts off the felt as it sweeps to the winner. | `sweepArc` |
| Trump is known | A light passes once over each trump in your hand and over the turned-up card. | `sheenMs` (0: none), `sheen` |

None of it runs in Off, at Instant, with reduced motion, or at Fast when `fastMotion` is 0.

## Rules for the code

- Change only `transform`, `translate` and `box-shadow`. No card moves its place in the layout,
  and in Tilt the hand holds still under a finger.
- Read every number from `DEPTH`. The CSS reads them as `--dp-*` custom properties under `html.depth` (and
  `html.tilt`). A value marked `js` is read by the script only. The `depth`
  self-test area checks that the CSS reads exactly the properties that `DEPTH` gives.
- A card lifts over `liftMs`. It lifts at once at speed Instant, under the system's reduced-motion setting, and at
  Fast when `fastMotion` is 0.
- Shadows reuse colors on the registry (`docs/ui/palette.json`). Don't add a color for depth.

## Tuning during a game

1. In the menu, type `!dev parallax` in **Load a code**, and then select **Load**.
2. Start or resume a game. A two-row strip covers the header, so the trick and your hand stay in view. It stays for
   the tab, also after a reload.
3. Choose a value in the list, and then move the slider. The table changes at once. A tuned value shows a dot in the
   list.
4. Select the **Off** checkbox to compare with the classic table. It doesn't change the setting.
5. Select **Copy** to copy every value as JSON, to paste into `DEPTH`'s defaults.
6. In Tilt, select **Level** to make the present angle level.
7. Select **▴** to fold the strip into a small **Depth** tab in the bottom-right corner. Select the tab to open the
   strip again.

**Reset** returns every value to `DEPTH`'s. The ✕ closes the panel. `!dev reset:parallax` also drops the values.
Tuned values last for the tab only (sessionStorage `kct-depth`), and a backup never holds them.

## Next steps

| Step | Scope |
|---|---|
| 1 (done, PR #308) | `DEPTH`, the Still and Off setting, heights and shadows, the touch lift, and the tuning panel. |
| 2 (done, PR #309) | Tilt: device orientation and the mouse, opt-in, with the planes and shadows above. |
| 3 (this) | Motion: a played card's rise, a won trick's lift and the trump light. |
