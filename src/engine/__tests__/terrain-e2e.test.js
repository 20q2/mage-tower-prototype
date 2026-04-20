/**
 * End-to-end terrain tests: full play card → move → resolve flow for each color.
 * Tests both P1 and P2 perspectives, edge cases, and college effects.
 */
import { describe, it, expect } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'
import { getValidMoves, resolveTile, resolveChain, isPassable } from '../rules'
import { PHASES, ROWS, COLS } from '../constants'

// === Helpers ===

function makeTile(color) {
  return { color, card: { name: color, color, scryfallName: 'Plains', displayName: color } }
}

function emptyGrid() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ color: 'empty', card: null }))
  )
}

function baseState(overrides = {}) {
  return {
    grid: emptyGrid(),
    mascots: { p1: { row: 0, col: 1 }, p2: { row: 5, col: 1 } },
    hands: { p1: [], p2: [] },
    decks: { p1: [], p2: [] },
    discard: [],
    phase: PHASES.P1_DRAW,
    turnCount: 1,
    winner: null,
    pendingMoves: { p1: null, p2: null },
    portalLinks: [],
    silverquillImmunity: null,
    prismariBoostRow: null,
    blueBonusDraws: { p1: 0, p2: 0 },
    pendingLateral: null,
    pendingLateralPlayer: null,
    log: [],
    ...overrides,
  }
}

/** Place a tile, submit both moves, resolve, return final state */
function placeAndResolve({ tiles = [], mascots, p1Move, p2Move, extras = {} }) {
  const grid = emptyGrid()
  for (const { row, col, color } of tiles) {
    grid[row][col] = makeTile(color)
  }
  const state = baseState({
    grid,
    mascots: mascots || { p1: { row: 0, col: 1 }, p2: { row: 5, col: 1 } },
    phase: PHASES.RESOLVE,
    pendingMoves: { p1: p1Move, p2: p2Move },
    ...extras,
  })
  return gameReducer(state, { type: 'RESOLVE_MOVES' })
}

// ============================
// RED — +1 Forward
// ============================
describe('RED terrain (+1 forward)', () => {
  it('P1 pushes P2 onto red → P2 slides forward (toward row 0)', () => {
    const result = placeAndResolve({
      tiles: [{ row: 4, col: 1, color: 'red' }],
      p1Move: { row: 4, col: 1 },
      p2Move: { row: 1, col: 1 },
    })
    // Red pushes P2 from (4,1) toward row 0 → (3,1)
    expect(result.mascots.p2).toEqual({ row: 3, col: 1 })
  })

  it('P2 pushes P1 onto red → P1 slides forward (toward row 5)', () => {
    const result = placeAndResolve({
      tiles: [{ row: 1, col: 1, color: 'red' }],
      p1Move: { row: 4, col: 1 },
      p2Move: { row: 1, col: 1 },
    })
    // Red pushes P1 from (1,1) toward row 5 → (2,1)
    expect(result.mascots.p1).toEqual({ row: 2, col: 1 })
  })

  it('red at board edge (row 0) when P1 pushes: forward is -1, clamped, no effect', () => {
    // P1 pushes P2 onto red at row 0. P1's forward = -1 → row -1 → clamped to 0 → no move
    const result = placeAndResolve({
      tiles: [{ row: 0, col: 1, color: 'red' }],
      mascots: { p1: { row: 5, col: 1 }, p2: { row: 1, col: 1 } },
      p1Move: { row: 0, col: 1 },
      p2Move: { row: 4, col: 1 },
    })
    expect(result.mascots.p2.row).toBe(0) // Can't go further, stays at 0
  })

  it('red at board edge (row 5) when P2 pushes: forward is +1, clamped, no effect', () => {
    const result = placeAndResolve({
      tiles: [{ row: 5, col: 1, color: 'red' }],
      mascots: { p1: { row: 4, col: 1 }, p2: { row: 0, col: 1 } },
      p1Move: { row: 1, col: 1 },
      p2Move: { row: 5, col: 1 },
    })
    expect(result.mascots.p1.row).toBe(5) // Can't go further, stays at 5
  })

  it('chains through 3 consecutive red tiles', () => {
    const result = placeAndResolve({
      tiles: [
        { row: 4, col: 1, color: 'red' },
        { row: 3, col: 1, color: 'red' },
        { row: 2, col: 1, color: 'red' },
      ],
      p1Move: { row: 4, col: 1 },
      p2Move: { row: 1, col: 1 },
    })
    // (4,1)→(3,1)→(2,1)→(1,1)
    expect(result.mascots.p2).toEqual({ row: 1, col: 1 })
  })

  it('red chain into goal row triggers win', () => {
    const result = placeAndResolve({
      tiles: [{ row: 1, col: 1, color: 'red' }],
      mascots: { p1: { row: 5, col: 1 }, p2: { row: 2, col: 1 } },
      p1Move: { row: 1, col: 1 },
      p2Move: { row: 4, col: 1 },
    })
    expect(result.mascots.p2).toEqual({ row: 0, col: 1 })
    expect(result.winner).toBe('p1')
  })
})

