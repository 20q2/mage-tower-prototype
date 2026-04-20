import { ROWS, COLS } from './constants'
import { getValidMoves, resolveChain } from './rules'

function jitter() {
  return (Math.random() - 0.5) * 1.0
}

// AI moves its OWN mascot toward its goal
export function chooseMove(state) {
  const { activePlayer, grid, mascots } = state
  const myMascot = mascots[activePlayer]
  const goalRow = activePlayer === 'p1' ? 0 : 5

  const validMoves = getValidMoves(grid, myMascot, activePlayer)
  if (validMoves.length === 0) return null

  let bestMove = validMoves[0]
  let bestScore = -Infinity

  for (const move of validMoves) {
    let score = 0

    // Prefer moves toward goal
    const currentDist = Math.abs(myMascot.row - goalRow)
    const newDist = Math.abs(move.row - goalRow)
    score += (currentDist - newDist) * 3

    // Evaluate chain — does it push us closer?
    const chain = resolveChain(grid, { row: move.row, col: move.col }, activePlayer, state.silverquillImmunity)
    const chainDist = Math.abs(chain.finalPos.row - goalRow)
    score += (currentDist - chainDist) * 4

    // Avoid black tiles (they push backward)
    const destTile = grid[move.row][move.col]
    if (destTile.color === 'black') score -= 3

    // Love red tiles (they push forward)
    if (destTile.color === 'red') score += 2

    score += jitter()

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return { row: bestMove.row, col: bestMove.col }
}

// AI places 1 card to build its own path or block opponent
export function chooseCardPlay(state) {
  const { activePlayer, grid, mascots, hands } = state
  const hand = hands[activePlayer]
  if (hand.length === 0) return null

  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const myMascot = mascots[activePlayer]
  const oppMascot = mascots[opponent]
  const goalRow = activePlayer === 'p1' ? 0 : 5
  const forwardDir = activePlayer === 'p1' ? -1 : 1

  let bestPlay = null
  let bestScore = 0

  for (let cardIndex = 0; cardIndex < hand.length; cardIndex++) {
    const card = hand[cardIndex]

    // College cards: always play
    if (card.college) {
      const target = findCollegeTarget(state, card, activePlayer)
      if (target) return { cardIndex, ...target, college: card.college }
    }

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        let score = 0

        // Red in my own forward path = build a speed lane
        if (card.color === 'red') {
          const myForwardRow = myMascot.row + forwardDir
          if (row === myForwardRow && col === myMascot.col) score += 4
          // Red anywhere ahead of me is decent
          if ((activePlayer === 'p1' && row < myMascot.row) ||
              (activePlayer === 'p2' && row > myMascot.row)) {
            if (col === myMascot.col) score += 2
          }
        }

        // Green wall in opponent's path = block them
        if (card.color === 'green') {
          const oppForwardRow = oppMascot.row + (opponent === 'p1' ? -1 : 1)
          if (row === oppForwardRow && col === oppMascot.col) score += 3
        }

        // Black in opponent's forward path = trap
        if (card.color === 'black') {
          const oppForwardRow = oppMascot.row + (opponent === 'p1' ? -1 : 1)
          if (row === oppForwardRow && col === oppMascot.col) score += 3
        }

        // White near my mascot = lateral options
        if (card.color === 'white') {
          if (row === myMascot.row && Math.abs(col - myMascot.col) <= 1) score += 1
        }

        score += jitter()

        if (score > bestScore) {
          bestScore = score
          bestPlay = { cardIndex, row, col }
        }
      }
    }
  }

  return bestPlay
}

function findCollegeTarget(state, card, activePlayer) {
  const { mascots } = state
  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const oppMascot = mascots[opponent]

  switch (card.college) {
    case 'witherbloom':
      return { row: Math.max(0, Math.min(ROWS - 1, oppMascot.row)), col: Math.max(0, Math.min(COLS - 1, oppMascot.col)) }
    case 'prismari':
      return { row: mascots[activePlayer].row, col: 0 }
    default:
      return { row: 2, col: 1 }
  }
}
