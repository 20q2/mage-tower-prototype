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
  it('p1 wins by reaching row 0', () => {
    expect(checkWinCondition({ p1: { row: 0, col: 1 }, p2: { row: 3, col: 1 } }, 'p1')).toBe('p1')
  })

  it('p2 wins by reaching row 5', () => {
    expect(checkWinCondition({ p1: { row: 3, col: 1 }, p2: { row: 7, col: 1 } }, 'p2')).toBe('p2')
  })

  it('returns null when no winner', () => {
    expect(checkWinCondition({ p1: { row: 2, col: 1 }, p2: { row: 4, col: 1 } }, 'p1')).toBe(null)
  })

  it('backwards compat: checks both without activePlayer', () => {
    expect(checkWinCondition({ p1: { row: 0, col: 1 }, p2: { row: 3, col: 1 } })).toBe('p1')
    expect(checkWinCondition({ p1: { row: 3, col: 1 }, p2: { row: 7, col: 1 } })).toBe('p2')
  })
})
