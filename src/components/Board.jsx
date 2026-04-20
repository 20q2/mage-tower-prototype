import Tile from './Tile'
import '../styles/board.css'
import { ROWS, COLS } from '../engine/constants'

export default function Board({ grid, mascots, validMoves, onTileClick, onDropCard, canDropCards }) {
  const validMoveSet = new Set((validMoves || []).map((m) => `${m.row},${m.col}`))

  function getMascotAt(row, col) {
    if (mascots.p1.row === row && mascots.p1.col === col) return 'p1'
    if (mascots.p2.row === row && mascots.p2.col === col) return 'p2'
    return null
  }

  const tiles = []
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      tiles.push(
        <Tile
          key={`${row}-${col}`}
          tile={grid[row][col]}
          row={row}
          col={col}
          mascotHere={getMascotAt(row, col)}
          onTileClick={onTileClick}
          onDrop={onDropCard}
          canDrop={canDropCards}
          isValidMove={validMoveSet.has(`${row},${col}`)}
          isMiddleLane={col === 1}
        />
      )
    }
  }

  return (
    <div className="board-wrapper">
      <div className="board-goal board-goal--p2">P2 GOAL</div>
      <div className="board-grid">
        {tiles}
      </div>
      <div className="board-goal board-goal--p1">P1 GOAL</div>
    </div>
  )
}
