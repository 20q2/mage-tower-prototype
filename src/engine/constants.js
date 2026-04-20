export const ROWS = 6
export const COLS = 3
export const CHAIN_CAP = 10
export const ACTIONS_PER_TURN = 3

export const COLORS = ['white', 'blue', 'black', 'red', 'green', 'colorless']

export const COLLEGES = {
  witherbloom: { colors: ['green', 'black'], name: 'Witherbloom' },
  silverquill: { colors: ['white', 'black'], name: 'Silverquill' },
  lorehold: { colors: ['white', 'red'], name: 'Lorehold' },
  quandrix: { colors: ['green', 'blue'], name: 'Quandrix' },
  prismari: { colors: ['red', 'blue'], name: 'Prismari' },
}

// Alternating turns: Draw → Act (3 actions: play cards or move) → Check win → Next player
export const PHASES = {
  DRAW: 'draw',
  ACT: 'act',       // Spend actions: play a card OR move 1 step
  CHECK_WIN: 'checkWin',
}

export const P1_GOAL_ROW = 5
export const P2_GOAL_ROW = 0
