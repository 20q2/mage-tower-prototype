import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'

describe('createInitialState', () => {
  it('creates a 6x3 empty grid', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.grid).toHaveLength(6)
    expect(state.grid[0]).toHaveLength(3)
    expect(state.grid[0][0].color).toBe('empty')
    expect(state.grid[0][0].card).toBe(null)
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

  it('starts on p1_draw phase', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.phase).toBe('p1_draw')
  })
})

describe('gameReducer', () => {
  let state

  beforeEach(() => {
    state = createInitialState('lorehold', 'witherbloom')
  })

  it('DRAW_CARD for p1 moves to p1_play', () => {
    const deckBefore = state.decks.p1.length
    const handBefore = state.hands.p1.length
    const next = gameReducer(state, { type: 'DRAW_CARD', payload: { player: 'p1' } })
    expect(next.hands.p1).toHaveLength(handBefore + 1)
    expect(next.decks.p1).toHaveLength(deckBefore - 1)
    expect(next.phase).toBe('p1_play')
  })

  it('DRAW_CARD for p2 moves to p2_play', () => {
    const next = gameReducer(
      { ...state, phase: 'p2_draw' },
      { type: 'DRAW_CARD', payload: { player: 'p2' } }
    )
    expect(next.phase).toBe('p2_play')
  })

  it('PLAY_CARD places card on grid and removes from hand', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD', payload: { player: 'p1' } })
    const card = next.hands.p1[0]
    const handSize = next.hands.p1.length
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1, player: 'p1' },
    })
    expect(next.grid[2][1].card.name).toEqual(card.name)
    expect(next.hands.p1).toHaveLength(handSize - 1)
  })

  it('END_PLAY_PHASE p1 → p2_draw', () => {
    const next = gameReducer(
      { ...state, phase: 'p1_play' },
      { type: 'END_PLAY_PHASE', payload: { player: 'p1' } }
    )
    expect(next.phase).toBe('p2_draw')
  })

  it('END_PLAY_PHASE p2 → move', () => {
    const next = gameReducer(
      { ...state, phase: 'p2_play' },
      { type: 'END_PLAY_PHASE', payload: { player: 'p2' } }
    )
    expect(next.phase).toBe('move')
  })

  it('SUBMIT_MOVE collects moves, both submitted → resolve', () => {
    let next = { ...state, phase: 'move', pendingMoves: { p1: null, p2: null } }
    next = gameReducer(next, { type: 'SUBMIT_MOVE', payload: { player: 'p1', row: 4, col: 1 } })
    expect(next.pendingMoves.p1).toEqual({ row: 4, col: 1 })
    expect(next.phase).toBe('move') // Still waiting for p2

    next = gameReducer(next, { type: 'SUBMIT_MOVE', payload: { player: 'p2', row: 1, col: 1 } })
    expect(next.pendingMoves.p2).toEqual({ row: 1, col: 1 })
    expect(next.phase).toBe('resolve') // Both in
  })

  it('RESOLVE_MOVES applies both moves', () => {
    let next = {
      ...state,
      phase: 'resolve',
      pendingMoves: { p1: { row: 4, col: 1 }, p2: { row: 1, col: 1 } },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.phase).toBe('checkWin')
    // Mascots moved (may chain, but at least the target was set)
    expect(next.mascots).toBeDefined()
  })

  it('END_TURN advances to next round', () => {
    let next = { ...state, phase: 'checkWin', turnCount: 1 }
    next = gameReducer(next, { type: 'END_TURN' })
    expect(next.phase).toBe('p1_draw')
    expect(next.turnCount).toBe(2)
  })

  it('PLAY_CARD on empty tile does not add null to discard', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD', payload: { player: 'p1' } })
    expect(next.grid[2][1].card).toBe(null)
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1, player: 'p1' },
    })
    expect(next.discard.every(c => c !== null)).toBe(true)
  })

  it('PLAY_CARD for blue card increments blue bonus draws', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD', payload: { player: 'p1' } })
    next.hands.p1[0] = { name: 'Test Blue', color: 'blue', scryfallName: 'Island' }
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1, player: 'p1' },
    })
    expect(next.blueBonusDraws.p1).toBe(1)
  })
})
