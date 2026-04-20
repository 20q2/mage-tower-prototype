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
}

export default function Tile({ tile, row, col, mascotHere, onTileClick, isValidMove }) {
  const [imgFailed, setImgFailed] = useState(false)
  const imageUrl = tile.card ? getScryfallImageUrl(tile.card.scryfallName) : null
  const colorClass = tile.card?.college ? 'gold' : tile.color
  const isGoalP1 = row === P1_GOAL_ROW
  const isGoalP2 = row === P2_GOAL_ROW
  const effectLabel = tile.card?.college
    ? tile.card.college.charAt(0).toUpperCase() + tile.card.college.slice(1)
    : EFFECT_LABELS[tile.color]

  return (
    <motion.div
      className={[
        'tile',
        `tile--${colorClass}`,
        isGoalP1 && 'tile--goal-p1',
        isGoalP2 && 'tile--goal-p2',
        isValidMove && 'tile--valid-move',
        mascotHere && 'tile--has-mascot',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onTileClick?.(row, col)}
      whileHover={{ y: -3, scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
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

      {/* Card name at top */}
      {tile.card && tile.card.name && (
        <div className="tile__card-name">{tile.card.name}</div>
      )}

      {/* Effect label at bottom */}
      {effectLabel && <div className="tile__effect-label">{effectLabel}</div>}

      {/* Mascot token */}
      {mascotHere && <Mascot player={mascotHere} />}
    </motion.div>
  )
}