// ============================
// BLACK — -1 Backward
// ============================
describe('BLACK terrain (-1 backward)', () => {
  it('P1 pushes P2 onto black → P2 pushed backward (toward row 5)', () => {
    const result = placeAndResolve({
      tiles: [{ row: 4, col: 1, color: 'black' }],
      p1Move: { row: 4, col: 1 },
      p2Move: { row: 1, col: 1 },
    })
    // Black pushes backward relative to P1's push direction: P1 pushes toward row 0, backward = row 5
    expect(result.mascots.p2).toEqual({ row: 5, col: 1 })
  })

  it('P2 pushes P1 onto black → P1 pushed backward (toward row 0)', () => {
    const result = placeAndResolve({
      tiles: [{ row: 1, col: 1, color: 'black' }],
      p1Move: { row: 4, col: 1 },
      p2Move: { row: 1, col: 1 },
    })
    // P2 pushes toward row 5, backward = row 0
    expect(result.mascots.p1).toEqual({ row: 0, col: 1 })
  })

  it('black at edge does nothing', () => {
    const result = placeAndResolve({
      tiles: [{ row: 5, col: 1, color: 'black' }],
      mascots: { p1: { row: 0, col: 1 }, p2: { row: 4, col: 1 } },
      p1Move: { row: 5, col: 1 }, // push P2 to black at row 5
      p2Move: { row: 1, col: 1 },
    })
    // Black at row 5, backward for P1's push = +1 → row 6 → clamped to 5 → no move
    expect(result.mascots.p2.row).toBe(5)
  })

  it('black then red creates pushback then forward', () => {
    const result = placeAndResolve({
      tiles: [
        { row: 4, col: 1, color: 'black' },
        { row: 5, col: 1, color: 'red' },
      ],
      p1Move: { row: 4, col: 1 },
      p2Move: { row: 1, col: 1 },
    })
    // Black at (4,1) pushes P2 backward to (5,1), red at (5,1) pushes forward to (4,1),
    // then black again → (5,1) → red → (4,1) → loop until chain cap
    // Final position depends on chain cap (10), should end at (4,1) or (5,1)
    expect([4, 5]).toContain(result.mascots.p2.row)
  })
})

// ============================
// GREEN — WALL (impassable)
// ============================
describe('GREEN terrain (wall)', () => {
  it('green tile is not passable', () => {
    expect(isPassable(makeTile('green'))).toBe(false)
  })

  it('all other colors are passable', () => {
    for (const color of ['white', 'blue', 'black', 'red', 'colorless', 'empty']) {
      expect(isPassable({ color, card: null })).toBe(true)
    }
  })

  it('green tile is not a valid move target', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('green')
    const moves = getValidMoves(grid, { row: 5, col: 1 }, 'p1')
    expect(moves.find(m => m.row === 4 && m.col === 1)).toBeUndefined()
  })

  it('green next to mascot blocks lateral but not other directions', () => {
    const grid = emptyGrid()
    grid[3][0] = makeTile('green') // green to the left
    const moves = getValidMoves(grid, { row: 3, col: 1 }, 'p1')
    expect(moves.find(m => m.col === 0)).toBeUndefined()
    expect(moves.find(m => m.direction === 'forward')).toBeDefined()
    expect(moves.find(m => m.direction === 'right')).toBeDefined()
  })

  it('mascot surrounded by green on all sides has no valid moves', () => {
    const grid = emptyGrid()
    grid[2][1] = makeTile('green') // forward
    grid[3][0] = makeTile('green') // left
    grid[3][2] = makeTile('green') // right
    const moves = getValidMoves(grid, { row: 3, col: 1 }, 'p1')
    expect(moves).toHaveLength(0)
  })
})

