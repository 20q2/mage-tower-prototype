import { ROWS, COLS, CHAIN_CAP, P1_GOAL_ROW, P2_GOAL_ROW } from './constants'

export function isPassable(tile) {
  return tile.color !== 'green'
}

export function resolveTile(grid, pos, movingPlayer, silverquillImmunity, extras = {}) {
  const tile = grid[pos.row][pos.col]
  const noEffect = { newPos: { ...pos }, chain: false }

  if (silverquillImmunity === movingPlayer) {
    return noEffect
  }

  const forwardDir = movingPlayer === 'p1' ? -1 : 1
  const backwardDir = -forwardDir

  // Prismari: doubled movement in boosted row
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
      const lateralOptions = []
      if (pos.col > 0 && isPassable(grid[pos.row][pos.col - 1])) {
        lateralOptions.push({ row: pos.row, col: pos.col - 1 })
      }
      if (pos.col < COLS - 1 && isPassable(grid[pos.row][pos.col + 1])) {
        lateralOptions.push({ row: pos.row, col: pos.col + 1 })
      }
      return { newPos: { ...pos }, lateralOptions, chain: false }
    }
    case 'blue': {
      // Quandrix portal: if portals are linked, teleport to another blue tile
      const portals = extras.portalLinks || []
      if (portals.length >= 2) {
        const currentIdx = portals.findIndex(
          (p) => p.row === pos.row && p.col === pos.col
        )
        if (currentIdx !== -1) {
          const nextIdx = (currentIdx + 1) % portals.length
          const dest = portals[nextIdx]
          return { newPos: { row: dest.row, col: dest.col }, chain: true, portal: true }
        }
      }
      return noEffect
    }
    case 'colorless':
    default:
      return noEffect
  }
}

export function resolveChain(grid, startPos, movingPlayer, silverquillImmunity, extras = {}) {
  const steps = [{ ...startPos }]
  let currentPos = { ...startPos }
  let depth = 0

  while (depth < CHAIN_CAP) {
    const result = resolveTile(grid, currentPos, movingPlayer, silverquillImmunity, extras)
    if (!result.chain) {
      return { finalPos: currentPos, steps, lateralOptions: result.lateralOptions || null }
    }
    currentPos = result.newPos
    steps.push({ ...currentPos })
    depth++
  }

  return { finalPos: currentPos, steps, lateralOptions: null }
}

export function getValidMoves(grid, mascotPos, activePlayer) {
  const moves = []
  const forwardDir = activePlayer === 'p1' ? -1 : 1

  const forward = { row: mascotPos.row + forwardDir, col: mascotPos.col }
  const left = { row: mascotPos.row, col: mascotPos.col - 1 }
  const right = { row: mascotPos.row, col: mascotPos.col + 1 }

  const candidates = [
    { ...forward, direction: 'forward' },
    { ...left, direction: 'left' },
    { ...right, direction: 'right' },
  ]

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

export function checkWinCondition(mascots) {
  if (mascots.p2.row === P2_GOAL_ROW) return 'p1'
  if (mascots.p1.row === P1_GOAL_ROW) return 'p2'
  return null
}
