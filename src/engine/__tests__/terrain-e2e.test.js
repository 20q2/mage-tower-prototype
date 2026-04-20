/**
 * End-to-end terrain tests for the "move your own mascot" model.
 * P1 starts at row 5, races to row 0. P2 starts at row 0, races to row 5.
 * Each player gets 2 move steps per turn.
 */
import { describe, it, expect } from 'vitest'
import { gameReducer } from '../gameState'
import { getValidMoves, resolveTile, resolveChain, isPassable, checkWinCondition } from '../rules'
import { PHASES, ROWS, COLS, MOVE_STEPS } from '../constants'

function makeTile(color) {
  return { color, card: { name: color, color, scryfallName: 'Plains', displayName: color } }
}

function emptyGrid() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ color: 'empty', card: null }))
  )
}

function moveState(overrides = {}) {
  return {
    grid: emptyGrid(),
    mascots: { p1: { row: 5, col: 1 }, p2: { row: 0, col: 1 } },
    hands: { p1: [], p2: [] },
    decks: { p1: [], p2: [] },
    discard: [],
    phase: PHASES.MOVE,
    activePlayer: 'p1',
    firstPlayer: 'p1',
    turnCount: 1,
    winner: null,
    movesRemaining: MOVE_STEPS,
    hasPlayedCard: false,
    portalLinks: [],
    silverquillImmunity: null,
    prismariBoostRow: null,
    blueBonusDraws: { p1: 0, p2: 0 },
    pendingLateral: null,
    log: [],
    ...overrides,
  }
}

// ============================
// RED — +1 Forward
// ============================
describe('RED terrain', () => {
  it('P1 steps onto red → pushed toward row 0', () => {
    const state = moveState()
    state.grid[4][1] = makeTile('red')
    const next = gameReducer(state, { type: 'MOVE_MASCOT', payload: { row: 4, col: 1 } })
    expect(next.mascots.p1).toEqual({ row: 3, col: 1 }) // Red pushed forward
  })

  it('P2 steps onto red → pushed toward row 5', () => {
    const state = moveState({ activePlayer: 'p2' })
    state.grid[1][1] = makeTile('red')
    const next = gameReducer(state, { type: 'MOVE_MASCOT', payload: { row: 1, col: 1 } })
    expect(next.mascots.p2).toEqual({ row: 2, col: 1 })
  })

  it('chains through multiple reds', () => {
    const state = moveState()
    state.grid[4][1] = makeTile('red')
    state.grid[3][1] = makeTile('red')
    const next = gameReducer(state, { type: 'MOVE_MASCOT', payload: { row: 4, col: 1 } })
    expect(next.mascots.p1).toEqual({ row: 2, col: 1 })
  })

  it('red chain into goal row wins', () => {
    const state = moveState({ mascots: { p1: { row: 2, col: 1 }, p2: { row: 0, col: 1 } } })
    state.grid[1][1] = makeTile('red')
    const next = gameReducer(state, { type: 'MOVE_MASCOT', payload: { row: 1, col: 1 } })
    expect(next.mascots.p1).toEqual({ row: 0, col: 1 })
    expect(next.winner).toBe('p1')
  })
})

// ============================
// BLACK — -1 Backward
// ============================
describe('BLACK terrain', () => {
  it('P1 steps onto black → pushed backward (toward row 5)', () => {
    const state = moveState({ mascots: { p1: { row: 3, col: 1 }, p2: { row: 0, col: 1 } } })
    state.grid[2][1] = makeTile('black')
    const next = gameReducer(state, { type: 'MOVE_MASCOT', payload: { row: 2, col: 1 } })
    expect(next.mascots.p1).toEqual({ row: 3, col: 1 }) // Pushed back
  })

  it('P2 steps onto black → pushed backward (toward row 0)', () => {
    const state = moveState({ activePlayer: 'p2', mascots: { p1: { row: 5, col: 1 }, p2: { row: 2, col: 1 } } })
    state.grid[3][1] = makeTile('black')
    const next = gameReducer(state, { type: 'MOVE_MASCOT', payload: { row: 3, col: 1 } })
    expect(next.mascots.p2).toEqual({ row: 2, col: 1 }) // Pushed back toward row 0
  })
})

// ============================
// GREEN — WALL
// ============================
describe('GREEN terrain', () => {
  it('green is impassable', () => {
    expect(isPassable(makeTile('green'))).toBe(false)
  })

  it('green blocks movement', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('green')
    const moves = getValidMoves(grid, { row: 5, col: 1 }, 'p1')
    expect(moves.find(m => m.row === 4 && m.col === 1)).toBeUndefined()
  })

  it('surrounded by green = no moves', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('green') // forward
    grid[5][0] = makeTile('green') // left
    grid[5][2] = makeTile('green') // right
    const moves = getValidMoves(grid, { row: 5, col: 1 }, 'p1')
    expect(moves).toHaveLength(0)
  })
})

