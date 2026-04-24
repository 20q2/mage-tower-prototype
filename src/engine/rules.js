import { ROWS, COLS, CHAIN_CAP, P1_GOAL_ROW, P2_GOAL_ROW } from './constants'

export function isPassable(tile, silverquillImmunity, movingPlayer) {
  // Face-down tiles are passable
  if (tile.faceDown) return true
  // Silverquill immunity lets you walk through green walls
  if (silverquillImmunity && silverquillImmunity === movingPlayer && tile.color === 'green') return true
  return tile.color !== 'green'
}

/**
 * Resolve what happens when a mascot enters a tile.
 * Returns: { newPos, chain, draw, whiteBonus }
 */
export function resolveTile(grid, pos, movingPlayer, silverquillImmunity) {
  const tile = grid[pos.row][pos.col]
  const noEffect = { newPos: { ...pos }, chain: false }

  // Face-down tiles have no terrain effect
  if (tile.faceDown) return noEffect

  if (silverquillImmunity === movingPlayer) {
    return noEffect
  }

  const forwardDir = movingPlayer === 'p1' ? -1 : 1
  const backwardDir = -forwardDir

  switch (tile.color) {
    case 'red': {
      const newRow = pos.row + forwardDir
      const clampedRow = Math.max(0, Math.min(ROWS - 1, newRow))
      if (clampedRow === pos.row) return noEffect
      return { newPos: { row: clampedRow, col: pos.col }, chain: true }
    }
    case 'black': {
      const newRow = pos.row + backwardDir
      const clampedRow = Math.max(0, Math.min(ROWS - 1, newRow))
      if (clampedRow === pos.row) return noEffect
      return { newPos: { row: clampedRow, col: pos.col }, chain: true }
    }
    case 'white': {
      return { newPos: { ...pos }, chain: false, whiteBonus: true }
    }
    case 'blue': {
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
export function resolveChain(grid, startPos, movingPlayer, silverquillImmunity) {
  const steps = [{ ...startPos }]
  let currentPos = { ...startPos }
  let depth = 0
  let drawCount = 0
  let whiteBonus = false

  while (depth < CHAIN_CAP) {
    const result = resolveTile(grid, currentPos, movingPlayer, silverquillImmunity)
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
export function getValidMoves(grid, mascotPos, activePlayer, { bonus = false, silverquillImmunity = null } = {}) {
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
      isPassable(grid[candidate.row][candidate.col], silverquillImmunity, activePlayer)
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
