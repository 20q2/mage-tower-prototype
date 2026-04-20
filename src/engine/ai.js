import { ROWS, COLS } from './constants'
import { getValidMoves, isPassable, resolveChain } from './rules'

function jitter() {
  return (Math.random() - 0.5) * 1.0
}

export function chooseMove(state) {
  const { activePlayer, grid, mascots } = state
  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const opponentMascot = mascots[opponent]
  const goalRow = activePlayer === 'p1' ? 0 : 5

  const validMoves = getValidMoves(grid, opponentMascot, activePlayer)

  if (validMoves.length === 0) return null

  let bestMove = validMoves[0]
  let bestScore = -Infinity

  for (const move of validMoves) {
    let score = 0

    const currentDist = Math.abs(opponentMascot.row - goalRow)
    const newDist = Math.abs(move.row - goalRow)
    score += (currentDist - newDist) * 3

    const chainResult = resolveChain(grid, { row: move.row, col: move.col }, activePlayer, state.silverquillImmunity)
    const chainDist = Math.abs(chainResult.finalPos.row - goalRow)
    score += (currentDist - chainDist) * 2

    score += jitter()

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return { row: bestMove.row, col: bestMove.col }
}

export function chooseCardPlay(state) {
  const { activePlayer, grid, mascots, hands } = state
  const hand = hands[activePlayer]

  if (hand.length === 0) return null

  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const opponentMascot = mascots[opponent]
  const goalRow = activePlayer === 'p1' ? 0 : 5
  const forwardDir = activePlayer === 'p1' ? -1 : 1

  let bestPlay = null
  let bestScore = 0

  for (let cardIndex = 0; cardIndex < hand.length; cardIndex++) {
    const card = hand[cardIndex]

    if (card.college) {
      const target = findCollegeTarget(state, card, activePlayer)
      if (target) {
        return { cardIndex, ...target, college: card.college }
      }
    }

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        let score = 0

        if (card.color === 'red') {
          const pathRow = opponentMascot.row + forwardDir
          if (row === pathRow && col === opponentMascot.col) score += 3
          if (col === opponentMascot.col) score += 1
        }

        if (card.color === 'green') {
          const leftCol = opponentMascot.col - 1
          const rightCol = opponentMascot.col + 1
          if ((col === leftCol || col === rightCol) && row === opponentMascot.row) score += 2
        }

        if (card.color === 'black') {
          const behindRow = opponentMascot.row - forwardDir
          if (row === behindRow && col === opponentMascot.col) score += 2
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
  const { grid, mascots } = state
  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const opponentMascot = mascots[opponent]

  switch (card.college) {
    case 'witherbloom':
      return {
        row: Math.max(0, Math.min(ROWS - 1, opponentMascot.row)),
        col: Math.max(0, Math.min(COLS - 1, opponentMascot.col)),
      }
    case 'prismari':
      return { row: opponentMascot.row, col: 0 }
    default:
      return { row: 2, col: 1 }
  }
}
