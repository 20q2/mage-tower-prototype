# Mage Tower — Game Theory & Balance Analysis

## Current Parameters

- **Board:** 8 rows x 3 columns (landscape: 8 cols x 3 rows visually)
- **Actions:** 3 per turn (play card = 1 action, move 1 step = 1 action)
- **Draw:** 1 card per turn (start of turn)
- **Starting hand:** 3 cards
- **Win:** Reach the opposite end (7 rows of travel)
- **Movement:** Forward, left, right (no backward unless forced by black)
- **Deck size:** 24 cards

---

## Fundamental Math

### Race Length
- 7 rows to cross
- Each move action = 1 step (minimum)
- 3 actions/turn → max 3 steps/turn on empty board
- **Minimum turns to win (pure rush, no terrain):** ceil(7/3) = **3 turns**
- **Realistic with terrain building:** 4-6 turns

### Action Economy
- **Draw rate:** 1 card/turn (+ blue tile draws)
- **Spend rate:** 0-3 cards/turn
- **Net hand growth at 0 plays:** +1/turn
- **Net hand at 1 play/turn:** 0 (stable)
- **Net hand at 2+ plays/turn:** shrinking

Starting with 3 cards, you can sustain 1 card/turn for ~3 turns before needing pure-move turns to let hand refill. Blue tiles on your path fix this by drawing as you move.

### Effective Distance Per Action

