import { motion } from 'framer-motion'
import { PHASES } from '../engine/constants'

const PHASE_DISPLAY = {
  [PHASES.DRAW]: { label: 'Draw', color: '#3b82f6' },
  [PHASES.PLAY]: { label: 'Play Cards', color: '#a855f7' },
  [PHASES.MOVE]: { label: 'Move Opponent', color: '#ef4444' },
  [PHASES.RESOLVE]: { label: 'Resolving...', color: '#22c55e' },
  [PHASES.CHECK_WIN]: { label: 'Checking...', color: '#f59e0b' },
}

export default function PhaseIndicator({ phase, activePlayer, turnCount }) {
  const display = PHASE_DISPLAY[phase] || { label: phase, color: '#888' }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '12px 24px',
      background: 'var(--bg-medium)',
      borderRadius: 'var(--radius-lg)',
      marginBottom: '12px',
    }}>
      <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
        Turn {turnCount}
      </span>
      <span style={{
        fontFamily: 'Cinzel, serif',
        fontWeight: 700,
        fontSize: '16px',
        color: activePlayer === 'p1' ? '#4ade80' : '#a78bfa',
      }}>
        {activePlayer === 'p1' ? 'Player 1' : 'Player 2'}
      </span>
      <motion.span
        key={phase}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        style={{
          background: display.color,
          color: 'white',
          padding: '6px 14px',
          borderRadius: 'var(--radius)',
          fontWeight: 700,
          fontSize: '13px',
          textTransform: 'uppercase',
        }}
      >
        {display.label}
      </motion.span>
    </div>
  )
}
