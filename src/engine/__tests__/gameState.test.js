import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'
import { PHASES } from '../constants'

describe('createInitialState', () => {
  it('creates an 8x3 grid with face-down cards in center column', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.grid).toHaveLength(8)
    expect(state.grid[0]).toHaveLength(3)
    // Center column (col 1) should have 8 face-down cards
    for (let row = 0; row < 8; row++) {
      expect(state.grid[row][1].faceDown).toBe(true)
    }
    // Side columns should be empty
    for (let row = 0; row < 8; row++) {
      expect(state.grid[row][0].color).toBe('empty')
      expect(state.grid[row][2].color).toBe('empty')
    }
  })

  it('tiles have stack arrays', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    for (const row of state.grid) {
      for (const tile of row) {
        expect(Array.isArray(tile.stack)).toBe(true)
      }
    }
  })

  it('mascots at their goal rows', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.mascots.p1).toEqual({ row: 7, col: 1 })
    expect(state.mascots.p2).toEqual({ row: 0, col: 1 })
  })

  it('deals 3 cards each', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.hands.p1).toHaveLength(3)
    expect(state.hands.p2).toHaveLength(3)
  })

  it('has mascot abilities and abilityUsed in state', () => {
    const state = createInitialState('lorehold', 'witherbloom', { p1: 'quandrix', p2: 'witherbloom' })
    expect(state.mascotAbilities).toEqual({ p1: 'quandrix', p2: 'witherbloom' })
    expect(state.abilityUsed).toEqual({ p1: false, p2: false })
  })

  it('does not have portalLinks or prismariBoostRow', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.portalLinks).toBeUndefined()
    expect(state.prismariBoostRow).toBeUndefined()
  })
})

describe('gameReducer — alternating play + simultaneous move', () => {
  let state
  beforeEach(() => { state = createInitialState('lorehold', 'witherbloom') })

  it('DRAW_CARDS: both draw, enters play phase', () => {
    const next = gameReducer(state, { type: 'DRAW_CARDS' })
    expect(next.phase).toBe('play')
    expect(next.hands.p1).toHaveLength(4)
    expect(next.hands.p2).toHaveLength(4)
    expect(next.playTurn).toBe('p1')
  })

  it('PLAY_CARD: places card, switches playTurn', () => {
    let next = gameReducer(state, { type: 'DRAW_CARDS' })
    const card = next.hands.p1[0]
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 5, col: 1 } })
    expect(next.grid[5][1].card.name).toBe(card.name)
    expect(next.playTurn).toBe('p2')
  })

  it('PLAY_CARD: stacking — old card goes underneath', () => {
    let next = gameReducer(state, { type: 'DRAW_CARDS' })
    // Place first card on empty side tile
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 5, col: 0 } })
    const firstCard = next.grid[5][0].card
    // P2 places on same tile
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 5, col: 0 } })
    expect(next.grid[5][0].stack).toHaveLength(1)
    expect(next.grid[5][0].stack[0].name).toBe(firstCard.name)
  })

  it('PASS: ends play phase, enters move', () => {
    let next = gameReducer(state, { type: 'DRAW_CARDS' })
    next = gameReducer(next, { type: 'PASS' })
    expect(next.phase).toBe('move')
  })

  it('alternating plays: P1 plays, P2 plays, P1 passes', () => {
    let next = gameReducer(state, { type: 'DRAW_CARDS' })
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 5, col: 1 } })
    expect(next.playTurn).toBe('p2')
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 2, col: 1 } })
    expect(next.playTurn).toBe('p1')
    next = gameReducer(next, { type: 'PASS' })
    expect(next.phase).toBe('move')
  })

  it('SUBMIT_MOVE: collects both, then resolves', () => {
    let next = { ...state, phase: 'move', pendingMoves: { p1: null, p2: null }, pendingWhiteBonus: { p1: false, p2: false } }
    next = gameReducer(next, { type: 'SUBMIT_MOVE', payload: { player: 'p1', row: 6, col: 1 } })
    expect(next.pendingMoves.p1).toEqual({ row: 6, col: 1 })
    expect(next.phase).toBe('move')

    next = gameReducer(next, { type: 'SUBMIT_MOVE', payload: { player: 'p2', row: 1, col: 1 } })
    expect(next.phase).toBe('resolve')
  })

  it('RESOLVE_MOVES: both mascots move', () => {
    let next = {
      ...state, phase: 'resolve',
      pendingMoves: { p1: { row: 6, col: 1 }, p2: { row: 1, col: 1 } },
      pendingWhiteBonus: { p1: false, p2: false },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.mascots.p1).toEqual({ row: 6, col: 1 })
    expect(next.mascots.p2).toEqual({ row: 1, col: 1 })
    expect(next.phase).toBe('checkWin')
  })

  it('END_TURN: switches active player, resets abilities', () => {
    let next = { ...state, phase: 'checkWin', activePlayer: 'p1', abilityUsed: { p1: true, p2: false } }
    next = gameReducer(next, { type: 'END_TURN' })
    expect(next.activePlayer).toBe('p2')
    expect(next.phase).toBe('draw')
    expect(next.abilityUsed).toEqual({ p1: false, p2: false })
    expect(next.silverquillImmunity).toBe(null)
  })

  it('red chain through RESOLVE_MOVES', () => {
    let next = { ...state, phase: 'resolve',
      pendingMoves: { p1: { row: 6, col: 1 }, p2: { row: 1, col: 1 } },
      pendingWhiteBonus: { p1: false, p2: false },
    }
    next.grid[6][1] = { color: 'red', card: { name: 'Mountain', color: 'red', scryfallName: 'Mountain', displayName: 'Mountain' }, stack: [] }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.mascots.p1).toEqual({ row: 5, col: 1 })
  })

  it('white tile sets pendingWhiteBonus', () => {
    let next = { ...state, phase: 'resolve',
      pendingMoves: { p1: { row: 6, col: 1 }, p2: { row: 1, col: 1 } },
      pendingWhiteBonus: { p1: false, p2: false },
    }
    next.grid[6][1] = { color: 'white', card: { name: 'Plains', color: 'white', scryfallName: 'Plains', displayName: 'Plains' }, stack: [] }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.pendingWhiteBonus.p1).toBe(true)
    expect(next.phase).toBe('move')
  })

  it('WHITE_BONUS_MOVE moves mascot', () => {
    let next = {
      ...state, phase: 'move',
      mascots: { p1: { row: 6, col: 1 }, p2: { row: 1, col: 1 } },
      pendingWhiteBonus: { p1: true, p2: false },
    }
    next = gameReducer(next, { type: 'WHITE_BONUS_MOVE', payload: { player: 'p1', row: 5, col: 1 } })
    expect(next.mascots.p1).toEqual({ row: 5, col: 1 })
    expect(next.pendingWhiteBonus.p1).toBe(false)
    expect(next.phase).toBe('checkWin')
  })

  it('P1 wins at row 0', () => {
    let next = { ...state, phase: 'resolve',
      mascots: { p1: { row: 1, col: 1 }, p2: { row: 5, col: 1 } },
      pendingMoves: { p1: { row: 0, col: 1 }, p2: { row: 6, col: 1 } },
      pendingWhiteBonus: { p1: false, p2: false },
    }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.winner).toBe('p1')
  })
})

