# Mage Tower Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a playable webapp prototype of Strixhaven Mage Tower — a tactical grid-based card game with real MTG art, two game modes (vs AI and hot-seat), and Slay the Spire-inspired visuals.

**Architecture:** React + Vite SPA. Game logic lives in a pure-JS engine layer (`src/engine/`) separated from React UI components (`src/components/`). State is managed via `useReducer`. Framer Motion handles animations. Scryfall API provides card art.

**Tech Stack:** Vite, React 18, Framer Motion, CSS, Scryfall REST API

**Spec:** `docs/superpowers/specs/2026-04-19-mage-tower-prototype-design.md`

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `src/main.jsx`
- Create: `src/App.jsx`
- Create: `src/styles/theme.css`
- Create: `.gitignore`

- [ ] **Step 1: Initialize Vite + React project**

```bash
cd a:/Coding/MagetowerPrototype
npm create vite@latest . -- --template react
```

Select React + JavaScript when prompted. If the directory is non-empty, allow overwrite.

- [ ] **Step 2: Install dependencies**

```bash
npm install framer-motion
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 3: Configure Vitest**

Add to `vite.config.js`:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.js',
  },
})
```

Create `src/test-setup.js`:

```js
import '@testing-library/jest-dom'
```

- [ ] **Step 4: Add test script to package.json**

In `package.json` scripts, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Create base theme CSS**

Replace `src/styles/theme.css` (delete default Vite CSS files `src/App.css` and `src/index.css`):

```css
/* Slay the Spire-inspired dark warm theme */
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Inter:wght@400;500;600;700&display=swap');

:root {
  --bg-dark: #1a1210;
  --bg-medium: #2a1f1a;
  --bg-light: #3d2e24;
  --bg-card: #4a3728;
  --text-primary: #f0e6d6;
  --text-secondary: #b8a898;
  --text-muted: #7a6a5a;
  --accent-gold: #d4a843;
  --accent-glow: #f5c542;

  /* MTG colors */
  --mtg-white: #f5f0e0;
  --mtg-blue: #3b82f6;
  --mtg-black: #1a1a2e;
  --mtg-red: #ef4444;
  --mtg-green: #22c55e;
  --mtg-gold: #d4a843;
  --mtg-colorless: #9ca3af;

  /* Layout */
  --radius: 8px;
  --radius-lg: 12px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg-dark);
  color: var(--text-primary);
  min-height: 100vh;
  overflow: hidden;
}

h1, h2, h3 {
  font-family: 'Cinzel', serif;
}

button {
  font-family: 'Inter', sans-serif;
  cursor: pointer;
  border: none;
  outline: none;
}
```

- [ ] **Step 6: Update main.jsx and App.jsx**

`src/main.jsx`:

```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`src/App.jsx`:

```jsx
import { useState } from 'react'

export default function App() {
  const [screen, setScreen] = useState('menu')

  return (
    <div style={{ minHeight: '100vh' }}>
      {screen === 'menu' && <div>Main Menu (placeholder)</div>}
      {screen === 'game' && <div>Game Screen (placeholder)</div>}
    </div>
  )
}
```

- [ ] **Step 7: Update .gitignore**

Ensure `.gitignore` includes:

```
node_modules
dist
.superpowers
```

- [ ] **Step 8: Verify dev server runs**

```bash
npm run dev
```

Expected: Vite dev server starts, app renders placeholder text at `http://localhost:5173`.

- [ ] **Step 9: Run tests to verify setup**

```bash
npm run test
```

Expected: No tests yet, exits cleanly with 0 tests.

- [ ] **Step 10: Commit**

```bash
git init
git add -A
git commit -m "feat: scaffold Vite + React project with theme and test setup"
```

---

## Task 2: Constants & Card/Deck Data

**Files:**
- Create: `src/engine/constants.js`
- Create: `src/engine/decks.js`
- Create: `src/utils/scryfall.js`
- Create: `src/engine/__tests__/decks.test.js`

- [ ] **Step 1: Write the failing test for deck structure**

Create `src/engine/__tests__/decks.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { DECKS } from '../decks'
import { COLORS, COLLEGES } from '../constants'

describe('decks', () => {
  it('exports exactly 3 preset decks', () => {
    expect(Object.keys(DECKS)).toHaveLength(3)
  })

  it('each deck has 30 cards', () => {
    for (const [name, deck] of Object.entries(DECKS)) {
      expect(deck.cards).toHaveLength(30)
    }
  })

  it('every card has required fields', () => {
    for (const [name, deck] of Object.entries(DECKS)) {
      for (const card of deck.cards) {
        expect(card).toHaveProperty('name')
        expect(card).toHaveProperty('color')
        expect(COLORS).toContain(card.color)
        expect(card).toHaveProperty('scryfallName')
        if (card.college) {
          expect(Object.keys(COLLEGES)).toContain(card.college)
          expect(card.collegeColors).toHaveLength(2)
        }
      }
    }
  })

  it('each deck has a name and description', () => {
    for (const [key, deck] of Object.entries(DECKS)) {
      expect(deck.name).toBeTruthy()
      expect(deck.description).toBeTruthy()
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/engine/__tests__/decks.test.js
```

Expected: FAIL — cannot find `../decks` or `../constants`.

- [ ] **Step 3: Create constants.js**

Create `src/engine/constants.js`:

```js
export const ROWS = 6
export const COLS = 3
export const CHAIN_CAP = 10

export const COLORS = ['white', 'blue', 'black', 'red', 'green', 'colorless']

export const COLLEGES = {
  witherbloom: { colors: ['green', 'black'], name: 'Witherbloom' },
  silverquill: { colors: ['white', 'black'], name: 'Silverquill' },
  lorehold: { colors: ['white', 'red'], name: 'Lorehold' },
  quandrix: { colors: ['green', 'blue'], name: 'Quandrix' },
  prismari: { colors: ['red', 'blue'], name: 'Prismari' },
}

export const PHASES = {
  DRAW: 'draw',
  PLAY: 'play',
  MOVE: 'move',
  RESOLVE: 'resolve',
  CHECK_WIN: 'checkWin',
}

export const P1_GOAL_ROW = 5
export const P2_GOAL_ROW = 0
```

- [ ] **Step 4: Create decks.js with 3 preset decks**

Create `src/engine/decks.js`. Each deck has 30 cards using real Strixhaven card names. Cards are assigned a game color based on their primary MTG color identity.

