import { PHASES, ROWS, COLS } from './constants'
import { DECKS } from './decks'
import { resolveChain, checkWinCondition } from './rules'

function shuffleArray(arr) {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function addId(card, index) {
  return { ...card, id: `${card.name}-${index}-${Math.random().toString(36).slice(2, 8)}` }
}

// Map mono-color cards to their basic land for tile display
export const COLOR_TO_LAND = {
  white: 'Plains',
  blue: 'Island',
  black: 'Swamp',
  red: 'Mountain',
  green: 'Forest',
  colorless: 'Wastes',
}

export function createInitialState(p1DeckKey, p2DeckKey) {
  const p1Cards = shuffleArray(DECKS[p1DeckKey].cards.map(addId))
  const p2Cards = shuffleArray(DECKS[p2DeckKey].cards.map(addId))

  // Grid starts EMPTY — no cards dealt to board
  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ color: 'empty', card: null }))
  )

  // Deal 3 cards to each hand from their full deck
  const p1Hand = p1Cards.splice(0, 3)
  const p2Hand = p2Cards.splice(0, 3)

  return {
    grid,
    mascots: {
      p1: { row: 0, col: 1 },
      p2: { row: 5, col: 1 },
    },
    hands: { p1: p1Hand, p2: p2Hand },
    decks: { p1: p1Cards, p2: p2Cards },
    discard: [],
    phase: PHASES.DRAW,
    activePlayer: 'p1',
    turnCount: 1,
    winner: null,
    portalLinks: [],
    silverquillImmunity: null,
    prismariBoostRow: null,
    blueBonusDraws: { p1: 0, p2: 0 },
    log: ['Game started!'],
  }
}

