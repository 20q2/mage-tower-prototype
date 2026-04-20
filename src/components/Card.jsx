import { motion } from 'framer-motion'
import { getScryfallImageUrl } from '../utils/scryfall'
import { useState } from 'react'

const COLOR_PIPS = {
  white: '#f5f0e0',
  blue: '#3b82f6',
  black: '#2d2040',
  red: '#ef4444',
  green: '#22c55e',
  colorless: '#9ca3af',
}

export default function Card({ card, index, isSelected, onSelect, draggable }) {
  const [imgFailed, setImgFailed] = useState(false)
  const imageUrl = getScryfallImageUrl(card.scryfallName)
  const colorClass = card.college ? 'gold' : card.color

  function handleDragStart(e) {
    e.dataTransfer.setData('text/plain', String(index))
    e.dataTransfer.effectAllowed = 'move'
  }

  return (
    <motion.div
      className={[
        'card',
        `card--${colorClass}`,
        isSelected && 'card--selected',
        draggable && 'card--draggable',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect?.(index)}
      draggable={draggable}
      onDragStart={handleDragStart}
      whileHover={{ y: -16, scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 30 }}
      animate={{
        opacity: 1,
        y: isSelected ? -20 : 0,
      }}
      transition={{ delay: index * 0.04 }}
    >
      {!imgFailed ? (
        <div
          className="card__art"
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
        <div className="card__art card__art--fallback" />
      )}

      {!card.college && (
        <div
          className="card__color-pip"
          style={{ background: COLOR_PIPS[card.color] || COLOR_PIPS.colorless }}
        />
      )}

      {card.college && <div className="card__college">{card.college}</div>}
      <div className="card__name">{card.name}</div>
    </motion.div>
  )
}
