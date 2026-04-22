import { describe, it, expect, beforeEach } from 'vitest'
import { createInitialState, gameReducer } from '../gameState'
import { PHASES } from '../constants'

describe('createInitialState', () => {
  it('creates an 8x3 empty grid', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    expect(state.grid).toHaveLength(8)
    expect(state.grid[0]).toHaveLength(3)
    for (const row of state.grid) for (const tile of row) expect(tile.color).toBe('empty')
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
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 4, col: 1 } })
    expect(next.grid[4][1].card.name).toBe(card.name)
    expect(next.playTurn).toBe('p2') // Opponent's turn to play/pass
  })

  it('PASS: ends play phase, enters move', () => {
    let next = gameReducer(state, { type: 'DRAW_CARDS' })
    next = gameReducer(next, { type: 'PASS' })
    expect(next.phase).toBe('move')
  })

  it('alternating plays: P1 plays, P2 plays, P1 passes', () => {
    let next = gameReducer(state, { type: 'DRAW_CARDS' })
    // P1 plays
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 5, col: 1 } })
    expect(next.playTurn).toBe('p2')
    // P2 plays
    next = gameReducer(next, { type: 'PLAY_CARD', payload: { cardIndex: 0, row: 2, col: 1 } })
    expect(next.playTurn).toBe('p1')
    // P1 passes → move phase
    next = gameReducer(next, { type: 'PASS' })
    expect(next.phase).toBe('move')
  })

  it('SUBMIT_MOVE: collects both, then resolves', () => {
    let next = { ...state, phase: 'move', pendingMoves: { p1: null, p2: null }, pendingWhiteBonus: { p1: false, p2: false } }
    next = gameReducer(next, { type: 'SUBMIT_MOVE', payload: { player: 'p1', row: 6, col: 1 } })
    expect(next.pendingMoves.p1).toEqual({ row: 6, col: 1 })
    expect(next.phase).toBe('move') // Waiting for P2

    next = gameReducer(next, { type: 'SUBMIT_MOVE', payload: { player: 'p2', row: 1, col: 1 } })
    expect(next.phase).toBe('resolve') // Both in
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

  it('END_TURN: switches active player', () => {
    let next = { ...state, phase: 'checkWin', activePlayer: 'p1' }
    next = gameReducer(next, { type: 'END_TURN' })
    expect(next.activePlayer).toBe('p2')
    expect(next.phase).toBe('draw')
  })

  it('red chain through RESOLVE_MOVES', () => {
    let next = { ...state, phase: 'resolve',
      pendingMoves: { p1: { row: 6, col: 1 }, p2: { row: 1, col: 1 } },
      pendingWhiteBonus: { p1: false, p2: false },
    }
    next.grid[6][1] = { color: 'red', card: { name: 'Mountain', color: 'red', scryfallName: 'Mountain', displayName: 'Mountain' } }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.mascots.p1).toEqual({ row: 5, col: 1 }) // Pushed forward by red
  })

  it('white tile sets pendingWhiteBonus', () => {
    let next = { ...state, phase: 'resolve',
      pendingMoves: { p1: { row: 6, col: 1 }, p2: { row: 1, col: 1 } },
      pendingWhiteBonus: { p1: false, p2: false },
    }
    next.grid[6][1] = { color: 'white', card: { name: 'Plains', color: 'white', scryfallName: 'Plains', displayName: 'Plains' } }
    next = gameReducer(next, { type: 'RESOLVE_MOVES' })
    expect(next.pendingWhiteBonus.p1).toBe(true)
    expect(next.phase).toBe('move') // Back to move for bonus
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
