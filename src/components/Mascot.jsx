import { motion } from 'framer-motion'

export default function Mascot({ player }) {
  return (
    <motion.div
      className={`mascot mascot--${player}`}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
    >
      {player === 'p1' ? 'P1' : 'P2'}
    </motion.div>
  )
}
