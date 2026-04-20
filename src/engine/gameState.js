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

  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ color: 'empty', card: null }))
  )

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
    phase: PHASES.P1_DRAW,
    turnCount: 1,
    winner: null,
    // Simultaneous move collection
    pendingMoves: { p1: null, p2: null },
    // College state
    portalLinks: [],
    silverquillImmunity: null,
    prismariBoostRow: null,
    blueBonusDraws: { p1: 0, p2: 0 },
    // Lateral choice after resolve
    pendingLateral: null,
    pendingLateralPlayer: null,
    log: ['Game started!'],
  }
}

export function gameReducer(state, action) {
  switch (action.type) {
    // === DRAW: specified player draws ===
    case 'DRAW_CARD': {
      const player = action.payload?.player || 'p1'
      const deck = [...state.decks[player]]
      const hand = [...state.hands[player]]
      const bonusDraws = state.blueBonusDraws[player]
      const totalDraws = 1 + bonusDraws
      const drawn = deck.splice(0, Math.min(totalDraws, deck.length))
      hand.push(...drawn)

      // After P1 draws → P1 plays. After P2 draws → P2 plays.
      const nextPhase = player === 'p1' ? PHASES.P1_PLAY : PHASES.P2_PLAY

      return {
        ...state,
        decks: { ...state.decks, [player]: deck },
        hands: { ...state.hands, [player]: hand },
        blueBonusDraws: { ...state.blueBonusDraws, [player]: 0 },
        phase: nextPhase,
        log: [...state.log, `${player} draws ${drawn.length} card(s).`],
      }
    }

    // === PLAY: place a card on the grid ===
    case 'PLAY_CARD': {
      const { cardIndex, row, col, player } = action.payload
      const hand = [...state.hands[player]]
      const card = hand[cardIndex]
      hand.splice(cardIndex, 1)

      const grid = state.grid.map((r) => r.map((t) => ({ ...t })))
      const oldTileCard = grid[row][col].card
      const discard = oldTileCard ? [...state.discard, oldTileCard] : [...state.discard]

      const isCollege = !!card.college
      const tileCard = isCollege
        ? card
        : { ...card, displayName: COLOR_TO_LAND[card.color] || 'Wastes' }
      grid[row][col] = { color: card.color, card: tileCard }

      const blueBonusDraws = { ...state.blueBonusDraws }
      if (card.color === 'blue') {
        blueBonusDraws[player] = (blueBonusDraws[player] || 0) + 1
      }

      return {
        ...state,
        grid,
        hands: { ...state.hands, [player]: hand },
        discard,
        blueBonusDraws,
        log: [...state.log, `${player} plays ${card.name} at (${row},${col}).`],
      }
    }

    // === END PLAY: finish placing terrain ===
    case 'END_PLAY_PHASE': {
      const { player } = action.payload
      if (player === 'p1') {
        // P1 done → P2 draws
        return { ...state, phase: PHASES.P2_DRAW }
      } else {
        // P2 done → simultaneous move phase
        return {
          ...state,
          phase: PHASES.MOVE,
          pendingMoves: { p1: null, p2: null },
          log: [...state.log, '--- Both players choose movement ---'],
        }
      }
    }

    // === SUBMIT_MOVE: one player locks in their move choice ===
    case 'SUBMIT_MOVE': {
      const { player, row, col } = action.payload
      const pendingMoves = { ...state.pendingMoves, [player]: { row, col } }

      // Check if both moves are submitted
      const bothReady = pendingMoves.p1 !== null && pendingMoves.p2 !== null
      if (bothReady) {
        return { ...state, pendingMoves, phase: PHASES.RESOLVE }
      }
      return {
        ...state,
        pendingMoves,
        log: [...state.log, `${player} has chosen their move.`],
      }
    }

    // === RESOLVE: execute both moves simultaneously ===
    case 'RESOLVE_MOVES': {
      const { p1: p1Move, p2: p2Move } = state.pendingMoves
      const newMascots = { ...state.mascots }
      const logEntries = [...state.log]

      // P1 moves P2's mascot (toward P2 goal = row 0)
      if (p1Move) {
        const targetTile = state.grid[p1Move.row][p1Move.col]
        logEntries.push(`P1 pushes P2's mascot to (${p1Move.row},${p1Move.col}).`)

        const chain1 = resolveChain(
          state.grid, p1Move, 'p1', state.silverquillImmunity,
          { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
        )
        newMascots.p2 = chain1.finalPos

        // Log tile effects
        if (chain1.steps.length > 1) {
          for (let i = 0; i < chain1.steps.length - 1; i++) {
            const step = chain1.steps[i]
            const tile = state.grid[step.row]?.[step.col]
            if (tile && tile.color !== 'empty' && tile.color !== 'colorless') {
              logEntries.push(`  ${tileEffectName(tile.color)} at (${step.row},${step.col})!`)
            }
          }
          logEntries.push(`  → P2's mascot lands at (${chain1.finalPos.row},${chain1.finalPos.col})`)
        }

        if (chain1.lateralOptions?.length > 0) {
          logEntries.push(`  White tile — lateral slide available!`)
        }
      }

      // P2 moves P1's mascot (toward P1 goal = row 5)
      if (p2Move) {
        logEntries.push(`P2 pushes P1's mascot to (${p2Move.row},${p2Move.col}).`)

        const chain2 = resolveChain(
          state.grid, p2Move, 'p2', state.silverquillImmunity,
          { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
        )
        newMascots.p1 = chain2.finalPos

        if (chain2.steps.length > 1) {
          for (let i = 0; i < chain2.steps.length - 1; i++) {
            const step = chain2.steps[i]
            const tile = state.grid[step.row]?.[step.col]
            if (tile && tile.color !== 'empty' && tile.color !== 'colorless') {
              logEntries.push(`  ${tileEffectName(tile.color)} at (${step.row},${step.col})!`)
            }
          }
          logEntries.push(`  → P1's mascot lands at (${chain2.finalPos.row},${chain2.finalPos.col})`)
        }

        if (chain2.lateralOptions?.length > 0) {
          logEntries.push(`  White tile — lateral slide available!`)
        }
      }

      const winner = checkWinCondition(newMascots)

      return {
        ...state,
        mascots: newMascots,
        phase: PHASES.CHECK_WIN,
        winner,
        pendingMoves: { p1: null, p2: null },
        log: logEntries,
      }
    }

    case 'RESOLVE_LATERAL': {
      const { row, col, player } = action.payload
      const opponent = player === 'p1' ? 'p2' : 'p1'
      const newMascots = { ...state.mascots, [opponent]: { row, col } }

      const chainResult = resolveChain(
        state.grid, { row, col }, player, state.silverquillImmunity,
        { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
      )
      newMascots[opponent] = chainResult.finalPos

      const winner = checkWinCondition(newMascots)

      return {
        ...state,
        mascots: newMascots,
        winner,
        pendingLateral: null,
        pendingLateralPlayer: null,
        log: [...state.log, `Mascot slides laterally to (${row},${col}).`],
      }
    }

    case 'SKIP_LATERAL': {
      return { ...state, pendingLateral: null, pendingLateralPlayer: null }
    }

    // === END_TURN: start next round ===
    case 'END_TURN': {
      const silverquillImmunity = null // Clears each round

      return {
        ...state,
        phase: PHASES.P1_DRAW,
        turnCount: state.turnCount + 1,
        silverquillImmunity,
        pendingLateral: null,
        pendingLateralPlayer: null,
        log: [...state.log, `--- Turn ${state.turnCount + 1} ---`],
      }
    }

    case 'ACTIVATE_COLLEGE': {
      const { college, params, player } = action.payload
      return applyCollegeReducer(state, college, params, player)
    }

    default:
      return state
  }
}

function tileEffectName(color) {
  switch (color) {
    case 'red': return 'Red tile — pushed forward'
    case 'black': return 'Black tile — pushed backward'
    case 'white': return 'White tile — lateral slide'
    case 'green': return 'Green wall — blocked'
    case 'blue': return 'Blue tile — portal'
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
