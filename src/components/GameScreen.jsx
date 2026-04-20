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

const COLOR_NAMES = { white: 'White', blue: 'Blue', black: 'Black', red: 'Red', green: 'Green' }

export default function GameScreen({ p1Deck, p2Deck, mode, onExit }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(p1Deck, p2Deck)
  )

  const [selectedCardIndex, setSelectedCardIndex] = useState(null)
  const [showPassScreen, setShowPassScreen] = useState(false)
  const [showLog, setShowLog] = useState(false)
  // For college cards: { cardIndex, row, col, card } — waiting for player to choose mode
  const [collegeChoice, setCollegeChoice] = useState(null)
  const logBottomRef = useRef(null)
  const aiActingRef = useRef(false)

  const {
    grid, mascots, hands, phase, activePlayer, turnCount, winner,
    actionsRemaining, pendingLateral, log,
  } = state

  const isAI = mode === 'ai'
  const isAiTurn = isAI && activePlayer === 'p2'
  const isHumanTurn = !isAiTurn

  const canAct = phase === PHASES.ACT && actionsRemaining > 0 && !winner && !pendingLateral && !collegeChoice
  const canPlay = canAct && hands[activePlayer].length > 0
  const canMove = canAct

  const validMoves = canMove && isHumanTurn
    ? getValidMoves(grid, mascots[activePlayer], activePlayer)
    : []

  useEffect(() => { aiActingRef.current = false }, [phase, activePlayer, actionsRemaining])

  useEffect(() => {
    if (showLog) logBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log.length, showLog])

  useEffect(() => {
    if (mode === 'hotseat' && phase === PHASES.DRAW && turnCount > 1) setShowPassScreen(true)
  }, [activePlayer])

  // Auto-draw
  useEffect(() => {
    if (phase !== PHASES.DRAW || winner || showPassScreen) return
    const t = setTimeout(() => dispatch({ type: 'DRAW_CARD' }), 400)
    return () => clearTimeout(t)
  }, [phase, winner, showPassScreen, activePlayer])

  // AI actions
  useEffect(() => {
    if (!isAiTurn || phase !== PHASES.ACT || winner || pendingLateral) return
    if (actionsRemaining <= 0) return
    if (aiActingRef.current) return
    aiActingRef.current = true

    const t = setTimeout(() => {
      const aiState = { ...state, activePlayer: 'p2' }

      if (actionsRemaining >= 2 && hands.p2.length > 0) {
        const play = chooseCardPlay(aiState)
        if (play) {
          const card = hands.p2[play.cardIndex]
          if (card.college) {
            // AI picks: use as college effect ~40% of the time, otherwise pick best color
            const useCollege = Math.random() < 0.4
            if (useCollege) {
              dispatch({ type: 'PLAY_CARD', payload: { cardIndex: play.cardIndex, row: play.row, col: play.col, playMode: 'college' } })
              dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, play.row, play.col) } })
            } else {
              // Pick whichever color helps more (simplified: pick color1)
              dispatch({ type: 'PLAY_CARD', payload: { cardIndex: play.cardIndex, row: play.row, col: play.col, playMode: 'color1' } })
            }
          } else {
            dispatch({ type: 'PLAY_CARD', payload: { cardIndex: play.cardIndex, row: play.row, col: play.col } })
          }
          return
        }
      }

      const move = chooseMove(aiState)
      if (move) {
        dispatch({ type: 'MOVE_MASCOT', payload: move })
      } else {
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

  // Auto end turn
  useEffect(() => {
    if (phase !== PHASES.CHECK_WIN || winner || pendingLateral) return
    const t = setTimeout(() => dispatch({ type: 'END_TURN' }), 500)
    return () => clearTimeout(t)
  }, [phase, winner, pendingLateral])

  // Play a card at a position with a chosen mode
  function playCard(cardIndex, row, col, playMode) {
    const card = hands[activePlayer][cardIndex]
    dispatch({ type: 'PLAY_CARD', payload: { cardIndex, row, col, playMode } })
    if (playMode === 'college' && card?.college) {
      dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params: buildCollegeParams(card.college, row, col) } })
    }
    setSelectedCardIndex(null)
    setCollegeChoice(null)
  }

  // Tile click
  const handleTileClick = useCallback((row, col) => {
    if (winner || !isHumanTurn) return

    if (pendingLateral?.length > 0) {
      if (pendingLateral.some(o => o.row === row && o.col === col)) {
        dispatch({ type: 'RESOLVE_LATERAL', payload: { row, col } })
      }
      return
    }

    // Place card
    if (canPlay && selectedCardIndex !== null) {
      const card = hands[activePlayer][selectedCardIndex]
      if (card.college) {
        // Show choice modal
        setCollegeChoice({ cardIndex: selectedCardIndex, row, col, card })
      } else {
        playCard(selectedCardIndex, row, col)
      }
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
    if (card.college) {
      setCollegeChoice({ cardIndex, row, col, card })
      setSelectedCardIndex(null)
    } else {
      playCard(cardIndex, row, col)
    }
  }, [canPlay, isHumanTurn, winner, hands, activePlayer])

  const handleCardSelect = useCallback((index) => {
    if (!canPlay || !isHumanTurn || winner) return
    setSelectedCardIndex(prev => prev === index ? null : index)
  }, [canPlay, isHumanTurn, winner])

  const playerColor = activePlayer === 'p1' ? '#4ade80' : '#a78bfa'
  const playerName = activePlayer === 'p1' ? 'Player 1' : 'Player 2'
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
            <span style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '4px' }}>actions</span>
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

      {/* COLLEGE CHOICE MODAL */}
      <AnimatePresence>
        {collegeChoice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50,
            }}
            onClick={() => setCollegeChoice(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.8, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{
                background: 'var(--bg-medium)', borderRadius: '12px', padding: '24px',
                border: '2px solid var(--accent-gold)', maxWidth: '360px', textAlign: 'center',
              }}
            >
              <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--accent-gold)', marginBottom: '8px', fontSize: '16px' }}>
                How to play {collegeChoice.card.name}?
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
                This is a {collegeChoice.card.college} card ({collegeChoice.card.collegeColors.map(c => COLOR_NAMES[c]).join('/')})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={() => playCard(collegeChoice.cardIndex, collegeChoice.row, collegeChoice.col, 'college')}
                  style={{
                    background: 'var(--mtg-gold)', color: 'var(--bg-dark)', padding: '10px 16px',
                    borderRadius: '6px', fontWeight: 700, fontSize: '13px', border: 'none', cursor: 'pointer',
                  }}
                >
                  {collegeChoice.card.college.charAt(0).toUpperCase() + collegeChoice.card.college.slice(1)} Effect
                </button>
                {collegeChoice.card.collegeColors.map((color, i) => (
                  <button
                    key={color}
                    onClick={() => playCard(collegeChoice.cardIndex, collegeChoice.row, collegeChoice.col, i === 0 ? 'color1' : 'color2')}
                    style={{
                      background: `var(--mtg-${color})`, color: color === 'black' ? '#ccc' : 'var(--bg-dark)',
                      padding: '10px 16px', borderRadius: '6px', fontWeight: 700, fontSize: '13px',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    Play as {COLOR_NAMES[color]} terrain
                  </button>
                ))}
                <button
                  onClick={() => setCollegeChoice(null)}
                  style={{
                    background: 'none', color: 'var(--text-muted)', padding: '8px',
                    fontSize: '12px', border: 'none', cursor: 'pointer',
                  }}
                >
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
          {collegeChoice && (
            <span className="hint" style={{ color: 'var(--accent-gold)' }}>Choose how to play this card...</span>
          )}
          {phase === PHASES.DRAW && <span className="hint">Drawing...</span>}
          {isAiTurn && phase === PHASES.ACT && <span className="hint">Opponent's turn...</span>}
        </div>

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