describe('gameReducer — mascot abilities', () => {
  it('USE_ABILITY witherbloom clears 3x3 area', () => {
    const state = createInitialState('lorehold', 'witherbloom', { p1: 'witherbloom', p2: 'silverquill' })
    // Place some tiles near P1 mascot (row 7, col 1)
    state.grid[6][0] = { color: 'red', card: { name: 'Mountain', color: 'red' }, stack: [] }
    state.grid[6][1] = { color: 'green', card: { name: 'Forest', color: 'green' }, stack: [] }
    state.grid[6][2] = { color: 'blue', card: { name: 'Island', color: 'blue' }, stack: [] }

    const next = gameReducer({ ...state, phase: PHASES.MOVE }, {
      type: 'USE_ABILITY', payload: { player: 'p1', params: {} }
    })

    // 3x3 around (7,1) = rows 6-7, cols 0-2 (clamped)
    expect(next.grid[6][0].color).toBe('empty')
    expect(next.grid[6][1].color).toBe('empty')
    expect(next.grid[6][2].color).toBe('empty')
    expect(next.abilityUsed.p1).toBe(true)
  })

  it('USE_ABILITY silverquill sets immunity', () => {
    const state = createInitialState('lorehold', 'witherbloom', { p1: 'silverquill', p2: 'witherbloom' })
    const next = gameReducer({ ...state, phase: PHASES.MOVE }, {
      type: 'USE_ABILITY', payload: { player: 'p1', params: {} }
    })
    expect(next.silverquillImmunity).toBe('p1')
    expect(next.abilityUsed.p1).toBe(true)
  })

  it('USE_ABILITY prismari shifts mascot', () => {
    const state = createInitialState('lorehold', 'witherbloom', { p1: 'prismari', p2: 'witherbloom' })
    expect(state.mascots.p1).toEqual({ row: 7, col: 1 })

    const next = gameReducer({ ...state, phase: PHASES.MOVE }, {
      type: 'USE_ABILITY', payload: { player: 'p1', params: { direction: 'left' } }
    })
    expect(next.mascots.p1).toEqual({ row: 7, col: 0 })
    expect(next.abilityUsed.p1).toBe(true)
  })

  it('USE_ABILITY cannot be used twice in same round', () => {
    const state = createInitialState('lorehold', 'witherbloom', { p1: 'silverquill', p2: 'witherbloom' })
    let next = gameReducer({ ...state, phase: PHASES.MOVE }, {
      type: 'USE_ABILITY', payload: { player: 'p1', params: {} }
    })
    expect(next.abilityUsed.p1).toBe(true)

    // Try again — should be no-op
    const next2 = gameReducer(next, {
      type: 'USE_ABILITY', payload: { player: 'p1', params: {} }
    })
    expect(next2).toBe(next)
  })
})
