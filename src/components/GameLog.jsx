import { useEffect, useRef } from 'react'

export default function GameLog({ entries }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [entries.length])

  return (
    <div style={{
      background: 'var(--bg-medium)',
      borderRadius: 'var(--radius-lg)',
      padding: '12px',
      height: '300px',
      overflowY: 'auto',
      fontSize: '12px',
      lineHeight: '1.6',
    }}>
      <h3 style={{ fontSize: '14px', marginBottom: '8px', color: 'var(--accent-gold)' }}>
        Game Log
      </h3>
      {entries.map((entry, i) => (
        <div key={i} style={{ color: 'var(--text-secondary)', marginBottom: '2px' }}>
          {entry}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
