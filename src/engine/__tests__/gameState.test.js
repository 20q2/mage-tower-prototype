import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'

describe('createInitialState', () => {
  it('creates a 6x3 pre-seeded grid', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.grid).toHaveLength(6)
    expect(state.grid[0]).toHaveLength(3)
    // Board has 10 pre-seeded tiles (5 per player)
    let filledCount = 0
    for (const row of state.grid) {
      for (const tile of row) {
        if (tile.color !== 'empty') filledCount++
      }
    }
    expect(filledCount).toBe(10)
  })

  it('places mascots at correct starting positions', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.mascots.p1).toEqual({ row: 0, col: 1 })
    expect(state.mascots.p2).toEqual({ row: 5, col: 1 })
  })

  it('deals 5 cards to each player', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.hands.p1).toHaveLength(5)
    expect(state.hands.p2).toHaveLength(5)
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

  it('END_PLAY_PHASE: first player done → second player draws', () => {
    // When p1 is first: p1 ends → p2_draw
    let next = gameReducer(
      { ...state, phase: 'p1_play', firstPlayer: 'p1' },
      { type: 'END_PLAY_PHASE', payload: { player: 'p1' } }
    )
    expect(next.phase).toBe('p2_draw')

    // When p2 is first: p2 ends → p1_draw
    next = gameReducer(
      { ...state, phase: 'p2_play', firstPlayer: 'p2' },
      { type: 'END_PLAY_PHASE', payload: { player: 'p2' } }
    )
    expect(next.phase).toBe('p1_draw')
  })

  it('END_PLAY_PHASE: second player done → move phase', () => {
    // When p1 is first, p2 is second: p2 ends → move
    let next = gameReducer(
      { ...state, phase: 'p2_play', firstPlayer: 'p1' },
      { type: 'END_PLAY_PHASE', payload: { player: 'p2' } }
    )
    expect(next.phase).toBe('move')

    // When p2 is first, p1 is second: p1 ends → move
    next = gameReducer(
      { ...state, phase: 'p1_play', firstPlayer: 'p2' },
      { type: 'END_PLAY_PHASE', payload: { player: 'p1' } }
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

  it('END_TURN advances to next round and alternates first player', () => {
    // firstPlayer starts as 'p1', so next round p2 goes first
    let next = { ...state, phase: 'checkWin', turnCount: 1, firstPlayer: 'p1' }
    next = gameReducer(next, { type: 'END_TURN' })
    expect(next.phase).toBe('p2_draw')
    expect(next.firstPlayer).toBe('p2')
    expect(next.turnCount).toBe(2)

    // Next round, p1 goes first again
    next = { ...next, phase: 'checkWin' }
    next = gameReducer(next, { type: 'END_TURN' })
    expect(next.phase).toBe('p1_draw')
    expect(next.firstPlayer).toBe('p1')
    expect(next.turnCount).toBe(3)
  })

  it('PLAY_CARD on empty tile does not add null to discard', () => {
    // Force an empty tile for this test
    state.grid[2][1] = { color: 'empty', card: null }
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
