import Tile from './Tile'
import '../styles/board.css'
import { ROWS, COLS } from '../engine/constants'

export default function Board({ grid, mascots, validMoves, onTileClick, placeTargets }) {
  const validMoveSet = new Set((validMoves || []).map((m) => `${m.row},${m.col}`))
  const placeTargetSet = new Set((placeTargets || []).map((p) => `${p.row},${p.col}`))

  function getMascotAt(row, col) {
    if (mascots.p1.row === row && mascots.p1.col === col) return 'p1'
    if (mascots.p2.row === row && mascots.p2.col === col) return 'p2'
    return null
  }

  return (
    <div className="board">
      {Array.from({ length: ROWS }, (_, row) =>
        Array.from({ length: COLS }, (_, col) => (
          <Tile
            key={`${row}-${col}`}
            tile={grid[row][col]}
            row={row}
            col={col}
            mascotHere={getMascotAt(row, col)}
            onTileClick={onTileClick}
            isValidMove={validMoveSet.has(`${row},${col}`)}
            isPlaceTarget={placeTargetSet.has(`${row},${col}`)}
          />
        ))
      )}
    </div>
  )
}
