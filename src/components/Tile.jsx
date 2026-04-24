import { forwardRef, useState } from 'react'
import { motion } from 'framer-motion'
import { getScryfallImageUrl } from '../utils/scryfall'
import { P1_GOAL_ROW, P2_GOAL_ROW } from '../engine/constants'

const EFFECT_LABELS = {
  white: 'Slide L/R',
  red: '+1 Forward',
  black: '-1 Back',
  green: 'WALL',
  blue: 'Draw 1',
  colorless: '',
  empty: '',
  facedown: '',
}

const Tile = forwardRef(function Tile({ tile, row, col, onTileClick, onDrop, isValidMove, isMiddleLane, canDrop, hasMascot }, ref) {
  const [imgFailed, setImgFailed] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const isFaceDown = tile.faceDown
  const isEmpty = !isFaceDown && (tile.color === 'empty' || !tile.card)
  const isGoalP1 = row === P1_GOAL_ROW
  const isGoalP2 = row === P2_GOAL_ROW
  const stackSize = tile.stack ? tile.stack.length : 0

  let artName = null
  let imageUrl = null
  let colorClass = 'empty'
  let effectLabel = ''
  let displayName = ''

  if (isFaceDown) {
    colorClass = 'facedown'
    effectLabel = ''
    displayName = 'Face Down'
  } else if (!isEmpty) {
    artName = tile.card?.displayName || tile.card?.scryfallName || null
    imageUrl = artName ? getScryfallImageUrl(artName) : null
    colorClass = tile.color
    effectLabel = EFFECT_LABELS[tile.color] || ''
    displayName = tile.card?.displayName || ''
  }

  function handleDragOver(e) {
    if (!canDrop) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(true)
  }

  function handleDragLeave() {
    setDragOver(false)
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    if (!canDrop) return
    const cardIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (!isNaN(cardIndex)) {
      onDrop?.(cardIndex, row, col)
    }
  }

  return (
    <motion.div
      ref={ref}
      className={[
        'tile',
        `tile--${colorClass}`,
        isGoalP1 && 'tile--goal-p1',
        isGoalP2 && 'tile--goal-p2',
        isValidMove && 'tile--valid-move',
        hasMascot && 'tile--has-mascot',
        isMiddleLane && 'tile--middle-lane',
        dragOver && 'tile--drag-over',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onTileClick?.(row, col)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      whileHover={isEmpty && !dragOver ? {} : { y: -3, scale: 1.03 }}
      whileTap={isEmpty ? {} : { scale: 0.97 }}
    >
      {isFaceDown ? (
        <div className="tile__art tile__art--facedown" />
      ) : imageUrl && !imgFailed ? (
        <div
          className="tile__art"
          style={{ backgroundImage: `url(${imageUrl})` }}
        >
          <img
            src={imageUrl}
            alt=""
            style={{ display: 'none' }}
            onError={() => setImgFailed(true)}
          />
        </div>
      ) : (
        <div className="tile__art tile__art--fallback" />
      )}

      {displayName && <div className="tile__card-name">{displayName}</div>}
      {effectLabel && <div className="tile__effect-label">{effectLabel}</div>}
      {stackSize > 0 && (
        <div className="tile__stack-badge">{stackSize}</div>
      )}
    </motion.div>
  )
})

export default Tile