// ============================
// WHITE — Lateral slide L/R
// ============================
describe('WHITE terrain (lateral slide)', () => {
  it('white tile returns lateral options, not a chain', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('white')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.chain).toBe(false)
    expect(result.lateralOptions).toBeDefined()
    expect(result.lateralOptions.length).toBeGreaterThan(0)
  })

  it('white tile in center offers left and right', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('white')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.lateralOptions).toEqual([
      { row: 3, col: 0 },
      { row: 3, col: 2 },
    ])
  })

  it('white tile at left edge only offers right', () => {
    const grid = emptyGrid()
    grid[3][0] = makeTile('white')
    const result = resolveTile(grid, { row: 3, col: 0 }, 'p1', null)
    expect(result.lateralOptions).toEqual([{ row: 3, col: 1 }])
  })

  it('white tile at right edge only offers left', () => {
    const grid = emptyGrid()
    grid[3][2] = makeTile('white')
    const result = resolveTile(grid, { row: 3, col: 2 }, 'p1', null)
    expect(result.lateralOptions).toEqual([{ row: 3, col: 1 }])
  })

  it('white tile next to green wall excludes that direction', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('white')
    grid[3][0] = makeTile('green')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.lateralOptions).toEqual([{ row: 3, col: 2 }])
  })

  it('resolveChain on white returns lateralOptions', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('white')
    const result = resolveChain(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.finalPos).toEqual({ row: 3, col: 1 }) // stays on white
    expect(result.lateralOptions).toBeDefined()
    expect(result.lateralOptions.length).toBeGreaterThan(0)
  })

  it('white tile through RESOLVE_MOVES sets pendingLateral', () => {
    const result = placeAndResolve({
      tiles: [{ row: 4, col: 1, color: 'white' }],
      p1Move: { row: 4, col: 1 },
      p2Move: { row: 1, col: 1 },
    })
    // P2 lands on white → pendingLateral should be set for P1
    expect(result.pendingLateral).toBeDefined()
    expect(result.pendingLateral).not.toBe(null)
    expect(result.pendingLateral.length).toBeGreaterThan(0)
    expect(result.pendingLateralPlayer).toBe('p1')
    // Mascot stays on the white tile (doesn't auto-slide)
    expect(result.mascots.p2).toEqual({ row: 4, col: 1 })
  })

  it('RESOLVE_LATERAL moves mascot to lateral position', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('white')
    const state = baseState({
      grid,
      mascots: { p1: { row: 0, col: 1 }, p2: { row: 3, col: 1 } },
      phase: PHASES.CHECK_WIN,
      pendingLateral: [{ row: 3, col: 0 }, { row: 3, col: 2 }],
      pendingLateralPlayer: 'p1',
    })
    const next = gameReducer(state, {
      type: 'RESOLVE_LATERAL',
      payload: { row: 3, col: 0, player: 'p1' },
    })
    expect(next.mascots.p2).toEqual({ row: 3, col: 0 })
    expect(next.pendingLateral).toBe(null)
  })

  it('SKIP_LATERAL clears pendingLateral', () => {
    const state = baseState({
      pendingLateral: [{ row: 3, col: 0 }],
      pendingLateralPlayer: 'p1',
    })
    const next = gameReducer(state, { type: 'SKIP_LATERAL' })
    expect(next.pendingLateral).toBe(null)
  })
})

