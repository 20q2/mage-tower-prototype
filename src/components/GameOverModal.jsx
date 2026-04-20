import { motion } from 'framer-motion'

export default function GameOverModal({ winner, turnCount, onRematch, onMenu }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <motion.div
        initial={{ scale: 0.5, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        style={{
          background: 'var(--bg-medium)',
          borderRadius: '16px',
          padding: '48px',
          textAlign: 'center',
          border: '3px solid var(--accent-gold)',
          maxWidth: '400px',
        }}
      >
        <h2 style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '28px',
          color: winner === 'p1' ? '#4ade80' : '#a78bfa',
          marginBottom: '8px',
        }}>
          {winner === 'p1' ? 'Player 1' : 'Player 2'} Wins!
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>
          Victory in {turnCount} turns
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={onRematch}
            style={{
              background: 'var(--accent-gold)',
              color: 'var(--bg-dark)',
              padding: '12px 24px',
              borderRadius: 'var(--radius)',
              fontWeight: 700,
              fontSize: '15px',
            }}
          >
            Rematch
          </button>
          <button
            onClick={onMenu}
            style={{
              background: 'var(--bg-light)',
              color: 'var(--text-primary)',
              padding: '12px 24px',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '15px',
              border: '2px solid var(--text-muted)',
            }}
          >
            Main Menu
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
