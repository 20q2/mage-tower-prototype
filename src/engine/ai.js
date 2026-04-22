import { ROWS, COLS } from './constants'
import { getValidMoves, resolveChain } from './rules'

function jitter() {
  return (Math.random() - 0.5) * 0.3
}

// AI moves its OWN mascot — picks the step that gets closest to goal
export function chooseMove(state) {
  const { activePlayer, grid, mascots } = state
  const myMascot = mascots[activePlayer]
  const goalRow = activePlayer === 'p1' ? 0 : 7

  const validMoves = getValidMoves(grid, myMascot, activePlayer)
  if (validMoves.length === 0) return null

  const currentDist = Math.abs(myMascot.row - goalRow)
  let bestMove = validMoves[0]
  let bestScore = -Infinity

  for (const move of validMoves) {
    const chain = resolveChain(grid, { row: move.row, col: move.col }, activePlayer, state.silverquillImmunity,
      { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow })
    const chainDist = Math.abs(chain.finalPos.row - goalRow)
    let score = (currentDist - chainDist) * 5

    if (chain.steps.length > 1) score += chain.steps.length * 2
    if (chainDist === 0) score += 100
    if (chain.whiteBonus) score += 3
    if (chain.drawCount > 0) score += chain.drawCount * 2

    const destTile = grid[move.row][move.col]
    if (destTile.color === 'black') score -= 4
    if (destTile.color === 'red') score += 2
    if (move.col === 1) score += 0.3

    score += jitter()
    if (score > bestScore) { bestScore = score; bestMove = move }
  }

  return { row: bestMove.row, col: bestMove.col }
}

// AI places 1 card — evaluates how placement helps own path and hurts opponent
export function chooseCardPlay(state) {
  const { activePlayer, grid, mascots, hands } = state
  const hand = hands[activePlayer]
  if (hand.length === 0) return null

  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const myMascot = mascots[activePlayer]
  const oppMascot = mascots[opponent]
  const goalRow = activePlayer === 'p1' ? 0 : 7
  const oppGoalRow = opponent === 'p1' ? 0 : 7
  const forwardDir = activePlayer === 'p1' ? -1 : 1
  const extras = { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }

  let bestPlay = null
  let bestScore = 0.5 // Must beat "doing nothing" threshold

  for (let cardIndex = 0; cardIndex < hand.length; cardIndex++) {
    const card = hand[cardIndex]

    if (card.college) {
      const target = findCollegeTarget(state, card, activePlayer)
      if (target) return { cardIndex, ...target, college: card.college }
    }

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        let score = 0

        // Red ahead of me = speed lane
        if (card.color === 'red') {
          if (col === myMascot.col && ((activePlayer === 'p1' && row < myMascot.row) || (activePlayer === 'p2' && row > myMascot.row))) {
            score += 4
            if (row === myMascot.row + forwardDir) score += 3 // Right in front
          }
        }

        // Green blocking opponent
        if (card.color === 'green') {
          const oppForward = oppMascot.row + (opponent === 'p1' ? -1 : 1)
          if (row === oppForward && col === oppMascot.col) score += 4
          if (col === oppMascot.col) score += 1
        }

        // Black in opponent's path
        if (card.color === 'black') {
          const oppForward = oppMascot.row + (opponent === 'p1' ? -1 : 1)
          if (row === oppForward && col === oppMascot.col) score += 3
        }

        // White ahead of me = bonus move
        if (card.color === 'white') {
          if ((activePlayer === 'p1' && row < myMascot.row) || (activePlayer === 'p2' && row > myMascot.row)) {
            if (col === myMascot.col) score += 3
          }
        }

        // Blue ahead = draw cards
        if (card.color === 'blue') {
          if (col === myMascot.col && ((activePlayer === 'p1' && row < myMascot.row) || (activePlayer === 'p2' && row > myMascot.row))) {
            score += 2
          }
        }

        // Overwriting opponent's helpful tiles
        const existing = grid[row][col]
        if (existing.color === 'red' && col === oppMascot.col) score += 2

        score += jitter()
        if (score > bestScore) { bestScore = score; bestPlay = { cardIndex, row, col } }
      }
    }
  }

  return bestPlay
}

function findCollegeTarget(state, card, activePlayer) {
  const { mascots } = state
  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const oppMascot = mascots[opponent]
  const myMascot = mascots[activePlayer]

  switch (card.college) {
    case 'witherbloom':
      return { row: Math.max(0, Math.min(ROWS - 1, oppMascot.row)), col: Math.max(0, Math.min(COLS - 1, oppMascot.col)) }
    case 'prismari':
      return { row: myMascot.row, col: 0 }
    default:
      return { row: 2, col: 1 }
  }
}