// ============================
// BLUE — Draw +1 / Portal
// ============================
describe('BLUE terrain (draw bonus + portal)', () => {
  it('blue tile has no movement effect without portals', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('blue')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.chain).toBe(false)
    expect(result.newPos).toEqual({ row: 3, col: 1 })
  })

  it('placing blue card increments blue bonus draws', () => {
    const state = baseState({
      phase: PHASES.P1_PLAY,
      hands: {
        p1: [{ name: 'Island', color: 'blue', scryfallName: 'Island', id: 'b1' }],
        p2: [],
      },
    })
    const next = gameReducer(state, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1, player: 'p1' },
    })
    expect(next.blueBonusDraws.p1).toBe(1)
  })

  it('blue bonus draws gives extra card on next draw', () => {
    const state = baseState({
      phase: PHASES.P1_DRAW,
      blueBonusDraws: { p1: 1, p2: 0 },
      decks: {
        p1: [
          { name: 'A', color: 'red', scryfallName: 'A', id: 'a' },
          { name: 'B', color: 'red', scryfallName: 'B', id: 'b' },
        ],
        p2: [],
      },
      hands: { p1: [], p2: [] },
    })
    const next = gameReducer(state, { type: 'DRAW_CARD', payload: { player: 'p1' } })
    // 1 base + 1 bonus = 2 cards drawn
    expect(next.hands.p1).toHaveLength(2)
    expect(next.blueBonusDraws.p1).toBe(0) // Reset after draw
  })

  it('blue portal teleports when Quandrix portals are linked', () => {
    const grid = emptyGrid()
    grid[1][0] = makeTile('blue')
    grid[4][2] = makeTile('blue')
    const portals = [{ row: 1, col: 0 }, { row: 4, col: 2 }]
    const result = resolveTile(grid, { row: 1, col: 0 }, 'p1', null, { portalLinks: portals })
    expect(result.chain).toBe(true)
    expect(result.portal).toBe(true)
    expect(result.newPos).toEqual({ row: 4, col: 2 })
  })

  it('blue tile with no portal link has no effect', () => {
    const grid = emptyGrid()
    grid[1][0] = makeTile('blue')
    const result = resolveTile(grid, { row: 1, col: 0 }, 'p1', null, { portalLinks: [] })
    expect(result.chain).toBe(false)
  })

  it('portal with only 1 blue tile does nothing', () => {
    const grid = emptyGrid()
    grid[1][0] = makeTile('blue')
    const result = resolveTile(grid, { row: 1, col: 0 }, 'p1', null, { portalLinks: [{ row: 1, col: 0 }] })
    expect(result.chain).toBe(false)
  })
})

// ============================
// COLORLESS — No effect
// ============================
describe('COLORLESS terrain (no effect)', () => {
  it('colorless has no movement effect', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('colorless')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.chain).toBe(false)
    expect(result.newPos).toEqual({ row: 3, col: 1 })
  })

  it('colorless is passable', () => {
    expect(isPassable(makeTile('colorless'))).toBe(true)
  })

  it('mascot stays on colorless through resolve', () => {
    const result = placeAndResolve({
      tiles: [{ row: 4, col: 1, color: 'colorless' }],
      p1Move: { row: 4, col: 1 },
      p2Move: { row: 1, col: 1 },
    })
    expect(result.mascots.p2).toEqual({ row: 4, col: 1 })
  })
})

// ============================
// EMPTY — No effect (starting state)
// ============================
describe('EMPTY tiles (starting board)', () => {
  it('empty is passable', () => {
    expect(isPassable({ color: 'empty', card: null })).toBe(true)
  })

  it('empty has no movement effect', () => {
    const grid = emptyGrid()
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.chain).toBe(false)
    expect(result.newPos).toEqual({ row: 3, col: 1 })
  })

  it('valid moves work on empty board', () => {
    const grid = emptyGrid()
    const moves = getValidMoves(grid, { row: 3, col: 1 }, 'p1')
    expect(moves).toHaveLength(3) // forward, left, right
  })
})

