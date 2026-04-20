export default function MoveControls({ validMoves, onMove }) {
  if (!validMoves || validMoves.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '12px' }}>
        No valid moves available.
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', padding: '8px' }}>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '8px', fontSize: '13px' }}>
        Click a highlighted tile to move opponent's mascot, or use buttons:
      </p>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
        {validMoves.map((move) => (
          <button
            key={`${move.row}-${move.col}`}
            onClick={() => onMove(move)}
            style={{
              background: 'var(--bg-light)',
              color: 'var(--text-primary)',
              padding: '8px 16px',
              borderRadius: 'var(--radius)',
              fontWeight: 600,
              fontSize: '13px',
              border: '2px solid var(--accent-gold)',
            }}
          >
            {move.direction.charAt(0).toUpperCase() + move.direction.slice(1)}
          </button>
        ))}
      </div>
    </div>
  )
}
