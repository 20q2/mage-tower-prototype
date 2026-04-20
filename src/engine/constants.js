export const ROWS = 6
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

// Turn flow: P1 draws → P1 plays terrain → P2 draws → P2 plays terrain → Both move → Resolve → Check win
export const PHASES = {
  P1_DRAW: 'p1_draw',
  P1_PLAY: 'p1_play',
  P2_DRAW: 'p2_draw',
  P2_PLAY: 'p2_play',
  MOVE: 'move',         // Both players choose moves (collected before resolving)
  RESOLVE: 'resolve',   // Both moves execute simultaneously
  CHECK_WIN: 'checkWin',
}

export const P1_GOAL_ROW = 5
export const P2_GOAL_ROW = 0
