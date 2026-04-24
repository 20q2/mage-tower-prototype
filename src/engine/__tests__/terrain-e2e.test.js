import { describe, it, expect } from 'vitest'
import { gameReducer } from '../gameState'
import { getValidMoves, resolveTile, resolveChain, isPassable, checkWinCondition } from '../rules'
import { PHASES, ROWS, COLS } from '../constants'

function makeTile(color) {
  return { color, card: { name: color, color, scryfallName: 'Plains', displayName: color }, stack: [] }
}

function emptyGrid() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ color: 'empty', card: null, stack: [] }))
  )
}

function resolveState(overrides = {}) {
  return {
    grid: emptyGrid(),
    mascots: { p1: { row: 7, col: 1 }, p2: { row: 0, col: 1 } },
    hands: { p1: [], p2: [] },
    decks: { p1: [], p2: [] },
    discard: [],
    phase: PHASES.RESOLVE,
    activePlayer: 'p1',
    playTurn: null,
    turnCount: 1,
    winner: null,
    pendingMoves: { p1: { row: 6, col: 1 }, p2: { row: 1, col: 1 } },
    pendingWhiteBonus: { p1: false, p2: false },
    silverquillImmunity: null,
    mascotAbilities: { p1: null, p2: null },
    abilityUsed: { p1: false, p2: false },
    playsThisTurn: { p1: 0, p2: 0 },
    log: [],
    ...overrides,
  }
}

describe('RED', () => {
  it('pushes P1 forward', () => {
    const state = resolveState()
    state.grid[6][1] = makeTile('red')
    const next = gameReducer(state, { type: 'RESOLVE_MOVES' })
    expect(next.mascots.p1).toEqual({ row: 5, col: 1 })
  })

  it('pushes P2 forward', () => {
    const state = resolveState()
    state.grid[1][1] = makeTile('red')
    const next = gameReducer(state, { type: 'RESOLVE_MOVES' })
    expect(next.mascots.p2).toEqual({ row: 2, col: 1 })
  })

  it('chains through multiple reds', () => {
    const state = resolveState()
    state.grid[6][1] = makeTile('red')
    state.grid[5][1] = makeTile('red')
    const next = gameReducer(state, { type: 'RESOLVE_MOVES' })
    expect(next.mascots.p1).toEqual({ row: 4, col: 1 })
  })
})

describe('BLACK', () => {
  it('pushes P1 backward', () => {
    const state = resolveState({ mascots: { p1: { row: 4, col: 1 }, p2: { row: 0, col: 1 } },
      pendingMoves: { p1: { row: 3, col: 1 }, p2: { row: 1, col: 1 } } })
    state.grid[3][1] = makeTile('black')
    const next = gameReducer(state, { type: 'RESOLVE_MOVES' })
    expect(next.mascots.p1).toEqual({ row: 4, col: 1 }) // Pushed back
  })
})

describe('GREEN', () => {
  it('is impassable', () => {
    expect(isPassable(makeTile('green'))).toBe(false)
  })

  it('blocks movement', () => {
    const grid = emptyGrid()
    grid[6][1] = makeTile('green')
    const moves = getValidMoves(grid, { row: 7, col: 1 }, 'p1')
    expect(moves.find(m => m.row === 6 && m.col === 1)).toBeUndefined()
  })

  it('is passable with silverquill immunity', () => {
    const grid = emptyGrid()
    grid[6][1] = makeTile('green')
    const moves = getValidMoves(grid, { row: 7, col: 1 }, 'p1', { silverquillImmunity: 'p1' })
    expect(moves.find(m => m.row === 6 && m.col === 1)).toBeDefined()
  })
})

