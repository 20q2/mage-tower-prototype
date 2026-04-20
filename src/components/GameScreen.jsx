import { useReducer, useCallback, useEffect, useState, useRef } from 'react'
import { AnimatePresence } from 'framer-motion'
import Board from './Board'
import PlayerHand from './PlayerHand'
import PhaseIndicator from './PhaseIndicator'
import GameLog from './GameLog'
import MoveControls from './MoveControls'
import GameOverModal from './GameOverModal'
import PassScreen from './PassScreen'
import { createInitialState, gameReducer } from '../engine/gameState'
import { getValidMoves } from '../engine/rules'
import { chooseCardPlay, chooseMove } from '../engine/ai'
import { PHASES } from '../engine/constants'
import { ROWS, COLS } from '../engine/constants'

export default function GameScreen({ p1Deck, p2Deck, mode, onExit }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(p1Deck, p2Deck)
  )

  const [selectedCardIndex, setSelectedCardIndex] = useState(null)
  const [showPassScreen, setShowPassScreen] = useState(false)
  const prevTurnRef = useRef(state.turnCount)

  const {
    grid,
    mascots,
    hands,
    phase,
    activePlayer,
    turnCount,
    winner,
    pendingLateral,
    log,
  } = state

  const opponent = activePlayer === 'p1' ? 'p2' : 'p1'
  const isAiTurn = mode === 'ai' && activePlayer === 'p2'
  const isHumanTurn = !isAiTurn

  // --- Hot-seat: show pass screen on turn change ---
  useEffect(() => {
    if (
      mode === 'hotseat' &&
      phase === PHASES.DRAW &&
      turnCount > 1 &&
      turnCount !== prevTurnRef.current
    ) {
      setShowPassScreen(true)
    }
    prevTurnRef.current = turnCount
  }, [turnCount, phase, mode])

  // --- Auto-advance DRAW phase ---
  useEffect(() => {
    if (phase !== PHASES.DRAW || winner || showPassScreen) return
    const timer = setTimeout(() => {
      dispatch({ type: 'DRAW_CARD' })
    }, 400)
    return () => clearTimeout(timer)
  }, [phase, winner, showPassScreen])

  // --- Auto-advance CHECK_WIN phase ---
  useEffect(() => {
    if (phase !== PHASES.CHECK_WIN) return
    if (winner) return // GameOverModal will show
    if (pendingLateral) return // wait for lateral resolution
    const timer = setTimeout(() => {
      dispatch({ type: 'END_TURN' })
    }, 300)
    return () => clearTimeout(timer)
  }, [phase, winner, pendingLateral])

  // --- AI: PLAY phase ---
  useEffect(() => {
    if (!isAiTurn || phase !== PHASES.PLAY || winner) return
    const timer = setTimeout(() => {
      const play = chooseCardPlay(state)
      if (play) {
        const card = hands[activePlayer][play.cardIndex]
        dispatch({
          type: 'PLAY_CARD',
          payload: { cardIndex: play.cardIndex, row: play.row, col: play.col },
        })
        if (card && card.college) {
          // Dispatch college effect after card is played
          const params = buildCollegeParams(card.college, play.row, play.col, state)
          dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params } })
        }
      }
      // End play phase after playing (or if no play available)
      setTimeout(() => {
        dispatch({ type: 'END_PLAY_PHASE' })
      }, 200)
    }, 500)
    return () => clearTimeout(timer)
  }, [isAiTurn, phase, winner])

  // --- AI: MOVE phase ---
  useEffect(() => {
    if (!isAiTurn || phase !== PHASES.MOVE || winner) return
    const timer = setTimeout(() => {
      const move = chooseMove(state)
      if (move) {
        dispatch({ type: 'MOVE_MASCOT', payload: { row: move.row, col: move.col } })
      }
    }, 800)
    return () => clearTimeout(timer)
  }, [isAiTurn, phase, winner])

  // --- AI: handle pending lateral ---
  useEffect(() => {
    if (!isAiTurn || !pendingLateral || winner) return
    const timer = setTimeout(() => {
      // AI picks the first lateral option or skips
      if (pendingLateral.length > 0) {
        dispatch({
          type: 'RESOLVE_LATERAL',
          payload: { row: pendingLateral[0].row, col: pendingLateral[0].col },
        })
      } else {
        dispatch({ type: 'SKIP_LATERAL' })
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [isAiTurn, pendingLateral, winner])

  // --- Compute valid moves and place targets ---
  const validMoves =
    phase === PHASES.MOVE && isHumanTurn && !winner
      ? getValidMoves(grid, mascots[opponent], activePlayer)
      : []

  const placeTargets =
    phase === PHASES.PLAY && isHumanTurn && selectedCardIndex !== null
      ? allTilePositions()
      : []

  // --- Human: tile click handler ---
  const handleTileClick = useCallback(
    (row, col) => {
      if (winner || !isHumanTurn) return

      // Pending lateral: click a lateral option tile
      if (pendingLateral && pendingLateral.length > 0) {
        const isLateralOption = pendingLateral.some(
          (opt) => opt.row === row && opt.col === col
        )
        if (isLateralOption) {
          dispatch({ type: 'RESOLVE_LATERAL', payload: { row, col } })
        }
        return
      }

      // PLAY phase: place selected card
      if (phase === PHASES.PLAY && selectedCardIndex !== null) {
        const card = hands[activePlayer][selectedCardIndex]
        dispatch({
          type: 'PLAY_CARD',
          payload: { cardIndex: selectedCardIndex, row, col },
        })
        if (card && card.college) {
          const params = buildCollegeParams(card.college, row, col, state)
          dispatch({ type: 'ACTIVATE_COLLEGE', payload: { college: card.college, params } })
        }
        setSelectedCardIndex(null)
        return
      }

      // MOVE phase: click a valid move tile
      if (phase === PHASES.MOVE) {
        const isValid = validMoves.some((m) => m.row === row && m.col === col)
        if (isValid) {
          dispatch({ type: 'MOVE_MASCOT', payload: { row, col } })
        }
      }
    },
    [
      winner,
      isHumanTurn,
      pendingLateral,
      phase,
      selectedCardIndex,
      hands,
      activePlayer,
      validMoves,
      state,
    ]
  )

  // --- Human: card selection ---
  const handleCardSelect = useCallback(
    (index) => {
      if (phase !== PHASES.PLAY || !isHumanTurn || winner) return
      setSelectedCardIndex((prev) => (prev === index ? null : index))
    },
    [phase, isHumanTurn, winner]
  )

  // --- Human: end play phase ---
  const handleEndPlayPhase = useCallback(() => {
    if (phase !== PHASES.PLAY || !isHumanTurn) return
    setSelectedCardIndex(null)
    dispatch({ type: 'END_PLAY_PHASE' })
  }, [phase, isHumanTurn])

  // --- Human: move via MoveControls button ---
  const handleMoveButton = useCallback(
    (move) => {
      if (phase !== PHASES.MOVE || !isHumanTurn || winner) return
      dispatch({ type: 'MOVE_MASCOT', payload: { row: move.row, col: move.col } })
    },
    [phase, isHumanTurn, winner]
  )

  // --- Human: skip lateral ---
  const handleSkipLateral = useCallback(() => {
    dispatch({ type: 'SKIP_LATERAL' })
  }, [])

  // --- Rematch ---
  const handleRematch = useCallback(() => {
    window.location.reload()
  }, [])

  // --- Lateral highlight positions ---
  const lateralTargets =
    pendingLateral && isHumanTurn ? pendingLateral : []

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '260px 1fr 260px',
        gap: '16px',
        minHeight: '100vh',
        padding: '16px',
        maxWidth: '1100px',
        margin: '0 auto',
      }}
    >
      {/* LEFT COLUMN: Hand + Controls */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3
          style={{
            fontFamily: 'Cinzel, serif',
            fontSize: '14px',
            color:
              activePlayer === 'p1' ? '#4ade80' : '#a78bfa',
            textAlign: 'center',
          }}
        >
          {activePlayer === 'p1' ? 'Player 1' : 'Player 2'}'s Hand
        </h3>
        <PlayerHand
          cards={hands[activePlayer]}
          selectedIndex={
            phase === PHASES.PLAY && isHumanTurn ? selectedCardIndex : null
          }
          onSelect={handleCardSelect}
        />

        {/* Play phase controls */}
        {phase === PHASES.PLAY && isHumanTurn && (
          <div style={{ textAlign: 'center' }}>
            {selectedCardIndex !== null && (
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  marginBottom: '8px',
                }}
              >
                Click a tile on the board to place the card
              </p>
            )}
            <button
              onClick={handleEndPlayPhase}
              style={{
                background: 'var(--bg-light)',
                color: 'var(--text-primary)',
                padding: '10px 20px',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                fontSize: '13px',
                border: '2px solid var(--accent-gold)',
              }}
            >
              End Play Phase
            </button>
          </div>
        )}

        {/* Move phase controls */}
        {phase === PHASES.MOVE && isHumanTurn && !pendingLateral && (
          <MoveControls validMoves={validMoves} onMove={handleMoveButton} />
        )}

        {/* Pending lateral controls */}
        {pendingLateral && isHumanTurn && (
          <div style={{ textAlign: 'center' }}>
            <p
              style={{
                color: 'var(--accent-gold)',
                fontSize: '13px',
                marginBottom: '8px',
                fontWeight: 600,
              }}
            >
              Lateral slide! Click a highlighted tile or skip.
            </p>
            <button
              onClick={handleSkipLateral}
              style={{
                background: 'var(--bg-light)',
                color: 'var(--text-primary)',
                padding: '8px 16px',
                borderRadius: 'var(--radius)',
                fontWeight: 600,
                fontSize: '13px',
                border: '2px solid var(--text-muted)',
              }}
            >
              Skip Lateral
            </button>
          </div>
        )}
      </div>

      {/* CENTER COLUMN: Phase indicator + Board */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <PhaseIndicator
          phase={phase}
          activePlayer={activePlayer}
          turnCount={turnCount}
        />
        <Board
          grid={grid}
          mascots={mascots}
          validMoves={[...validMoves, ...lateralTargets]}
          onTileClick={handleTileClick}
          placeTargets={placeTargets}
        />
      </div>

      {/* RIGHT COLUMN: Game Log + Back Button */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <GameLog entries={log} />
        <button
          onClick={onExit}
          style={{
            background: 'var(--bg-light)',
            color: 'var(--text-secondary)',
            padding: '10px 16px',
            borderRadius: 'var(--radius)',
            fontWeight: 600,
            fontSize: '13px',
            border: '2px solid var(--text-muted)',
            marginTop: 'auto',
          }}
        >
          Back to Menu
        </button>
      </div>

      {/* Pass Screen for hot-seat */}
      <AnimatePresence>
        {showPassScreen && (
          <PassScreen
            nextPlayer={activePlayer}
            onReady={() => setShowPassScreen(false)}
          />
        )}
      </AnimatePresence>

      {/* Game Over Modal */}
      <AnimatePresence>
        {winner && (
          <GameOverModal
            winner={winner}
            turnCount={turnCount}
            onRematch={handleRematch}
            onMenu={onExit}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// --- Helper: all tile positions for card placement ---
function allTilePositions() {
  const positions = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      positions.push({ row, col })
    }
  }
  return positions
}

// --- Helper: build college effect params ---
function buildCollegeParams(college, row, col, state) {
  switch (college) {
    case 'witherbloom':
      return {
        centerRow: row,
        centerCol: col,
        wallRow: row,
        wallCol: col,
      }
    case 'prismari':
      return { row }
    case 'lorehold':
      return {
        discardIndex: 0,
        row,
        col,
      }
    case 'silverquill':
      return {}
    case 'quandrix':
      return {}
    default:
      return {}
  }
}
