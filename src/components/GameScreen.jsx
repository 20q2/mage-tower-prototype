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

export default function GameScreen({ p1Deck, p2Deck, mode, onExit }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(p1Deck, p2Deck)
  )

  const [selectedCardIndex, setSelectedCardIndex] = useState(null)
  const [showPassScreen, setShowPassScreen] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const logBottomRef = useRef(null)
  // Guard refs to prevent double-dispatching from effects
  const aiPlayingRef = useRef(false)
  const aiMovingRef = useRef(false)

  const { grid, mascots, hands, phase, turnCount, winner, pendingMoves, pendingLateral, log } = state

  const isAI = mode === 'ai'

  const activePlayer =
    phase === PHASES.P1_DRAW || phase === PHASES.P1_PLAY ? 'p1' :
    phase === PHASES.P2_DRAW || phase === PHASES.P2_PLAY ? 'p2' :
    null

  const isAiTurn = isAI && activePlayer === 'p2'
  const isHumanPlayPhase = (phase === PHASES.P1_PLAY) || (phase === PHASES.P2_PLAY && !isAI)
  const isHumanMovePhase = phase === PHASES.MOVE && !winner

  const p1NeedsMove = phase === PHASES.MOVE && pendingMoves.p1 === null
  const p2NeedsMove = phase === PHASES.MOVE && pendingMoves.p2 === null
  const humanNeedsMove = isHumanMovePhase && p1NeedsMove

  const validMovesP1 = humanNeedsMove
    ? getValidMoves(grid, mascots.p2, 'p1')
    : []

  const validMovesP2 = !isAI && p2NeedsMove
    ? getValidMoves(grid, mascots.p1, 'p2')
    : []

  // Reset AI guards when phase changes
  useEffect(() => {
    aiPlayingRef.current = false
    aiMovingRef.current = false
  }, [phase])

  // Scroll log
  useEffect(() => {
    if (showLog) logBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length, showLog])

  // Hot-seat: pass screen between P1 play → P2 play
  useEffect(() => {
    if (mode === 'hotseat' && phase === PHASES.P2_DRAW) {
      setShowPassScreen(true)
    }
  }, [phase, mode])

  // === Auto-advance draws ===
  useEffect(() => {
    if (phase === PHASES.P1_DRAW && !winner) {
      const t = setTimeout(() => dispatch({ type: 'DRAW_CARD', payload: { player: 'p1' } }), 400)
      return () => clearTimeout(t)
    }
  }, [phase, winner])

  useEffect(() => {
    if (phase === PHASES.P2_DRAW && !winner && !showPassScreen) {
      const t = setTimeout(() => dispatch({ type: 'DRAW_CARD', payload: { player: 'p2' } }), 400)
      return () => clearTimeout(t)
    }
  }, [phase, winner, showPassScreen])

  // === AI: play phase ===
  useEffect(() => {
    if (!isAiTurn || phase !== PHASES.P2_PLAY || winner) return
    if (aiPlayingRef.current) return
    aiPlayingRef.current = true

    const t = setTimeout(() => {
      const aiState = { ...state, activePlayer: 'p2' }
      const play = chooseCardPlay(aiState)
      if (play) {
        const card = hands.p2[play.cardIndex]
        dispatch({ type: 'PLAY_CARD', payload: { cardIndex: play.cardIndex, row: play.row, col: play.col, player: 'p2' } })
        if (card?.college) {
          dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, play.row, play.col), player: 'p2' } })
        }
      }
      // Use a fresh timeout so the PLAY_CARD dispatch is processed first
      setTimeout(() => dispatch({ type: 'END_PLAY_PHASE', payload: { player: 'p2' } }), 300)
    }, 600)
    return () => clearTimeout(t)
  }, [isAiTurn, phase, winner])

  // === AI: move phase ===
  useEffect(() => {
    if (!isAI || phase !== PHASES.MOVE || winner) return
    if (pendingMoves.p2 !== null) return // Already submitted
    if (aiMovingRef.current) return
    aiMovingRef.current = true

    const t = setTimeout(() => {
      const aiState = { ...state, activePlayer: 'p2' }
      const move = chooseMove(aiState)
      if (move) {
        dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p2', row: move.row, col: move.col } })
      }
    }, 500)
    return () => clearTimeout(t)
  }, [isAI, phase, winner, pendingMoves.p2])

  // === Auto-resolve when both moves are in ===
  useEffect(() => {
    if (phase !== PHASES.RESOLVE) return
    const t = setTimeout(() => dispatch({ type: 'RESOLVE_MOVES' }), 400)
    return () => clearTimeout(t)
  }, [phase])

  // === Auto-advance CHECK_WIN → next turn ===
  useEffect(() => {
    if (phase !== PHASES.CHECK_WIN || winner || pendingLateral) return
    const t = setTimeout(() => dispatch({ type: 'END_TURN' }), 500)
    return () => clearTimeout(t)
  }, [phase, winner, pendingLateral])

  // === Tile click handler ===
  const handleTileClick = useCallback((row, col) => {
    if (winner) return

    if (pendingLateral?.length > 0) {
      if (pendingLateral.some(o => o.row === row && o.col === col)) {
        dispatch({ type: 'RESOLVE_LATERAL', payload: { row, col, player: state.pendingLateralPlayer } })
      }
      return
    }

    if (isHumanPlayPhase && selectedCardIndex !== null) {
      const player = activePlayer
      const card = hands[player][selectedCardIndex]
      dispatch({ type: 'PLAY_CARD', payload: { cardIndex: selectedCardIndex, row, col, player } })
      if (card?.college) {
        dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, row, col), player } })
      }
      setSelectedCardIndex(null)
      return
    }

    if (humanNeedsMove && validMovesP1.some(m => m.row === row && m.col === col)) {
      dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p1', row, col } })
      return
    }

    if (!isAI && p2NeedsMove && !p1NeedsMove && validMovesP2.some(m => m.row === row && m.col === col)) {
      dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p2', row, col } })
      return
    }
  }, [winner, pendingLateral, isHumanPlayPhase, selectedCardIndex, hands, activePlayer, humanNeedsMove, validMovesP1, p2NeedsMove, p1NeedsMove, validMovesP2, isAI, state])

  // === Drop card handler ===
  const handleDropCard = useCallback((cardIndex, row, col) => {
    if (!isHumanPlayPhase || winner) return
    const player = activePlayer
    const card = hands[player][cardIndex]
    dispatch({ type: 'PLAY_CARD', payload: { cardIndex, row, col, player } })
    if (card?.college) {
      dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, row, col), player } })
    }
    setSelectedCardIndex(null)
  }, [isHumanPlayPhase, winner, hands, activePlayer])

  const handleCardSelect = useCallback((index) => {
    if (!isHumanPlayPhase || winner) return
    setSelectedCardIndex(prev => prev === index ? null : index)
  }, [isHumanPlayPhase, winner])

  const canDropCards = isHumanPlayPhase && !winner

  // Phase display
  const phaseLabel = {
    [PHASES.P1_DRAW]: 'P1 Drawing...',
    [PHASES.P1_PLAY]: 'P1 Place Terrain',
    [PHASES.P2_DRAW]: 'P2 Drawing...',
    [PHASES.P2_PLAY]: isAI ? 'AI Placing...' : 'P2 Place Terrain',
    [PHASES.MOVE]: 'Choose Movement',
    [PHASES.RESOLVE]: 'Resolving...',
    [PHASES.CHECK_WIN]: '...',
  }[phase] || phase

  const phaseColor = {
    [PHASES.P1_DRAW]: '#3b82f6',
    [PHASES.P1_PLAY]: '#4ade80',
    [PHASES.P2_DRAW]: '#3b82f6',
    [PHASES.P2_PLAY]: '#a78bfa',
    [PHASES.MOVE]: '#ef4444',
    [PHASES.RESOLVE]: '#f59e0b',
    [PHASES.CHECK_WIN]: '#f59e0b',
  }[phase] || '#888'

  const highlightedMoves = humanNeedsMove
    ? validMovesP1
    : (!isAI && p2NeedsMove && !p1NeedsMove ? validMovesP2 : [])

  return (
    <div className="game-screen">
      {/* TOP BAR */}
      <div className="top-bar">
        <button onClick={onExit} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '12px', padding: '4px 8px' }}>
          ← Menu
        </button>

        <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Turn {turnCount}</span>

        <motion.span
          key={phase}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            background: phaseColor,
            color: 'white',
            padding: '4px 12px',
            borderRadius: '6px',
            fontWeight: 700,
            fontSize: '12px',
            textTransform: 'uppercase',
          }}
        >
          {phaseLabel}
        </motion.span>

        {phase === PHASES.MOVE && pendingMoves.p1 && !pendingMoves.p2 && isAI && (
          <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>
            AI choosing move...
          </span>
        )}

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

      {/* BOARD AREA */}
      <div className="board-area">
        <Board
          grid={grid}
          mascots={mascots}
          validMoves={[...highlightedMoves, ...(pendingLateral || [])]}
          onTileClick={handleTileClick}
          onDropCard={handleDropCard}
          canDropCards={canDropCards}
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
        <div className="controls-strip">
          {isHumanPlayPhase && (
            <>
              <span className="hint">Drag a card onto the board, or click to select & place</span>
              <button className="btn btn--primary" onClick={() => {
                setSelectedCardIndex(null)
                dispatch({ type: 'END_PLAY_PHASE', payload: { player: activePlayer } })
              }}>
                Done Playing
              </button>
            </>
          )}

          {humanNeedsMove && (
            <>
              <span className="hint">Click a glowing tile to push P2's mascot</span>
              {validMovesP1.map(m => (
                <button
                  key={`${m.row}-${m.col}`}
                  className="btn"
                  onClick={() => dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p1', row: m.row, col: m.col } })}
                >
                  {m.direction.charAt(0).toUpperCase() + m.direction.slice(1)}
                </button>
              ))}
            </>
          )}

          {!isAI && p2NeedsMove && !p1NeedsMove && (
            <>
              <span className="hint">P2: Click a glowing tile to push P1's mascot</span>
              {validMovesP2.map(m => (
                <button
                  key={`${m.row}-${m.col}`}
                  className="btn"
                  onClick={() => dispatch({ type: 'SUBMIT_MOVE', payload: { player: 'p2', row: m.row, col: m.col } })}
                >
                  {m.direction.charAt(0).toUpperCase() + m.direction.slice(1)}
                </button>
              ))}
            </>
          )}

          {phase === PHASES.MOVE && pendingMoves.p1 && (isAI ? !pendingMoves.p2 : false) && (
            <span className="hint">Waiting for opponent...</span>
          )}

          {pendingLateral && (
            <>
              <span className="hint" style={{ color: 'var(--accent-gold)' }}>White tile! Slide sideways?</span>
              <button className="btn" onClick={() => dispatch({ type: 'SKIP_LATERAL' })}>Skip</button>
            </>
          )}

          {(phase === PHASES.P1_DRAW || phase === PHASES.P2_DRAW) && (
            <span className="hint">Drawing...</span>
          )}

          {isAiTurn && phase === PHASES.P2_PLAY && (
            <span className="hint">AI placing terrain...</span>
          )}

          {phase === PHASES.RESOLVE && <span className="hint">Resolving movement...</span>}
        </div>

        {/* Hand: show during play phases and P1 move phase */}
        {(isHumanPlayPhase || humanNeedsMove) && (
          <PlayerHand
            cards={isHumanPlayPhase ? hands[activePlayer] : []}
            selectedIndex={isHumanPlayPhase ? selectedCardIndex : null}
            onSelect={handleCardSelect}
            canDrag={canDropCards}
          />
        )}

        {!isAI && p2NeedsMove && !p1NeedsMove && (
          <div style={{ minHeight: '40px' }} />
        )}
      </div>

      {/* PASS SCREEN */}
      <AnimatePresence>
        {showPassScreen && (
          <PassScreen
            nextPlayer="p2"
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

function buildCollegeParams(college, row, col) {
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
