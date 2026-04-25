import { ROWS, COLS, MASCOTS } from './constants'
import { getValidMoves, resolveChain } from './rules'

function jitter() {
  return (Math.random() - 0.5) * 0.3
}

// AI picks a random mascot at game start
export function chooseRandomMascot() {
  const keys = Object.keys(MASCOTS)
  return keys[Math.floor(Math.random() * keys.length)]
}

// AI moves its OWN mascot — picks the step that gets closest to goal
export function chooseMove(state) {
  const { activePlayer, grid, mascots, silverquillImmunity } = state
  const myMascot = mascots[activePlayer]
  const goalRow = activePlayer === 'p1' ? 0 : 7

  const validMoves = getValidMoves(grid, myMascot, activePlayer, { silverquillImmunity })
  if (validMoves.length === 0) return null

  const currentDist = Math.abs(myMascot.row - goalRow)
  let bestMove = validMoves[0]
  let bestScore = -Infinity

  for (const move of validMoves) {
    const chain = resolveChain(grid, { row: move.row, col: move.col }, activePlayer, silverquillImmunity)
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
  const { activePlayer, grid, mascots, hands, playsThisTurn = { p1: 0, p2: 0 } } = state
  const hand = hands[activePlayer]
  const discardCost = playsThisTurn[activePlayer] || 0
  // Need 1 card to play + discardCost cards to discard
  if (hand.length < 1 + discardCost) return null
  // AI won't play if cost is too high relative to hand size (keep at least 2 cards)
  if (discardCost > 0 && hand.length < 3 + discardCost) return null

  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const myMascot = mascots[activePlayer]
  const oppMascot = mascots[opponent]
  const forwardDir = activePlayer === 'p1' ? -1 : 1

  let bestPlay = null
  let bestScore = 0.5 // Must beat "doing nothing" threshold

  for (let cardIndex = 0; cardIndex < hand.length; cardIndex++) {
    const card = hand[cardIndex]

    // For college cards, AI picks the better color
    const colorsToTry = card.college
      ? card.collegeColors.map((c, i) => ({ color: c, playMode: i === 0 ? 'color1' : 'color2' }))
      : [{ color: card.color, playMode: undefined }]

    for (const { color, playMode } of colorsToTry) {
      for (let row = 0; row < ROWS; row++) {
        for (let col = 0; col < COLS; col++) {
          let score = 0

          // Red ahead of me = speed lane (but NOT if a wall is in front of it)
          if (color === 'red') {
            if (col === myMascot.col && ((activePlayer === 'p1' && row < myMascot.row) || (activePlayer === 'p2' && row > myMascot.row))) {
              // Check if the tile red would push INTO is blocked
              const pushRow = row + forwardDir
              const pushBlocked = pushRow < 0 || pushRow >= ROWS ||
                (grid[pushRow]?.[col]?.color === 'green')
              if (pushBlocked) {
                score -= 2 // Red into a wall is useless
              } else {
                score += 4
                if (row === myMascot.row + forwardDir) score += 3
              }
            }
          }

          // Green blocking opponent
          if (color === 'green') {
            const oppForward = oppMascot.row + (opponent === 'p1' ? -1 : 1)
            if (row === oppForward && col === oppMascot.col) score += 4
            if (col === oppMascot.col) score += 1
          }

          // Black in opponent's path
          if (color === 'black') {
            const oppForward = oppMascot.row + (opponent === 'p1' ? -1 : 1)
            if (row === oppForward && col === oppMascot.col) score += 3
          }

          // White ahead of me = bonus move
          if (color === 'white') {
            if ((activePlayer === 'p1' && row < myMascot.row) || (activePlayer === 'p2' && row > myMascot.row)) {
              if (col === myMascot.col) score += 3
            }
          }

          // Blue ahead = draw cards
          if (color === 'blue') {
            if (col === myMascot.col && ((activePlayer === 'p1' && row < myMascot.row) || (activePlayer === 'p2' && row > myMascot.row))) {
              score += 2
            }
          }

          // Overwriting opponent's helpful tiles
          const existing = grid[row][col]
          if (existing.color === 'red' && col === oppMascot.col) score += 2

          score += jitter()
          if (score > bestScore) {
            bestScore = score
            bestPlay = { cardIndex, row, col, playMode }
          }
        }
      }
    }
  }

  // Add discard indices if there's a cost
  if (bestPlay && discardCost > 0) {
    const discardIndices = []
    for (let i = hand.length - 1; i >= 0 && discardIndices.length < discardCost; i--) {
      if (i !== bestPlay.cardIndex) discardIndices.push(i)
    }
    bestPlay.discardIndices = discardIndices
  }

  return bestPlay
}

// AI decides whether to use ability (simple heuristics)
export function shouldUseAbility(state, player) {
  const ability = state.mascotAbilities[player]
  if (!ability || state.abilityUsed[player]) return null

  const mascotPos = state.mascots[player]
  const opponent = player === 'p1' ? 'p2' : 'p1'
  const oppMascot = state.mascots[opponent]
  const grid = state.grid
  const forwardDir = player === 'p1' ? -1 : 1

  switch (ability) {
    case 'silverquill': {
      // Use if facing a wall or dangerous tile ahead
      const forwardRow = mascotPos.row + forwardDir
      if (forwardRow >= 0 && forwardRow < ROWS) {
        const forwardTile = grid[forwardRow][mascotPos.col]
        if (forwardTile.color === 'green' || forwardTile.color === 'black') {
          return { type: 'USE_ABILITY', payload: { player, params: {} } }
        }
      }
      return null
    }
    case 'prismari': {
      // Use if in a bad column (edge) and want to recenter
      if (mascotPos.col !== 1) {
        const direction = mascotPos.col === 0 ? 'right' : 'left'
        return { type: 'USE_ABILITY', payload: { player, params: { direction } } }
      }
      return null
    }
    case 'witherbloom': {
      // Use if opponent has good terrain nearby
      let oppTerrainCount = 0
      for (let r = mascotPos.row - 1; r <= mascotPos.row + 1; r++) {
        for (let c = mascotPos.col - 1; c <= mascotPos.col + 1; c++) {
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            const tile = grid[r][c]
            if (tile.color === 'red' || tile.color === 'green') oppTerrainCount++
          }
        }
      }
      if (oppTerrainCount >= 2) {
        return { type: 'USE_ABILITY', payload: { player, params: {} } }
      }
      return null
    }
    case 'lorehold': {
      // Use if there are face-down or stacked tiles nearby
      let targets = 0
      for (let r = mascotPos.row - 1; r <= mascotPos.row + 1; r++) {
        for (let c = mascotPos.col - 1; c <= mascotPos.col + 1; c++) {
          if (r >= 0 && r < ROWS && c >= 0 && c < COLS) {
            const tile = grid[r][c]
            if (tile.faceDown || (tile.stack && tile.stack.length > 0)) targets++
          }
        }
      }
      if (targets > 0) {
        return { type: 'USE_ABILITY', payload: { player, params: {} } }
      }
      return null
    }
    case 'quandrix': {
      // Use if there's a beneficial swap possible (e.g., move a wall in front of opponent)
      // Simple: just skip for now, too complex for basic AI
      return null
    }
    default:
      return null
  }
}
