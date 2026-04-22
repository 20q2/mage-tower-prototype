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
    mascots: { p1: { row: ROWS - 1, col: 1 }, p2: { row: 0, col: 1 } },
    hands: { p1: p1Hand, p2: p2Hand },
    decks: { p1: p1Cards, p2: p2Cards },
    discard: [],
    phase: PHASES.DRAW,
    activePlayer: 'p1',         // Who starts the play phase
    playTurn: null,              // Whose turn it is to play/pass within the play phase
    turnCount: 1,
    winner: null,
    // Simultaneous move collection
    pendingMoves: { p1: null, p2: null },
    // White tile bonus moves
    pendingWhiteBonus: { p1: false, p2: false },
    // College state
    portalLinks: [],
    silverquillImmunity: null,
    prismariBoostRow: null,
    log: ['Game started!'],
  }
}

export function gameReducer(state, action) {
  switch (action.type) {

    // === DRAW: both players draw 1 card ===
    case 'DRAW_CARDS': {
      const hands = { ...state.hands }
      const decks = { ...state.decks }
      const logEntries = [...state.log]

      for (const player of ['p1', 'p2']) {
        const deck = [...decks[player]]
        const hand = [...hands[player]]
        if (deck.length > 0) {
          hand.push(deck.shift())
          logEntries.push(`${player} draws a card.`)
        }
        hands[player] = hand
        decks[player] = deck
      }

      return {
        ...state,
        hands,
        decks,
        phase: PHASES.PLAY,
        playTurn: state.activePlayer,  // Active player starts the play phase
        log: logEntries,
      }
    }

    // === PLAY_CARD: current playTurn player places a card ===
    case 'PLAY_CARD': {
      const { cardIndex, row, col, playMode } = action.payload
      const player = state.playTurn
      const hand = [...state.hands[player]]
      const card = hand[cardIndex]
      hand.splice(cardIndex, 1)

      const grid = state.grid.map(r => r.map(t => ({ ...t })))
      const oldTileCard = grid[row][col].card
      const discard = oldTileCard ? [...state.discard, oldTileCard] : [...state.discard]

      let tileColor, tileCard, logMsg
      if (card.college && playMode === 'color1') {
        tileColor = card.collegeColors[0]
        tileCard = { name: card.name, color: tileColor, scryfallName: COLOR_TO_LAND[tileColor] || 'Wastes', displayName: COLOR_TO_LAND[tileColor] || 'Wastes' }
        logMsg = `${player} plays ${card.name} as ${tileColor} at (${row},${col}).`
      } else if (card.college && playMode === 'color2') {
        tileColor = card.collegeColors[1]
        tileCard = { name: card.name, color: tileColor, scryfallName: COLOR_TO_LAND[tileColor] || 'Wastes', displayName: COLOR_TO_LAND[tileColor] || 'Wastes' }
        logMsg = `${player} plays ${card.name} as ${tileColor} at (${row},${col}).`
      } else if (card.college) {
        tileColor = card.color
        tileCard = card
        logMsg = `${player} plays ${card.name} (${card.college}) at (${row},${col}).`
      } else {
        tileColor = card.color
        tileCard = { ...card, displayName: COLOR_TO_LAND[card.color] || 'Wastes' }
        logMsg = `${player} plays ${card.name} at (${row},${col}).`
      }
      grid[row][col] = { color: tileColor, card: tileCard }

      // After playing, turn passes to the other player
      const otherPlayer = player === 'p1' ? 'p2' : 'p1'

      return {
        ...state,
        grid,
        hands: { ...state.hands, [player]: hand },
        discard,
        playTurn: otherPlayer,
        log: [...state.log, logMsg],
      }
    }

    // === PASS: current playTurn player passes — ends the play phase ===
    case 'PASS': {
      return {
        ...state,
        phase: PHASES.MOVE,
        playTurn: null,
        pendingMoves: { p1: null, p2: null },
        pendingWhiteBonus: { p1: false, p2: false },
        log: [...state.log, `${state.playTurn} passes. Movement phase!`],
      }
    }

    // === SUBMIT_MOVE: one player picks their move ===
    case 'SUBMIT_MOVE': {
      const { player, row, col } = action.payload
      const pendingMoves = { ...state.pendingMoves, [player]: { row, col } }

      const bothReady = pendingMoves.p1 !== null && pendingMoves.p2 !== null
      if (bothReady) {
        return { ...state, pendingMoves, phase: PHASES.RESOLVE }
      }
      return {
        ...state,
        pendingMoves,
        log: [...state.log, `${player} chose their move.`],
      }
    }

    // === RESOLVE: both moves execute simultaneously ===
    case 'RESOLVE_MOVES': {
      const { p1: p1Move, p2: p2Move } = state.pendingMoves
      const newMascots = { ...state.mascots }
      const logEntries = [...state.log]
      let hands = state.hands
      let decks = state.decks
      const pendingWhiteBonus = { p1: false, p2: false }

      for (const [player, move] of [['p1', p1Move], ['p2', p2Move]]) {
        if (!move) continue

        const chain = resolveChain(
          state.grid, move, player, state.silverquillImmunity,
          { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
        )
        newMascots[player] = chain.finalPos

        logEntries.push(`${player} moves to (${move.row},${move.col}).`)
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

        // Blue draw
        if (chain.drawCount > 0) {
          const deck = [...decks[player]]
          const hand = [...hands[player]]
          const drawn = deck.splice(0, Math.min(chain.drawCount, deck.length))
          hand.push(...drawn)
          hands = { ...hands, [player]: hand }
          decks = { ...decks, [player]: deck }
          if (drawn.length > 0) logEntries.push(`  Blue tile — drew ${drawn.length} card(s)!`)
        }

        // White bonus
        if (chain.whiteBonus) {
          pendingWhiteBonus[player] = true
          logEntries.push(`  White tile — bonus move!`)
        }
      }

      const winner = checkWinCondition(newMascots)
      const hasWhiteBonus = pendingWhiteBonus.p1 || pendingWhiteBonus.p2

      return {
        ...state,
        mascots: newMascots,
        hands, decks,
        pendingMoves: { p1: null, p2: null },
        pendingWhiteBonus,
        phase: hasWhiteBonus && !winner ? PHASES.MOVE : PHASES.CHECK_WIN,
        winner,
        log: logEntries,
      }
    }

    // === WHITE_BONUS_MOVE: player takes their free bonus step ===
    case 'WHITE_BONUS_MOVE': {
      const { player, row, col } = action.payload
      const newMascots = { ...state.mascots, [player]: { row, col } }

      const chain = resolveChain(
        state.grid, { row, col }, player, state.silverquillImmunity,
        { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }
      )
      newMascots[player] = chain.finalPos

      let hands = state.hands
      let decks = state.decks
      const logEntries = [...state.log, `${player} bonus moves to (${row},${col}).`]

      if (chain.steps.length > 1) {
        logEntries.push(`  → Chains to (${chain.finalPos.row},${chain.finalPos.col})`)
      }
      if (chain.drawCount > 0) {
        const deck = [...decks[player]]
        const hand = [...hands[player]]
        const drawn = deck.splice(0, Math.min(chain.drawCount, deck.length))
        hand.push(...drawn)
        hands = { ...hands, [player]: hand }
        decks = { ...decks, [player]: deck }
      }

      const pendingWhiteBonus = { ...state.pendingWhiteBonus, [player]: false }
      const winner = checkWinCondition(newMascots)
      const stillHasBonus = pendingWhiteBonus.p1 || pendingWhiteBonus.p2

      return {
        ...state,
        mascots: newMascots,
        hands, decks,
        pendingWhiteBonus,
        phase: stillHasBonus && !winner ? PHASES.MOVE : PHASES.CHECK_WIN,
        winner,
        log: logEntries,
      }
    }

    // === SKIP_WHITE_BONUS: player declines their bonus move ===
    case 'SKIP_WHITE_BONUS': {
      const { player } = action.payload
      const pendingWhiteBonus = { ...state.pendingWhiteBonus, [player]: false }
      const stillHasBonus = pendingWhiteBonus.p1 || pendingWhiteBonus.p2

      return {
        ...state,
        pendingWhiteBonus,
        phase: stillHasBonus ? PHASES.MOVE : PHASES.CHECK_WIN,
      }
    }

    // === END_TURN: alternate active player ===
    case 'END_TURN': {
      const nextPlayer = state.activePlayer === 'p1' ? 'p2' : 'p1'
      const silverquillImmunity =
        state.silverquillImmunity === state.activePlayer ? null : state.silverquillImmunity

      return {
        ...state,
        activePlayer: nextPlayer,
        phase: PHASES.DRAW,
        turnCount: state.turnCount + 1,
        silverquillImmunity,
        pendingMoves: { p1: null, p2: null },
        pendingWhiteBonus: { p1: false, p2: false },
        playTurn: null,
        log: [...state.log, `--- Turn ${state.turnCount + 1} ---`],
      }
    }

    case 'ACTIVATE_COLLEGE': {
      const { college, params, player } = action.payload
      return applyCollegeReducer(state, college, params, player || state.playTurn)
    }

    default:
      return state
  }
}

function tileEffectName(color) {
  switch (color) {
    case 'red': return 'Red — pushed forward'
    case 'black': return 'Black — pushed backward'
    case 'white': return 'White — bonus move'
    case 'green': return 'Green — wall'
    case 'blue': return 'Blue — draw'
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
      log.push(`Witherbloom NUKE! 3x3 destroyed.`)
      return { ...state, grid, log }
    }
    case 'silverquill': {
      log.push(`${activePlayer}'s mascot gains immunity!`)
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
