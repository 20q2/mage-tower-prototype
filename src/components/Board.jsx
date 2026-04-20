import { useRef, useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import Tile from './Tile'
import '../styles/board.css'
import { ROWS, COLS } from '../engine/constants'

export default function Board({ grid, mascots, validMoves, onTileClick, onDropCard, canDropCards }) {
  const validMoveSet = new Set((validMoves || []).map((m) => `${m.row},${m.col}`))
  const gridRef = useRef(null)
  const tileRefs = useRef({})
  const [mascotPositions, setMascotPositions] = useState({ p1: null, p2: null })
  const [hasInitialized, setHasInitialized] = useState(false)

  const setTileRef = useCallback((row, col, el) => {
    if (el) tileRefs.current[`${row},${col}`] = el
  }, [])

  // Calculate mascot pixel positions relative to grid container
  const updatePositions = useCallback(() => {
    const gridEl = gridRef.current
    if (!gridEl) return

    const gridRect = gridEl.getBoundingClientRect()
    const positions = {}

    for (const player of ['p1', 'p2']) {
      const { row, col } = mascots[player]
      const tileEl = tileRefs.current[`${row},${col}`]
      if (tileEl) {
        const tileRect = tileEl.getBoundingClientRect()
        positions[player] = {
          x: tileRect.left - gridRect.left + tileRect.width / 2,
          y: tileRect.top - gridRect.top + tileRect.height / 2,
        }
      }
    }

    if (positions.p1 && positions.p2) {
      setMascotPositions(positions)
      if (!hasInitialized) setHasInitialized(true)
    }
  }, [mascots, hasInitialized])

  useEffect(() => {
    updatePositions()
    // Recalculate after images may have loaded
    const t1 = setTimeout(updatePositions, 50)
    const t2 = setTimeout(updatePositions, 200)
    window.addEventListener('resize', updatePositions)
    return () => {
      window.removeEventListener('resize', updatePositions)
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [updatePositions])

  const tiles = []
  for (let col = 0; col < COLS; col++) {
    for (let row = 0; row < ROWS; row++) {
      tiles.push(
        <Tile
          key={`${row}-${col}`}
          ref={(el) => setTileRef(row, col, el)}
          tile={grid[row][col]}
          row={row}
          col={col}
          onTileClick={onTileClick}
          onDrop={onDropCard}
          canDrop={canDropCards}
          isValidMove={validMoveSet.has(`${row},${col}`)}
          isMiddleLane={col === 1}
          hasMascot={
            (mascots.p1.row === row && mascots.p1.col === col) ||
            (mascots.p2.row === row && mascots.p2.col === col)
          }
        />
      )
    }
  }

  return (
    <div className="board-wrapper">
      <div className="board-goal board-goal--p2">P2 GOAL</div>
      <div className="board-grid" ref={gridRef} style={{ position: 'relative' }}>
        {tiles}

        {/* Mascot overlays — animate smoothly between tile positions */}
        {['p1', 'p2'].map((player) => {
          const pos = mascotPositions[player]
          if (!pos) return null
          return (
            <motion.div
              key={player}
              className={`mascot mascot--${player}`}
              // Use left/top for centering, animate x/y for movement
              initial={false}
              animate={{
                left: pos.x,
                top: pos.y,
              }}
              transition={
                hasInitialized
                  ? { type: 'spring', stiffness: 120, damping: 18, mass: 1.2 }
                  : { duration: 0 }
              }
              style={{
                position: 'absolute',
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              {player === 'p1' ? 'P1' : 'P2'}
            </motion.div>
          )
        })}
      </div>
      <div className="board-goal board-goal--p1">P1 GOAL</div>
    </div>
  )
}
