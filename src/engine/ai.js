import { ROWS, COLS, ACTIONS_PER_TURN } from './constants'
import { getValidMoves, resolveChain } from './rules'

function jitter() {
  return (Math.random() - 0.5) * 0.3
}

/**
 * Simulate a full 2-step move sequence from a starting position.
 * Returns the best final position achievable and its distance to goal.
 */
function simulateBestMove(grid, startPos, player, immunity, extras) {
  const goalRow = player === 'p1' ? 0 : 5
  const startDist = Math.abs(startPos.row - goalRow)

  let bestDist = startDist
  let bestFinalPos = startPos

  // Try all step-1 moves
  const step1Moves = getValidMoves(grid, startPos, player)
  if (step1Moves.length === 0) return { finalPos: startPos, dist: startDist }

  for (const m1 of step1Moves) {
    const chain1 = resolveChain(grid, { row: m1.row, col: m1.col }, player, immunity, extras)
    const pos1 = chain1.finalPos
    const dist1 = Math.abs(pos1.row - goalRow)

    // Try all step-2 moves from chain1 result
    const step2Moves = getValidMoves(grid, pos1, player)
    if (step2Moves.length === 0) {
      if (dist1 < bestDist) { bestDist = dist1; bestFinalPos = pos1 }
      continue
    }

    for (const m2 of step2Moves) {
      const chain2 = resolveChain(grid, { row: m2.row, col: m2.col }, player, immunity, extras)
      const pos2 = chain2.finalPos
      const dist2 = Math.abs(pos2.row - goalRow)
      if (dist2 < bestDist) { bestDist = dist2; bestFinalPos = pos2 }
    }
  }

  return { finalPos: bestFinalPos, dist: bestDist }
}

// AI moves its OWN mascot — evaluates full 2-step sequences
export function chooseMove(state) {
  const { activePlayer, grid, mascots } = state
  const myMascot = mascots[activePlayer]
  const goalRow = activePlayer === 'p1' ? 0 : 5
  const extras = { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }

  const validMoves = getValidMoves(grid, myMascot, activePlayer)
  if (validMoves.length === 0) return null

  const currentDist = Math.abs(myMascot.row - goalRow)
  let bestMove = validMoves[0]
  let bestScore = -Infinity

  for (const move of validMoves) {
    // Resolve chain for step 1
    const chain = resolveChain(grid, { row: move.row, col: move.col }, activePlayer, state.silverquillImmunity, extras)
    const afterStep1 = chain.finalPos
    const step1Dist = Math.abs(afterStep1.row - goalRow)

    // Simulate best possible step 2 from step1's result
    const step2Result = simulateBestMove(grid, afterStep1, activePlayer, state.silverquillImmunity, extras)

    // Score: how much closer do we get over 2 steps?
    let score = (currentDist - step2Result.dist) * 5

    // Bonus for chains (exciting, efficient)
    if (chain.steps.length > 1) score += chain.steps.length * 2

    // Win detection
    if (step2Result.dist === 0) score += 100

    // Mild preference for center column (more options)
    if (move.col === 1) score += 0.5

    score += jitter()

    if (score > bestScore) {
      bestScore = score
      bestMove = move
    }
  }

  return { row: bestMove.row, col: bestMove.col }
}

// AI places 1 card — simulates how placement affects its own path AND opponent's
export function chooseCardPlay(state) {
  const { activePlayer, grid, mascots, hands } = state
  const hand = hands[activePlayer]
  if (hand.length === 0) return null

  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const myMascot = mascots[activePlayer]
  const oppMascot = mascots[opponent]
  const goalRow = activePlayer === 'p1' ? 0 : 5
  const oppGoalRow = opponent === 'p1' ? 0 : 5
  const forwardDir = activePlayer === 'p1' ? -1 : 1
  const extras = { portalLinks: state.portalLinks, prismariBoostRow: state.prismariBoostRow }

  // Baseline: how far can I get with current board?
  const baseline = simulateBestMove(grid, myMascot, activePlayer, state.silverquillImmunity, extras)
  const oppBaseline = simulateBestMove(grid, oppMascot, opponent, state.silverquillImmunity, extras)

  let bestPlay = null
  let bestScore = -1 // Must beat "do nothing"

  for (let cardIndex = 0; cardIndex < hand.length; cardIndex++) {
    const card = hand[cardIndex]

    // College cards: always play them
    if (card.college) {
      const target = findCollegeTarget(state, card, activePlayer)
      if (target) return { cardIndex, ...target, college: card.college }
    }

    // Try each board position
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // Simulate placing this card
        const testGrid = grid.map(r => r.map(t => ({ ...t })))
        const tileCard = { ...card, displayName: card.name }
        testGrid[row][col] = { color: card.color, card: tileCard }

        let score = 0

        // How does this improve MY path?
        const myResult = simulateBestMove(testGrid, myMascot, activePlayer, state.silverquillImmunity, extras)
        const myImprovement = baseline.dist - myResult.dist
        score += myImprovement * 6

        // How does this HURT opponent's path?
        const oppResult = simulateBestMove(testGrid, oppMascot, opponent, state.silverquillImmunity, extras)
        const oppHurt = oppResult.dist - oppBaseline.dist
        score += oppHurt * 4

        // Bonus: replacing an opponent-friendly tile (e.g., overwriting their red with our green)
        const existingTile = grid[row][col]
        if (existingTile.color === 'red' && card.color === 'green') score += 2
        if (existingTile.color === 'red' && card.color === 'black') score += 1

        // Penalty for wasting a card where it does nothing
        if (myImprovement === 0 && oppHurt === 0) score -= 1

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
  const myMascot = mascots[activePlayer]

  switch (card.college) {
    case 'witherbloom':
      // Nuke around opponent
      return { row: Math.max(0, Math.min(ROWS - 1, oppMascot.row)), col: Math.max(0, Math.min(COLS - 1, oppMascot.col)) }
    case 'prismari':
      // Boost the row we're on
      return { row: myMascot.row, col: 0 }
    default:
      return { row: 2, col: 1 }
  }
}
