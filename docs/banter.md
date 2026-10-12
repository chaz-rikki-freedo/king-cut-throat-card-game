# Opponent banter

Three short in-game lines for each personality. The lines draw on each bot's profile (`PERSONAS` in `index.html`) and on two sets of results: the wave table and a bot-only round-robin.

## Data

### Round-robin (bots only)

Source: `node tests/roundrobin.js 4 4 1`. Each of the 120 tables of three personalities played 4 games, with the seat orders rotating from table to table. That makes 480 games, and each bot played 144 games. An even share is 33.3%. With 144 games, the margin is about ±8 points (95%), so the top four are a statistical tie.

| Rank | Bot | Won | Win rate | South / West / East |
|---|---|---|---|---|
| 1 | Doc | 73 | 50.7% | 45.8 / 66.0 / 40.8 |
| 2 | Mei | 71 | 49.3% | 51.1 / 44.0 / 53.1 |
| 3 | Ace | 70 | 48.6% | 52.0 / 48.9 / 44.7 |
| 4 | Vex | 67 | 46.5% | 43.8 / 50.0 / 45.8 |
| 5 | Viv | 61 | 42.4% | 34.0 / 48.9 / 44.0 |
| 6 | Gus | 39 | 27.1% | 28.0 / 25.0 / 28.3 |
| 7 | Zen | 35 | 24.3% | 28.9 / 22.4 / 22.0 |
| 8 | Lou | 24 | 16.7% | 15.4 / 17.0 / 17.8 |
| 9 | Kit | 22 | 15.3% | 12.8 / 18.8 / 14.3 |
| 10 | Tex | 18 | 12.5% | 6.3 / 20.4 / 10.6 |

South is the seat you sit in, West is on your left, and East is on your right.

### Wave table (against your seat)

The **Your win** column in the README shows how hard each bot is on a human-style player. Vex holds that player down the most (the final boss, wave 18: 7%), and Doc comes next.

### What the lines use

- **Doc** wins the most games overall and is strongest on your left (66% from West).
- **Vex** beats you more than it beats the other bots.
- **Mei** and **Ace** place second and third. Ace, a club player, keeps up with the sharks.
- **Viv** is a strong bot but is weakest in the South seat.
- **Tex** is last against bots, and its bold calls feed the other players.

## Lines

| Bot | Lines |
|---|---|
| Vex | "Less than you think. Enough." · "Read that." · "Your move. Wrong one." |
| Doc | "Seen it. Won it." · "I only call what I keep." · "On your left. Lucky me." |
| Mei | "That was trump six." · "Counted. Checked." · "I counted. You didn't." |
| Ace | "Lucky? Good." · "Call it. I dare you." · "Club player. Shark results." |
| Viv | "Now it's interesting." · "Waited. Worth it." · "Pass. Yawn." |
| Gus | "Ha! Trump? Sure!" · "Win some, lose most." · "Worth a shot!" |
| Zen | "The cards came." · "Patience, then Kings." · "A loss is a lesson." |
| Lou | "Pass. Sorry." · "Oh no. Trump." · "Wait, I won?" |
| Kit | "Is that good?" · "Which one's trump?" · "My turn? Oh!" |
| Tex | "Deal 'em again." · "Called it. Lost it." · "Pass? Never heard of it." |
