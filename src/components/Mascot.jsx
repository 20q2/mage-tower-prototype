import { motion } from 'framer-motion'

const MASCOT_SYMBOLS = { p1: 'P1', p2: 'P2' }

export default function Mascot({ player }) {
  return (
    <motion.div
      className={`mascot mascot--${player}`}
      layout
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
    >
      {MASCOT_SYMBOLS[player]}
    </motion.div>
  )
}
