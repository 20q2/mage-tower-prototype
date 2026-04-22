import { ROWS, COLS, CHAIN_CAP, P1_GOAL_ROW, P2_GOAL_ROW } from './constants'

export function isPassable(tile) {
  return tile.color !== 'green'
}

/**
 * Resolve what happens when a mascot enters a tile.
 * Returns: { newPos, chain, draw, whiteBonus, lateralOptions? }
 *   chain: true if mascot is pushed to newPos and should resolve again
 *   draw: true if player draws a card
 *   whiteBonus: true if player gets a free extra step in any direction
 */
export function resolveTile(grid, pos, movingPlayer, silverquillImmunity, extras = {}) {
  const tile = grid[pos.row][pos.col]
  const noEffect = { newPos: { ...pos }, chain: false }

  if (silverquillImmunity === movingPlayer) {
    return noEffect
  }

  const forwardDir = movingPlayer === 'p1' ? -1 : 1
  const backwardDir = -forwardDir

  const prismariMultiplier =
    extras.prismariBoostRow != null && pos.row === extras.prismariBoostRow ? 2 : 1

  switch (tile.color) {
    case 'red': {
      const steps = 1 * prismariMultiplier
      const newRow = pos.row + forwardDir * steps
      const clampedRow = Math.max(0, Math.min(ROWS - 1, newRow))
      if (clampedRow === pos.row) return noEffect
      return { newPos: { row: clampedRow, col: pos.col }, chain: true }
    }
    case 'black': {
      const steps = 1 * prismariMultiplier
      const newRow = pos.row + backwardDir * steps
      const clampedRow = Math.max(0, Math.min(ROWS - 1, newRow))
      if (clampedRow === pos.row) return noEffect
      return { newPos: { row: clampedRow, col: pos.col }, chain: true }
    }
    case 'white': {
      // White = bonus step. Player gets a free move in any direction (F/B/L/R).
      // We return whiteBonus flag; the game state handles the extra move.
      return { newPos: { ...pos }, chain: false, whiteBonus: true }
    }
    case 'blue': {
      const portals = extras.portalLinks || []
      if (portals.length >= 2) {
        const currentIdx = portals.findIndex(p => p.row === pos.row && p.col === pos.col)
        if (currentIdx !== -1) {
          const nextIdx = (currentIdx + 1) % portals.length
          const dest = portals[nextIdx]
          return { newPos: { row: dest.row, col: dest.col }, chain: true, portal: true, draw: true }
        }
      }
      return { ...noEffect, draw: true }
    }
    case 'colorless':
    default:
      return noEffect
  }
}

/**
 * Resolve a chain of tile effects starting from a position.
 * Returns: { finalPos, steps, drawCount, whiteBonus }
 */
export function resolveChain(grid, startPos, movingPlayer, silverquillImmunity, extras = {}) {
  const steps = [{ ...startPos }]
  let currentPos = { ...startPos }
  let depth = 0
  let drawCount = 0
  let whiteBonus = false

  while (depth < CHAIN_CAP) {
    const result = resolveTile(grid, currentPos, movingPlayer, silverquillImmunity, extras)
    if (result.draw) drawCount++
    if (result.whiteBonus) whiteBonus = true
    if (!result.chain) {
      return { finalPos: currentPos, steps, drawCount, whiteBonus }
    }
    currentPos = result.newPos
    steps.push({ ...currentPos })
    depth++
  }

  return { finalPos: currentPos, steps, drawCount, whiteBonus }
}

/**
 * Get valid moves for a mascot. Standard move = forward, left, or right.
 * If bonus is true (white tile), also allows backward.
 */
export function getValidMoves(grid, mascotPos, activePlayer, { bonus = false } = {}) {
  const moves = []
  const forwardDir = activePlayer === 'p1' ? -1 : 1

  const candidates = [
    { row: mascotPos.row + forwardDir, col: mascotPos.col, direction: 'forward' },
    { row: mascotPos.row, col: mascotPos.col - 1, direction: 'left' },
    { row: mascotPos.row, col: mascotPos.col + 1, direction: 'right' },
  ]

  if (bonus) {
    candidates.push({ row: mascotPos.row - forwardDir, col: mascotPos.col, direction: 'backward' })
  }

  for (const candidate of candidates) {
    if (
      candidate.row >= 0 && candidate.row < ROWS &&
      candidate.col >= 0 && candidate.col < COLS &&
      isPassable(grid[candidate.row][candidate.col])
    ) {
      moves.push(candidate)
    }
  }

  return moves
}

export function checkWinCondition(mascots, activePlayer) {
  if (activePlayer) {
    if (activePlayer === 'p1' && mascots.p1.row === P2_GOAL_ROW) return 'p1'
    if (activePlayer === 'p2' && mascots.p2.row === P1_GOAL_ROW) return 'p2'
    return null
  }
  if (mascots.p1.row === P2_GOAL_ROW) return 'p1'
  if (mascots.p2.row === P1_GOAL_ROW) return 'p2'
  return null
}
