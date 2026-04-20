import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'

describe('createInitialState', () => {
  it('creates a 6x3 empty grid', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.grid).toHaveLength(6)
    expect(state.grid[0]).toHaveLength(3)
    // Grid starts empty
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
    // Card is placed on grid (may have displayName added for mono-color)
    expect(next.grid[2][1].card.name).toEqual(cardToPlay.name)
    expect(next.grid[2][1].color).toEqual(cardToPlay.color)
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

  it('PLAY_CARD on empty tile does not add null to discard', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    // Grid starts empty
    expect(next.grid[2][1].card).toBe(null)
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1 },
    })
    // No null in discard
    expect(next.discard.every(c => c !== null)).toBe(true)
  })

  it('PLAY_CARD on occupied tile adds old card to discard', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    // Play first card to fill a tile
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1 },
    })
    const occupyingCard = next.grid[2][1].card
    // Draw another card and play on same tile
    next = gameReducer(next, { type: 'END_PLAY_PHASE' })
    next = { ...next, phase: 'play' } // force back to play for test
    next.hands.p1 = [{ name: 'Test', color: 'red', scryfallName: 'Mountain', id: 'test-1' }]
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1 },
    })
    expect(next.discard).toContainEqual(occupyingCard)
  })

  it('PLAY_CARD for blue card increments blue bonus draws', () => {
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    next.hands.p1[0] = { name: 'Test Blue', color: 'blue', scryfallName: 'Island' }
    next = gameReducer(next, {
      type: 'PLAY_CARD',
      payload: { cardIndex: 0, row: 2, col: 1 },
    })
    expect(next.blueBonusDraws.p1).toBe(1)
  })
})