export function gameReducer(state, action) {
  const { activePlayer } = state
  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'

  switch (action.type) {
    case 'DRAW_CARD': {
      const deck = [...state.decks[activePlayer]]
      const hand = [...state.hands[activePlayer]]
      const bonusDraws = state.blueBonusDraws[activePlayer]
      const totalDraws = 1 + bonusDraws

      const drawn = deck.splice(0, Math.min(totalDraws, deck.length))
      hand.push(...drawn)

      return {
        ...state,
        decks: { ...state.decks, [activePlayer]: deck },
        hands: { ...state.hands, [activePlayer]: hand },
        blueBonusDraws: { ...state.blueBonusDraws, [activePlayer]: 0 },
        phase: PHASES.PLAY,
        log: [...state.log, `${activePlayer} draws ${drawn.length} card(s).`],
      }
    }

    case 'PLAY_CARD': {
      const { cardIndex, row, col } = action.payload
      const hand = [...state.hands[activePlayer]]
      const card = hand[cardIndex]
      hand.splice(cardIndex, 1)

      const grid = state.grid.map((r) => r.map((t) => ({ ...t })))
      const oldTileCard = grid[row][col].card
      const discard = oldTileCard ? [...state.discard, oldTileCard] : [...state.discard]

      // College cards: show the actual card on the tile
      // Mono-color cards: show a basic land to represent that color
      const isCollege = !!card.college
      const tileCard = isCollege
        ? card
        : { ...card, displayName: COLOR_TO_LAND[card.color] || 'Wastes' }

      grid[row][col] = { color: card.color, card: tileCard }

      const blueBonusDraws = { ...state.blueBonusDraws }
      if (card.color === 'blue') {
        blueBonusDraws[activePlayer] = (blueBonusDraws[activePlayer] || 0) + 1
      }

      return {
        ...state,
        grid,
        hands: { ...state.hands, [activePlayer]: hand },
        discard,
        blueBonusDraws,
        log: [...state.log, `${activePlayer} plays ${card.name} at (${row},${col}).`],
      }
    }

    case 'END_PLAY_PHASE': {
      return { ...state, phase: PHASES.MOVE }
    }

    case 'MOVE_MASCOT': {
      const { row, col } = action.payload
      const newMascots = {
        ...state.mascots,
        [opponent]: { row, col },
      }

      const chainResult = resolveChain(
        state.grid,
        { row, col },
        activePlayer,
        state.silverquillImmunity,
        { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
      )

      const logEntries = [...state.log]
      logEntries.push(`${activePlayer} moves ${opponent}'s mascot to (${row},${col}).`)
      if (chainResult.steps.length > 1) {
        logEntries.push(`Chain reaction! ${chainResult.steps.length} steps.`)
      }

      const winner = checkWinCondition(newMascots)

      return {
        ...state,
        mascots: newMascots,
        phase: PHASES.CHECK_WIN,
        winner,
        log: logEntries,
        pendingChain: chainResult.steps.length > 1 ? chainResult : null,
        pendingLateral: chainResult.lateralOptions || null,
      }
    }

    case 'RESOLVE_LATERAL': {
      const { row, col } = action.payload
      const newMascots = {
        ...state.mascots,
        [opponent]: { row, col },
      }

      const chainResult = resolveChain(
        state.grid,
        { row, col },
        activePlayer,
        state.silverquillImmunity,
        { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
      )
      newMascots[opponent] = chainResult.finalPos

      const winner = checkWinCondition(newMascots)

      return {
        ...state,
        mascots: newMascots,
        winner,
        pendingLateral: null,
        log: [...state.log, `Mascot slides laterally to (${row},${col}).`],
      }
    }

    case 'SKIP_LATERAL': {
      return { ...state, pendingLateral: null }
    }

    case 'END_TURN': {
      const nextPlayer = activePlayer === 'p1' ? 'p2' : 'p1'
      const silverquillImmunity =
        state.silverquillImmunity === activePlayer ? null : state.silverquillImmunity

      return {
        ...state,
        activePlayer: nextPlayer,
        phase: PHASES.DRAW,
        turnCount: state.turnCount + 1,
        silverquillImmunity,
        pendingLateral: null,
        log: [...state.log, `--- Turn ${state.turnCount + 1}: ${nextPlayer}'s turn ---`],
      }
    }

    case 'ACTIVATE_COLLEGE': {
      const { college, params } = action.payload
      return applyCollegeReducer(state, college, params, activePlayer)
    }

    default:
      return state
  }
}

function applyCollegeReducer(state, college, params, activePlayer) {
  const grid = state.grid.map((r) => r.map((t) => ({ ...t })))
  const log = [...state.log]

  switch (college) {
    case 'witherbloom': {
      const { centerRow, centerCol, wallRow, wallCol } = params
      for (let r = centerRow - 1; r <= centerRow + 1; r++) {
        for (let c = centerCol - 1; c <= centerCol + 1; c++) {
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            grid[r][c] = {
              color: 'colorless',
              card: { name: 'Destroyed', color: 'colorless', scryfallName: 'Wastes' },
            }
          }
        }
      }
      if (wallRow >= 0 && wallRow < ROWS && wallCol >= 0 && wallCol < COLS) {
        grid[wallRow][wallCol] = {
          color: 'green',
          card: { name: 'Witherbloom Wall', color: 'green', scryfallName: 'Forest' },
        }
      }
      log.push(`Witherbloom NUKE! 3x3 area destroyed around (${centerRow},${centerCol}).`)
      return { ...state, grid, log }
    }

    case 'silverquill': {
      log.push(`${activePlayer}'s mascot gains Silverquill immunity!`)
      return { ...state, silverquillImmunity: activePlayer, log }
    }

    case 'lorehold': {
      const { discardIndex, row, col } = params
      const discard = [...state.discard]
      const card = discard.splice(discardIndex, 1)[0]
      if (card) {
        grid[row][col] = { color: card.color, card }
        log.push(`Lorehold recalls ${card.name} to (${row},${col}).`)
      }
      return { ...state, grid, discard, log }
    }

    case 'quandrix': {
      const blueTiles = []
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (grid[r][c].color === 'blue') {
            blueTiles.push({ row: r, col: c })
          }
        }
      }
      log.push(`Quandrix links ${blueTiles.length} blue portals!`)
      return { ...state, portalLinks: blueTiles, log }
    }

    case 'prismari': {
      const { row } = params
      log.push(`Prismari doubles movement in row ${row}!`)
      return { ...state, prismariBoostRow: row, log }
    }

    default:
      return state
  }
}
