import { useState } from 'react'
import { motion } from 'framer-motion'
import { DECKS } from '../engine/decks'

const deckKeys = Object.keys(DECKS)

export default function MainMenu({ onStartGame }) {
  const [mode, setMode] = useState('ai')
  const [p1Deck, setP1Deck] = useState(deckKeys[0])
  const [p2Deck, setP2Deck] = useState(deckKeys[1])

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px',
    }}>
      <motion.h1
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          fontFamily: 'Cinzel, serif',
          fontSize: '48px',
          color: 'var(--accent-gold)',
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        Mage Tower
      </motion.h1>
      <p style={{
        color: 'var(--text-secondary)',
        marginBottom: '40px',
        fontSize: '16px',
        textAlign: 'center',
      }}>
        Strixhaven Tactical Card Game
      </p>

      {/* Mode Select */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '12px', textAlign: 'center' }}>
          Game Mode
        </h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { key: 'ai', label: 'vs AI' },
            { key: 'hotseat', label: 'Hot Seat' },
          ].map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              style={{
                padding: '12px 32px',
                borderRadius: 'var(--radius)',
                fontWeight: 700,
                fontSize: '15px',
                background: mode === m.key ? 'var(--accent-gold)' : 'var(--bg-light)',
                color: mode === m.key ? 'var(--bg-dark)' : 'var(--text-primary)',
                border: mode === m.key ? 'none' : '2px solid var(--text-muted)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deck Select */}
      <div style={{ display: 'flex', gap: '32px', marginBottom: '40px' }}>
        <DeckPicker
          label={mode === 'ai' ? 'Your Deck' : 'Player 1 Deck'}
          selected={p1Deck}
          onChange={setP1Deck}
        />
        {mode === 'hotseat' && (
          <DeckPicker label="Player 2 Deck" selected={p2Deck} onChange={setP2Deck} />
        )}
      </div>

      {/* Start Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          const aiDeck = mode === 'ai'
            ? deckKeys[Math.floor(Math.random() * deckKeys.length)]
            : p2Deck
          onStartGame({ mode, p1Deck, p2Deck: aiDeck })
        }}
        style={{
          background: 'linear-gradient(135deg, var(--accent-gold), #b8860b)',
          color: 'var(--bg-dark)',
          padding: '16px 48px',
          borderRadius: 'var(--radius-lg)',
          fontFamily: 'Cinzel, serif',
          fontWeight: 900,
          fontSize: '20px',
          letterSpacing: '1px',
        }}
      >
        Start Game
      </motion.button>
    </div>
  )
}

function DeckPicker({ label, selected, onChange }) {
  return (
    <div>
      <h3 style={{
        color: 'var(--text-primary)',
        marginBottom: '12px',
        fontSize: '14px',
        textAlign: 'center',
      }}>
        {label}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {deckKeys.map((key) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            style={{
              padding: '12px 20px',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '13px',
              textAlign: 'left',
              background: selected === key ? 'var(--bg-light)' : 'var(--bg-medium)',
              color: 'var(--text-primary)',
              border: selected === key
                ? '2px solid var(--accent-gold)'
                : '2px solid transparent',
              minWidth: '200px',
            }}
          >
            <div style={{ fontWeight: 700 }}>{DECKS[key].name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              {DECKS[key].description}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
