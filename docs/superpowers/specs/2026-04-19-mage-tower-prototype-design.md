# Strixhaven Mage Tower — Prototype Design Spec

## Overview

A webapp prototype of a fast, tactical, grid-based mini-game played with Magic: The Gathering draft decks. Cards are repurposed as terrain modifiers on a shared 3x6 board. Players place cards to reshape terrain and move the opponent's mascot toward their own goal row.

**Tech stack:** React + Vite + Framer Motion + CSS
**Game modes:** Human vs AI (heuristic), Hot-seat (2 players, same screen)
**Decks:** Pre-built Strixhaven-themed preset decks
**Art:** Real MTG card art via Scryfall API
**Visual style:** Slay the Spire-inspired — chunky, playful, animated, warm

## Rules (As-Written, No Guardrails)

The prototype implements the raw rules from the GDD with no balance fixes applied. This is intentional — the goal is to feel where the design breaks during playtesting.

### Setup
1. Each player selects a preset deck
2. Top 3 cards from each deck are revealed and arranged into a 3x6 grid
3. Player 1's mascot starts at the center of Player 2's goal row (row 0, col 1)
4. Player 2's mascot starts at the center of Player 1's goal row (row 5, col 1)
5. Each player draws 3 cards

### Board Orientation
- Row 0 = Player 2's goal row (top). P1 wins by pushing P2's mascot here
- Row 5 = Player 1's goal row (bottom). P2 wins by pushing P1's mascot here
- 3 columns (0, 1, 2)

### Turn Structure
Each player takes a full turn in sequence:

1. **Draw Phase** — Draw 1 card from deck
2. **Play Phase** — Play any number of cards from hand. Each card is placed onto any grid space, replacing the existing tile. The replaced card goes to discard
3. **Move Phase** — Move the opponent's mascot 1 space. Legal directions: forward (toward your goal row), left, or right. Cannot move backward unless forced by effects
4. **Resolve Phase** — Resolve tile effects on the mascot's new position. Effects can chain (movement effects trigger new tile resolutions)
5. **Win Check** — If a mascot is in the goal row, that mascot's controller loses

### Base Color Tile Effects

| Color | Effect |
|-------|--------|
| **White** | On entry: may move left or right 1 additional space |
| **Red** | On entry: move +1 forward (same direction entered) |
| **Blue** | No tile effect. After placing: the player who placed it draws +1 next turn |
| **Green** | Tile is impassable (wall) |
| **Black** | On entry: move -1 backward |
| **Colorless** | No tile effect. Baseline movement tile |

### College Effects (Dual-Color Cards)

| College | Colors | Effect |
|---------|--------|--------|
| **Witherbloom** | G/B | Destroy all tiles in a 3x3 area. Replace one tile in that area with a Green wall |
| **Silverquill** | W/B | Your mascot ignores all tile effects until your next turn |
| **Lorehold** | W/R | Choose a card from discard pile, recreate it on any board space |
| **Quandrix** | G/U | Blue tiles on the board become linked portals. Entering one teleports to another |
| **Prismari** | R/U | Select a row. Movement in that row is doubled until changed |

### Movement Chaining
When a mascot enters a tile, resolve its effect. If the effect causes movement, resolve the new tile too. Chain continues until no more movement is triggered. Safety cap at 10 resolutions to prevent infinite loops.

### Win Condition
You win when the opponent's mascot reaches your goal row.

## Architecture

### Tech Stack
- **Vite** — dev server, build tool
- **React** — UI component tree
- **Framer Motion** — animations (card play, mascot movement, screen shake)
- **CSS** — styling, Slay the Spire-inspired theme
- **Scryfall API** — card art images

### Project Structure
```
src/
  main.jsx              — entry point
  App.jsx               — routing (menu vs game)
  components/
    MainMenu.jsx        — mode select, deck picker
    GameScreen.jsx      — orchestrates board + hand + controls
    Board.jsx           — 3x6 grid rendering
    Tile.jsx            — single tile with card art + effect indicator
    Mascot.jsx          — mascot token with movement animation
    PlayerHand.jsx      — fan of cards in hand
    Card.jsx            — single card with Scryfall art
    PhaseIndicator.jsx  — turn phase banner
    MoveControls.jsx    — directional movement UI
    GameLog.jsx         — scrolling event feed
    GameOverModal.jsx   — victory screen
    PassScreen.jsx      — hot-seat turn handoff interstitial
  engine/
    gameState.js        — useReducer state machine, action creators
    rules.js            — tile effect resolution, movement chaining, college effects
    ai.js               — heuristic AI opponent
    decks.js            — preset deck definitions with Scryfall card names
    constants.js        — grid dimensions, phase names, chain cap
  utils/
    scryfall.js         — image URL construction, preloading
  styles/
    theme.css           — global Slay the Spire-inspired theme
    board.css           — grid and tile styles
    cards.css           — hand and card styles
    animations.css      — keyframes for non-Framer animations
```

### State Machine

Game state managed via `useReducer`. The state shape:

```
{
  grid: Tile[6][3],           // grid[row][col]
  mascots: {
    p1: { row, col },
    p2: { row, col }
  },
  hands: {
    p1: Card[],
    p2: Card[]
  },
  decks: {
    p1: Card[],
    p2: Card[]
  },
  discard: Card[],
  phase: "draw" | "play" | "move" | "resolve" | "checkWin",
  activePlayer: "p1" | "p2",
  turnCount: number,
  winner: null | "p1" | "p2",
  // College-specific state
  portalLinks: [{ row, col }[]],       // Quandrix blue tile portals
  silverquillImmunity: null | "p1" | "p2",
  prismariBoostRow: null | number,
  // Blue card draw tracking
  blueBonusDraws: { p1: number, p2: number },
  // Game log
  log: string[]
}
```

