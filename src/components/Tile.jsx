import { motion } from 'framer-motion'
import { getScryfallImageUrl } from '../utils/scryfall'
import Mascot from './Mascot'
import { P1_GOAL_ROW, P2_GOAL_ROW } from '../engine/constants'
import { useState } from 'react'

const EFFECT_LABELS = {
  white: 'Slide L/R',
  red: '+1 Forward',
  black: '-1 Back',
  green: 'WALL',
  blue: 'Draw +1',
  colorless: '',
  empty: '',
}

export default function Tile({ tile, row, col, mascotHere, onTileClick, isValidMove, isMiddleLane }) {
  const [imgFailed, setImgFailed] = useState(false)

  const isEmpty = tile.color === 'empty' || !tile.card
  const isCollege = tile.card?.college
  const isGoalP1 = row === P1_GOAL_ROW
  const isGoalP2 = row === P2_GOAL_ROW

  // Art: college cards show their actual art, mono-color show the basic land
  const artName = isCollege
    ? tile.card.scryfallName
    : tile.card?.displayName || tile.card?.scryfallName || null
  const imageUrl = artName ? getScryfallImageUrl(artName) : null

  const colorClass = isEmpty ? 'empty' : (isCollege ? 'gold' : tile.color)

  // Label: college name for college cards, effect for mono-color
  const effectLabel = isEmpty
    ? ''
    : isCollege
      ? tile.card.college.charAt(0).toUpperCase() + tile.card.college.slice(1)
      : EFFECT_LABELS[tile.color]

  // Display name: college cards show card name, mono-color show land name
  const displayName = isEmpty
    ? ''
    : isCollege
      ? tile.card.name
      : tile.card?.displayName || ''

  return (
    <motion.div
      className={[
        'tile',
        `tile--${colorClass}`,
        isGoalP1 && 'tile--goal-p1',
        isGoalP2 && 'tile--goal-p2',
        isValidMove && 'tile--valid-move',
        mascotHere && 'tile--has-mascot',
        isMiddleLane && 'tile--middle-lane',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onTileClick?.(row, col)}
      whileHover={isEmpty ? {} : { y: -3, scale: 1.03 }}
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

      {/* Card/land name at top */}
      {displayName && <div className="tile__card-name">{displayName}</div>}

      {/* Effect label at bottom */}
      {effectLabel && <div className="tile__effect-label">{effectLabel}</div>}

      {/* Mascot token */}
      {mascotHere && <Mascot player={mascotHere} />}
    </motion.div>
  )
}