// ============================
// SILVERQUILL IMMUNITY
// ============================
describe('Silverquill immunity', () => {
  it('immune mascot ignores red tile', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('red')
    const result = resolveTile(grid, { row: 4, col: 1 }, 'p1', 'p1')
    expect(result.chain).toBe(false)
    expect(result.newPos).toEqual({ row: 4, col: 1 })
  })

  it('immunity does not apply to the other player', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('red')
    const result = resolveTile(grid, { row: 4, col: 1 }, 'p1', 'p2')
    expect(result.chain).toBe(true) // P1 is NOT immune
  })

  it('immune mascot ignores black tile', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('black')
    const result = resolveTile(grid, { row: 4, col: 1 }, 'p1', 'p1')
    expect(result.chain).toBe(false)
  })
})

// ============================
// PRISMARI BOOST ROW
// ============================
describe('Prismari boost row (doubled movement)', () => {
  it('red on boosted row moves 2 instead of 1', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('red')
    const result = resolveTile(grid, { row: 4, col: 1 }, 'p1', null, { prismariBoostRow: 4 })
    // P1 forward = -1, doubled = -2. Row 4-2 = 2
    expect(result.newPos).toEqual({ row: 2, col: 1 })
    expect(result.chain).toBe(true)
  })

  it('black on boosted row moves 2 backward', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('black')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null, { prismariBoostRow: 3 })
    // P1 backward = +1, doubled = +2. Row 3+2 = 5
    expect(result.newPos).toEqual({ row: 5, col: 1 })
    expect(result.chain).toBe(true)
  })

  it('non-boosted row is not affected', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('red')
    const result = resolveTile(grid, { row: 4, col: 1 }, 'p1', null, { prismariBoostRow: 2 })
    expect(result.newPos).toEqual({ row: 3, col: 1 }) // Normal 1 step
  })

  it('doubled movement clamps to board edge', () => {
    const grid = emptyGrid()
    grid[1][1] = makeTile('red')
    const result = resolveTile(grid, { row: 1, col: 1 }, 'p1', null, { prismariBoostRow: 1 })
    // P1 forward = -1, doubled = -2. Row 1-2 = -1 → clamped to 0
    expect(result.newPos).toEqual({ row: 0, col: 1 })
  })
})

// ============================
// FULL PLAY → RESOLVE FLOW
// ============================
describe('Full play card → resolve flow', () => {
  it('playing a red card then moving onto it applies the effect', () => {
    // Simulate: P1 plays red card at (4,1), then P1 pushes P2 to (4,1)
    let state = baseState({
      phase: PHASES.P1_PLAY,
      hands: {
        p1: [{ name: 'Bolt', color: 'red', scryfallName: 'Lightning Bolt', id: 'r1' }],
        p2: [],
      },
    })

    // P1 plays card
    state = gameReducer(state, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 4, col: 1, player: 'p1' },
    })
    expect(state.grid[4][1].color).toBe('red')

    // Skip to resolve with both moves
    state = {
      ...state,
      phase: PHASES.RESOLVE,
      pendingMoves: { p1: { row: 4, col: 1 }, p2: { row: 1, col: 1 } },
    }
    state = gameReducer(state, { type: 'RESOLVE_MOVES' })

    // Red effect should have applied
    expect(state.mascots.p2.row).toBe(3) // Pushed forward from (4,1) to (3,1)
  })

  it('playing a green card blocks that tile from movement', () => {
    let state = baseState({
      phase: PHASES.P1_PLAY,
      hands: {
        p1: [{ name: 'Wall', color: 'green', scryfallName: 'Forest', id: 'g1' }],
        p2: [],
      },
    })

    state = gameReducer(state, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 4, col: 1, player: 'p1' },
    })
    expect(state.grid[4][1].color).toBe('green')

    const moves = getValidMoves(state.grid, { row: 5, col: 1 }, 'p1')
    expect(moves.find(m => m.row === 4 && m.col === 1)).toBeUndefined()
  })
})
