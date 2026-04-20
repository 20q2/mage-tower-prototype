import { describe, it, expect } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'
import { getValidMoves } from '../rules'
import { PHASES } from '../constants'

function makeTile(color, name = 'Test') {
  return {
    color,
    card: { name, color, scryfallName: 'Plains', displayName: name },
  }
}

function stateWithTerrain(tiles) {
  // Start from a clean state, then manually set grid tiles
  const state = createInitialState('lorehold', 'witherbloom')
  const grid = state.grid.map((r) => r.map((t) => ({ ...t })))
  for (const { row, col, color, name } of tiles) {
    grid[row][col] = makeTile(color, name || color)
  }
  return { ...state, grid }
}

describe('tile effects through RESOLVE_MOVES', () => {
  it('red tile pushes mascot forward (P1 pushing P2 toward row 0)', () => {
    // P2 mascot at row 5 col 1. P1 pushes to row 4 col 1 which is red.
    // Red should chain push to row 3.
    const state = stateWithTerrain([
      { row: 4, col: 1, color: 'red' },
    ])
    // Set up: mascots in default positions, move phase
    let next = {
      ...state,
      phase: PHASES.RESOLVE,
      pendingMoves: {
        p1: { row: 4, col: 1 }, // P1 pushes P2's mascot to red tile at (4,1)
        p2: { row: 1, col: 1 }, // P2 pushes P1's mascot to empty (1,1)
      },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })

    // P2 mascot should have chained: landed on red (4,1) → pushed to (3,1)
    expect(next.mascots.p2.row).toBe(3)
    expect(next.mascots.p2.col).toBe(1)
  })

  it('black tile pushes mascot backward', () => {
    // P2 mascot at row 5. P1 pushes to row 4 which is black.
    // Black pushes backward (away from P1's goal = toward row 5).
    const state = stateWithTerrain([
      { row: 4, col: 1, color: 'black' },
    ])
    let next = {
      ...state,
      phase: PHASES.RESOLVE,
      pendingMoves: {
        p1: { row: 4, col: 1 },
        p2: { row: 1, col: 1 },
      },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })

    // Black pushes P2's mascot backward (toward row 5)
    expect(next.mascots.p2.row).toBe(5)
    expect(next.mascots.p2.col).toBe(1)
  })

  it('chain: two red tiles in a row', () => {
    const state = stateWithTerrain([
      { row: 4, col: 1, color: 'red' },
      { row: 3, col: 1, color: 'red' },
    ])
    let next = {
      ...state,
      phase: PHASES.RESOLVE,
      pendingMoves: {
        p1: { row: 4, col: 1 },
        p2: { row: 1, col: 1 },
      },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })

    // Red at (4,1) → (3,1) → red at (3,1) → (2,1)
    expect(next.mascots.p2.row).toBe(2)
    expect(next.mascots.p2.col).toBe(1)
  })

  it('green tile blocks movement (not a valid move target)', () => {
    const state = stateWithTerrain([
      { row: 4, col: 1, color: 'green' },
    ])
    // getValidMoves should NOT include (4,1) since it's green
    const moves = getValidMoves(state.grid, { row: 5, col: 1 }, 'p1')
    expect(moves.find(m => m.row === 4 && m.col === 1)).toBeUndefined()
  })

  it('empty tiles have no effect', () => {
    const state = stateWithTerrain([]) // All empty
    let next = {
      ...state,
      phase: PHASES.RESOLVE,
      pendingMoves: {
        p1: { row: 4, col: 1 },
        p2: { row: 1, col: 1 },
      },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })

    // No chain — mascots stay where they were pushed
    expect(next.mascots.p2).toEqual({ row: 4, col: 1 })
    expect(next.mascots.p1).toEqual({ row: 1, col: 1 })
  })

  it('colorless tiles have no effect', () => {
    const state = stateWithTerrain([
      { row: 4, col: 1, color: 'colorless' },
    ])
    let next = {
      ...state,
      phase: PHASES.RESOLVE,
      pendingMoves: {
        p1: { row: 4, col: 1 },
        p2: { row: 1, col: 1 },
      },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.mascots.p2).toEqual({ row: 4, col: 1 })
  })

  it('P2 pushing P1: red tile pushes toward row 5', () => {
    // P1 mascot at row 0. P2 pushes to (1,1) which is red.
    // P2's forward = +1 (toward row 5), so red pushes to (2,1)
    const state = stateWithTerrain([
      { row: 1, col: 1, color: 'red' },
    ])
    let next = {
      ...state,
      phase: PHASES.RESOLVE,
      pendingMoves: {
        p1: { row: 4, col: 1 },
        p2: { row: 1, col: 1 },
      },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })

    // P1 mascot pushed to red (1,1) → chains to (2,1)
    expect(next.mascots.p1.row).toBe(2)
    expect(next.mascots.p1.col).toBe(1)
  })

  it('win condition triggers when mascot reaches goal row', () => {
    // P2 mascot at (1,1). P1 pushes to (0,1) = P2 goal row. P1 wins.
    const state = {
      ...stateWithTerrain([]),
      mascots: { p1: { row: 0, col: 1 }, p2: { row: 1, col: 1 } },
    }
    let next = {
      ...state,
      phase: PHASES.RESOLVE,
      pendingMoves: {
        p1: { row: 0, col: 1 },
        p2: { row: 1, col: 1 },
      },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.winner).toBe('p1')
  })

  it('red chain can push mascot into goal row for a win', () => {
    // P2 mascot at (2,1). Red at (1,1). P1 pushes P2 to (1,1) → chains to (0,1) = win
    const state = {
      ...stateWithTerrain([{ row: 1, col: 1, color: 'red' }]),
      mascots: { p1: { row: 5, col: 1 }, p2: { row: 2, col: 1 } },
    }
    let next = {
      ...state,
      phase: PHASES.RESOLVE,
      pendingMoves: {
        p1: { row: 1, col: 1 },
        p2: { row: 4, col: 1 },
      },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.mascots.p2.row).toBe(0)
    expect(next.winner).toBe('p1')
  })
})