```js
function card(name, color, scryfallName, college = null, collegeColors = null) {
  return { name, color, scryfallName, college, collegeColors }
}

export const DECKS = {
  lorehold: {
    name: 'Lorehold Aggro',
    description: 'Red/White — aggressive forward momentum, recycle from discard',
    cards: [
      card('Illuminate History', 'red', 'Illuminate History', 'lorehold', ['white', 'red']),
      card('Lorehold Command', 'red', 'Lorehold Command', 'lorehold', ['white', 'red']),
      card('Velomachus Lorehold', 'red', 'Velomachus Lorehold', 'lorehold', ['white', 'red']),
      card('Hofri Ghostforge', 'red', 'Hofri Ghostforge', 'lorehold', ['white', 'red']),
      card('Silverquill Command', 'white', 'Silverquill Command', 'silverquill', ['white', 'black']),
      card('Killian, Ink Duelist', 'black', 'Killian, Ink Duelist', 'silverquill', ['white', 'black']),
      card('Lightning Bolt', 'red', 'Lightning Bolt'),
      card('Shock', 'red', 'Shock'),
      card('Dragon Mantle', 'red', 'Dragon Mantle'),
      card('Heartfire Immolator', 'red', 'Heartfire Immolator'),
      card('Fervent Champion', 'red', 'Fervent Champion'),
      card('Scorching Dragonfire', 'red', 'Scorching Dragonfire'),
      card('Storm-Kiln Artist', 'red', 'Storm-Kiln Artist'),
      card('Efreet Flamepainter', 'red', 'Efreet Flamepainter'),
      card('Academic Dispute', 'red', 'Academic Dispute'),
      card('Swords to Plowshares', 'white', 'Swords to Plowshares'),
      card('Elite Vanguard', 'white', 'Elite Vanguard'),
      card('Leonin Lightscribe', 'white', 'Leonin Lightscribe'),
      card('Clever Lumimancer', 'white', 'Clever Lumimancer'),
      card('Guiding Voice', 'white', 'Guiding Voice'),
      card('Star Pupil', 'white', 'Star Pupil'),
      card('Stonebinder\'s Familiar', 'white', 'Stonebinder\'s Familiar'),
      card('Returned Pastcaller', 'white', 'Returned Pastcaller'),
      card('Pilgrim of the Ages', 'white', 'Pilgrim of the Ages'),
      card('Plains', 'colorless', 'Plains'),
      card('Plains', 'colorless', 'Plains'),
      card('Mountain', 'colorless', 'Mountain'),
      card('Mountain', 'colorless', 'Mountain'),
      card('Furycalm Snarl', 'colorless', 'Furycalm Snarl'),
      card('Lorehold Campus', 'colorless', 'Lorehold Campus'),
    ],
  },
  witherbloom: {
    name: 'Witherbloom Control',
    description: 'Green/Black — walls, traps, and board control',
    cards: [
      card('Witherbloom Command', 'green', 'Witherbloom Command', 'witherbloom', ['green', 'black']),
      card('Beledros Witherbloom', 'green', 'Beledros Witherbloom', 'witherbloom', ['green', 'black']),
      card('Dina, Soul Steeper', 'black', 'Dina, Soul Steeper', 'witherbloom', ['green', 'black']),
      card('Blex, Vexing Pest', 'green', 'Blex, Vexing Pest', 'witherbloom', ['green', 'black']),
      card('Quandrix Command', 'blue', 'Quandrix Command', 'quandrix', ['green', 'blue']),
      card('Zimone, Quandrix Prodigy', 'blue', 'Zimone, Quandrix Prodigy', 'quandrix', ['green', 'blue']),
      card('Overgrown Battlement', 'green', 'Overgrown Battlement'),
      card('Wall of Blossoms', 'green', 'Wall of Blossoms'),
      card('Dragonsguard Elite', 'green', 'Dragonsguard Elite'),
      card('Bookwurm', 'green', 'Bookwurm'),
      card('Mage Duel', 'green', 'Mage Duel'),
      card('Master Symmetrist', 'green', 'Master Symmetrist'),
      card('Bayou Groff', 'green', 'Bayou Groff'),
      card('Containment Breach', 'green', 'Containment Breach'),
      card('Emergent Sequence', 'green', 'Emergent Sequence'),
      card('Unwilling Ingredient', 'black', 'Unwilling Ingredient'),
      card('Lash of Malice', 'black', 'Lash of Malice'),
      card('Specter of the Fens', 'black', 'Specter of the Fens'),
      card('Eyetwitch', 'black', 'Eyetwitch'),
      card('Hunt for Specimens', 'black', 'Hunt for Specimens'),
      card('Plumb the Forbidden', 'black', 'Plumb the Forbidden'),
      card('Mage Hunter', 'black', 'Mage Hunter'),
      card('Brackish Trudge', 'black', 'Brackish Trudge'),
      card('Essence Infusion', 'black', 'Essence Infusion'),
      card('Swamp', 'colorless', 'Swamp'),
      card('Swamp', 'colorless', 'Swamp'),
      card('Forest', 'colorless', 'Forest'),
      card('Forest', 'colorless', 'Forest'),
      card('Necroblossom Snarl', 'colorless', 'Necroblossom Snarl'),
      card('Witherbloom Campus', 'colorless', 'Witherbloom Campus'),
    ],
  },
  prismari: {
    name: 'Prismari Tempo',
    description: 'Red/Blue — speed, card draw, portal tricks, row manipulation',
    cards: [
      card('Prismari Command', 'red', 'Prismari Command', 'prismari', ['red', 'blue']),
      card('Galazeth Prismari', 'red', 'Galazeth Prismari', 'prismari', ['red', 'blue']),
      card('Rootha, Mercurial Artist', 'red', 'Rootha, Mercurial Artist', 'prismari', ['red', 'blue']),
      card('Creative Outburst', 'red', 'Creative Outburst', 'prismari', ['red', 'blue']),
      card('Quandrix Command', 'blue', 'Quandrix Command', 'quandrix', ['green', 'blue']),
      card('Tanazir Quandrix', 'green', 'Tanazir Quandrix', 'quandrix', ['green', 'blue']),
      card('Expressive Iteration', 'red', 'Expressive Iteration'),
      card('Heated Debate', 'red', 'Heated Debate'),
      card('Pigment Storm', 'red', 'Pigment Storm'),
      card('Shivan Fire', 'red', 'Shivan Fire'),
      card('Ardent Dustspeaker', 'red', 'Ardent Dustspeaker'),
      card('Flame Channeler', 'red', 'Flame Channeler'),
      card('Sudden Breakthrough', 'red', 'Sudden Breakthrough'),
      card('Frost Trickster', 'blue', 'Frost Trickster'),
      card('Divide by Zero', 'blue', 'Divide by Zero'),
      card('Bury in Books', 'blue', 'Bury in Books'),
      card('Archmage Emeritus', 'blue', 'Archmage Emeritus'),
      card('Mentor\'s Guidance', 'blue', 'Mentor\'s Guidance'),
      card('Vortex Runner', 'blue', 'Vortex Runner'),
      card('Waterfall Aerialist', 'blue', 'Waterfall Aerialist'),
      card('Pop Quiz', 'blue', 'Pop Quiz'),
      card('Curate', 'blue', 'Curate'),
      card('Ingenious Mastery', 'blue', 'Ingenious Mastery'),
      card('Symmetry Sage', 'blue', 'Symmetry Sage'),
      card('Island', 'colorless', 'Island'),
      card('Island', 'colorless', 'Island'),
      card('Mountain', 'colorless', 'Mountain'),
      card('Mountain', 'colorless', 'Mountain'),
      card('Frostboil Snarl', 'colorless', 'Frostboil Snarl'),
      card('Prismari Campus', 'colorless', 'Prismari Campus'),
    ],
  },
}
```

- [ ] **Step 5: Create scryfall.js**

Create `src/utils/scryfall.js`:

```js
export function getScryfallImageUrl(cardName) {
  const encoded = encodeURIComponent(cardName)
  return `https://api.scryfall.com/cards/named?exact=${encoded}&format=image&version=art_crop`
}

export function preloadImages(cards) {
  return cards.map((card) => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = resolve
      img.onerror = resolve
      img.src = getScryfallImageUrl(card.scryfallName)
    })
  })
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npx vitest run src/engine/__tests__/decks.test.js
```

Expected: All 4 tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/engine/constants.js src/engine/decks.js src/utils/scryfall.js src/engine/__tests__/decks.test.js
git commit -m "feat: add constants, preset decks with Strixhaven cards, Scryfall utility"
```

---

## Task 3: Rules Engine — Base Tile Effects & Movement

**Files:**
- Create: `src/engine/rules.js`
- Create: `src/engine/__tests__/rules.test.js`

- [ ] **Step 1: Write failing tests for base tile resolution**

Create `src/engine/__tests__/rules.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { resolveTile, resolveChain, getValidMoves, checkWinCondition, isPassable } from '../rules'
import { P1_GOAL_ROW, P2_GOAL_ROW } from '../constants'

function makeTile(color) {
  return { color, card: { name: 'Test', color, scryfallName: 'Plains' } }
}

function makeGrid(defaultColor = 'colorless') {
  return Array.from({ length: 6 }, () =>
    Array.from({ length: 3 }, () => makeTile(defaultColor))
  )
}

describe('isPassable', () => {
  it('returns false for green tiles', () => {
    expect(isPassable(makeTile('green'))).toBe(false)
  })

  it('returns true for all other colors', () => {
    for (const color of ['white', 'blue', 'black', 'red', 'colorless']) {
      expect(isPassable(makeTile(color))).toBe(true)
    }
  })
})

describe('resolveTile', () => {
  it('red tile moves mascot +1 forward (p1 moves toward row 0)', () => {
    const grid = makeGrid()
    grid[2][1] = makeTile('red')
    const result = resolveTile(grid, { row: 2, col: 1 }, 'p1', null)
    expect(result.newPos).toEqual({ row: 1, col: 1 })
    expect(result.chain).toBe(true)
  })

  it('red tile moves mascot +1 forward (p2 moves toward row 5)', () => {
    const grid = makeGrid()
    grid[3][1] = makeTile('red')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p2', null)
    expect(result.newPos).toEqual({ row: 4, col: 1 })
    expect(result.chain).toBe(true)
  })

  it('black tile moves mascot -1 backward', () => {
    const grid = makeGrid()
    grid[3][1] = makeTile('black')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.newPos).toEqual({ row: 4, col: 1 })
    expect(result.chain).toBe(true)
  })

  it('white tile returns lateral options', () => {
    const grid = makeGrid()
    grid[3][1] = makeTile('white')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.lateralOptions).toEqual([
      { row: 3, col: 0 },
      { row: 3, col: 2 },
    ])
    expect(result.chain).toBe(false)
  })

  it('colorless tile has no effect', () => {
    const grid = makeGrid()
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.newPos).toEqual({ row: 3, col: 1 })
    expect(result.chain).toBe(false)
  })

  it('blue tile has no tile effect', () => {
    const grid = makeGrid()
    grid[3][1] = makeTile('blue')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.newPos).toEqual({ row: 3, col: 1 })
    expect(result.chain).toBe(false)
  })

  it('silverquill immunity skips tile effect', () => {
    const grid = makeGrid()
    grid[3][1] = makeTile('red')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', 'p1')
    expect(result.newPos).toEqual({ row: 3, col: 1 })
    expect(result.chain).toBe(false)
  })

  it('red tile does not move off the board', () => {
    const grid = makeGrid()
    grid[0][1] = makeTile('red')
    const result = resolveTile(grid, { row: 0, col: 1 }, 'p1', null)
    expect(result.newPos).toEqual({ row: 0, col: 1 })
    expect(result.chain).toBe(false)
  })
})

describe('resolveChain', () => {
  it('chains through multiple red tiles', () => {
    const grid = makeGrid()
    grid[3][1] = makeTile('red')
    grid[2][1] = makeTile('red')
    grid[1][1] = makeTile('colorless')
    const result = resolveChain(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.finalPos).toEqual({ row: 1, col: 1 })
    expect(result.steps.length).toBeGreaterThanOrEqual(2)
  })

  it('stops at chain cap', () => {
    const grid = makeGrid('red')
    const result = resolveChain(grid, { row: 5, col: 1 }, 'p1', null)
    expect(result.steps.length).toBeLessThanOrEqual(10)
  })
})

describe('getValidMoves', () => {
  it('returns forward, left, right from center', () => {
    const grid = makeGrid()
    const moves = getValidMoves(grid, { row: 3, col: 1 }, 'p1')
    expect(moves).toContainEqual({ row: 2, col: 1, direction: 'forward' })
    expect(moves).toContainEqual({ row: 3, col: 0, direction: 'left' })
    expect(moves).toContainEqual({ row: 3, col: 2, direction: 'right' })
  })

  it('excludes moves into green walls', () => {
    const grid = makeGrid()
    grid[2][1] = makeTile('green')
    const moves = getValidMoves(grid, { row: 3, col: 1 }, 'p1')
    expect(moves).not.toContainEqual(expect.objectContaining({ row: 2, col: 1 }))
  })

  it('excludes moves off the board edge', () => {
    const grid = makeGrid()
    const moves = getValidMoves(grid, { row: 3, col: 0 }, 'p1')
    expect(moves.every(m => m.col >= 0)).toBe(true)
  })

  it('p2 forward is toward row 5', () => {
    const grid = makeGrid()
    const moves = getValidMoves(grid, { row: 3, col: 1 }, 'p2')
    expect(moves).toContainEqual({ row: 4, col: 1, direction: 'forward' })
  })
})

describe('checkWinCondition', () => {
  it('p1 wins when p2 mascot is at row 0', () => {
    expect(checkWinCondition({ p1: { row: 3, col: 1 }, p2: { row: 0, col: 1 } })).toBe('p1')
  })

  it('p2 wins when p1 mascot is at row 5', () => {
    expect(checkWinCondition({ p1: { row: 5, col: 1 }, p2: { row: 3, col: 1 } })).toBe('p2')
  })

  it('returns null when no winner', () => {
    expect(checkWinCondition({ p1: { row: 2, col: 1 }, p2: { row: 4, col: 1 } })).toBe(null)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/engine/__tests__/rules.test.js
```

