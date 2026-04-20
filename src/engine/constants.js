export const ROWS = 6
export const COLS = 3
export const CHAIN_CAP = 10
export const MOVE_STEPS = 2

export const COLORS = ['white', 'blue', 'black', 'red', 'green', 'colorless']

export const COLLEGES = {
  witherbloom: { colors: ['green', 'black'], name: 'Witherbloom' },
  silverquill: { colors: ['white', 'black'], name: 'Silverquill' },
  lorehold: { colors: ['white', 'red'], name: 'Lorehold' },
  quandrix: { colors: ['green', 'blue'], name: 'Quandrix' },
  prismari: { colors: ['red', 'blue'], name: 'Prismari' },
}

// Alternating turns: Draw → Play 1 card → Move own mascot 2 steps → Resolve → Check win → Next player
export const PHASES = {
  DRAW: 'draw',
  PLAY: 'play',
  MOVE: 'move',
  RESOLVE: 'resolve',
  CHECK_WIN: 'checkWin',
}

export const P1_GOAL_ROW = 5
export const P2_GOAL_ROW = 0
