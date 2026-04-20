import { PHASES, ROWS, COLS, MOVE_STEPS } from './constants'
import { DECKS } from './decks'
import { resolveChain, checkWinCondition, getValidMoves } from './rules'

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

  const SEED_COUNT = 5
  const p1SeedCards = p1Cards.splice(0, SEED_COUNT)
  const p2SeedCards = p2Cards.splice(0, SEED_COUNT)

  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ color: 'empty', card: null }))
  )

  // P2 seeds rows 0-2
  const p2Positions = []
  for (let r = 0; r < 3; r++) for (let c = 0; c < COLS; c++) p2Positions.push({ row: r, col: c })
  shuffleArray(p2Positions)
  for (let i = 0; i < SEED_COUNT && i < p2Positions.length; i++) {
    const { row, col } = p2Positions[i]
    const card = p2SeedCards[i]
    const tileCard = card.college ? card : { ...card, displayName: COLOR_TO_LAND[card.color] || 'Wastes' }
    grid[row][col] = { color: card.color, card: tileCard }
  }

  // P1 seeds rows 3-5
  const p1Positions = []
  for (let r = 3; r < ROWS; r++) for (let c = 0; c < COLS; c++) p1Positions.push({ row: r, col: c })
  shuffleArray(p1Positions)
  for (let i = 0; i < SEED_COUNT && i < p1Positions.length; i++) {
    const { row, col } = p1Positions[i]
    const card = p1SeedCards[i]
    const tileCard = card.college ? card : { ...card, displayName: COLOR_TO_LAND[card.color] || 'Wastes' }
    grid[row][col] = { color: card.color, card: tileCard }
  }

  const p1Hand = p1Cards.splice(0, 5)
  const p2Hand = p2Cards.splice(0, 5)

  return {
    grid,
    mascots: {
      p1: { row: 5, col: 1 },  // P1 starts at THEIR goal row (bottom), races to row 0
      p2: { row: 0, col: 1 },  // P2 starts at THEIR goal row (top), races to row 5
    },
    hands: { p1: p1Hand, p2: p2Hand },
    decks: { p1: p1Cards, p2: p2Cards },
    discard: [],
    phase: PHASES.DRAW,
    activePlayer: 'p1',
    firstPlayer: 'p1',
    turnCount: 1,
    winner: null,
    // Movement: 2 steps per turn, track remaining
    movesRemaining: 0,
    // Card play: 1 card per turn, track if played
    hasPlayedCard: false,
    // College state
    portalLinks: [],
    silverquillImmunity: null,
    prismariBoostRow: null,
    blueBonusDraws: { p1: 0, p2: 0 },
    // Lateral
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
        hasPlayedCard: false,
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

      const tileCard = card.college
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
        hasPlayedCard: true,
        log: [...state.log, `${activePlayer} plays ${card.name} at (${row},${col}).`],
      }
    }

    // Advance to move phase (auto or manual after playing 1 card / skipping)
    case 'END_PLAY_PHASE': {
      return {
        ...state,
        phase: PHASES.MOVE,
        movesRemaining: MOVE_STEPS,
        log: [...state.log, `${activePlayer} moves! (${MOVE_STEPS} steps)`],
      }
    }

    // Move YOUR OWN mascot 1 step (called up to MOVE_STEPS times)
    case 'MOVE_MASCOT': {
      const { row, col } = action.payload
      const newMascots = { ...state.mascots, [activePlayer]: { row, col } }
      const movesRemaining = state.movesRemaining - 1

      // Resolve chain at new position
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

      const winner = checkWinCondition(newMascots, activePlayer)

      // If chain ended on white tile, offer lateral before continuing
      if (chain.lateralOptions?.length > 0 && !winner) {
        return {
          ...state,
          mascots: newMascots,
          movesRemaining,
          pendingLateral: chain.lateralOptions,
          winner,
          log: logEntries,
        }
      }

      // If no more moves or winner, go to check win
      if (movesRemaining <= 0 || winner) {
        return {
          ...state,
          mascots: newMascots,
          movesRemaining: 0,
          phase: PHASES.CHECK_WIN,
          winner,
          log: logEntries,
        }
      }

      // More moves remaining
      return {
        ...state,
        mascots: newMascots,
        movesRemaining,
        winner,
        log: logEntries,
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
      const movesRemaining = state.movesRemaining

      const logEntries = [...state.log, `Slides laterally to (${row},${col}).`]

      if (movesRemaining <= 0 || winner) {
        return {
          ...state,
          mascots: newMascots,
          movesRemaining: 0,
          phase: PHASES.CHECK_WIN,
          winner,
          pendingLateral: null,
          log: logEntries,
        }
      }

      return {
        ...state,
        mascots: newMascots,
        winner,
        pendingLateral: null,
        log: logEntries,
      }
    }

    case 'SKIP_LATERAL': {
      const movesRemaining = state.movesRemaining
      if (movesRemaining <= 0) {
        return { ...state, pendingLateral: null, phase: PHASES.CHECK_WIN }
      }
      return { ...state, pendingLateral: null }
    }

    // Skip remaining moves
    case 'END_MOVE_PHASE': {
      return {
        ...state,
        movesRemaining: 0,
        phase: PHASES.CHECK_WIN,
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
        movesRemaining: 0,
        hasPlayedCard: false,
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

// Win condition: you win by reaching the OPPOSITE goal row
// P1 starts row 5, wins at row 0. P2 starts row 0, wins at row 5.
function checkWinConditionForPlayer(mascots, player) {
  if (player === 'p1' && mascots.p1.row === 0) return 'p1'
  if (player === 'p2' && mascots.p2.row === 5) return 'p2'
  return null
}

// Override the imported checkWinCondition to check the active player
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
  const grid = state.grid.map((r) => r.map((t) => ({ ...t })))
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
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (grid[r][c].color === 'blue') blueTiles.push({ row: r, col: c })
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