Expected: FAIL — cannot find `../rules`.

- [ ] **Step 3: Implement rules.js**

Create `src/engine/rules.js`:

```js
import { ROWS, COLS, CHAIN_CAP, P1_GOAL_ROW, P2_GOAL_ROW } from './constants'

export function isPassable(tile) {
  return tile.color !== 'green'
}

export function resolveTile(grid, pos, movingPlayer, silverquillImmunity, extras = {}) {
  const tile = grid[pos.row][pos.col]
  const noEffect = { newPos: { ...pos }, chain: false }

  if (silverquillImmunity === movingPlayer) {
    return noEffect
  }

  const forwardDir = movingPlayer === 'p1' ? -1 : 1
  const backwardDir = -forwardDir

  // Prismari: doubled movement in boosted row
  const prismariMultiplier =
    extras.prismariBoostRow != null && pos.row === extras.prismariBoostRow ? 2 : 1

  switch (tile.color) {
    case 'red': {
      const steps = 1 * prismariMultiplier
      const newRow = pos.row + forwardDir * steps
      const clampedRow = Math.max(0, Math.min(ROWS - 1, newRow))
      if (clampedRow === pos.row) return noEffect
      return { newPos: { row: clampedRow, col: pos.col }, chain: true }
    }
    case 'black': {
      const steps = 1 * prismariMultiplier
      const newRow = pos.row + backwardDir * steps
      const clampedRow = Math.max(0, Math.min(ROWS - 1, newRow))
      if (clampedRow === pos.row) return noEffect
      return { newPos: { row: clampedRow, col: pos.col }, chain: true }
    }
    case 'white': {
      const lateralOptions = []
      if (pos.col > 0 && isPassable(grid[pos.row][pos.col - 1])) {
        lateralOptions.push({ row: pos.row, col: pos.col - 1 })
      }
      if (pos.col < COLS - 1 && isPassable(grid[pos.row][pos.col + 1])) {
        lateralOptions.push({ row: pos.row, col: pos.col + 1 })
      }
      return { newPos: { ...pos }, lateralOptions, chain: false }
    }
    case 'blue': {
      // Quandrix portal: if portals are linked, teleport to another blue tile
      const portals = extras.portalLinks || []
      if (portals.length >= 2) {
        const currentIdx = portals.findIndex(
          (p) => p.row === pos.row && p.col === pos.col
        )
        if (currentIdx !== -1) {
          // Teleport to the next portal in the list (wraps around)
          const nextIdx = (currentIdx + 1) % portals.length
          const dest = portals[nextIdx]
          return { newPos: { row: dest.row, col: dest.col }, chain: true, portal: true }
        }
      }
      return noEffect
    }
    case 'colorless':
    default:
      return noEffect
  }
}

export function resolveChain(grid, startPos, movingPlayer, silverquillImmunity, extras = {}) {
  const steps = [{ ...startPos }]
  let currentPos = { ...startPos }
  let depth = 0

  while (depth < CHAIN_CAP) {
    const result = resolveTile(grid, currentPos, movingPlayer, silverquillImmunity, extras)
    if (!result.chain) {
      return { finalPos: currentPos, steps, lateralOptions: result.lateralOptions || null }
    }
    currentPos = result.newPos
    steps.push({ ...currentPos })
    depth++
  }

  return { finalPos: currentPos, steps, lateralOptions: null }
}

export function getValidMoves(grid, mascotPos, activePlayer) {
  const moves = []
  const forwardDir = activePlayer === 'p1' ? -1 : 1

  const forward = { row: mascotPos.row + forwardDir, col: mascotPos.col }
  const left = { row: mascotPos.row, col: mascotPos.col - 1 }
  const right = { row: mascotPos.row, col: mascotPos.col + 1 }

  const candidates = [
    { ...forward, direction: 'forward' },
    { ...left, direction: 'left' },
    { ...right, direction: 'right' },
  ]

  for (const candidate of candidates) {
    if (
      candidate.row >= 0 && candidate.row < ROWS &&
      candidate.col >= 0 && candidate.col < COLS &&
      isPassable(grid[candidate.row][candidate.col])
    ) {
      moves.push(candidate)
    }
  }

  return moves
}

export function checkWinCondition(mascots) {
  if (mascots.p2.row === P2_GOAL_ROW) return 'p1'
  if (mascots.p1.row === P1_GOAL_ROW) return 'p2'
  return null
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/engine/__tests__/rules.test.js
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/rules.js src/engine/__tests__/rules.test.js
git commit -m "feat: implement base tile effects, movement chaining, and win conditions"
```

---

## Task 4: Game State Reducer

**Files:**
- Create: `src/engine/gameState.js`
- Create: `src/engine/__tests__/gameState.test.js`

- [ ] **Step 1: Write failing tests for the state machine**

Create `src/engine/__tests__/gameState.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'

describe('createInitialState', () => {
  it('creates a 6x3 grid from two decks', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.grid).toHaveLength(6)
    expect(state.grid[0]).toHaveLength(3)
  })

  it('places mascots at correct starting positions', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.mascots.p1).toEqual({ row: 0, col: 1 })
    expect(state.mascots.p2).toEqual({ row: 5, col: 1 })
  })

  it('deals 3 cards to each player', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.hands.p1).toHaveLength(3)
    expect(state.hands.p2).toHaveLength(3)
  })

  it('starts on draw phase for p1', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.phase).toBe('draw')
    expect(state.activePlayer).toBe('p1')
  })
})

describe('gameReducer', () => {
  let state

  beforeEach(() => {
    state = createInitialState('lorehold', 'witherbloom')
  })

  it('DRAW_CARD moves top card from deck to hand', () => {
    const deckSizeBefore = state.decks.p1.length
    const handSizeBefore = state.hands.p1.length
    const next = gameReducer(state, { type: 'DRAW_CARD' })
    expect(next.hands.p1).toHaveLength(handSizeBefore + 1)
    expect(next.decks.p1).toHaveLength(deckSizeBefore - 1)
    expect(next.phase).toBe('play')
  })

  it('PLAY_CARD places card on grid and removes from hand', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    const cardToPlay = next.hands.p1[0]
    const handSize = next.hands.p1.length
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1 },
    })
    expect(next.grid[2][1].card).toEqual(cardToPlay)
    expect(next.hands.p1).toHaveLength(handSize - 1)
  })

  it('END_PLAY_PHASE advances to move phase', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    next = gameReducer(next, { type: 'END_PLAY_PHASE' })
    expect(next.phase).toBe('move')
  })

  it('MOVE_MASCOT moves opponent mascot and triggers resolve', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    next = gameReducer(next, { type: 'END_PLAY_PHASE' })
    const p2Before = { ...next.mascots.p2 }
    next = gameReducer(next, {
      type: 'MOVE_MASCOT',
      payload: { row: p2Before.row - 1, col: p2Before.col },
    })
    expect(next.mascots.p2.row).toBe(p2Before.row - 1)
  })

  it('END_TURN switches active player', () => {
    let next = { ...state, phase: 'checkWin', activePlayer: 'p1' }
    next = gameReducer(next, { type: 'END_TURN' })
    expect(next.activePlayer).toBe('p2')
    expect(next.phase).toBe('draw')
  })

  it('PLAY_CARD adds replaced tile card to discard', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    const originalTileCard = next.grid[2][1].card
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1 },
    })
    expect(next.discard).toContainEqual(originalTileCard)
  })

  it('PLAY_CARD for blue card increments blue bonus draws', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    // Find or force a blue card in hand
    next.hands.p1[0] = { name: 'Test Blue', color: 'blue', scryfallName: 'Island' }
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1 },
    })
    expect(next.blueBonusDraws.p1).toBe(1)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/engine/__tests__/gameState.test.js
```