| Tile | Steps gained per 1 action spent moving |
|------|---------------------------------------|
| Empty | 1 |
| Red | 2 (step + chain push) |
| Red chain (2 reds) | 3 (step + 2 pushes) |
| Black | 0 (step + pushed back = net zero) |
| White | 1 + optional lateral (positional, not forward progress) |
| Blue | 1 + draw a card (refuel) |
| Green | N/A (can't enter) |

**Key insight:** Red is worth 2x a normal move. A 3-red chain from a single action = 4 effective rows of travel.

---

## Dominant Strategies

### Strategy 1: "Red Highway" (Strongest — Possibly Too Strong)

**Plan:** Spend turns 1-2 placing red tiles in a straight line on your column. Turn 3+, ride the chain.

**Example (P1, center column):**
- Turn 1: Draw. Play red at (6,1), play red at (5,1), move to (6,1) → chains to (5,1) → chains to (4,1). **Traveled 3 rows in 1 move action.**
- Turn 2: Draw. Play red at (3,1), move to (3,1) → chains to (2,1), move to (1,1). **At row 1.**
- Turn 3: Draw. Move to (0,1). **Win.**

**Total: 3 turns.** Only used 3 red cards and 5 move actions. Used 4 cards from a starting hand of 3 + 3 draws = 6 total cards available.

**Why it's dominant:**
- Red is the only tile that provides raw forward progress for free
- Chains stack linearly — each red adds 1 free row
- Opponent needs 2+ actions to disrupt (place green or black on your lane)
- With 14 red cards in Lorehold, you're statistically guaranteed to draw into this

**Balance concern:** Lorehold with 14 red cards can execute this nearly every game. Prismari with 11 reds is close behind. Witherbloom with 0 red cards cannot counter with an equivalent rush.

### Strategy 2: "Green Wall + Lateral Dodge"

**Plan:** Block opponent's column with green walls, use white tiles to dodge around them.

**Problem:** Green only blocks — it doesn't advance YOU. Spending 1 action on a green wall = 1 action NOT spent moving. The opponent can just switch lanes (left/right) and go around.

**Why it's weak:**
- 3 columns is too narrow for walls to create real obstacles
- Moving left/right costs 1 action, same as the wall cost you
- Net tempo: -1 for you (played card), -1 for opponent (detoured). Even trade at best.
- You fall behind on the race while the red player advances

**Balance concern:** Green is a tempo-negative play in a race game. It only works if it creates a PERMANENT barrier the opponent can't solve, but with 3 columns and lateral movement that's nearly impossible.

### Strategy 3: "Blue Engine"

**Plan:** Place blue tiles on your path, draw extra cards as you move through them, maintain card advantage.

**Strength:** Blue tiles solve the hand-depletion problem. Move through 2 blues = 2 extra cards = 2 future actions worth of terrain.

**Weakness:** Blue doesn't advance you faster — you still move 1 step per action. You just have more cards... but cards without tempo don't win races.

**When it works:** If the game goes long (6+ turns), card advantage compounds. If it ends in 3-4 turns (red highway), the extra cards never get played.

### Strategy 4: "Black Trap"

**Plan:** Place black tiles on the opponent's path. When they step on it, they get pushed backward.

**Problem:** The opponent can SEE the black tile and just go around it (costs 1 lateral move). And you spent 1 action placing it.

**When it works:** If you can create a corridor where the opponent HAS to pass through black (green wall on sides, black in the middle). But that costs 3 actions (2 greens + 1 black) and is easily broken by college effects.

---

## Deck Balance Issues

### Lorehold (Red/White) — Clearly Strongest
- **14 red cards** = reliable red highway every game
- **9 white cards** = lateral mobility to dodge obstacles
- **4 Lorehold college cards** = recall red tiles from discard (extend the highway)
- **2 Silverquill cards** = immunity to bypass traps
- **Weakness:** Almost no disruption tools. Pure race deck.

### Witherbloom (Green/Black) — Clearly Weakest
- **13 green cards** = walls that don't advance you
- **9 black cards** = traps that opponents walk around
- **0 red cards** = no acceleration AT ALL
- **4 Witherbloom college cards** = nuke 3x3 area (defensive, not forward)
- **2 Quandrix cards** = portal (needs 2 blue tiles; deck has 0 blue mono cards, only 2 blue college cards)
- **Weakness:** Cannot race. Can only slow opponent. But slowing isn't enough when red highway exists.

### Prismari (Red/Blue) — Strong, Best Designed
- **11 red cards** = slightly less highway material
- **12 blue cards** = draw engine while racing
- **4 Prismari college cards** = double movement in a row (massive combo potential)
- **2 Quandrix cards** = portals (more blue tiles = more portal targets)
- **Strength:** Balanced between acceleration and sustain. Prismari boost + red chain = devastating.

---

## Structural Problems

### Problem 1: Red Is Too Efficient
Red provides +1 free row per tile. No other color gives forward progress. This makes red objectively the best tile, and decks with more red will always have an advantage in a race game.

**Possible fixes:**
- Red pushes you forward but also pushes you into the NEXT tile (which might be bad). Already works this way via chaining, but chains are always forward = always good.
- Red only activates on your FIRST step through it each turn (no multi-chain exploitation).
- Red tiles "burn out" after use — become empty/colorless after activation.

### Problem 2: Green/Black Are Tempo-Negative
Spending an action to SLOW the opponent is almost always worse than spending an action to ADVANCE yourself, because the opponent can route around obstacles on a 3-wide board.

**Possible fixes:**
- Green walls also block diagonal/lateral movement (can't go around them).
- Black tiles push you backward 2 instead of 1 (higher cost for stepping on them).
- Playing a green/black card is a FREE action (0 actions instead of 1) — makes defensive plays not cost tempo.
- Green/black cards also provide some forward benefit (e.g., "place green AND move 1 step").

### Problem 3: 3-Wide Board Is Too Easy to Navigate
With only 3 columns, there's at most 1 tile between you and a different lane. Green walls are trivially bypassed with 1 lateral move.

**Possible fixes:**
- Expand to 4 or 5 columns (more meaningful blocking).
- Lateral moves cost 2 actions instead of 1 (lane changes are expensive).
- Movement is ONLY forward — lateral requires a white tile (white becomes essential, not just nice).

### Problem 4: First Player Advantage
P1 acts first and can establish a red highway before P2 can respond. In a 3-turn game, going first means you're always 1 turn ahead.

**Possible fix:**
- P2 gets 4 actions on their first turn (catch-up mechanic).
- Or P2 draws 2 cards on their first draw instead of 1.

### Problem 5: White Is Niche
White lets you slide laterally, which is useful for dodging obstacles. But if obstacles aren't meaningful (Problem 2), white isn't either. White doesn't advance you and doesn't draw cards.

**Possible fix:**
- White tiles give +1 action when stepped on ("quickstep" — the lateral doesn't cost an action).
- White slides ALSO resolve the destination tile (so slide into red = get pushed forward).

### Problem 6: College Effects Are Inconsistent
- **Witherbloom** (nuke 3x3): Powerful but defensive. Doesn't help you win faster.
- **Silverquill** (immunity): Strong defensive but you only have 1 turn of it.
- **Lorehold** (recall from discard): Incredible with red tiles — rebuild your highway for free.
- **Quandrix** (portals): Needs 2+ blue tiles on board. Cool but setup-intensive.
- **Prismari** (double movement in a row): Broken-strong if you have red in that row.

**Prismari + Red in same row = game-winning.** Place Prismari on a row with 2 reds, each red pushes 2 instead of 1. A single move action through that row can travel 5+ rows.

---

## Recommended Balance Changes (Prioritized)

### Tier 1: Critical (Game feels broken without these)

1. **Red tiles burn out after use.** When a mascot is pushed by red, the red tile becomes empty/colorless. This prevents "build highway once, ride forever" and makes red a finite resource. Now both players need to continuously invest in terrain.

2. **Give Witherbloom red cards.** Swap some green cards for red ones (or add a few). Every deck needs SOME acceleration. A 13-green deck is fundamentally unable to compete.

### Tier 2: Important (Makes the game more interesting)

3. **White tiles give a free lateral slide** (doesn't cost an action). Currently white costs 1 move action + gives a lateral option, which is barely better than just moving laterally. If the slide is free, white becomes a "turn the corner" card — step onto white, slide to the next column for free, continue forward.

4. **Black pushes backward 2 instead of 1.** Makes traps actually scary. Stepping on black currently loses 1 net step — barely worse than an empty tile. At -2, it's a meaningful setback worth building around.

5. **Playing a defensive card (green/black) is a free bonus action.** When you play green or black, it doesn't count as one of your 3 actions. This lets you block AND advance on the same turn, making defensive play not suicidal tempo-wise.

### Tier 3: Nice-to-Have (Polish)

6. **P2 gets 4 actions on turn 1** to offset first-player advantage.

7. **Lateral movement requires a white tile OR costs 2 actions.** This makes lane-blocking with green meaningful and white tiles essential for navigation.

8. **Prismari boost affects both players** (double-edged). Currently it's pure upside — boost your own row. If it also speeds the opponent through that row, there's a strategic tradeoff.

---

## Optimal Play Summary (Current Rules)

| Turn | Optimal P1 (Lorehold) | What P2 Can Do |
|------|----------------------|----------------|
| 1 | Play red, play red, move (chain 3 rows) | Play green? (-1 tempo, easily bypassed) |
| 2 | Play red, move (chain), move | Try to catch up |
| 3 | Move, move, move → WIN | Lose |

**The game is currently solvable in ~3 turns with Lorehold.** That's the core problem. Red highway is too consistent and too fast, and no counter-strategy can keep up.

---

## Fun Factor Assessment

| Aspect | Rating | Notes |
|--------|--------|-------|
| "Oh shit" chain moments | 8/10 | Red chains feel great when they fire |
| Meaningful card choice | 4/10 | Red is almost always correct to play |
| Defensive play viability | 2/10 | Green/black are trap options (pun intended) |
| Deck diversity | 3/10 | Lorehold > Prismari >> Witherbloom |
| Game length | 3/10 | Too short — over before the board develops |
| Comeback potential | 2/10 | If you fall behind, no catch-up mechanic |
| Interaction between players | 4/10 | Mostly solitaire — build your lane, ignore theirs |

**The game is fun when chains fire. The game is NOT fun when the correct play is always "place red, move forward." Balance changes should preserve the chain joy while making other options viable.**
