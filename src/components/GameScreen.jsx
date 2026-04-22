import { useReducer, useCallback, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Board from './Board'
import PlayerHand from './PlayerHand'
import GameOverModal from './GameOverModal'
import PassScreen from './PassScreen'
import { createInitialState, gameReducer } from '../engine/gameState'
import { getValidMoves } from '../engine/rules'
import { chooseCardPlay, chooseMove } from '../engine/ai'
import { PHASES } from '../engine/constants'

const COLOR_NAMES = { white: 'White', blue: 'Blue', black: 'Black', red: 'Red', green: 'Green' }

export default function GameScreen({ p1Deck, p2Deck, mode, onExit }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(p1Deck, p2Deck)
  )

  const [selectedCardIndex, setSelectedCardIndex] = useState(null)
  const [collegeChoice, setCollegeChoice] = useState(null)
  const [showPassScreen, setShowPassScreen] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const logBottomRef = useRef(null)
  const aiActingRef = useRef(false)

  const {
    grid, mascots, hands, phase, activePlayer, playTurn, turnCount, winner,
    pendingMoves, pendingWhiteBonus, log,
  } = state

  const isAI = mode === 'ai'
  const isAiPlayTurn = isAI && playTurn === 'p2'
  const isHumanPlayTurn = playTurn === 'p1' || (playTurn === 'p2' && !isAI)

  // Move phase: who still needs to submit?
  const p1NeedsMove = phase === PHASES.MOVE && pendingMoves.p1 === null && !pendingWhiteBonus.p1 && !pendingWhiteBonus.p2
  const p2NeedsMove = phase === PHASES.MOVE && pendingMoves.p2 === null && !pendingWhiteBonus.p1 && !pendingWhiteBonus.p2
  const p1NeedsWhiteBonus = phase === PHASES.MOVE && pendingWhiteBonus.p1
  const p2NeedsWhiteBonus = phase === PHASES.MOVE && pendingWhiteBonus.p2

  // Valid moves for movement
  const validMovesP1 = p1NeedsMove ? getValidMoves(grid, mascots.p1, 'p1') : []
  const validMovesP2 = p2NeedsMove && !isAI ? getValidMoves(grid, mascots.p2, 'p2') : []
  const whiteBonusMovesP1 = p1NeedsWhiteBonus ? getValidMoves(grid, mascots.p1, 'p1', { bonus: true }) : []
  const whiteBonusMovesP2 = p2NeedsWhiteBonus && !isAI ? getValidMoves(grid, mascots.p2, 'p2', { bonus: true }) : []

  // Which moves to highlight on board
  const highlightedMoves = [
    ...validMovesP1,
    ...validMovesP2,
    ...whiteBonusMovesP1,
    ...whiteBonusMovesP2,
  ]

  useEffect(() => { aiActingRef.current = false }, [phase, playTurn, pendingMoves.p2, pendingWhiteBonus.p2])

  useEffect(() => {
    if (showLog) logBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length, showLog])

  // === Auto-draw ===
  useEffect(() => {
    if (phase !== PHASES.DRAW || winner) return
    const t = setTimeout(() => dispatch({ type: 'DRAW_CARDS' }), 400)
    return () => clearTimeout(t)
  }, [phase, winner])

  // === AI: play phase ===
  useEffect(() => {
    if (!isAiPlayTurn || phase !== PHASES.PLAY || winner) return
    if (aiActingRef.current) return
    aiActingRef.current = true

    const t = setTimeout(() => {
      const aiState = { ...state, activePlayer: 'p2' }
      const play = chooseCardPlay(aiState)
      if (play && hands.p2.length > 0) {
        const card = hands.p2[play.cardIndex]
        const playMode = card.college ? (Math.random() < 0.4 ? 'college' : 'color1') : undefined
        dispatch({ type: 'PLAY_CARD', payload: { cardIndex: play.cardIndex, row: play.row, col: play.col, playMode } })
        if (playMode === 'college' && card.college) {
          dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, play.row, play.col), player: 'p2' } })
        }
      } else {
        dispatch({ type: 'PASS' })
      }
    }, 700)
    return () => clearTimeout(t)
  }, [isAiPlayTurn, phase, winner])

  // === AI: submit move ===
  useEffect(() => {
    if (!isAI || phase !== PHASES.MOVE || winner) return
    if (pendingMoves.p2 !== null) return
    if (pendingWhiteBonus.p1 || pendingWhiteBonus.p2) return
    if (aiActingRef.current) return
    aiActingRef.current = true

    const t = setTimeout(() => {
      const aiState = { ...state, activePlayer: 'p2' }
      const move = chooseMove(aiState)
      if (move) dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p2', ...move } })
    }, 500)
    return () => clearTimeout(t)
  }, [isAI, phase, winner, pendingMoves.p2, pendingWhiteBonus])

  // === AI: white bonus ===
  useEffect(() => {
    if (!isAI || !pendingWhiteBonus.p2 || winner) return
    const t = setTimeout(() => {
      const bonusMoves = getValidMoves(grid, mascots.p2, 'p2', { bonus: true })
      if (bonusMoves.length > 0) {
        // Pick the one that gets closest to goal (row 7)
        const best = bonusMoves.reduce((a, b) => Math.abs(b.row - 7) < Math.abs(a.row - 7) ? b : a)
        dispatch({ type: 'WHITE_BONUS_MOVE', payload: { player: 'p2', row: best.row, col: best.col } })
      } else {
        dispatch({ type: 'SKIP_WHITE_BONUS', payload: { player: 'p2' } })
      }
    }, 500)
    return () => clearTimeout(t)
  }, [isAI, pendingWhiteBonus.p2, winner])

  // === Auto-resolve when both moves submitted ===
  useEffect(() => {
    if (phase !== PHASES.RESOLVE) return
    const t = setTimeout(() => dispatch({ type: 'RESOLVE_MOVES' }), 400)
    return () => clearTimeout(t)
  }, [phase])

  // === Auto end turn ===
  useEffect(() => {
    if (phase !== PHASES.CHECK_WIN || winner) return
    const t = setTimeout(() => dispatch({ type: 'END_TURN' }), 500)
    return () => clearTimeout(t)
  }, [phase, winner])

  // Play card helper
  function playCard(cardIndex, row, col, playMode) {
    const card = hands[playTurn][cardIndex]
    dispatch({ type: 'PLAY_CARD', payload: { cardIndex, row, col, playMode } })
    if (playMode === 'college' && card?.college) {
      dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, row, col), player: playTurn } })
    }
    setSelectedCardIndex(null)
    setCollegeChoice(null)
  }

  // Tile click
  const handleTileClick = useCallback((row, col) => {
    if (winner) return

    // Play phase: place card
    if (phase === PHASES.PLAY && isHumanPlayTurn && selectedCardIndex !== null) {
      const card = hands[playTurn][selectedCardIndex]
      if (card.college) {
        setCollegeChoice({ cardIndex: selectedCardIndex, row, col, card })
      } else {
        playCard(selectedCardIndex, row, col)
      }
      return
    }

    // Move phase: P1 picks move
    if (p1NeedsMove && validMovesP1.some(m => m.row === row && m.col === col)) {
      dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p1', row, col } })
      return
    }

    // Move phase: P2 picks move (hot-seat)
    if (p2NeedsMove && validMovesP2.some(m => m.row === row && m.col === col)) {
      dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p2', row, col } })
      return
    }

    // White bonus: P1
    if (p1NeedsWhiteBonus && whiteBonusMovesP1.some(m => m.row === row && m.col === col)) {
      dispatch({ type: 'WHITE_BONUS_MOVE', payload: { player: 'p1', row, col } })
      return
    }

    // White bonus: P2 (hot-seat)
    if (p2NeedsWhiteBonus && whiteBonusMovesP2.some(m => m.row === row && m.col === col)) {
      dispatch({ type: 'WHITE_BONUS_MOVE', payload: { player: 'p2', row, col } })
      return
    }
  }, [winner, phase, isHumanPlayTurn, selectedCardIndex, hands, playTurn,
      p1NeedsMove, validMovesP1, p2NeedsMove, validMovesP2,
      p1NeedsWhiteBonus, whiteBonusMovesP1, p2NeedsWhiteBonus, whiteBonusMovesP2])

  const handleDropCard = useCallback((cardIndex, row, col) => {
    if (phase !== PHASES.PLAY || !isHumanPlayTurn || winner) return
    const card = hands[playTurn][cardIndex]
    if (card.college) {
      setCollegeChoice({ cardIndex, row, col, card })
      setSelectedCardIndex(null)
    } else {
      playCard(cardIndex, row, col)
    }
  }, [phase, isHumanPlayTurn, winner, hands, playTurn])

  const handleCardSelect = useCallback((index) => {
    if (phase !== PHASES.PLAY || !isHumanPlayTurn || winner) return
    setSelectedCardIndex(prev => prev === index ? null : index)
  }, [phase, isHumanPlayTurn, winner])

  // Status display
  const playTurnName = playTurn === 'p1' ? 'Player 1' : 'Player 2'
  const playTurnColor = playTurn === 'p1' ? '#4ade80' : '#a78bfa'

  let statusLabel = ''
  let statusColor = '#888'
  if (phase === PHASES.DRAW) { statusLabel = 'Drawing...'; statusColor = '#3b82f6' }
  else if (phase === PHASES.PLAY) { statusLabel = `${playTurnName}'s play`; statusColor = playTurnColor }
  else if (phase === PHASES.MOVE) {
    if (p1NeedsWhiteBonus) { statusLabel = 'P1 white bonus!'; statusColor = '#f5f0e0' }
    else if (p2NeedsWhiteBonus) { statusLabel = 'P2 white bonus!'; statusColor = '#f5f0e0' }
    else { statusLabel = 'Choose movement'; statusColor = '#ef4444' }
  }
  else if (phase === PHASES.RESOLVE) { statusLabel = 'Resolving...'; statusColor = '#f59e0b' }

  return (
    <div className="game-screen">
      {/* TOP BAR */}
      <div className="top-bar">
        <button onClick={onExit} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '12px', padding: '4px 8px' }}>
          ← Menu
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Turn {turnCount}</span>
        <motion.span
          key={statusLabel}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: statusColor, color: statusColor === '#f5f0e0' ? '#1a1210' : 'white',
            padding: '4px 12px', borderRadius: '6px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase',
          }}
        >
          {statusLabel}
        </motion.span>
        {isAiPlayTurn && <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>AI thinking...</span>}
        <button
          onClick={() => setShowLog(v => !v)}
          style={{
            background: showLog ? 'var(--accent-gold)' : 'none',
            color: showLog ? 'var(--bg-dark)' : 'var(--text-muted)',
            fontSize: '12px', padding: '4px 10px', borderRadius: '4px', marginLeft: 'auto',
          }}
        >
          Log
        </button>
      </div>

      {/* BOARD */}
      <div className="board-area">
        <Board
          grid={grid} mascots={mascots}
          validMoves={highlightedMoves}
          onTileClick={handleTileClick}
          onDropCard={handleDropCard}
          canDropCards={phase === PHASES.PLAY && isHumanPlayTurn && !winner}
        />
      </div>

      {/* LOG */}
      {showLog && (
        <div className="game-log-overlay">
          <h4>Game Log</h4>
          {log.map((entry, i) => <div key={i} className="log-entry">{entry}</div>)}
          <div ref={logBottomRef} />
        </div>
      )}

      {/* COLLEGE CHOICE MODAL */}
      <AnimatePresence>
        {collegeChoice && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={() => setCollegeChoice(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-medium)', borderRadius: '12px', padding: '24px', border: '2px solid var(--accent-gold)', maxWidth: '360px', textAlign: 'center' }}
            >
              <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--accent-gold)', marginBottom: '8px', fontSize: '16px' }}>
                {collegeChoice.card.name}
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
                {collegeChoice.card.college} ({collegeChoice.card.collegeColors.map(c => COLOR_NAMES[c]).join('/')})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button onClick={() => playCard(collegeChoice.cardIndex, collegeChoice.row, collegeChoice.col, 'college')}
                  style={{ background: 'var(--mtg-gold)', color: 'var(--bg-dark)', padding: '10px 16px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                  {collegeChoice.card.college.charAt(0).toUpperCase() + collegeChoice.card.college.slice(1)} Effect
                </button>
                {collegeChoice.card.collegeColors.map((color, i) => (
                  <button key={color}
                    onClick={() => playCard(collegeChoice.cardIndex, collegeChoice.row, collegeChoice.col, i === 0 ? 'color1' : 'color2')}
                    style={{ background: `var(--mtg-${color})`, color: color === 'black' ? '#ccc' : 'var(--bg-dark)', padding: '10px 16px', borderRadius: '6px', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer' }}>
                    Play as {COLOR_NAMES[color]}
                  </button>
                ))}
                <button onClick={() => setCollegeChoice(null)}
                  style={{ background: 'none', color: 'var(--text-muted)', padding: '8px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM BAR */}
      <div className="bottom-bar">
        <div className="controls-strip">
          {/* Play phase */}
          {phase === PHASES.PLAY && isHumanPlayTurn && (
            <>
              <span className="hint">
                {selectedCardIndex !== null ? 'Click a tile to place' : `${playTurnName}: play a card or pass`}
              </span>
              <button className="btn btn--primary" onClick={() => {
                setSelectedCardIndex(null)
                dispatch({ type: 'PASS' })
              }}>
                Pass
              </button>
            </>
          )}

          {/* Waiting for AI/opponent to play */}
          {phase === PHASES.PLAY && !isHumanPlayTurn && (
            <span className="hint">{isAI ? 'AI deciding...' : `Waiting for ${playTurnName}...`}</span>
          )}

          {/* Move phase */}
          {p1NeedsMove && (
            <>
              <span className="hint">P1: choose your move</span>
              {validMovesP1.map(m => (
                <button key={`p1-${m.row}-${m.col}`} className="btn"
                  onClick={() => dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p1', row: m.row, col: m.col } })}>
                  {m.direction.charAt(0).toUpperCase() + m.direction.slice(1)}
                </button>
              ))}
            </>
          )}
          {!isAI && p2NeedsMove && !p1NeedsMove && (
            <>
              <span className="hint">P2: choose your move</span>
              {validMovesP2.map(m => (
                <button key={`p2-${m.row}-${m.col}`} className="btn"
                  onClick={() => dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p2', row: m.row, col: m.col } })}>
                  {m.direction.charAt(0).toUpperCase() + m.direction.slice(1)}
                </button>
              ))}
            </>
          )}
          {isAI && p2NeedsMove && pendingMoves.p1 !== null && (
            <span className="hint">AI choosing move...</span>
          )}

          {/* White bonus */}
          {p1NeedsWhiteBonus && (
            <>
              <span className="hint" style={{ color: 'var(--mtg-white)' }}>P1: white tile bonus move! (any direction)</span>
              {whiteBonusMovesP1.map(m => (
                <button key={`wb1-${m.row}-${m.col}`} className="btn"
                  onClick={() => dispatch({ type: 'WHITE_BONUS_MOVE', payload: { player: 'p1', row: m.row, col: m.col } })}>
                  {m.direction.charAt(0).toUpperCase() + m.direction.slice(1)}
                </button>
              ))}
              <button className="btn" onClick={() => dispatch({ type: 'SKIP_WHITE_BONUS', payload: { player: 'p1' } })}>Skip</button>
            </>
          )}
          {!isAI && p2NeedsWhiteBonus && (
            <>
              <span className="hint" style={{ color: 'var(--mtg-white)' }}>P2: white tile bonus move!</span>
              {whiteBonusMovesP2.map(m => (
                <button key={`wb2-${m.row}-${m.col}`} className="btn"
                  onClick={() => dispatch({ type: 'WHITE_BONUS_MOVE', payload: { player: 'p2', row: m.row, col: m.col } })}>
                  {m.direction.charAt(0).toUpperCase() + m.direction.slice(1)}
                </button>
              ))}
              <button className="btn" onClick={() => dispatch({ type: 'SKIP_WHITE_BONUS', payload: { player: 'p2' } })}>Skip</button>
            </>
          )}

          {phase === PHASES.DRAW && <span className="hint">Drawing...</span>}
          {phase === PHASES.RESOLVE && <span className="hint">Resolving...</span>}
        </div>

        {/* Hand — show during play phase for the current playTurn */}
        {phase === PHASES.PLAY && isHumanPlayTurn && (
          <PlayerHand
            cards={hands[playTurn]}
            selectedIndex={selectedCardIndex}
            onSelect={handleCardSelect}
            canDrag={!winner}
          />
        )}
      </div>

      <AnimatePresence>
        {showPassScreen && <PassScreen nextPlayer={activePlayer} onReady={() => setShowPassScreen(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {winner && <GameOverModal winner={winner} turnCount={turnCount} onRematch={() => window.location.reload()} onMenu={onExit} />}
      </AnimatePresence>
    </div>
  )
}

function buildCollegeParams(college, row, col) {
  switch (college) {
    case 'witherbloom': return { centerRow: row, centerCol: col, wallRow: row, wallCol: col }
    case 'prismari': return { row }
    case 'lorehold': return { discardIndex: 0, row, col }
    default: return {}
  }
}
