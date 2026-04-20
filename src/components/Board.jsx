import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Tile from './Tile'
import '../styles/board.css'
import { ROWS, COLS } from '../engine/constants'

export default function Board({ grid, mascots, validMoves, onTileClick, onDropCard, canDropCards }) {
  const validMoveSet = new Set((validMoves || []).map((m) => `${m.row},${m.col}`))
  const gridRef = useRef(null)
  const tileRefs = useRef({})
  const [mascotPositions, setMascotPositions] = useState({ p1: null, p2: null })

  // Register tile DOM elements
  function setTileRef(row, col, el) {
    tileRefs.current[`${row},${col}`] = el
  }

  // Calculate mascot pixel positions relative to grid container
  useEffect(() => {
    function update() {
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
      setMascotPositions(positions)
    }

    update()

    // Recalculate on resize
    window.addEventListener('resize', update)
    // Also recalculate after a brief delay (images loading can shift layout)
    const t = setTimeout(update, 100)
    return () => {
      window.removeEventListener('resize', update)
      clearTimeout(t)
    }
  }, [mascots.p1.row, mascots.p1.col, mascots.p2.row, mascots.p2.col])

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

        {/* Mascots rendered as overlays — animate between positions */}
        {['p1', 'p2'].map((player) => {
          const pos = mascotPositions[player]
          if (!pos) return null
          return (
            <motion.div
              key={player}
              className={`mascot mascot--${player}`}
              animate={{ x: pos.x, y: pos.y }}
              transition={{
                type: 'spring',
                stiffness: 120,
                damping: 18,
                mass: 1.2,
              }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
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