### Reducer Actions
- `DRAW_CARD` — move top card from deck to hand
- `PLAY_CARD` — place card from hand onto grid position, replace tile, add old tile to discard
- `END_PLAY_PHASE` — advance to move phase
- `MOVE_MASCOT` — move opponent's mascot in a direction
- `RESOLVE_TILE` — process tile effect at mascot's current position
- `CHAIN_MOVE` — triggered by resolution, moves mascot and re-resolves
- `CHECK_WIN` — evaluate win condition
- `END_TURN` — switch active player, advance turn count
- `ACTIVATE_COLLEGE` — trigger a college-specific effect (Witherbloom area, Quandrix link, etc.)

### Rules Engine (rules.js)

Pure functions, no React dependency:

- `resolveTile(grid, mascotPos, direction, immunities)` — returns movement result + chain flag
- `resolveChain(grid, mascotPos, direction, immunities, depth)` — recursive chain resolver with depth cap
- `getValidMoves(grid, mascotPos, activePlayer)` — returns legal move directions
- `checkWinCondition(mascots)` — returns winner or null
- `applyCollegeEffect(state, college, params)` — handles each college's unique trigger
- `isPassable(tile)` — checks for green walls

### AI Opponent (ai.js)

Heuristic-based, no tree search:

**Card placement scoring:**
- Red tile in opponent mascot's forward path: +3
- Green wall blocking opponent's good route: +2
- Black tile behind opponent mascot: +2
- College card in high-value position: +4
- Random jitter: +/- 0.5

**Movement scoring:**
- Moves mascot closer to goal row: +3
- Destination has favorable chain (Red forward): +2
- Destination has unfavorable chain (Black backward): -2
- Avoids pushing into portal that exits near own goal: -1
- Random jitter: +/- 0.5

AI plays with a brief artificial delay (500-800ms) for readability.

### Scryfall Integration (scryfall.js)

- Card names stored in deck definitions map to Scryfall lookup
- Image URL: `https://api.scryfall.com/cards/named?exact={name}&format=image&version=art_crop`
- Preload all deck images on game start screen
- Fallback: color-coded gradient placeholder if image fails
- Images cached in browser via standard HTTP caching
- Deck card names must be verified against Scryfall during development to ensure valid lookups

### Preset Decks (decks.js)

Three decks, ~30 cards each, using real Strixhaven cards:

**"Lorehold Aggro"** — Red/White focus
- Heavy red (speed tiles) and white (lateral movement)
- College cards: Lorehold, Silverquill
- Playstyle: aggressive forward momentum, recycle from discard

**"Witherbloom Control"** — Green/Black focus
- Heavy green (walls) and black (pushback traps)
- College cards: Witherbloom, Quandrix
- Playstyle: lock down the board, create trap corridors

**"Prismari Tempo"** — Red/Blue focus
- Heavy red (speed) and blue (card draw advantage)
- College cards: Prismari, Quandrix
- Playstyle: fast movement, portal tricks, row manipulation

Each deck has enough color variety that the 6-card board setup (3 from each deck) produces playable boards most of the time.

## UI & Visual Design

### Slay the Spire-Inspired Theme
- Dark warm background (deep browns/charcoals)
- Chunky, rounded UI elements
- Bold color-coded borders and glows
- Hand-drawn/parchment texture feel where appropriate
- Satisfying weight to all animations

### Card Rendering
- Cards show Scryfall art as background image
- Color-coded border (Red=#ef4444, Blue=#3b82f6, Green=#22c55e, White=#f5f5f5, Black=#1a1a1a, Gold for dual-color)
- Slight tilt on hover, scale up
- Swoosh animation when played onto board

### Board Tiles
- Cropped card art as tile background
- Colored glow/border indicating tile effect
- Gentle pulse when a mascot occupies the tile
- Goal rows have distinct styling (purple for P2, green for P1)

### Mascots
- Bold chunky tokens
- Bounce/settle animation on movement (slight overshoot, then settle)
- Screen shake on chain reactions (3+ chains)
- Trail effect during movement chains

### Animations (Framer Motion)
- Card draw: fly from deck to hand
- Card play: swoosh from hand to board tile, replaced card flips to discard
- Mascot move: weighted tween tile-to-tile
- Chain resolution: sequential tile-to-tile with increasing speed
- Witherbloom: explosion/shatter effect on 3x3 area
- Quandrix portal: swirl/warp effect on teleport
- Win: confetti/fanfare modal

### Game Log
- Right sidebar, scrolling text feed
- Color-coded entries matching tile colors
- Narrates each action ("Red tile: Mascot slides forward!", "Witherbloom NUKE: 3x3 area destroyed!")

## Game Flow

### Main Menu
1. Select mode: "vs AI" or "Hot Seat"
2. Each player picks a preset deck (in AI mode, AI picks randomly)
3. Start game button

### In-Game
1. Board setup animation — 6 cards flip into place on the grid
2. Starting hands dealt (3 each)
3. Turn loop begins with Player 1

### Hot-Seat Specifics
- Between turns: "Pass to Player X" interstitial screen hides the hand
- Click/tap to reveal your hand and begin your turn

### AI Specifics
- AI turn plays out automatically with brief delays between actions
- AI card placements and moves are narrated in the game log
- Player can see the AI "thinking" with a brief indicator

### Game Over
- Modal overlay with winner announcement
- Turn count displayed
- "Rematch" and "Main Menu" buttons
