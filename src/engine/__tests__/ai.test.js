import { describe, it, expect } from 'vitest'
import { chooseCardPlay, chooseMove } from '../ai'
import { createInitialState, gameReducer } from '../gameState'

describe('chooseMove', () => {
  it('returns a valid move from the available options', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    next = gameReducer(next, { type: 'END_PLAY_PHASE' })
    const move = chooseMove(next)
    expect(move).toHaveProperty('row')
    expect(move).toHaveProperty('col')
    expect(move.row).toBeGreaterThanOrEqual(0)
    expect(move.row).toBeLessThan(6)
    expect(move.col).toBeGreaterThanOrEqual(0)
    expect(move.col).toBeLessThan(3)
  })
})

describe('chooseCardPlay', () => {
  it('returns null or a valid play action', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    let next = gameReducer(state, { type: 'DRAW_CARD' })
    const play = chooseCardPlay(next)
    if (play !== null) {
      expect(play).toHaveProperty('cardIndex')
      expect(play).toHaveProperty('row')
      expect(play).toHaveProperty('col')
    }
  })

  it('returns null when hand is empty', () => {
    const state = createInitialState('lorehold', 'witherbloom')
    state.hands[state.activePlayer] = []
    const play = chooseCardPlay(state)
    expect(play).toBe(null)
  })
})
