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
}

const Tile = forwardRef(function Tile({ tile, row, col, onTileClick, onDrop, isValidMove, isMiddleLane, canDrop, hasMascot }, ref) {
  const [imgFailed, setImgFailed] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const isEmpty = tile.color === 'empty' || !tile.card
  const isCollege = tile.card?.college
  const isGoalP1 = row === P1_GOAL_ROW
  const isGoalP2 = row === P2_GOAL_ROW

  const artName = isCollege
    ? tile.card.scryfallName
    : tile.card?.displayName || tile.card?.scryfallName || null
  const imageUrl = artName ? getScryfallImageUrl(artName) : null

  const colorClass = isEmpty ? 'empty' : (isCollege ? 'gold' : tile.color)

  const effectLabel = isEmpty
    ? ''
    : isCollege
      ? tile.card.college.charAt(0).toUpperCase() + tile.card.college.slice(1)
      : EFFECT_LABELS[tile.color]

  const displayName = isEmpty
    ? ''
    : isCollege
      ? tile.card.name
      : tile.card?.displayName || ''

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
      {imageUrl && !imgFailed ? (
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
    </motion.div>
  )
})

export default Tile