// ============================
// WHITE — Lateral slide
// ============================
describe('WHITE terrain', () => {
  it('white returns lateral options', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('white')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.lateralOptions).toEqual([{ row: 3, col: 0 }, { row: 3, col: 2 }])
    expect(result.chain).toBe(false)
  })

  it('MOVE_MASCOT onto white sets pendingLateral', () => {
    const state = moveState({ mascots: { p1: { row: 4, col: 1 }, p2: { row: 0, col: 1 } } })
    state.grid[3][1] = makeTile('white')
    const next = gameReducer(state, { type: 'MOVE_MASCOT', payload: { row: 3, col: 1 } })
    expect(next.pendingLateral).not.toBe(null)
    expect(next.pendingLateral.length).toBeGreaterThan(0)
    expect(next.mascots.p1).toEqual({ row: 3, col: 1 })
  })

  it('RESOLVE_LATERAL moves mascot sideways', () => {
    const state = moveState({
      mascots: { p1: { row: 3, col: 1 }, p2: { row: 0, col: 1 } },
      pendingLateral: [{ row: 3, col: 0 }, { row: 3, col: 2 }],
      movesRemaining: 1,
    })
    const next = gameReducer(state, { type: 'RESOLVE_LATERAL', payload: { row: 3, col: 0 } })
    expect(next.mascots.p1).toEqual({ row: 3, col: 0 })
    expect(next.pendingLateral).toBe(null)
  })
})

// ============================
// BLUE — Draw +1 / Portal
// ============================
describe('BLUE terrain', () => {
  it('blue has no movement effect without portals', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('blue')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.chain).toBe(false)
  })

  it('blue portal teleports when linked', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('blue')
    grid[1][0] = makeTile('blue')
    const portals = [{ row: 3, col: 1 }, { row: 1, col: 0 }]
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null, { portalLinks: portals })
    expect(result.chain).toBe(true)
    expect(result.newPos).toEqual({ row: 1, col: 0 })
  })
})

// ============================
// EMPTY / COLORLESS
// ============================
describe('EMPTY and COLORLESS', () => {
  it('both are passable with no effect', () => {
    expect(isPassable({ color: 'empty', card: null })).toBe(true)
    expect(isPassable(makeTile('colorless'))).toBe(true)

    const grid = emptyGrid()
    expect(resolveTile(grid, { row: 3, col: 1 }, 'p1', null).chain).toBe(false)
    grid[3][1] = makeTile('colorless')
    expect(resolveTile(grid, { row: 3, col: 1 }, 'p1', null).chain).toBe(false)
  })
})

// ============================
// SILVERQUILL IMMUNITY
// ============================
describe('Silverquill immunity', () => {
  it('immune player ignores tile effects', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('red')
    expect(resolveTile(grid, { row: 4, col: 1 }, 'p1', 'p1').chain).toBe(false)
  })

  it('does not affect other player', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('red')
    expect(resolveTile(grid, { row: 4, col: 1 }, 'p1', 'p2').chain).toBe(true)
  })
})

// ============================
// PRISMARI BOOST
// ============================
describe('Prismari boost row', () => {
  it('red on boosted row moves 2', () => {
    const grid = emptyGrid()
    grid[4][1] = makeTile('red')
    const result = resolveTile(grid, { row: 4, col: 1 }, 'p1', null, { prismariBoostRow: 4 })
    expect(result.newPos).toEqual({ row: 2, col: 1 })
  })
})

// ============================
// 2-STEP MOVEMENT
// ============================
describe('2-step movement', () => {
  it('player can take 2 steps', () => {
    const state = moveState()
    state.grid[4][1] = { color: 'empty', card: null }
    state.grid[3][1] = { color: 'empty', card: null }

    let next = gameReducer(state, { type: 'MOVE_MASCOT', payload: { row: 4, col: 1 } })
    expect(next.movesRemaining).toBe(1)
    expect(next.phase).toBe('move') // Still moving

    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 3, col: 1 } })
    expect(next.movesRemaining).toBe(0)
    expect(next.phase).toBe('checkWin') // Done
    expect(next.mascots.p1).toEqual({ row: 3, col: 1 })
  })

  it('chain counts as move but can continue stepping after', () => {
    const state = moveState()
    state.grid[4][1] = makeTile('red') // Will push to row 3
    // Step 1: move to (4,1) → chain to (3,1). Still have 1 step left.
    const next = gameReducer(state, { type: 'MOVE_MASCOT', payload: { row: 4, col: 1 } })
    expect(next.mascots.p1).toEqual({ row: 3, col: 1 })
    expect(next.movesRemaining).toBe(1) // Still 1 step left
    expect(next.phase).toBe('move')
  })

  it('END_MOVE_PHASE skips remaining steps', () => {
    const state = moveState()
    const next = gameReducer(state, { type: 'END_MOVE_PHASE' })
    expect(next.phase).toBe('checkWin')
    expect(next.movesRemaining).toBe(0)
  })
})

// ============================
// WIN CONDITION
// ============================
describe('Win condition', () => {
  it('P1 wins at row 0', () => {
    expect(checkWinCondition({ p1: { row: 0, col: 1 }, p2: { row: 3, col: 1 } }, 'p1')).toBe('p1')
  })

  it('P2 wins at row 5', () => {
    expect(checkWinCondition({ p1: { row: 3, col: 1 }, p2: { row: 5, col: 1 } }, 'p2')).toBe('p2')
  })

  it('no winner mid-board', () => {
    expect(checkWinCondition({ p1: { row: 3, col: 1 }, p2: { row: 2, col: 1 } }, 'p1')).toBe(null)
  })
})
