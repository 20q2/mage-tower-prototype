import { describe, it, expect } from 'vitest'
import { chooseCardPlay, chooseMove } from '../ai'
import { createInitialState } from '../gameState'

describe('chooseMove', () => {
  it('returns a valid move from the available options', () => {
    const state = { ...createInitialState('lorehold', 'witherbloom'), activePlayer: 'p2' }
    const move = chooseMove(state)
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
    const state = { ...createInitialState('lorehold', 'witherbloom'), activePlayer: 'p2' }
    const play = chooseCardPlay(state)
    if (play !== null) {
      expect(play).toHaveProperty('cardIndex')
      expect(play).toHaveProperty('row')
      expect(play).toHaveProperty('col')
    }
  })

  it('returns null when hand is empty', () => {
    const state = { ...createInitialState('lorehold', 'witherbloom'), activePlayer: 'p2' }
    state.hands.p2 = []
    const play = chooseCardPlay(state)
    expect(play).toBe(null)
  })
})
