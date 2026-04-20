import { PHASES, ROWS, COLS, ACTIONS_PER_TURN } from './constants'
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

  // Clean field — every tile is a player's decision
  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ color: 'empty', card: null }))
  )

  const p1Hand = p1Cards.splice(0, 5)
  const p2Hand = p2Cards.splice(0, 5)

  return {
    grid,
    mascots: { p1: { row: 5, col: 1 }, p2: { row: 0, col: 1 } },
    hands: { p1: p1Hand, p2: p2Hand },
    decks: { p1: p1Cards, p2: p2Cards },
    discard: [],
    phase: PHASES.DRAW,
    activePlayer: 'p1',
    turnCount: 1,
    winner: null,
    actionsRemaining: 0,
    portalLinks: [],
    silverquillImmunity: null,
    prismariBoostRow: null,
    pendingLateral: null,
    log: ['Game started!'],
  }
}

export function gameReducer(state, action) {
  const { activePlayer } = state

  switch (action.type) {
    case 'DRAW_CARD': {
      const deck = [...state.decks[activePlayer]]
      const hand = [...state.hands[activePlayer]]
      const drawn = deck.splice(0, Math.min(1, deck.length))
      hand.push(...drawn)

      return {
        ...state,
        decks: { ...state.decks, [activePlayer]: deck },
        hands: { ...state.hands, [activePlayer]: hand },
        phase: PHASES.ACT,
        actionsRemaining: ACTIONS_PER_TURN,
        log: [...state.log, `${activePlayer} draws ${drawn.length} card(s). ${ACTIONS_PER_TURN} actions available.`],
      }
    }

    // Play a card = 1 action
    case 'PLAY_CARD': {
      const { cardIndex, row, col } = action.payload
      const hand = [...state.hands[activePlayer]]
      const card = hand[cardIndex]
      hand.splice(cardIndex, 1)

      const grid = state.grid.map(r => r.map(t => ({ ...t })))
      const oldTileCard = grid[row][col].card
      const discard = oldTileCard ? [...state.discard, oldTileCard] : [...state.discard]

      const tileCard = card.college
        ? card
        : { ...card, displayName: COLOR_TO_LAND[card.color] || 'Wastes' }
      grid[row][col] = { color: card.color, card: tileCard }

      const actionsRemaining = state.actionsRemaining - 1

      return {
        ...state,
        grid,
        hands: { ...state.hands, [activePlayer]: hand },
        discard,
        actionsRemaining,
        phase: actionsRemaining <= 0 ? PHASES.CHECK_WIN : PHASES.ACT,
        log: [...state.log, `${activePlayer} plays ${card.name} at (${row},${col}). [${actionsRemaining} actions left]`],
      }
    }

    // Move 1 step = 1 action
    case 'MOVE_MASCOT': {
      const { row, col } = action.payload
      const newMascots = { ...state.mascots, [activePlayer]: { row, col } }

      const chain = resolveChain(
        state.grid, { row, col }, activePlayer, state.silverquillImmunity,
        { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
      )
      newMascots[activePlayer] = chain.finalPos

      const logEntries = [...state.log]
      logEntries.push(`${activePlayer} moves to (${row},${col}).`)

      if (chain.steps.length > 1) {
        for (let i = 0; i < chain.steps.length - 1; i++) {
          const step = chain.steps[i]
          const tile = state.grid[step.row]?.[step.col]
          if (tile && tile.color !== 'empty' && tile.color !== 'colorless') {
            logEntries.push(`  ${tileEffectName(tile.color)}!`)
          }
        }
        logEntries.push(`  → Lands at (${chain.finalPos.row},${chain.finalPos.col})`)
      }

      // Blue tiles: draw cards immediately on entry
      let hands = state.hands
      let decks = state.decks
      if (chain.drawCount > 0) {
        const deck = [...decks[activePlayer]]
        const hand = [...hands[activePlayer]]
        const drawn = deck.splice(0, Math.min(chain.drawCount, deck.length))
        hand.push(...drawn)
        hands = { ...hands, [activePlayer]: hand }
        decks = { ...decks, [activePlayer]: deck }
        if (drawn.length > 0) {
          logEntries.push(`  Blue tile — drew ${drawn.length} card(s)!`)
        }
      }

      const winner = checkWinCondition(newMascots, activePlayer)
      const actionsRemaining = state.actionsRemaining - 1

      // White tile lateral
      if (chain.lateralOptions?.length > 0 && !winner) {
        logEntries.push(`  White tile — slide sideways?`)
        return {
          ...state,
          mascots: newMascots,
          hands, decks,
          actionsRemaining,
          pendingLateral: chain.lateralOptions,
          winner,
          log: logEntries,
        }
      }

      return {
        ...state,
        mascots: newMascots,
        hands, decks,
        actionsRemaining,
        phase: (actionsRemaining <= 0 || winner) ? PHASES.CHECK_WIN : PHASES.ACT,
        winner,
        log: [...logEntries, actionsRemaining > 0 && !winner ? `[${actionsRemaining} actions left]` : ''].filter(Boolean),
      }
    }

    case 'RESOLVE_LATERAL': {
      const { row, col } = action.payload
      const newMascots = { ...state.mascots, [activePlayer]: { row, col } }

      const chain = resolveChain(
        state.grid, { row, col }, activePlayer, state.silverquillImmunity,
        { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
      )
      newMascots[activePlayer] = chain.finalPos
      const winner = checkWinCondition(newMascots, activePlayer)
      const actionsRemaining = state.actionsRemaining

      return {
        ...state,
        mascots: newMascots,
        winner,
        pendingLateral: null,
        phase: (actionsRemaining <= 0 || winner) ? PHASES.CHECK_WIN : PHASES.ACT,
        log: [...state.log, `Slides laterally to (${row},${col}).`],
      }
    }

    case 'SKIP_LATERAL': {
      const actionsRemaining = state.actionsRemaining
      return {
        ...state,
        pendingLateral: null,
        phase: actionsRemaining <= 0 ? PHASES.CHECK_WIN : PHASES.ACT,
      }
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
        actionsRemaining: 0,
        pendingLateral: null,
        log: [...state.log, `--- ${nextPlayer}'s turn ---`],
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

function tileEffectName(color) {
  switch (color) {
    case 'red': return 'Red — pushed forward'
    case 'black': return 'Black — pushed backward'
    case 'white': return 'White — lateral slide'
    case 'green': return 'Green — wall'
    case 'blue': return 'Blue — portal'
    default: return color
  }
}

function applyCollegeReducer(state, college, params, activePlayer) {
  const grid = state.grid.map(r => r.map(t => ({ ...t })))
  const log = [...state.log]

  switch (college) {
    case 'witherbloom': {
      const { centerRow, centerCol, wallRow, wallCol } = params
      for (let r = centerRow - 1; r <= centerRow + 1; r++) {
        for (let c = centerCol - 1; c <= centerCol + 1; c++) {
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            grid[r][c] = { color: 'colorless', card: { name: 'Destroyed', color: 'colorless', scryfallName: 'Wastes' } }
          }
        }
      }
      if (wallRow >= 0 && wallRow < ROWS && wallCol >= 0 && wallCol < COLS) {
        grid[wallRow][wallCol] = { color: 'green', card: { name: 'Witherbloom Wall', color: 'green', scryfallName: 'Forest' } }
      }
      log.push(`Witherbloom NUKE! 3x3 destroyed around (${centerRow},${centerCol}).`)
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
      if (card) { grid[row][col] = { color: card.color, card }; log.push(`Lorehold recalls ${card.name}.`) }
      return { ...state, grid, discard, log }
    }
    case 'quandrix': {
      const blueTiles = []
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[r][c].color === 'blue') blueTiles.push({ row: r, col: c })
      log.push(`Quandrix links ${blueTiles.length} blue portals!`)
      return { ...state, portalLinks: blueTiles, log }
    }
    case 'prismari': {
      const { row } = params
      log.push(`Prismari doubles movement in row ${row}!`)
      return { ...state, prismariBoostRow: row, log }
    }
    default: return state
  }
}
