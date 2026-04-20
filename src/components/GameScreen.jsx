import { useReducer, useCallback, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Board from './Board'
import PlayerHand from './PlayerHand'
import GameOverModal from './GameOverModal'
import PassScreen from './PassScreen'
import { createInitialState, gameReducer } from '../engine/gameState'
import { getValidMoves } from '../engine/rules'
import { chooseCardPlay, chooseMove } from '../engine/ai'
import { PHASES, MOVE_STEPS } from '../engine/constants'

export default function GameScreen({ p1Deck, p2Deck, mode, onExit }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(p1Deck, p2Deck)
  )

  const [selectedCardIndex, setSelectedCardIndex] = useState(null)
  const [showPassScreen, setShowPassScreen] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const logBottomRef = useRef(null)
  const aiActingRef = useRef(false)

  const {
    grid, mascots, hands, phase, activePlayer, turnCount, winner,
    movesRemaining, hasPlayedCard, pendingLateral, log,
  } = state

  const isAI = mode === 'ai'
  const isAiTurn = isAI && activePlayer === 'p2'
  const isHumanTurn = !isAiTurn

  // You move YOUR OWN mascot
  const validMoves = phase === PHASES.MOVE && isHumanTurn && !winner && !pendingLateral
    ? getValidMoves(grid, mascots[activePlayer], activePlayer)
    : []

  // Reset AI guard on phase change
  useEffect(() => { aiActingRef.current = false }, [phase, activePlayer])

  // Scroll log
  useEffect(() => {
    if (showLog) logBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length, showLog])

  // Hot-seat: pass screen on player switch
  useEffect(() => {
    if (mode === 'hotseat' && phase === PHASES.DRAW && turnCount > 1) {
      setShowPassScreen(true)
    }
  }, [activePlayer])

  // === Auto-advance DRAW ===
  useEffect(() => {
    if (phase !== PHASES.DRAW || winner || showPassScreen) return
    const t = setTimeout(() => dispatch({ type: 'DRAW_CARD' }), 400)
    return () => clearTimeout(t)
  }, [phase, winner, showPassScreen, activePlayer])

  // === AI: play phase ===
  useEffect(() => {
    if (!isAiTurn || phase !== PHASES.PLAY || winner) return
    if (aiActingRef.current) return
    aiActingRef.current = true

    const t = setTimeout(() => {
      const aiState = { ...state, activePlayer: 'p2' }
      const play = chooseCardPlay(aiState)
      if (play) {
        const card = hands.p2[play.cardIndex]
        dispatch({ type: 'PLAY_CARD', payload: { cardIndex: play.cardIndex, row: play.row, col: play.col } })
        if (card?.college) {
          dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, play.row, play.col) } })
        }
      }
      setTimeout(() => dispatch({ type: 'END_PLAY_PHASE' }), 300)
    }, 600)
    return () => clearTimeout(t)
  }, [isAiTurn, phase, winner])

  // === AI: move phase ===
  useEffect(() => {
    if (!isAiTurn || phase !== PHASES.MOVE || winner || pendingLateral) return
    if (movesRemaining <= 0) return
    if (aiActingRef.current) return
    aiActingRef.current = true

    const t = setTimeout(() => {
      // AI moves its OWN mascot
      const aiMoves = getValidMoves(grid, mascots.p2, 'p2')
      if (aiMoves.length > 0) {
        // Pick best move using AI heuristics
        const aiState = { ...state, activePlayer: 'p2' }
        const move = chooseMove(aiState)
        if (move) {
          dispatch({ type: 'MOVE_MASCOT', payload: move })
        } else {
          dispatch({ type: 'END_MOVE_PHASE' })
        }
      } else {
        dispatch({ type: 'END_MOVE_PHASE' })
      }
    }, 500)
    return () => clearTimeout(t)
  }, [isAiTurn, phase, winner, movesRemaining, pendingLateral])

  // === AI: lateral ===
  useEffect(() => {
    if (!isAiTurn || !pendingLateral || winner) return
    const t = setTimeout(() => {
      if (pendingLateral.length > 0) {
        dispatch({ type: 'RESOLVE_LATERAL', payload: pendingLateral[0] })
      } else {
        dispatch({ type: 'SKIP_LATERAL' })
      }
    }, 400)
    return () => clearTimeout(t)
  }, [isAiTurn, pendingLateral, winner])

  // === Auto-advance CHECK_WIN → end turn ===
  useEffect(() => {
    if (phase !== PHASES.CHECK_WIN || winner || pendingLateral) return
    const t = setTimeout(() => dispatch({ type: 'END_TURN' }), 500)
    return () => clearTimeout(t)
  }, [phase, winner, pendingLateral])

  // === Tile click ===
  const handleTileClick = useCallback((row, col) => {
    if (winner || !isHumanTurn) return

    // Lateral choice
    if (pendingLateral?.length > 0) {
      if (pendingLateral.some(o => o.row === row && o.col === col)) {
        dispatch({ type: 'RESOLVE_LATERAL', payload: { row, col } })
      }
      return
    }

    // Play phase: place card
    if (phase === PHASES.PLAY && selectedCardIndex !== null && !hasPlayedCard) {
      const card = hands[activePlayer][selectedCardIndex]
      dispatch({ type: 'PLAY_CARD', payload: { cardIndex: selectedCardIndex, row, col } })
      if (card?.college) {
        dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, row, col) } })
      }
      setSelectedCardIndex(null)
      return
    }

    // Move phase: move own mascot
    if (phase === PHASES.MOVE && movesRemaining > 0) {
      if (validMoves.some(m => m.row === row && m.col === col)) {
        dispatch({ type: 'MOVE_MASCOT', payload: { row, col } })
      }
    }
  }, [winner, isHumanTurn, pendingLateral, phase, selectedCardIndex, hasPlayedCard, hands, activePlayer, validMoves, movesRemaining])

  // === Drop card ===
  const handleDropCard = useCallback((cardIndex, row, col) => {
    if (phase !== PHASES.PLAY || !isHumanTurn || winner || hasPlayedCard) return
    const card = hands[activePlayer][cardIndex]
    dispatch({ type: 'PLAY_CARD', payload: { cardIndex, row, col } })
    if (card?.college) {
      dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, row, col) } })
    }
    setSelectedCardIndex(null)
  }, [phase, isHumanTurn, winner, hasPlayedCard, hands, activePlayer])

  const handleCardSelect = useCallback((index) => {
    if (phase !== PHASES.PLAY || !isHumanTurn || winner || hasPlayedCard) return
    setSelectedCardIndex(prev => prev === index ? null : index)
  }, [phase, isHumanTurn, winner, hasPlayedCard])

  const canDropCards = phase === PHASES.PLAY && isHumanTurn && !winner && !hasPlayedCard

  // Phase display
  const playerColor = activePlayer === 'p1' ? '#4ade80' : '#a78bfa'
  const playerName = activePlayer === 'p1' ? 'Player 1' : 'Player 2'

  const phaseLabel = {
    [PHASES.DRAW]: 'Drawing...',
    [PHASES.PLAY]: hasPlayedCard ? 'Card Played!' : 'Place 1 Card',
    [PHASES.MOVE]: `Move (${movesRemaining} steps left)`,
    [PHASES.RESOLVE]: 'Resolving...',
    [PHASES.CHECK_WIN]: '...',
  }[phase] || phase

  const phaseColor = {
    [PHASES.DRAW]: '#3b82f6',
    [PHASES.PLAY]: '#a855f7',
    [PHASES.MOVE]: '#ef4444',
    [PHASES.RESOLVE]: '#f59e0b',
    [PHASES.CHECK_WIN]: '#f59e0b',
  }[phase] || '#888'

  return (
    <div className="game-screen">
      {/* TOP BAR */}
      <div className="top-bar">
        <button onClick={onExit} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '12px', padding: '4px 8px' }}>
          ← Menu
        </button>
        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Turn {turnCount}</span>
        <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '16px', color: playerColor }}>
          {playerName}
        </span>
        <motion.span
          key={`${phase}-${hasPlayedCard}-${movesRemaining}`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: phaseColor, color: 'white', padding: '4px 12px',
            borderRadius: '6px', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase',
          }}
        >
          {phaseLabel}
        </motion.span>
        {isAiTurn && <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>AI thinking...</span>}
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
          grid={grid}
          mascots={mascots}
          validMoves={[...validMoves, ...(pendingLateral || [])]}
          onTileClick={handleTileClick}
          onDropCard={handleDropCard}
          canDropCards={canDropCards}
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

      {/* BOTTOM BAR */}
      <div className="bottom-bar">
        <div className="controls-strip">
          {phase === PHASES.PLAY && isHumanTurn && !hasPlayedCard && (
            <>
              <span className="hint">Play 1 card (drag or click), or skip</span>
              <button className="btn btn--primary" onClick={() => dispatch({ type: 'END_PLAY_PHASE' })}>
                Skip / Done
              </button>
            </>
          )}
          {phase === PHASES.PLAY && isHumanTurn && hasPlayedCard && (
            <>
              <span className="hint">Card placed!</span>
              <button className="btn btn--primary" onClick={() => dispatch({ type: 'END_PLAY_PHASE' })}>
                Move →
              </button>
            </>
          )}
          {phase === PHASES.MOVE && isHumanTurn && !pendingLateral && movesRemaining > 0 && (
            <>
              <span className="hint">Move your mascot ({movesRemaining} step{movesRemaining > 1 ? 's' : ''} left)</span>
              {validMoves.map(m => (
                <button key={`${m.row}-${m.col}`} className="btn"
                  onClick={() => dispatch({ type: 'MOVE_MASCOT', payload: m })}>
                  {m.direction.charAt(0).toUpperCase() + m.direction.slice(1)}
                </button>
              ))}
              <button className="btn" onClick={() => dispatch({ type: 'END_MOVE_PHASE' })}>
                End Move
              </button>
            </>
          )}
          {pendingLateral && isHumanTurn && (
            <>
              <span className="hint" style={{ color: 'var(--accent-gold)' }}>White tile! Slide sideways?</span>
              <button className="btn" onClick={() => dispatch({ type: 'SKIP_LATERAL' })}>Skip</button>
            </>
          )}
          {phase === PHASES.DRAW && <span className="hint">Drawing...</span>}
          {isAiTurn && phase !== PHASES.DRAW && <span className="hint">Opponent's turn...</span>}
          {phase === PHASES.CHECK_WIN && !winner && <span className="hint">...</span>}
        </div>

        {/* Hand */}
        {isHumanTurn && (phase === PHASES.PLAY || phase === PHASES.MOVE) && (
          <PlayerHand
            cards={hands[activePlayer]}
            selectedIndex={phase === PHASES.PLAY && !hasPlayedCard ? selectedCardIndex : null}
            onSelect={handleCardSelect}
            canDrag={canDropCards}
          />
        )}
      </div>

      {/* PASS SCREEN */}
      <AnimatePresence>
        {showPassScreen && (
          <PassScreen nextPlayer={activePlayer} onReady={() => setShowPassScreen(false)} />
        )}
      </AnimatePresence>

      {/* GAME OVER */}
      <AnimatePresence>
        {winner && (
          <GameOverModal
            winner={winner} turnCount={turnCount}
            onRematch={() => window.location.reload()} onMenu={onExit}
          />
        )}
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