describe('WHITE', () => {
  it('gives whiteBonus flag', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('white')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.whiteBonus).toBe(true)
    expect(result.chain).toBe(false)
  })

  it('resolveChain propagates whiteBonus', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('white')
    const result = resolveChain(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.whiteBonus).toBe(true)
  })

  it('bonus moves include backward', () => {
    const grid = emptyGrid()
    const moves = getValidMoves(grid, { row: 3, col: 1 }, 'p1', { bonus: true })
    expect(moves.find(m => m.direction === 'backward')).toBeDefined()
  })

  it('normal moves do NOT include backward', () => {
    const grid = emptyGrid()
    const moves = getValidMoves(grid, { row: 3, col: 1 }, 'p1')
    expect(moves.find(m => m.direction === 'backward')).toBeUndefined()
  })

  it('RESOLVE_MOVES sets pendingWhiteBonus', () => {
    const state = resolveState()
    state.grid[6][1] = makeTile('white')
    const next = gameReducer(state, { type: 'RESOLVE_MOVES' })
    expect(next.pendingWhiteBonus.p1).toBe(true)
    expect(next.phase).toBe('move') // Back for bonus
  })

  it('WHITE_BONUS_MOVE resolves and clears', () => {
    const state = {
      ...resolveState(),
      phase: PHASES.MOVE,
      mascots: { p1: { row: 6, col: 1 }, p2: { row: 1, col: 1 } },
      pendingWhiteBonus: { p1: true, p2: false },
      pendingMoves: { p1: null, p2: null },
    }
    const next = gameReducer(state, { type: 'WHITE_BONUS_MOVE', payload: { player: 'p1', row: 5, col: 1 } })
    expect(next.mascots.p1).toEqual({ row: 5, col: 1 })
    expect(next.pendingWhiteBonus.p1).toBe(false)
  })
})

describe('BLUE', () => {
  it('draws on entry', () => {
    const grid = emptyGrid()
    grid[3][1] = makeTile('blue')
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.draw).toBe(true)
  })

  it('RESOLVE_MOVES draws cards', () => {
    const state = resolveState({
      decks: { p1: [{ name: 'A', color: 'red', scryfallName: 'A', id: 'a' }], p2: [] },
    })
    state.grid[6][1] = makeTile('blue')
    const next = gameReducer(state, { type: 'RESOLVE_MOVES' })
    expect(next.hands.p1).toHaveLength(1)
    expect(next.decks.p1).toHaveLength(0)
  })
})

describe('FACEDOWN', () => {
  it('face-down tiles are passable', () => {
    const facedownTile = { color: 'facedown', card: { name: 'Hidden' }, faceDown: true, stack: [] }
    expect(isPassable(facedownTile)).toBe(true)
  })

  it('face-down tiles have no effect', () => {
    const grid = emptyGrid()
    grid[3][1] = { color: 'facedown', card: { name: 'Hidden', color: 'red' }, faceDown: true, stack: [] }
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.chain).toBe(false)
  })
})

describe('EMPTY / COLORLESS', () => {
  it('passable, no effect', () => {
    expect(isPassable({ color: 'empty', card: null, stack: [] })).toBe(true)
    const grid = emptyGrid()
    const result = resolveTile(grid, { row: 3, col: 1 }, 'p1', null)
    expect(result.chain).toBe(false)
  })
})

describe('WIN', () => {
  it('P1 wins at row 0', () => {
    expect(checkWinCondition({ p1: { row: 0, col: 1 }, p2: { row: 3, col: 1 } }, 'p1')).toBe('p1')
  })
  it('P2 wins at row 7', () => {
    expect(checkWinCondition({ p1: { row: 3, col: 1 }, p2: { row: 7, col: 1 } }, 'p2')).toBe('p2')
  })
  it('no winner mid-board', () => {
    expect(checkWinCondition({ p1: { row: 3, col: 1 }, p2: { row: 4, col: 1 } }, 'p1')).toBe(null)
  })
})

describe('PLAY PHASE', () => {
  it('PASS ends play phase', () => {
    const state = { ...resolveState(), phase: PHASES.PLAY, playTurn: 'p1' }
    const next = gameReducer(state, { type: 'PASS' })
    expect(next.phase).toBe('move')
  })
})

describe('CARD STACKING', () => {
  it('playing on occupied tile pushes old card to stack', () => {
    const state = resolveState({ phase: PHASES.PLAY, playTurn: 'p1' })
    state.hands.p1 = [
      { name: 'Card A', color: 'red', scryfallName: 'Mountain', id: 'a' },
      { name: 'Card B', color: 'blue', scryfallName: 'Island', id: 'b' },
    ]
    // Play first card
    let next = gameReducer(state, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 5, col: 1 } })
    expect(next.grid[5][1].card.name).toBe('Card A')
    expect(next.grid[5][1].stack).toHaveLength(0)

    // Play second card on same tile (from p2's turn now)
    next.hands.p2 = [{ name: 'Card C', color: 'green', scryfallName: 'Forest', id: 'c' }]
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 5, col: 1 } })
    expect(next.grid[5][1].card.name).toBe('Card C')
    expect(next.grid[5][1].stack).toHaveLength(1)
    expect(next.grid[5][1].stack[0].name).toBe('Card A')
  })
})
