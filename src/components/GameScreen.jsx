import { useReducer, useCallback, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Board from './Board'
import PlayerHand from './PlayerHand'
import GameOverModal from './GameOverModal'
import PassScreen from './PassScreen'
import { createInitialState, gameReducer } from '../engine/gameState'
import { getValidMoves } from '../engine/rules'
import { chooseCardPlay, chooseMove } from '../engine/ai'
import { PHASES, ACTIONS_PER_TURN } from '../engine/constants'

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
    actionsRemaining, pendingLateral, log,
  } = state

  const isAI = mode === 'ai'
  const isAiTurn = isAI && activePlayer === 'p2'
  const isHumanTurn = !isAiTurn

  const canAct = phase === PHASES.ACT && actionsRemaining > 0 && !winner && !pendingLateral
  const canPlay = canAct && hands[activePlayer].length > 0
  const canMove = canAct

  const validMoves = canMove && isHumanTurn
    ? getValidMoves(grid, mascots[activePlayer], activePlayer)
    : []

  useEffect(() => { aiActingRef.current = false }, [phase, activePlayer, actionsRemaining])

  useEffect(() => {
    if (showLog) logBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length, showLog])

  // Hot-seat pass screen
  useEffect(() => {
    if (mode === 'hotseat' && phase === PHASES.DRAW && turnCount > 1) setShowPassScreen(true)
  }, [activePlayer])

  // Auto-draw
  useEffect(() => {
    if (phase !== PHASES.DRAW || winner || showPassScreen) return
    const t = setTimeout(() => dispatch({ type: 'DRAW_CARD' }), 400)
    return () => clearTimeout(t)
  }, [phase, winner, showPassScreen, activePlayer])

  // AI: spend actions
  useEffect(() => {
    if (!isAiTurn || phase !== PHASES.ACT || winner || pendingLateral) return
    if (actionsRemaining <= 0) return
    if (aiActingRef.current) return
    aiActingRef.current = true

    const t = setTimeout(() => {
      const aiState = { ...state, activePlayer: 'p2' }

      // Strategy: play a card if we have 2+ actions left, otherwise move
      // (saves last actions for movement)
      if (actionsRemaining >= 2 && hands.p2.length > 0) {
        const play = chooseCardPlay(aiState)
        if (play) {
          const card = hands.p2[play.cardIndex]
          dispatch({ type: 'PLAY_CARD', payload: { cardIndex: play.cardIndex, row: play.row, col: play.col } })
          if (card?.college) {
            dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, play.row, play.col) } })
          }
          return
        }
      }

      // Move
      const move = chooseMove(aiState)
      if (move) {
        dispatch({ type: 'MOVE_MASCOT', payload: move })
      } else {
        // No valid moves, end turn
        dispatch({ type: 'END_TURN' })
      }
    }, 600)
    return () => clearTimeout(t)
  }, [isAiTurn, phase, winner, actionsRemaining, pendingLateral])

  // AI lateral
  useEffect(() => {
    if (!isAiTurn || !pendingLateral || winner) return
    const t = setTimeout(() => {
      if (pendingLateral.length > 0) dispatch({ type: 'RESOLVE_LATERAL', payload: pendingLateral[0] })
      else dispatch({ type: 'SKIP_LATERAL' })
    }, 400)
    return () => clearTimeout(t)
  }, [isAiTurn, pendingLateral, winner])

  // Auto end turn when no actions left
  useEffect(() => {
    if (phase !== PHASES.CHECK_WIN || winner || pendingLateral) return
    const t = setTimeout(() => dispatch({ type: 'END_TURN' }), 500)
    return () => clearTimeout(t)
  }, [phase, winner, pendingLateral])

  // Tile click
  const handleTileClick = useCallback((row, col) => {
    if (winner || !isHumanTurn) return

    if (pendingLateral?.length > 0) {
      if (pendingLateral.some(o => o.row === row && o.col === col)) {
        dispatch({ type: 'RESOLVE_LATERAL', payload: { row, col } })
      }
      return
    }

    // Play card
    if (canPlay && selectedCardIndex !== null) {
      const card = hands[activePlayer][selectedCardIndex]
      dispatch({ type: 'PLAY_CARD', payload: { cardIndex: selectedCardIndex, row, col } })
      if (card?.college) {
        dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, row, col) } })
      }
      setSelectedCardIndex(null)
      return
    }

    // Move
    if (canMove && validMoves.some(m => m.row === row && m.col === col)) {
      dispatch({ type: 'MOVE_MASCOT', payload: { row, col } })
    }
  }, [winner, isHumanTurn, pendingLateral, canPlay, selectedCardIndex, hands, activePlayer, canMove, validMoves])

  const handleDropCard = useCallback((cardIndex, row, col) => {
    if (!canPlay || !isHumanTurn || winner) return
    const card = hands[activePlayer][cardIndex]
    dispatch({ type: 'PLAY_CARD', payload: { cardIndex, row, col } })
    if (card?.college) {
      dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, row, col) } })
    }
    setSelectedCardIndex(null)
  }, [canPlay, isHumanTurn, winner, hands, activePlayer])

  const handleCardSelect = useCallback((index) => {
    if (!canPlay || !isHumanTurn || winner) return
    setSelectedCardIndex(prev => prev === index ? null : index)
  }, [canPlay, isHumanTurn, winner])

  const playerColor = activePlayer === 'p1' ? '#4ade80' : '#a78bfa'
  const playerName = activePlayer === 'p1' ? 'Player 1' : 'Player 2'

  // Action pips display
  const actionPips = Array.from({ length: ACTIONS_PER_TURN }, (_, i) => i < actionsRemaining)

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

        {/* Action pips */}
        {phase === PHASES.ACT && (
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {actionPips.map((active, i) => (
              <div key={i} style={{
                width: '12px', height: '12px', borderRadius: '50%',
                background: active ? 'var(--accent-gold)' : 'var(--bg-light)',
                border: `2px solid ${active ? 'var(--accent-glow)' : 'var(--text-muted)'}`,
                transition: 'all 0.2s ease',
              }} />
            ))}
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '4px' }}>
              actions
            </span>
          </div>
        )}

        {phase === PHASES.DRAW && <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Drawing...</span>}
        {isAiTurn && phase === PHASES.ACT && <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>AI thinking...</span>}

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
          validMoves={[...validMoves, ...(pendingLateral || [])]}
          onTileClick={handleTileClick}
          onDropCard={handleDropCard}
          canDropCards={canPlay && isHumanTurn && !winner}
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
          {canAct && isHumanTurn && (
            <>
              <span className="hint">
                {selectedCardIndex !== null
                  ? 'Click a tile to place card (1 action)'
                  : 'Play a card or click a glowing tile to move (1 action each)'}
              </span>
              {validMoves.map(m => (
                <button key={`${m.row}-${m.col}`} className="btn"
                  onClick={() => dispatch({ type: 'MOVE_MASCOT', payload: m })}>
                  {m.direction.charAt(0).toUpperCase() + m.direction.slice(1)}
                </button>
              ))}
              <button className="btn btn--primary" onClick={() => {
                setSelectedCardIndex(null)
                // End turn early by going to CHECK_WIN
                dispatch({ type: 'END_TURN' })
              }}>
                End Turn
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
          {isAiTurn && phase === PHASES.ACT && <span className="hint">Opponent's turn...</span>}
        </div>

        {/* Hand — always visible during ACT phase */}
        {phase === PHASES.ACT && isHumanTurn && (
          <PlayerHand
            cards={hands[activePlayer]}
            selectedIndex={canPlay ? selectedCardIndex : null}
            onSelect={handleCardSelect}
            canDrag={canPlay && !winner}
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
