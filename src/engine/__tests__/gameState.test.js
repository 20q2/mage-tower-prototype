import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'
import { PHASES, ACTIONS_PER_TURN } from '../constants'

describe('createInitialState', () => {
  it('creates an 8x3 empty grid', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.grid).toHaveLength(8)
    expect(state.grid[0]).toHaveLength(3)
    for (const row of state.grid) for (const tile of row) expect(tile.color).toBe('empty')
  })

  it('mascots start at their own goal rows', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.mascots.p1).toEqual({ row: 7, col: 1 })
    expect(state.mascots.p2).toEqual({ row: 0, col: 1 })
  })

  it('deals 3 cards to each player', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.hands.p1).toHaveLength(3)
    expect(state.hands.p2).toHaveLength(3)
  })

  it('starts on draw phase', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.phase).toBe('draw')
    expect(state.activePlayer).toBe('p1')
  })
})

describe('gameReducer — 3-action system', () => {
  let state
  beforeEach(() => { state = createInitialState('lorehold', 'witherbloom') })

  it('DRAW_CARD → act phase with 3 actions', () => {
    const next = gameReducer(state, { type: 'DRAW_CARD' })
    expect(next.phase).toBe('act')
    expect(next.actionsRemaining).toBe(ACTIONS_PER_TURN)
  })

  it('PLAY_CARD costs 1 action', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    const card = next.hands.p1[0]
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 3, col: 1 } })
    expect(next.actionsRemaining).toBe(ACTIONS_PER_TURN - 1)
    expect(next.grid[3][1].card.name).toBe(card.name)
    expect(next.phase).toBe('act') // Still acting
  })

  it('MOVE_MASCOT costs 1 action', () => {
    let next = { ...state, phase: 'act', actionsRemaining: 3, activePlayer: 'p1' }
    next.grid[6][1] = { color: 'empty', card: null }
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 6, col: 1 } })
    expect(next.mascots.p1).toEqual({ row: 6, col: 1 })
    expect(next.actionsRemaining).toBe(2)
    expect(next.phase).toBe('act')
  })

  it('spending all 3 actions ends turn', () => {
    let next = { ...state, phase: 'act', actionsRemaining: 1, activePlayer: 'p1' }
    next.grid[6][1] = { color: 'empty', card: null }
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 6, col: 1 } })
    expect(next.actionsRemaining).toBe(0)
    expect(next.phase).toBe('checkWin')
  })

  it('can mix cards and moves: 2 cards + 1 move', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 3, col: 0 } })
    expect(next.actionsRemaining).toBe(2)
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 3, col: 2 } })
    expect(next.actionsRemaining).toBe(1)
    next.grid[6][1] = { color: 'empty', card: null }
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 6, col: 1 } })
    expect(next.actionsRemaining).toBe(0)
    expect(next.phase).toBe('checkWin')
  })

  it('can do 3 moves', () => {
    let next = { ...state, phase: 'act', actionsRemaining: 3, activePlayer: 'p1' }
    next.grid[6][1] = { color: 'empty', card: null }
    next.grid[5][1] = { color: 'empty', card: null }
    next.grid[4][1] = { color: 'empty', card: null }

    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 6, col: 1 } })
    expect(next.actionsRemaining).toBe(2)
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 5, col: 1 } })
    expect(next.actionsRemaining).toBe(1)
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 4, col: 1 } })
    expect(next.actionsRemaining).toBe(0)
    expect(next.mascots.p1).toEqual({ row: 4, col: 1 })
  })

  it('END_TURN switches player', () => {
    let next = { ...state, phase: 'checkWin', activePlayer: 'p1' }
    next = gameReducer(next, { type: 'END_TURN' })
    expect(next.activePlayer).toBe('p2')
    expect(next.phase).toBe('draw')
  })

  it('P1 wins at row 0', () => {
    let next = {
      ...state, phase: 'act', actionsRemaining: 1, activePlayer: 'p1',
      mascots: { p1: { row: 1, col: 1 }, p2: { row: 4, col: 1 } },
    }
    next.grid[0][1] = { color: 'empty', card: null }
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 0, col: 1 } })
    expect(next.winner).toBe('p1')
  })

  it('stepping onto blue tile draws a card immediately', () => {
    let next = { ...state, phase: 'act', actionsRemaining: 3, activePlayer: 'p1' }
    next.grid[6][1] = { color: 'blue', card: { name: 'Island', color: 'blue', scryfallName: 'Island', displayName: 'Island' } }
    const handBefore = next.hands.p1.length
    const deckBefore = next.decks.p1.length
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 6, col: 1 } })
    expect(next.hands.p1.length).toBe(handBefore + 1)
    expect(next.decks.p1.length).toBe(deckBefore - 1)
  })
})
