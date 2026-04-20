# Mage Tower — Strixhaven Tactical Card Game

A fast, tactical grid-based game where you race your mascot across a board of terrain you build with Magic: The Gathering cards.

## How to Play

Two players (or 1 vs AI) race their mascots from one end of a 3x6 board to the other. The board starts empty — you shape it by playing cards as terrain.

### Setup
- Each player picks a Strixhaven-themed deck
- Board starts empty, mascots at opposite ends
- Draw 3 cards to start

### Turn Structure
Each turn you **draw 1 card**, then get **3 actions**. Each action is either:

- **Play a card** — place it on any tile to create terrain (1 action)
- **Move** — move your mascot 1 step: forward, left, or right (1 action)

You can mix however you want: 3 moves, 3 cards, or any combination.

### Terrain Effects
Cards create terrain based on their color:

| Color | Land | Effect |
|-------|------|--------|
| Red | Mountain | Pushed +1 forward (chains!) |
| Black | Swamp | Pushed -1 backward |
| White | Plains | May slide left or right |
| Green | Forest | Wall — impassable |
| Blue | Island | Draw 1 card immediately |
| Colorless | — | No effect |

### College Cards (Dual-Color)
College cards can be played three ways:
- **As their college effect** (powerful one-time ability)
- **As either of their two colors** (flexible terrain)

| College | Colors | Effect |
|---------|--------|--------|
| Witherbloom | Green/Black | Destroy a 3x3 area, place a wall |
| Silverquill | White/Black | Your mascot ignores tile effects for a turn |
| Lorehold | White/Red | Recall a card from discard to any tile |
| Quandrix | Green/Blue | Link all blue tiles as portals |
| Prismari | Red/Blue | Double movement in a row |

### Winning
First player to reach the opposite end of the board wins.

### Key Strategies
- **Red chains**: Place red tiles in a line and ride the momentum
- **Green walls**: Block your opponent's lane
- **Blue islands**: Refuel your hand as you advance
- **Black traps**: Punish opponents who follow your path
- **College flexibility**: Use the effect when it's game-changing, use as terrain when you need a specific color

## Running Locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5433

## Tech Stack

- React + Vite
- Framer Motion (animations)
- Scryfall API (MTG card art)
- Vitest (tests)

```bash
npm test        # run tests
npm run build   # production build
```

## Project Structure

```
src/
  engine/           # Pure game logic (no React)
    constants.js    # Grid size, actions, phases
    decks.js        # 3 preset Strixhaven decks
    rules.js        # Tile effects, chaining, movement
    gameState.js    # Reducer, state machine
    ai.js           # Heuristic AI opponent
  components/       # React UI
    GameScreen.jsx  # Main game orchestrator
    Board.jsx       # 6x3 landscape grid
    Tile.jsx        # Individual terrain tile
    Card.jsx        # Card in hand
    PlayerHand.jsx  # Fanned hand display
    MainMenu.jsx    # Mode + deck selection
  utils/
    scryfall.js     # Card art URL construction
  styles/
    theme.css       # Slay the Spire-inspired theme
    board.css       # Grid and tile styles
    cards.css       # Hand card styles
```
