import { motion } from 'framer-motion'

export default function PassScreen({ nextPlayer, onReady }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onReady}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'var(--bg-dark)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 90,
        cursor: 'pointer',
      }}
    >
      <h2 style={{
        fontFamily: 'Cinzel, serif',
        fontSize: '32px',
        color: nextPlayer === 'p1' ? '#4ade80' : '#a78bfa',
        marginBottom: '16px',
      }}>
        {nextPlayer === 'p1' ? "Player 1's" : "Player 2's"} Turn
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '16px' }}>
        Click anywhere to begin
      </p>
    </motion.div>
  )
}
