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

export function createInitialState(p1DeckKey, p2DeckKey, mascotChoices = {}) {
  const p1Cards = shuffleArray(DECKS[p1DeckKey].cards.map(addId))
  const p2Cards = shuffleArray(DECKS[p2DeckKey].cards.map(addId))

  const grid = Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => ({ color: 'empty', card: null, stack: [] }))
  )

  // Deal starting hands (5 each)
  const p1Hand = p1Cards.splice(0, 5)
  const p2Hand = p2Cards.splice(0, 5)

  // Place face-down cards in center column (col 1), all 8 rows
  // P1's 4 cards fill rows 4-7 center, P2's 4 cards fill rows 0-3 center
  const p2FaceDown = p2Cards.splice(0, 4)
  const p1FaceDown = p1Cards.splice(0, 4)

  for (let row = 0; row < 4; row++) {
    if (p2FaceDown[row]) {
      grid[row][1] = { color: 'facedown', card: p2FaceDown[row], faceDown: true, stack: [] }
    }
  }
  for (let row = 4; row < ROWS; row++) {
    if (p1FaceDown[row - 4]) {
      grid[row][1] = { color: 'facedown', card: p1FaceDown[row - 4], faceDown: true, stack: [] }
    }
  }

  return {
    grid,
    mascots: { p1: { row: ROWS - 1, col: 1 }, p2: { row: 0, col: 1 } },
    hands: { p1: p1Hand, p2: p2Hand },
    decks: { p1: p1Cards, p2: p2Cards },
    discard: [],
    phase: PHASES.DRAW,
    activePlayer: 'p1',
    playTurn: null,
    turnCount: 1,
    winner: null,
    pendingMoves: { p1: null, p2: null },
    pendingWhiteBonus: { p1: false, p2: false },
    silverquillImmunity: null,
    // Mascot abilities
    mascotAbilities: {
      p1: mascotChoices.p1 || null,
      p2: mascotChoices.p2 || null,
    },
    abilityUsed: { p1: false, p2: false },
    // Escalating play cost: 1st free, 2nd costs 1 discard, 3rd costs 2, etc.
    playsThisTurn: { p1: 0, p2: 0 },
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
        playTurn: state.activePlayer,
        log: logEntries,
      }
    }

    // === PLAY_CARD: current playTurn player places a card ===
    // discardIndices: array of card indices to discard as cost (for 2nd+ spell)
    case 'PLAY_CARD': {
      const { cardIndex, row, col, playMode, discardIndices = [] } = action.payload
      const player = state.playTurn
      const hand = [...state.hands[player]]

      // Remove discarded cards first (highest index first to avoid shifting)
      const sortedDiscards = [...discardIndices].sort((a, b) => b - a)
      const discardedCards = []
      for (const idx of sortedDiscards) {
        if (idx !== cardIndex && idx >= 0 && idx < hand.length) {
          discardedCards.push(hand.splice(idx, 1)[0])
        }
      }

      // Now find the played card (index may have shifted)
      const adjustedIndex = hand.findIndex(c => c === state.hands[player][cardIndex])
      const card = hand[adjustedIndex !== -1 ? adjustedIndex : cardIndex]
      hand.splice(adjustedIndex !== -1 ? adjustedIndex : cardIndex, 1)

      const grid = state.grid.map(r => r.map(t => ({ ...t, stack: [...(t.stack || [])] })))
      const oldTile = grid[row][col]

      // Card stacking: old card goes underneath into the stack
      let newStack = [...(oldTile.stack || [])]
      if (oldTile.card) {
        newStack = [oldTile.card, ...newStack]
      }

      let tileColor, tileCard, logMsg
      if (card.college && (playMode === 'color1' || playMode === 'color2')) {
        const colorIdx = playMode === 'color1' ? 0 : 1
        tileColor = card.collegeColors[colorIdx]
        tileCard = { name: card.name, color: tileColor, scryfallName: COLOR_TO_LAND[tileColor] || 'Wastes', displayName: COLOR_TO_LAND[tileColor] || 'Wastes' }
        logMsg = `${player} plays ${card.name} as ${tileColor} at (${row},${col}).`
      } else {
        tileColor = card.color
        tileCard = { ...card, displayName: COLOR_TO_LAND[card.color] || 'Wastes' }
        logMsg = `${player} plays ${card.name} at (${row},${col}).`
      }
      grid[row][col] = { color: tileColor, card: tileCard, stack: newStack }

      const otherPlayer = player === 'p1' ? 'p2' : 'p1'
      const newPlays = { ...state.playsThisTurn, [player]: state.playsThisTurn[player] + 1 }
      const discard = [...state.discard, ...discardedCards]

      const costMsg = discardedCards.length > 0
        ? ` (discarded ${discardedCards.length} card${discardedCards.length > 1 ? 's' : ''} as cost)`
        : ''

      return {
        ...state,
        grid,
        hands: { ...state.hands, [player]: hand },
        discard,
        playTurn: otherPlayer,
        playsThisTurn: newPlays,
        log: [...state.log, logMsg + costMsg],
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

    // === USE_ABILITY: player activates their mascot ability ===
    case 'USE_ABILITY': {
      const { player, params } = action.payload
      const ability = state.mascotAbilities[player]
      if (!ability || state.abilityUsed[player]) return state

      const grid = state.grid.map(r => r.map(t => ({ ...t, stack: [...(t.stack || [])] })))
      const logEntries = [...state.log]
      const mascotPos = state.mascots[player]
      let newState = { ...state }

      switch (ability) {
        case 'witherbloom': {
          // Clear all tiles in 3x3 around mascot
          for (let r = mascotPos.row - 1; r <= mascotPos.row + 1; r++) {
            for (let c = mascotPos.col - 1; c <= mascotPos.col + 1; c++) {
              if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                grid[r][c] = { color: 'empty', card: null, stack: [] }
              }
            }
          }
          logEntries.push(`${player} uses Witherbloom — Wither and Bloom! 3x3 area cleared.`)
          newState = { ...state, grid, log: logEntries }
          break
        }
        case 'prismari': {
          // Move mascot 1 space left or right (no tile effect)
          const { direction } = params // 'left' or 'right'
          const newCol = mascotPos.col + (direction === 'left' ? -1 : 1)
          if (newCol >= 0 && newCol < COLS) {
            const newMascots = { ...state.mascots, [player]: { row: mascotPos.row, col: newCol } }
            logEntries.push(`${player} uses Prismari — Kinetic Jaunt! Shifts ${direction}.`)
            newState = { ...state, mascots: newMascots, log: logEntries }
          } else {
            return state // Can't move off-board
          }
          break
        }
        case 'lorehold': {
          // In 3x3 around mascot: peel top stacked card, flip face-down cards
          for (let r = mascotPos.row - 1; r <= mascotPos.row + 1; r++) {
            for (let c = mascotPos.col - 1; c <= mascotPos.col + 1; c++) {
              if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
                const tile = grid[r][c]
                // Flip face-down cards
                if (tile.faceDown && tile.card) {
                  const revealedCard = tile.card
                  grid[r][c] = { color: revealedCard.color, card: revealedCard, stack: [...(tile.stack || [])], faceDown: false }
                  logEntries.push(`  Flipped face-down card at (${r},${c}): ${revealedCard.name}`)
                }
                // Peel top card off stacked tiles (reveal card underneath)
                else if (tile.stack && tile.stack.length > 0) {
                  const buried = [...tile.stack]
                  const revealed = buried.shift()
                  grid[r][c] = { color: revealed.color, card: revealed, stack: buried }
                  logEntries.push(`  Peeled card at (${r},${c}), revealed: ${revealed.name}`)
                }
              }
            }
          }
          logEntries.push(`${player} uses Lorehold — Shared Memories!`)
          newState = { ...state, grid, log: logEntries }
          break
        }
        case 'quandrix': {
          // Swap positions of 2 tiles within 3x3 around mascot
          const { tile1, tile2 } = params // { row, col } each
          const inRange = (pos) => {
            return Math.abs(pos.row - mascotPos.row) <= 1 && Math.abs(pos.col - mascotPos.col) <= 1 &&
              pos.row >= 0 && pos.row < ROWS && pos.col >= 0 && pos.col < COLS
          }
          if (inRange(tile1) && inRange(tile2)) {
            const temp = { ...grid[tile1.row][tile1.col] }
            grid[tile1.row][tile1.col] = { ...grid[tile2.row][tile2.col] }
            grid[tile2.row][tile2.col] = temp
            logEntries.push(`${player} uses Quandrix — Vortex Warp! Swapped (${tile1.row},${tile1.col}) and (${tile2.row},${tile2.col}).`)
            newState = { ...state, grid, log: logEntries }
          } else {
            return state
          }
          break
        }
        case 'silverquill': {
          // Ignore all tile effects this movement phase
          logEntries.push(`${player} uses Silverquill — Silvery Barbs! Immune to tile effects.`)
          newState = { ...state, silverquillImmunity: player, log: logEntries }
          break
        }
        default:
          return state
      }

      return {
        ...newState,
        abilityUsed: { ...state.abilityUsed, [player]: true },
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
          state.grid, move, player, state.silverquillImmunity
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
        state.grid, { row, col }, player, state.silverquillImmunity
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

      return {
        ...state,
        activePlayer: nextPlayer,
        phase: PHASES.DRAW,
        turnCount: state.turnCount + 1,
        silverquillImmunity: null, // Reset each turn
        abilityUsed: { p1: false, p2: false },
        playsThisTurn: { p1: 0, p2: 0 },
        pendingMoves: { p1: null, p2: null },
        pendingWhiteBonus: { p1: false, p2: false },
        playTurn: null,
        log: [...state.log, `--- Turn ${state.turnCount + 1} ---`],
      }
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
