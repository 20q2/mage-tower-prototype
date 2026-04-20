import { useReducer, useCallback, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Board from './Board'
import PlayerHand from './PlayerHand'
import GameOverModal from './GameOverModal'
import PassScreen from './PassScreen'
import { createInitialState, gameReducer } from '../engine/gameState'
import { getValidMoves } from '../engine/rules'
import { chooseCardPlay, chooseMove } from '../engine/ai'
import { PHASES, ROWS, COLS } from '../engine/constants'

export default function GameScreen({ p1Deck, p2Deck, mode, onExit }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(p1Deck, p2Deck)
  )

  const [selectedCardIndex, setSelectedCardIndex] = useState(null)
  const [showPassScreen, setShowPassScreen] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const prevTurnRef = useRef(state.turnCount)
  const logBottomRef = useRef(null)

  const {
    grid, mascots, hands, phase, activePlayer,
    turnCount, winner, pendingLateral, log,
  } = state

  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const isAiTurn = mode === 'ai' && activePlayer === 'p2'
  const isHumanTurn = !isAiTurn

  // Scroll log to bottom
  useEffect(() => {
    if (showLog) logBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length, showLog])

  // Hot-seat: show pass screen on turn change
  useEffect(() => {
    if (mode === 'hotseat' && phase === PHASES.DRAW && turnCount > 1 && turnCount !== prevTurnRef.current) {
      setShowPassScreen(true)
    }
    prevTurnRef.current = turnCount
  }, [turnCount, phase, mode])

  // Auto-advance DRAW
  useEffect(() => {
    if (phase !== PHASES.DRAW || winner || showPassScreen) return
    const t = setTimeout(() => dispatch({ type: 'DRAW_CARD' }), 400)
    return () => clearTimeout(t)
  }, [phase, winner, showPassScreen])

  // Auto-advance CHECK_WIN
  useEffect(() => {
    if (phase !== PHASES.CHECK_WIN || winner || pendingLateral) return
    const t = setTimeout(() => dispatch({ type: 'END_TURN' }), 300)
    return () => clearTimeout(t)
  }, [phase, winner, pendingLateral])

  // AI: PLAY
  useEffect(() => {
    if (!isAiTurn || phase !== PHASES.PLAY || winner) return
    const t = setTimeout(() => {
      const play = chooseCardPlay(state)
      if (play) {
        const card = hands[activePlayer][play.cardIndex]
        dispatch({ type: 'PLAY_CARD', payload: { cardIndex: play.cardIndex, row: play.row, col: play.col } })
        if (card?.college) {
          dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, play.row, play.col, state) } })
        }
      }
      setTimeout(() => dispatch({ type: 'END_PLAY_PHASE' }), 200)
    }, 500)
    return () => clearTimeout(t)
  }, [isAiTurn, phase, winner])

  // AI: MOVE
  useEffect(() => {
    if (!isAiTurn || phase !== PHASES.MOVE || winner) return
    const t = setTimeout(() => {
      const move = chooseMove(state)
      if (move) dispatch({ type: 'MOVE_MASCOT', payload: { row: move.row, col: move.col } })
    }, 800)
    return () => clearTimeout(t)
  }, [isAiTurn, phase, winner])

  // AI: lateral
  useEffect(() => {
    if (!isAiTurn || !pendingLateral || winner) return
    const t = setTimeout(() => {
      if (pendingLateral.length > 0) {
        dispatch({ type: 'RESOLVE_LATERAL', payload: pendingLateral[0] })
      } else {
        dispatch({ type: 'SKIP_LATERAL' })
      }
    }, 500)
    return () => clearTimeout(t)
  }, [isAiTurn, pendingLateral, winner])

  const validMoves = phase === PHASES.MOVE && isHumanTurn && !winner
    ? getValidMoves(grid, mascots[opponent], activePlayer)
    : []

  const handleTileClick = useCallback((row, col) => {
    if (winner || !isHumanTurn) return

    if (pendingLateral?.length > 0) {
      if (pendingLateral.some(o => o.row === row && o.col === col)) {
        dispatch({ type: 'RESOLVE_LATERAL', payload: { row, col } })
      }
      return
    }

    if (phase === PHASES.PLAY && selectedCardIndex !== null) {
      const card = hands[activePlayer][selectedCardIndex]
      dispatch({ type: 'PLAY_CARD', payload: { cardIndex: selectedCardIndex, row, col } })
      if (card?.college) {
        dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, row, col, state) } })
      }
      setSelectedCardIndex(null)
      return
    }

    if (phase === PHASES.MOVE) {
      if (validMoves.some(m => m.row === row && m.col === col)) {
        dispatch({ type: 'MOVE_MASCOT', payload: { row, col } })
      }
    }
  }, [winner, isHumanTurn, pendingLateral, phase, selectedCardIndex, hands, activePlayer, validMoves, state])

  const handleCardSelect = useCallback((index) => {
    if (phase !== PHASES.PLAY || !isHumanTurn || winner) return
    setSelectedCardIndex(prev => prev === index ? null : index)
  }, [phase, isHumanTurn, winner])

  // Phase display
  const phaseInfo = {
    [PHASES.DRAW]: { label: 'Drawing...', color: '#3b82f6' },
    [PHASES.PLAY]: { label: 'Play Cards', color: '#a855f7' },
    [PHASES.MOVE]: { label: 'Move Opponent', color: '#ef4444' },
    [PHASES.RESOLVE]: { label: 'Resolving...', color: '#22c55e' },
    [PHASES.CHECK_WIN]: { label: '...', color: '#f59e0b' },
  }[phase] || { label: phase, color: '#888' }

  const playerColor = activePlayer === 'p1' ? '#4ade80' : '#a78bfa'
  const playerName = activePlayer === 'p1' ? 'Player 1' : 'Player 2'

  return (
    <div className="game-screen">
      {/* TOP BAR */}
      <div className="top-bar">
        <button
          onClick={onExit}
          style={{ background: 'none', color: 'var(--text-muted)', fontSize: '12px', padding: '4px 8px' }}
        >
          ← Menu
        </button>

        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
          Turn {turnCount}
        </span>

        <span style={{ fontFamily: 'Cinzel, serif', fontWeight: 700, fontSize: '16px', color: playerColor }}>
          {playerName}
        </span>

        <motion.span
          key={phase}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: phaseInfo.color,
            color: 'white',
            padding: '4px 12px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '12px',
            textTransform: 'uppercase',
          }}
        >
          {phaseInfo.label}
        </motion.span>

        {isAiTurn && (
          <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
            AI thinking...
          </span>
        )}

        <button
          onClick={() => setShowLog(v => !v)}
          style={{
            background: showLog ? 'var(--accent-gold)' : 'none',
            color: showLog ? 'var(--bg-dark)' : 'var(--text-muted)',
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '4px',
            marginLeft: 'auto',
          }}
        >
          Log
        </button>
      </div>

      {/* BOARD AREA */}
      <div className="board-area">
        <Board
          grid={grid}
          mascots={mascots}
          validMoves={[...validMoves, ...(pendingLateral && isHumanTurn ? pendingLateral : [])]}
          onTileClick={handleTileClick}
        />
      </div>

      {/* GAME LOG OVERLAY */}
      {showLog && (
        <div className="game-log-overlay">
          <h4>Game Log</h4>
          {log.map((entry, i) => (
            <div key={i} className="log-entry">{entry}</div>
          ))}
          <div ref={logBottomRef} />
        </div>
      )}

      {/* BOTTOM BAR */}
      <div className="bottom-bar">
        {/* Controls strip */}
        <div className="controls-strip">
          {phase === PHASES.PLAY && isHumanTurn && (
            <>
              {selectedCardIndex !== null && (
                <span className="hint">Click a tile to place card</span>
              )}
              {selectedCardIndex === null && (
                <span className="hint">Select a card or skip</span>
              )}
              <button className="btn btn--primary" onClick={() => {
                setSelectedCardIndex(null)
                dispatch({ type: 'END_PLAY_PHASE' })
              }}>
                Done Playing
              </button>
            </>
          )}

          {phase === PHASES.MOVE && isHumanTurn && !pendingLateral && (
            <>
              <span className="hint">Click a glowing tile to move {opponent}'s mascot</span>
              {validMoves.map(m => (
                <button
                  key={`${m.row}-${m.col}`}
                  className="btn"
                  onClick={() => dispatch({ type: 'MOVE_MASCOT', payload: m })}
                >
                  {m.direction.charAt(0).toUpperCase() + m.direction.slice(1)}
                </button>
              ))}
            </>
          )}

          {pendingLateral && isHumanTurn && (
            <>
              <span className="hint" style={{ color: 'var(--accent-gold)' }}>
                White tile! Slide sideways?
              </span>
              <button className="btn" onClick={() => dispatch({ type: 'SKIP_LATERAL' })}>
                Skip
              </button>
            </>
          )}

          {phase === PHASES.DRAW && !isAiTurn && (
            <span className="hint">Drawing...</span>
          )}

          {isAiTurn && <span className="hint">Opponent's turn...</span>}
        </div>

        {/* Hand */}
        <PlayerHand
          cards={hands[activePlayer]}
          selectedIndex={phase === PHASES.PLAY && isHumanTurn ? selectedCardIndex : null}
          onSelect={handleCardSelect}
        />
      </div>

      {/* PASS SCREEN */}
      <AnimatePresence>
        {showPassScreen && (
          <PassScreen
            nextPlayer={activePlayer}
            onReady={() => setShowPassScreen(false)}
          />
        )}
      </AnimatePresence>

      {/* GAME OVER */}
      <AnimatePresence>
        {winner && (
          <GameOverModal
            winner={winner}
            turnCount={turnCount}
            onRematch={() => window.location.reload()}
            onMenu={onExit}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function buildCollegeParams(college, row, col, state) {
  switch (college) {
    case 'witherbloom':
      return { centerRow: row, centerCol: col, wallRow: row, wallCol: col }
    case 'prismari':
      return { row }
    case 'lorehold':
      return { discardIndex: 0, row, col }
    default:
      return {}
  }
}