Expected: FAIL — cannot find `../gameState`.

- [ ] **Step 3: Implement gameState.js**

Create `src/engine/gameState.js`:

```js
import { PHASES, ROWS, COLS } from './constants'
import { DECKS } from './decks'
import { resolveChain, checkWinCondition } from './rules'

function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function addId(card, index) {
  return { ...card, id: `${card.name}-${index}-${Math.random().toString(36).slice(2, 8)}` }
}

export function createInitialState(p1DeckKey, p2DeckKey) {
  const p1Cards = shuffleArray(DECKS[p1DeckKey].cards.map(addId))
  const p2Cards = shuffleArray(DECKS[p2DeckKey].cards.map(addId))

  // Top 3 from each deck form the 3x6 grid
  // P1's 3 cards = top row (rows 0-2 left to right... actually row 0 cols 0-2)
  // Wait — 6 cards total for a 3x6 = 18 tiles. We need 18 cards.
  // Spec says "top 3 cards from each deck" = 6 cards for a 3-col x 6-row = 18 cells.
  // Re-reading spec: "Each player reveals the top 3 cards" and "Combine to form a 3x6 grid"
  // This means 6 cards map to 18 cells. Each card occupies 3 cells? Or we need 9 from each?
  // The GDD says "12 cards used as initial board (3x6 grid)" — so 12 cards, not 6.
  // That's 6 from each deck. Let's use top 6 from each.

  const p1BoardCards = p1Cards.splice(0, 9)
  const p2BoardCards = p2Cards.splice(0, 9)

  // Build grid: rows 0-2 from p2's cards (their side), rows 3-5 from p1's cards
  const grid = []
  for (let row = 0; row < 3; row++) {
    grid.push(
      Array.from({ length: 3 }, (_, col) => {
        const card = p2BoardCards[row * 3 + col]
        return { color: card.color, card }
      })
    )
  }
  for (let row = 0; row < 3; row++) {
    grid.push(
      Array.from({ length: 3 }, (_, col) => {
        const card = p1BoardCards[row * 3 + col]
        return { color: card.color, card }
      })
    )
  }

  // Draw 3 cards each
  const p1Hand = p1Cards.splice(0, 3)
  const p2Hand = p2Cards.splice(0, 3)

  return {
    grid,
    mascots: {
      p1: { row: 0, col: 1 },
      p2: { row: 5, col: 1 },
    },
    hands: { p1: p1Hand, p2: p2Hand },
    decks: { p1: p1Cards, p2: p2Cards },
    discard: [],
    phase: PHASES.DRAW,
    activePlayer: 'p1',
    turnCount: 1,
    winner: null,
    portalLinks: [],
    silverquillImmunity: null,
    prismariBoostRow: null,
    blueBonusDraws: { p1: 0, p2: 0 },
    log: ['Game started!'],
  }
}

export function gameReducer(state, action) {
  const { activePlayer } = state
  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'

  switch (action.type) {
    case 'DRAW_CARD': {
      const deck = [...state.decks[activePlayer]]
      const hand = [...state.hands[activePlayer]]
      const bonusDraws = state.blueBonusDraws[activePlayer]
      const totalDraws = 1 + bonusDraws

      const drawn = deck.splice(0, Math.min(totalDraws, deck.length))
      hand.push(...drawn)

      return {
        ...state,
        decks: { ...state.decks, [activePlayer]: deck },
        hands: { ...state.hands, [activePlayer]: hand },
        blueBonusDraws: { ...state.blueBonusDraws, [activePlayer]: 0 },
        phase: PHASES.PLAY,
        log: [...state.log, `${activePlayer} draws ${drawn.length} card(s).`],
      }
    }

    case 'PLAY_CARD': {
      const { cardIndex, row, col } = action.payload
      const hand = [...state.hands[activePlayer]]
      const card = hand[cardIndex]
      hand.splice(cardIndex, 1)

      const grid = state.grid.map((r) => r.map((t) => ({ ...t })))
      const oldTileCard = grid[row][col].card
      grid[row][col] = { color: card.color, card }

      const discard = [...state.discard, oldTileCard]

      const blueBonusDraws = { ...state.blueBonusDraws }
      if (card.color === 'blue') {
        blueBonusDraws[activePlayer] = (blueBonusDraws[activePlayer] || 0) + 1
      }

      return {
        ...state,
        grid,
        hands: { ...state.hands, [activePlayer]: hand },
        discard,
        blueBonusDraws,
        log: [...state.log, `${activePlayer} plays ${card.name} at (${row},${col}).`],
      }
    }

    case 'END_PLAY_PHASE': {
      return { ...state, phase: PHASES.MOVE }
    }

    case 'MOVE_MASCOT': {
      const { row, col } = action.payload
      const newMascots = {
        ...state.mascots,
        [opponent]: { row, col },
      }

      // Resolve tile chain
      const chainResult = resolveChain(
        state.grid,
        { row, col },
        activePlayer,
        state.silverquillImmunity,
        { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
      )

      newMascots[opponent] = chainResult.finalPos

      const logEntries = [...state.log]
      logEntries.push(`${activePlayer} moves ${opponent}'s mascot to (${row},${col}).`)
      if (chainResult.steps.length > 1) {
        logEntries.push(`Chain reaction! ${chainResult.steps.length} steps.`)
      }

      const winner = checkWinCondition(newMascots)

      return {
        ...state,
        mascots: newMascots,
        phase: winner ? PHASES.CHECK_WIN : PHASES.CHECK_WIN,
        winner,
        log: logEntries,
        pendingLateral: chainResult.lateralOptions || null,
      }
    }

    case 'RESOLVE_LATERAL': {
      const { row, col } = action.payload
      const newMascots = {
        ...state.mascots,
        [opponent]: { row, col },
      }

      // Resolve chain from lateral position
      const chainResult = resolveChain(
        state.grid,
        { row, col },
        activePlayer,
        state.silverquillImmunity,
        { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
      )
      newMascots[opponent] = chainResult.finalPos

      const winner = checkWinCondition(newMascots)

      return {
        ...state,
        mascots: newMascots,
        winner,
        pendingLateral: null,
        log: [...state.log, `Mascot slides laterally to (${row},${col}).`],
      }
    }

    case 'SKIP_LATERAL': {
      return { ...state, pendingLateral: null }
    }

    case 'END_TURN': {
      const nextPlayer = activePlayer === 'p1' ? 'p2' : 'p1'
      // Clear silverquill immunity if it was for the player whose turn just ended
      const silverquillImmunity =
        state.silverquillImmunity === activePlayer ? null : state.silverquillImmunity

      return {
        ...state,
        activePlayer: nextPlayer,
        phase: PHASES.DRAW,
        turnCount: state.turnCount + 1,
        silverquillImmunity,
        pendingLateral: null,
        log: [...state.log, `--- Turn ${state.turnCount + 1}: ${nextPlayer}'s turn ---`],
      }
    }

    case 'ACTIVATE_COLLEGE': {
      const { college, params } = action.payload
      return applyCollegeReducer(state, college, params, activePlayer)
    }

    default:
      return state
  }
}

function applyCollegeReducer(state, college, params, activePlayer) {
  const grid = state.grid.map((r) => r.map((t) => ({ ...t })))
  const log = [...state.log]

  switch (college) {
    case 'witherbloom': {
      const { centerRow, centerCol, wallRow, wallCol } = params
      for (let r = centerRow - 1; r <= centerRow + 1; r++) {
        for (let c = centerCol - 1; c <= centerCol + 1; c++) {
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            grid[r][c] = {
              color: 'colorless',
              card: { name: 'Destroyed', color: 'colorless', scryfallName: 'Wastes' },
            }
          }
        }
      }
      if (wallRow >= 0 && wallRow < ROWS && wallCol >= 0 && wallCol < COLS) {
        grid[wallRow][wallCol] = {
          color: 'green',
          card: { name: 'Witherbloom Wall', color: 'green', scryfallName: 'Forest' },
        }
      }
      log.push(`Witherbloom NUKE! 3x3 area destroyed around (${centerRow},${centerCol}).`)
      return { ...state, grid, log }
    }

    case 'silverquill': {
      log.push(`${activePlayer}'s mascot gains Silverquill immunity!`)
      return { ...state, silverquillImmunity: activePlayer, log }
    }

    case 'lorehold': {
      const { discardIndex, row, col } = params
      const discard = [...state.discard]
      const card = discard.splice(discardIndex, 1)[0]
      if (card) {
        grid[row][col] = { color: card.color, card }
        log.push(`Lorehold recalls ${card.name} to (${row},${col}).`)
      }
      return { ...state, grid, discard, log }
    }

    case 'quandrix': {
      const blueTiles = []
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c].color === 'blue') {
            blueTiles.push({ row: r, col: c })
          }
        }
      }
      log.push(`Quandrix links ${blueTiles.length} blue portals!`)
      return { ...state, portalLinks: blueTiles, log }
    }

    case 'prismari': {
      const { row } = params
      log.push(`Prismari doubles movement in row ${row}!`)
      return { ...state, prismariBoostRow: row, log }
    }

    default:
      return state
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/engine/__tests__/gameState.test.js
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/gameState.js src/engine/__tests__/gameState.test.js
git commit -m "feat: implement game state reducer with full turn lifecycle"
```

---

## Task 5: AI Opponent

**Files:**
- Create: `src/engine/ai.js`
- Create: `src/engine/__tests__/ai.test.js`

- [ ] **Step 1: Write failing tests for AI**

Create `src/engine/__tests__/ai.test.js`:

```js
import { describe, it, expect } from 'vitest'
import { chooseCardPlay, chooseMove } from '../ai'
import { createInitialState, gameReducer } from '../gameState'

