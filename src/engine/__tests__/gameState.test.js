import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'

describe('createInitialState', () => {
  it('creates a 6x3 pre-seeded grid', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.grid).toHaveLength(6)
    expect(state.grid[0]).toHaveLength(3)
    let filledCount = 0
    for (const row of state.grid) for (const tile of row) if (tile.color !== 'empty') filledCount++
    expect(filledCount).toBe(10)
  })

  it('mascots start at their own goal rows', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.mascots.p1).toEqual({ row: 5, col: 1 }) // P1 starts bottom, races to row 0
    expect(state.mascots.p2).toEqual({ row: 0, col: 1 }) // P2 starts top, races to row 5
  })

  it('deals 5 cards to each player', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.hands.p1).toHaveLength(5)
    expect(state.hands.p2).toHaveLength(5)
  })

  it('starts on draw phase for p1', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.phase).toBe('draw')
    expect(state.activePlayer).toBe('p1')
  })
})

describe('gameReducer', () => {
  let state
  beforeEach(() => { state = createInitialState('lorehold', 'witherbloom') })

  it('DRAW_CARD moves to play phase', () => {
    const next = gameReducer(state, { type: 'DRAW_CARD' })
    expect(next.phase).toBe('play')
    expect(next.hands.p1.length).toBe(state.hands.p1.length + 1)
  })

  it('PLAY_CARD places card and sets hasPlayedCard', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    const card = next.hands.p1[0]
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 3, col: 1 } })
    expect(next.grid[3][1].card.name).toBe(card.name)
    expect(next.hasPlayedCard).toBe(true)
  })

  it('END_PLAY_PHASE advances to move with MOVE_STEPS remaining', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    next = gameReducer(next, { type: 'END_PLAY_PHASE' })
    expect(next.phase).toBe('move')
    expect(next.movesRemaining).toBe(2)
  })

  it('MOVE_MASCOT moves your OWN mascot and decrements steps', () => {
    let next = { ...state, phase: 'move', movesRemaining: 2, activePlayer: 'p1' }
    // P1 mascot at (5,1), move to (4,1)
    next.grid[4][1] = { color: 'empty', card: null } // ensure empty
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 4, col: 1 } })
    expect(next.mascots.p1).toEqual({ row: 4, col: 1 })
    expect(next.movesRemaining).toBe(1)
  })

  it('last move goes to CHECK_WIN', () => {
    let next = { ...state, phase: 'move', movesRemaining: 1, activePlayer: 'p1' }
    next.grid[4][1] = { color: 'empty', card: null }
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 4, col: 1 } })
    expect(next.phase).toBe('checkWin')
    expect(next.movesRemaining).toBe(0)
  })

  it('END_TURN switches player', () => {
    let next = { ...state, phase: 'checkWin', activePlayer: 'p1' }
    next = gameReducer(next, { type: 'END_TURN' })
    expect(next.activePlayer).toBe('p2')
    expect(next.phase).toBe('draw')
  })

  it('P1 wins by reaching row 0', () => {
    let next = {
      ...state,
      phase: 'move',
      movesRemaining: 1,
      activePlayer: 'p1',
      mascots: { p1: { row: 1, col: 1 }, p2: { row: 4, col: 1 } },
    }
    next.grid[0][1] = { color: 'empty', card: null }
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 0, col: 1 } })
    expect(next.winner).toBe('p1')
  })

  it('P2 wins by reaching row 5', () => {
    let next = {
      ...state,
      phase: 'move',
      movesRemaining: 1,
      activePlayer: 'p2',
      mascots: { p1: { row: 4, col: 1 }, p2: { row: 4, col: 1 } },
    }
    next.grid[5][1] = { color: 'empty', card: null }
    next = gameReducer(next, { type: 'MOVE_MASCOT', payload: { row: 5, col: 1 } })
    expect(next.winner).toBe('p2')
  })

  it('blue card increments bonus draws', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    next.hands.p1[0] = { name: 'Test Blue', color: 'blue', scryfallName: 'Island' }
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 3, col: 1 } })
    expect(next.blueBonusDraws.p1).toBe(1)
  })
})
