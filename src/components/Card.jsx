import { motion } from 'framer-motion'
import { getScryfallImageUrl } from '../utils/scryfall'
import { useState } from 'react'

export default function Card({ card, index, isSelected, onSelect }) {
  const [imgFailed, setImgFailed] = useState(false)
  const imageUrl = getScryfallImageUrl(card.scryfallName)
  const colorClass = card.college ? 'gold' : card.color

  return (
    <motion.div
      className={[
        'card',
        `card--${colorClass}`,
        isSelected && 'card--selected',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => onSelect?.(index)}
      whileHover={{ y: -8, scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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

      {card.college && <div className="card__college">{card.college}</div>}
      <div className="card__name">{card.name}</div>
    </motion.div>
  )
}