describe('chooseMove', () => {
  it('returns a valid move from the available options', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    next = gameReducer(next, { type: 'END_PLAY_PHASE' })
    const move = chooseMove(next)
    expect(move).toHaveProperty('row')
    expect(move).toHaveProperty('col')
    expect(move.row).toBeGreaterThanOrEqual(0)
    expect(move.row).toBeLessThan(6)
    expect(move.col).toBeGreaterThanOrEqual(0)
    expect(move.col).toBeLessThan(3)
  })
})

describe('chooseCardPlay', () => {
  it('returns null or a valid play action', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    const play = chooseCardPlay(next)
    if (play !== null) {
      expect(play).toHaveProperty('cardIndex')
      expect(play).toHaveProperty('row')
      expect(play).toHaveProperty('col')
    }
  })

  it('returns null when hand is empty', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    state.hands[state.activePlayer] = []
    const play = chooseCardPlay(state)
    expect(play).toBe(null)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/engine/__tests__/ai.test.js
```

Expected: FAIL — cannot find `../ai`.

- [ ] **Step 3: Implement ai.js**

Create `src/engine/ai.js`:

```js
import { ROWS, COLS } from './constants'
import { getValidMoves, isPassable, resolveChain } from './rules'

function jitter() {
  return (Math.random() - 0.5) * 1.0
}

export function chooseMove(state) {
  const { activePlayer, grid, mascots } = state
  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const opponentMascot = mascots[opponent]
  const goalRow = activePlayer === 'p1' ? 0 : 5

  const validMoves = getValidMoves(grid, opponentMascot, activePlayer)

  if (validMoves.length === 0) return null

  let bestMove = validMoves[0]
  let bestScore = -Infinity

  for (const move of validMoves) {
    let score = 0

    // Prefer moves that push mascot closer to the goal
    const currentDist = Math.abs(opponentMascot.row - goalRow)
    const newDist = Math.abs(move.row - goalRow)
    score += (currentDist - newDist) * 3

    // Evaluate chain at destination
    const chainResult = resolveChain(grid, { row: move.row, col: move.col }, activePlayer, state.silverquillImmunity)
    const chainDist = Math.abs(chainResult.finalPos.row - goalRow)
    score += (currentDist - chainDist) * 2

    score += jitter()

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return { row: bestMove.row, col: bestMove.col }
}

export function chooseCardPlay(state) {
  const { activePlayer, grid, mascots, hands } = state
  const hand = hands[activePlayer]

  if (hand.length === 0) return null

  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const opponentMascot = mascots[opponent]
  const goalRow = activePlayer === 'p1' ? 0 : 5
  const forwardDir = activePlayer === 'p1' ? -1 : 1

  let bestPlay = null
  let bestScore = 0 // Only play if score > 0 (otherwise skip)

  for (let cardIndex = 0; cardIndex < hand.length; cardIndex++) {
    const card = hand[cardIndex]

    // College cards are high value — always play them
    if (card.college) {
      const target = findCollegeTarget(state, card, activePlayer)
      if (target) {
        return { cardIndex, ...target, college: card.college }
      }
    }

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        let score = 0

        // Red in opponent's forward path
        if (card.color === 'red') {
          const pathRow = opponentMascot.row + forwardDir
          if (row === pathRow && col === opponentMascot.col) score += 3
          // Red anywhere in forward column is decent
          if (col === opponentMascot.col) score += 1
        }

        // Green wall to block escape routes
        if (card.color === 'green') {
          const leftCol = opponentMascot.col - 1
          const rightCol = opponentMascot.col + 1
          if ((col === leftCol || col === rightCol) && row === opponentMascot.row) score += 2
        }

        // Black behind opponent
        if (card.color === 'black') {
          const behindRow = opponentMascot.row - forwardDir
          if (row === behindRow && col === opponentMascot.col) score += 2
        }

        score += jitter()

        if (score > bestScore) {
          bestScore = score
          bestPlay = { cardIndex, row, col }
        }
      }
    }
  }

  return bestPlay
}

function findCollegeTarget(state, card, activePlayer) {
  const { grid, mascots } = state
  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const opponentMascot = mascots[opponent]

  switch (card.college) {
    case 'witherbloom':
      // Target area near opponent mascot
      return {
        row: Math.max(0, Math.min(ROWS - 1, opponentMascot.row)),
        col: Math.max(0, Math.min(COLS - 1, opponentMascot.col)),
      }
    case 'prismari':
      // Boost the row the opponent mascot is on
      return { row: opponentMascot.row, col: 0 }
    default:
      // For silverquill, lorehold, quandrix — just play on any open spot
      return { row: 2, col: 1 }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/engine/__tests__/ai.test.js
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/engine/ai.js src/engine/__tests__/ai.test.js
git commit -m "feat: implement heuristic AI opponent with placement and movement scoring"
```

---

## Task 6: Board & Tile Components

**Files:**
- Create: `src/components/Board.jsx`
- Create: `src/components/Tile.jsx`
- Create: `src/components/Mascot.jsx`
- Create: `src/styles/board.css`

- [ ] **Step 1: Create board.css**

Create `src/styles/board.css`:

```css
.board {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  max-width: 420px;
  margin: 0 auto;
}

.tile {
  position: relative;
  aspect-ratio: 3 / 4;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border: 3px solid transparent;
}

.tile:hover {
  transform: scale(1.03);
}

.tile--white { border-color: var(--mtg-white); box-shadow: 0 0 12px rgba(245, 240, 224, 0.3); }
.tile--blue { border-color: var(--mtg-blue); box-shadow: 0 0 12px rgba(59, 130, 246, 0.3); }
.tile--black { border-color: var(--mtg-black); box-shadow: 0 0 12px rgba(26, 26, 46, 0.5); }
.tile--red { border-color: var(--mtg-red); box-shadow: 0 0 12px rgba(239, 68, 68, 0.3); }
.tile--green { border-color: var(--mtg-green); box-shadow: 0 0 12px rgba(34, 197, 94, 0.3); }
.tile--colorless { border-color: var(--mtg-colorless); }
.tile--gold { border-color: var(--mtg-gold); box-shadow: 0 0 12px rgba(212, 168, 67, 0.4); }

.tile__art {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
  filter: brightness(0.7);
}

.tile__art--fallback {
  background: var(--bg-card);
}

.tile__effect-label {
  position: absolute;
  bottom: 4px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-primary);
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}

.tile--goal-p1 {
  border-color: var(--mtg-green);
  box-shadow: inset 0 0 20px rgba(34, 197, 94, 0.2);
}

.tile--goal-p2 {
  border-color: #7c3aed;
  box-shadow: inset 0 0 20px rgba(124, 58, 237, 0.2);
}

.tile--valid-move {
  animation: pulse-highlight 1s infinite;
}

@keyframes pulse-highlight {
  0%, 100% { box-shadow: 0 0 8px rgba(245, 197, 66, 0.4); }
  50% { box-shadow: 0 0 20px rgba(245, 197, 66, 0.8); }
}

.tile--has-mascot {
  animation: tile-pulse 2s infinite ease-in-out;
}

@keyframes tile-pulse {
  0%, 100% { filter: brightness(1); }
  50% { filter: brightness(1.15); }
}

.mascot {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: 900;
  z-index: 10;
  border: 3px solid;
}

.mascot--p1 {
  background: radial-gradient(circle, #4ade80, #16a34a);
  border-color: #15803d;
  color: #052e16;
}

.mascot--p2 {
  background: radial-gradient(circle, #a78bfa, #7c3aed);
  border-color: #6d28d9;
  color: #1e1b4b;
}
```

- [ ] **Step 2: Create Mascot.jsx**

Create `src/components/Mascot.jsx`:

```jsx
import { motion } from 'framer-motion'

const MASCOT_SYMBOLS = { p1: 'P1', p2: 'P2' }

export default function Mascot({ player }) {
  return (
    <motion.div
      className={`mascot mascot--${player}`}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
    >
      {MASCOT_SYMBOLS[player]}
    </motion.div>
  )
}
```

- [ ] **Step 3: Create Tile.jsx**

Create `src/components/Tile.jsx`:

```jsx
import { motion } from 'framer-motion'
import { getScryfallImageUrl } from '../utils/scryfall'
import Mascot from './Mascot'
import { P1_GOAL_ROW, P2_GOAL_ROW } from '../engine/constants'
import { useState } from 'react'

const EFFECT_LABELS = {
  white: 'Slide L/R',
  red: '+1 Forward',
  black: '-1 Back',
  green: 'Wall',
  blue: 'Draw +1',
  colorless: '',
}

export default function Tile({ tile, row, col, mascotHere, onTileClick, isValidMove, isPlaceTarget }) {
  const [imgFailed, setImgFailed] = useState(false)
  const imageUrl = tile.card ? getScryfallImageUrl(tile.card.scryfallName) : null
  const colorClass = tile.card?.college ? 'gold' : tile.color
  const isGoalP1 = row === P1_GOAL_ROW
  const isGoalP2 = row === P2_GOAL_ROW
  const effectLabel = tile.card?.college
    ? tile.card.college.charAt(0).toUpperCase() + tile.card.college.slice(1)
    : EFFECT_LABELS[tile.color]

  return (
    <motion.div
      className={[
        'tile',
        `tile--${colorClass}`,
        isGoalP1 && 'tile--goal-p1',
        isGoalP2 && 'tile--goal-p2',
        isValidMove && 'tile--valid-move',
        mascotHere && 'tile--has-mascot',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onTileClick?.(row, col)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
    >
      {imageUrl && !imgFailed ? (
        <div
          className="tile__art"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{ display: 'none' }}
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        <div className="tile__art tile__art--fallback" />
      )}

      {effectLabel && <div className="tile__effect-label">{effectLabel}</div>}

      {mascotHere && <Mascot player={mascotHere} />}
    </motion.div>
  )
}
```

- [ ] **Step 4: Create Board.jsx**

Create `src/components/Board.jsx`:

```jsx
import Tile from './Tile'
import '../styles/board.css'
import { ROWS, COLS } from '../engine/constants'

export default function Board({ grid, mascots, validMoves, onTileClick, placeTargets }) {
  const validMoveSet = new Set((validMoves || []).map((m) => `${m.row},${m.col}`))
  const placeTargetSet = new Set((placeTargets || []).map((p) => `${p.row},${p.col}`))

  function getMascotAt(row, col) {
    if (mascots.p1.row === row && mascots.p1.col === col) return 'p1'
    if (mascots.p2.row === row && mascots.p2.col === col) return 'p2'
    return null
  }

  return (
    <div className="board">
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => (
          <Tile
            key={`${row}-${col}`}
            tile={grid[row][col]}
            row={row}
            col={col}
            mascotHere={getMascotAt(row, col)}
            onTileClick={onTileClick}
            isValidMove={validMoveSet.has(`${row},${col}`)}
            isPlaceTarget={placeTargetSet.has(`${row},${col}`)}
          />
        ))
      )}
    </div>
  )
}
```

- [ ] **Step 5: Verify components render**

Update `src/App.jsx` temporarily to render the board with a test state:

```jsx
import { useState } from 'react'
import Board from './components/Board'
import { createInitialState } from './engine/gameState'

export default function App() {
  const [state] = useState(() => createInitialState('lorehold', 'witherbloom'))

  return (
    <div style={{ padding: '20px', minHeight: '100vh' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Mage Tower</h1>
      <Board grid={state.grid} mascots={state.mascots} />
    </div>
  )
}
```

```bash
npm run dev
```

Expected: Board renders with a 3x6 grid of tiles showing card art and two mascot tokens.

- [ ] **Step 6: Commit**

```bash
git add src/components/Board.jsx src/components/Tile.jsx src/components/Mascot.jsx src/styles/board.css src/App.jsx
git commit -m "feat: add Board, Tile, and Mascot components with Scryfall art"
```

---

## Task 7: Card & Hand Components

**Files:**
- Create: `src/components/Card.jsx`
- Create: `src/components/PlayerHand.jsx`
- Create: `src/styles/cards.css`

- [ ] **Step 1: Create cards.css**

Create `src/styles/cards.css`:

```css
.hand {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  min-height: 160px;
}

.card {
  position: relative;
  width: 100px;
  height: 140px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  cursor: pointer;
  border: 3px solid transparent;
  transition: border-color 0.15s ease;
  flex-shrink: 0;
}

.card--white { border-color: var(--mtg-white); }
.card--blue { border-color: var(--mtg-blue); }
.card--black { border-color: var(--mtg-black); }
.card--red { border-color: var(--mtg-red); }
.card--green { border-color: var(--mtg-green); }
.card--colorless { border-color: var(--mtg-colorless); }
.card--gold { border-color: var(--mtg-gold); }

.card--selected {
  outline: 3px solid var(--accent-glow);
  outline-offset: 2px;
  transform: translateY(-12px);
}

.card__art {
  position: absolute;
  inset: 0;
  background-size: cover;
  background-position: center;
}

.card__art--fallback {
  background: var(--bg-card);
}

.card__name {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 4px 6px;
  background: rgba(0, 0, 0, 0.75);
  font-size: 10px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card__college {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  background: rgba(212, 168, 67, 0.9);
  color: #1a1210;
  padding: 2px 5px;
  border-radius: 3px;
}
```

- [ ] **Step 2: Create Card.jsx**

Create `src/components/Card.jsx`:

```jsx
import { motion } from 'framer-motion'
import { getScryfallImageUrl } from '../utils/scryfall'
import { useState } from 'react'

export default function Card({ card, index, isSelected, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false)
  const imageUrl = getScryfallImageUrl(card.scryfallName)
  const colorClass = card.college ? 'gold' : card.color

  return (
    <motion.div
      className={[
        'card',
        `card--${colorClass}`,
        isSelected && 'card--selected',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect?.(index)}
      whileHover={{ y: -8, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {!imgFailed ? (
        <div
          className="card__art"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{ display: 'none' }}
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        <div className="card__art card__art--fallback" />
      )}

      {card.college && <div className="card__college">{card.college}</div>}
      <div className="card__name">{card.name}</div>
    </motion.div>
  )
}
```

- [ ] **Step 3: Create PlayerHand.jsx**

Create `src/components/PlayerHand.jsx`:

```jsx
import Card from './Card'
import '../styles/cards.css'

export default function PlayerHand({ cards, selectedIndex, onSelect }) {
  return (
    <div className="hand">
      {cards.map((card, i) => (
        <Card
          key={card.id || i}
          card={card}
          index={i}
          isSelected={selectedIndex === i}
          onSelect={onSelect}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/Card.jsx src/components/PlayerHand.jsx src/styles/cards.css
git commit -m "feat: add Card and PlayerHand components with Scryfall art and selection"
```

---

## Task 8: Phase Indicator, Game Log, Move Controls

**Files:**
- Create: `src/components/PhaseIndicator.jsx`
- Create: `src/components/GameLog.jsx`
- Create: `src/components/MoveControls.jsx`

- [ ] **Step 1: Create PhaseIndicator.jsx**

Create `src/components/PhaseIndicator.jsx`:

```jsx
import { motion } from 'framer-motion'
import { PHASES } from '../engine/constants'

const PHASE_DISPLAY = {
  [PHASES.DRAW]: { label: 'Draw', color: '#3b82f6' },
  [PHASES.PLAY]: { label: 'Play Cards', color: '#a855f7' },
  [PHASES.MOVE]: { label: 'Move Opponent', color: '#ef4444' },
  [PHASES.RESOLVE]: { label: 'Resolving...', color: '#22c55e' },
  [PHASES.CHECK_WIN]: { label: 'Checking...', color: '#f59e0b' },
}

export default function PhaseIndicator({ phase, activePlayer, turnCount }) {
  const display = PHASE_DISPLAY[phase] || { label: phase, color: '#888' }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '12px 24px',
      background: 'var(--bg-medium)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '12px',
    }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        Turn {turnCount}
      </span>
      <span style={{
        fontFamily: 'Cinzel, serif',
        fontWeight: 700,
        fontSize: '16px',
        color: activePlayer === 'p1' ? '#4ade80' : '#a78bfa',
      }}>
        {activePlayer === 'p1' ? 'Player 1' : 'Player 2'}
      </span>
      <motion.span
        key={phase}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          background: display.color,
          color: 'white',
          padding: '6px 14px',
          borderRadius: 'var(--radius)',
          fontWeight: 700,
          fontSize: '13px',
          textTransform: 'uppercase',
        }}
      >
        {display.label}
      </motion.span>
    </div>
  )
}
```

- [ ] **Step 2: Create GameLog.jsx**

Create `src/components/GameLog.jsx`:

```jsx
import { useEffect, useRef } from 'react'

export default function GameLog({ entries }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div style={{
      background: 'var(--bg-medium)',
      borderRadius: 'var(--radius-lg)',
      padding: '12px',
      height: '300px',
      overflowY: 'auto',
      fontSize: '12px',
      lineHeight: '1.6',
    }}>
      <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--accent-gold)' }}>
        Game Log
      </h3>
      {entries.map((entry, i) => (
        <div key={i} style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>
          {entry}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
```

- [ ] **Step 3: Create MoveControls.jsx**

Create `src/components/MoveControls.jsx`:

```jsx
export default function MoveControls({ validMoves, onMove }) {
  if (!validMoves || validMoves.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>
        No valid moves available.
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '8px' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '13px' }}>
        Click a highlighted tile to move opponent's mascot, or use buttons:
      </p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {validMoves.map((move) => (
          <button
            key={`${move.row}-${move.col}`}
            onClick={() => onMove(move)}
            style={{
              background: 'var(--bg-light)',
              color: 'var(--text-primary)',
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '13px',
              border: '2px solid var(--accent-gold)',
            }}
          >
            {move.direction.charAt(0).toUpperCase() + move.direction.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/PhaseIndicator.jsx src/components/GameLog.jsx src/components/MoveControls.jsx
git commit -m "feat: add PhaseIndicator, GameLog, and MoveControls components"
```

---

## Task 9: GameScreen — Full Game Loop

**Files:**
- Create: `src/components/GameScreen.jsx`

- [ ] **Step 1: Create GameScreen.jsx**

Create `src/components/GameScreen.jsx`:

```jsx
import { useReducer, useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Board from './Board'
import PlayerHand from './PlayerHand'
import PhaseIndicator from './PhaseIndicator'
import GameLog from './GameLog'
import MoveControls from './MoveControls'
import GameOverModal from './GameOverModal'
import { createInitialState, gameReducer } from '../engine/gameState'
import { getValidMoves } from '../engine/rules'
import { chooseCardPlay, chooseMove } from '../engine/ai'
import { PHASES } from '../engine/constants'

export default function GameScreen({ p1Deck, p2Deck, mode, onExit }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(p1Deck, p2Deck)
  )
  const [selectedCardIndex, setSelectedCardIndex] = useState(null)

  const { phase, activePlayer, grid, mascots, hands, winner, log, pendingLateral } = state
  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const isAiTurn = mode === 'ai' && activePlayer === 'p2'

  const validMoves =
    phase === PHASES.MOVE ? getValidMoves(grid, mascots[opponent], activePlayer) : []

  // Auto-advance draw phase
  useEffect(() => {
    if (phase === PHASES.DRAW && !winner) {
      const timer = setTimeout(() => dispatch({ type: 'DRAW_CARD' }), 400)
      return () => clearTimeout(timer)
    }
  }, [phase, winner])

  // Auto-advance checkWin → end turn
  useEffect(() => {
    if (phase === PHASES.CHECK_WIN && !winner && !pendingLateral) {
      const timer = setTimeout(() => dispatch({ type: 'END_TURN' }), 300)
      return () => clearTimeout(timer)
    }
  }, [phase, winner, pendingLateral])

  // AI turn logic
  useEffect(() => {
    if (!isAiTurn || winner) return

    if (phase === PHASES.PLAY) {
      const timer = setTimeout(() => {
        const play = chooseCardPlay(state)
        if (play) {
          if (play.college) {
            dispatch({
              type: 'PLAY_CARD',
              payload: { cardIndex: play.cardIndex, row: play.row, col: play.col },
            })
            dispatch({
              type: 'ACTIVATE_COLLEGE',
              payload: {
                college: play.college,
                params: { centerRow: play.row, centerCol: play.col, row: play.row, col: play.col },
              },
            })
          } else {
            dispatch({
              type: 'PLAY_CARD',
              payload: { cardIndex: play.cardIndex, row: play.row, col: play.col },
            })
          }
          // AI plays one card then ends
          setTimeout(() => dispatch({ type: 'END_PLAY_PHASE' }), 500)
        } else {
          dispatch({ type: 'END_PLAY_PHASE' })
        }
      }, 600)
      return () => clearTimeout(timer)
    }

    if (phase === PHASES.MOVE) {
      const timer = setTimeout(() => {
        const move = chooseMove(state)
        if (move) {
          dispatch({ type: 'MOVE_MASCOT', payload: move })
        }
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [isAiTurn, phase, winner])

  const handleTileClick = useCallback(
    (row, col) => {
      if (winner || isAiTurn) return

      // During play phase: place selected card
      if (phase === PHASES.PLAY && selectedCardIndex !== null) {
        dispatch({
          type: 'PLAY_CARD',
          payload: { cardIndex: selectedCardIndex, row, col },
        })
        setSelectedCardIndex(null)
        return
      }

      // During move phase: move mascot to valid tile
      if (phase === PHASES.MOVE) {
        const isValid = validMoves.some((m) => m.row === row && m.col === col)
        if (isValid) {
          dispatch({ type: 'MOVE_MASCOT', payload: { row, col } })
        }
      }

      // Handle pending lateral choice
      if (pendingLateral) {
        const isLateral = pendingLateral.some((p) => p.row === row && p.col === col)
        if (isLateral) {
          dispatch({ type: 'RESOLVE_LATERAL', payload: { row, col } })
        }
      }
    },
    [phase, selectedCardIndex, validMoves, winner, isAiTurn, pendingLateral]
  )

  const handleCardSelect = useCallback(
    (index) => {
      if (phase !== PHASES.PLAY || isAiTurn) return
      setSelectedCardIndex(selectedCardIndex === index ? null : index)
    },
    [phase, selectedCardIndex, isAiTurn]
  )

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 420px 240px',
      gap: '16px',
      padding: '16px',
      minHeight: '100vh',
      maxWidth: '1100px',
      margin: '0 auto',
    }}>
      {/* Left: hand + controls */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {phase === PHASES.PLAY && !isAiTurn && (
          <button
            onClick={() => dispatch({ type: 'END_PLAY_PHASE' })}
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-dark)',
              padding: '10px 20px',
              borderRadius: 'var(--radius)',
              fontWeight: 700,
              fontSize: '14px',
              marginBottom: '12px',
              alignSelf: 'center',
            }}
          >
            End Play Phase
          </button>
        )}

        {pendingLateral && !isAiTurn && (
          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '13px' }}>
              White tile! Choose a lateral move or skip:
            </p>
            <button
              onClick={() => dispatch({ type: 'SKIP_LATERAL' })}
              style={{
                background: 'var(--bg-light)',
                color: 'var(--text-primary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                fontSize: '13px',
                border: '2px solid var(--text-muted)',
              }}
            >
              Skip
            </button>
          </div>
        )}

        {phase === PHASES.MOVE && !isAiTurn && (
          <MoveControls
            validMoves={validMoves}
            onMove={(move) => dispatch({ type: 'MOVE_MASCOT', payload: move })}
          />
        )}

        <PlayerHand
          cards={hands[activePlayer]}
          selectedIndex={selectedCardIndex}
          onSelect={handleCardSelect}
        />

        {isAiTurn && (
          <div style={{
            textAlign: 'center',
            padding: '12px',
            color: 'var(--text-muted)',
            fontStyle: 'italic',
          }}>
            AI is thinking...
          </div>
        )}
      </div>

      {/* Center: board */}
      <div>
        <PhaseIndicator
          phase={phase}
          activePlayer={activePlayer}
          turnCount={state.turnCount}
        />
        <Board
          grid={grid}
          mascots={mascots}
          validMoves={phase === PHASES.MOVE ? validMoves : []}
          onTileClick={handleTileClick}
          placeTargets={pendingLateral || []}
        />
      </div>

      {/* Right: game log */}
      <div>
        <GameLog entries={log} />
        <button
          onClick={onExit}
          style={{
            marginTop: '12px',
            background: 'var(--bg-light)',
            color: 'var(--text-secondary)',
            padding: '8px 16px',
            borderRadius: 'var(--radius)',
            fontSize: '12px',
            width: '100%',
          }}
        >
          Back to Menu
        </button>
      </div>

      {/* Win overlay */}
      <AnimatePresence>
        {winner && (
          <GameOverModal
            winner={winner}
            turnCount={state.turnCount}
            onRematch={() => window.location.reload()}
            onMenu={onExit}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameScreen.jsx
git commit -m "feat: implement GameScreen with full turn loop, AI integration, and game flow"
```

---

## Task 10: Game Over Modal & Pass Screen

**Files:**
- Create: `src/components/GameOverModal.jsx`
- Create: `src/components/PassScreen.jsx`

- [ ] **Step 1: Create GameOverModal.jsx**

Create `src/components/GameOverModal.jsx`:

```jsx
import { motion } from 'framer-motion'

export default function GameOverModal({ winner, turnCount, onRematch, onMenu }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <motion.div
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{
          background: 'var(--bg-medium)',
          borderRadius: '16px',
          padding: '48px',
          textAlign: 'center',
          border: '3px solid var(--accent-gold)',
          maxWidth: '400px',
        }}
      >
        <h2 style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '28px',
          color: winner === 'p1' ? '#4ade80' : '#a78bfa',
          marginBottom: '8px',
        }}>
          {winner === 'p1' ? 'Player 1' : 'Player 2'} Wins!
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Victory in {turnCount} turns
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onRematch}
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-dark)',
              padding: '12px 24px',
              borderRadius: 'var(--radius)',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            Rematch
          </button>
          <button
            onClick={onMenu}
            style={{
              background: 'var(--bg-light)',
              color: 'var(--text-primary)',
              padding: '12px 24px',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '15px',
              border: '2px solid var(--text-muted)',
            }}
          >
            Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Create PassScreen.jsx**

Create `src/components/PassScreen.jsx`:

```jsx
import { motion } from 'framer-motion'

export default function PassScreen({ nextPlayer, onReady }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onReady}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-dark)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
        cursor: 'pointer',
      }}
    >
      <h2 style={{
        fontFamily: 'Cinzel, serif',
        fontSize: '32px',
        color: nextPlayer === 'p1' ? '#4ade80' : '#a78bfa',
        marginBottom: '16px',
      }}>
        {nextPlayer === 'p1' ? "Player 1's" : "Player 2's"} Turn
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
        Click anywhere to begin
      </p>
    </motion.div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/GameOverModal.jsx src/components/PassScreen.jsx
git commit -m "feat: add GameOverModal and PassScreen components"
```

---

## Task 11: Main Menu

**Files:**
- Create: `src/components/MainMenu.jsx`

- [ ] **Step 1: Create MainMenu.jsx**

Create `src/components/MainMenu.jsx`:

```jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { DECKS } from '../engine/decks'

const deckKeys = Object.keys(DECKS)

export default function MainMenu({ onStartGame }) {
  const [mode, setMode] = useState('ai')
  const [p1Deck, setP1Deck] = useState(deckKeys[0])
  const [p2Deck, setP2Deck] = useState(deckKeys[1])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
    }}>
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '48px',
          color: 'var(--accent-gold)',
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        Mage Tower
      </motion.h1>
      <p style={{
        color: 'var(--text-secondary)',
        marginBottom: '40px',
        fontSize: '16px',
        textAlign: 'center',
      }}>
        Strixhaven Tactical Card Game
      </p>

      {/* Mode Select */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>
          Game Mode
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { key: 'ai', label: 'vs AI' },
            { key: 'hotseat', label: 'Hot Seat' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                padding: '12px 32px',
                borderRadius: 'var(--radius)',
                fontWeight: 700,
                fontSize: '15px',
                background: mode === m.key ? 'var(--accent-gold)' : 'var(--bg-light)',
                color: mode === m.key ? 'var(--bg-dark)' : 'var(--text-primary)',
                border: mode === m.key ? 'none' : '2px solid var(--text-muted)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deck Select */}
      <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
        <DeckPicker
          label={mode === 'ai' ? 'Your Deck' : 'Player 1 Deck'}
          selected={p1Deck}
          onChange={setP1Deck}
        />
        {mode === 'hotseat' && (
          <DeckPicker label="Player 2 Deck" selected={p2Deck} onChange={setP2Deck} />
        )}
      </div>

      {/* Start Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          const aiDeck = mode === 'ai'
            ? deckKeys[Math.floor(Math.random() * deckKeys.length)]
            : p2Deck
          onStartGame({ mode, p1Deck, p2Deck: aiDeck })
        }}
        style={{
          background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)',
          color: 'var(--bg-dark)',
          padding: '16px 48px',
          borderRadius: 'var(--radius-lg)',
          fontFamily: 'Cinzel, serif',
          fontWeight: 900,
          fontSize: '20px',
          letterSpacing: '1px',
        }}
      >
        Start Game
      </motion.button>
    </div>
  )
}

function DeckPicker({ label, selected, onChange }) {
  return (
    <div>
      <h3 style={{
        color: 'var(--text-primary)',
        marginBottom: '12px',
        fontSize: '14px',
        textAlign: 'center',
      }}>
        {label}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {deckKeys.map((key) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '13px',
              textAlign: 'left',
              background: selected === key ? 'var(--bg-light)' : 'var(--bg-medium)',
              color: 'var(--text-primary)',
              border: selected === key
                ? '2px solid var(--accent-gold)'
                : '2px solid transparent',
              minWidth: '200px',
            }}
          >
            <div style={{ fontWeight: 700 }}>{DECKS[key].name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {DECKS[key].description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MainMenu.jsx
git commit -m "feat: add MainMenu with mode selection and deck picker"
```

---

## Task 12: Wire Up App.jsx — Full Flow

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: Update App.jsx to connect menu → game flow**

Replace `src/App.jsx`:

```jsx
import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import MainMenu from './components/MainMenu'
import GameScreen from './components/GameScreen'

export default function App() {
  const [gameConfig, setGameConfig] = useState(null)

  if (!gameConfig) {
    return <MainMenu onStartGame={setGameConfig} />
  }

  return (
    <AnimatePresence mode="wait">
      <GameScreen
        key={`${gameConfig.p1Deck}-${gameConfig.p2Deck}-${Date.now()}`}
        p1Deck={gameConfig.p1Deck}
        p2Deck={gameConfig.p2Deck}
        mode={gameConfig.mode}
        onExit={() => setGameConfig(null)}
      />
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Clean up default Vite files**

Delete these files if they exist:
- `src/App.css`
- `src/index.css`
- `src/assets/react.svg`
- `public/vite.svg`

Update `index.html` to remove the vite icon link and set the title:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Mage Tower — Strixhaven</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Verify full flow in browser**

```bash
npm run dev
```

Expected:
1. Main menu renders with mode select and deck picker
2. Clicking "Start Game" transitions to the game screen
3. Board renders with card art, mascots placed correctly
4. Turn phases cycle: draw → play → move → resolve
5. AI takes its turn automatically in vs AI mode
6. "Back to Menu" returns to main menu

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx index.html
git rm --cached src/App.css src/index.css src/assets/react.svg public/vite.svg 2>/dev/null; true
git commit -m "feat: wire up full game flow — menu to game to victory"
```

---

## Task 13: Hot-Seat Mode Integration

**Files:**
- Modify: `src/components/GameScreen.jsx`

- [ ] **Step 1: Add PassScreen integration to GameScreen**

In `src/components/GameScreen.jsx`, add hot-seat support. Add this state and logic:

After the existing `useState` for `selectedCardIndex`:

```jsx
const [showPassScreen, setShowPassScreen] = useState(false)
```

Add an effect to show the pass screen on turn change in hot-seat mode:

```jsx
useEffect(() => {
  if (mode === 'hotseat' && phase === PHASES.DRAW && state.turnCount > 1) {
    setShowPassScreen(true)
  }
}, [activePlayer])
```

Add the PassScreen import at the top:

```jsx
import PassScreen from './PassScreen'
```

Add inside the return, before the `AnimatePresence` for the winner:

```jsx
<AnimatePresence>
  {showPassScreen && (
    <PassScreen
      nextPlayer={activePlayer}
      onReady={() => setShowPassScreen(false)}
    />
  )}
</AnimatePresence>
```

- [ ] **Step 2: Verify hot-seat mode**

```bash
npm run dev
```

Expected: In hot-seat mode, a "Pass to Player X" screen appears between turns. Clicking it reveals the next player's hand and starts their turn.

- [ ] **Step 3: Commit**

```bash
git add src/components/GameScreen.jsx
git commit -m "feat: integrate hot-seat pass screen between turns"
```

---

## Task 14: College Effect UI Triggers

**Files:**
- Modify: `src/components/GameScreen.jsx`

- [ ] **Step 1: Add college effect handling to card play**

In `GameScreen.jsx`, update the `handleTileClick` function's play-card branch. After the `PLAY_CARD` dispatch, check if the played card has a college effect and dispatch `ACTIVATE_COLLEGE`:

```jsx
// Inside handleTileClick, after PLAY_CARD dispatch during play phase:
const card = hands[activePlayer][selectedCardIndex]
dispatch({
  type: 'PLAY_CARD',
  payload: { cardIndex: selectedCardIndex, row, col },
})

if (card.college) {
  // For witherbloom: center on placement location
  // For prismari: target the row
  // For others: simple activation
  const params = {
    centerRow: row,
    centerCol: col,
    wallRow: row,
    wallCol: col,
    row,
    col,
    discardIndex: 0, // Lorehold: simplified — picks first discard
  }
  dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params } })
}
setSelectedCardIndex(null)
```

- [ ] **Step 2: Verify college effects trigger**

```bash
npm run dev
```

Expected: Playing a college card (e.g., Witherbloom) triggers its effect. The game log shows the college effect message.

- [ ] **Step 3: Commit**

```bash
git add src/components/GameScreen.jsx
git commit -m "feat: wire college effect triggers to card play actions"
```

---

## Task 15: Final Polish & Verification

**Files:**
- Modify: `src/styles/theme.css`

- [ ] **Step 1: Add screen shake animation for chain reactions**

Add to `src/styles/theme.css`:

```css
@keyframes screen-shake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-4px, -2px); }
  20% { transform: translate(4px, 2px); }
  30% { transform: translate(-3px, 3px); }
  40% { transform: translate(3px, -3px); }
  50% { transform: translate(-2px, 2px); }
  60% { transform: translate(2px, -2px); }
  70% { transform: translate(-1px, 1px); }
  80% { transform: translate(1px, -1px); }
}

.shake {
  animation: screen-shake 0.4s ease-out;
}
```

- [ ] **Step 2: Run full test suite**

```bash
npm run test
```

Expected: All tests pass (decks, rules, gameState, AI).

- [ ] **Step 3: Run dev server and playtest**

```bash
npm run dev
```

Verify:
1. Main menu → deck selection → start game works
2. vs AI mode: AI draws, plays a card, moves your mascot
3. Hot-seat mode: pass screen appears, both players can take turns
4. Card art loads from Scryfall
5. Tile effects resolve (red pushes forward, black pushes back, green blocks)
6. College effects trigger when dual-color cards are played
7. Game ends when a mascot reaches the goal row
8. Rematch and menu buttons work

- [ ] **Step 4: Build for production**

```bash
npm run build
```

Expected: Builds successfully to `dist/`.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: final polish — screen shake, verification, production build"
```
