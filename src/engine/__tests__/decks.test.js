import { describe, it, expect } from 'vitest'
import { DECKS } from '../decks'
import { COLORS, COLLEGES } from '../constants'

describe('decks', () => {
  it('exports exactly 3 preset decks', () => {
    expect(Object.keys(DECKS)).toHaveLength(3)
  })

  it('each deck has 30 cards', () => {
    for (const [name, deck] of Object.entries(DECKS)) {
      expect(deck.cards).toHaveLength(30)
    }
  })

  it('every card has required fields', () => {
    for (const [name, deck] of Object.entries(DECKS)) {
      for (const card of deck.cards) {
        expect(card).toHaveProperty('name')
        expect(card).toHaveProperty('color')
        expect(COLORS).toContain(card.color)
        expect(card).toHaveProperty('scryfallName')
        if (card.college) {
          expect(Object.keys(COLLEGES)).toContain(card.college)
          expect(card.collegeColors).toHaveLength(2)
        }
      }
    }
  })

  it('each deck has a name and description', () => {
    for (const [key, deck] of Object.entries(DECKS)) {
      expect(deck.name).toBeTruthy()
      expect(deck.description).toBeTruthy()
    }
  })
})
