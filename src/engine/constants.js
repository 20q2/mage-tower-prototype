export const ROWS = 8
export const COLS = 3
export const CHAIN_CAP = 10

export const COLORS = ['white', 'blue', 'black', 'red', 'green', 'colorless']

export const COLLEGES = {
  witherbloom: { colors: ['green', 'black'], name: 'Witherbloom' },
  silverquill: { colors: ['white', 'black'], name: 'Silverquill' },
  lorehold: { colors: ['white', 'red'], name: 'Lorehold' },
  quandrix: { colors: ['green', 'blue'], name: 'Quandrix' },
  prismari: { colors: ['red', 'blue'], name: 'Prismari' },
}

// Turn flow:
// 1. Both draw 1 card
// 2. Play phase: active player plays or passes → opponent plays or passes → repeat until pass
// 3. Move phase: both choose 1 step (forward/left/right) simultaneously, chains resolve
// 4. Check win, alternate active player
export const PHASES = {
  DRAW: 'draw',
  PLAY: 'play',         // Alternating card plays until someone passes
  MOVE: 'move',         // Both pick a move simultaneously
  RESOLVE: 'resolve',   // Both moves execute
  CHECK_WIN: 'checkWin',
}

export const P1_GOAL_ROW = 7
export const P2_GOAL_ROW = 0
