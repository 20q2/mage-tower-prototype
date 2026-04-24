import { useReducer, useCallback, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Board from './Board'
import PlayerHand from './PlayerHand'
import GameOverModal from './GameOverModal'
import PassScreen from './PassScreen'
import { createInitialState, gameReducer } from '../engine/gameState'
import { getValidMoves } from '../engine/rules'
import { chooseCardPlay, chooseMove, shouldUseAbility } from '../engine/ai'
import { PHASES, MASCOTS, COLS } from '../engine/constants'

const COLOR_NAMES = { white: 'White', blue: 'Blue', black: 'Black', red: 'Red', green: 'Green' }

export default function GameScreen({ p1Deck, p2Deck, mode, onExit, mascots: mascotChoices }) {
  const [state, dispatch] = useReducer(gameReducer, null, () =>
    createInitialState(p1Deck, p2Deck, mascotChoices)
  )

  const [selectedCardIndex, setSelectedCardIndex] = useState(null)
  const [collegeChoice, setCollegeChoice] = useState(null)
  const [showPassScreen, setShowPassScreen] = useState(false)
  const [showLog, setShowLog] = useState(false)
  const [abilityPrompt, setAbilityPrompt] = useState(null) // { player } when prompting
  const [quandrixSelection, setQuandrixSelection] = useState(null) // { tile1: {row,col} } partial
  const [prismariPrompt, setPrismariPrompt] = useState(null) // { player }
  const logBottomRef = useRef(null)
  const aiActingRef = useRef(false)

  const {
    grid, mascots, hands, phase, activePlayer, playTurn, turnCount, winner,
    pendingMoves, pendingWhiteBonus, log, mascotAbilities, abilityUsed,
    silverquillImmunity,
  } = state

  const isAI = mode === 'ai'
  const isAiPlayTurn = isAI && playTurn === 'p2'
  const isHumanPlayTurn = playTurn === 'p1' || (playTurn === 'p2' && !isAI)

  // Move phase: who still needs to submit?
  const p1NeedsMove = phase === PHASES.MOVE && pendingMoves.p1 === null && !pendingWhiteBonus.p1 && !pendingWhiteBonus.p2
  const p2NeedsMove = phase === PHASES.MOVE && pendingMoves.p2 === null && !pendingWhiteBonus.p1 && !pendingWhiteBonus.p2
  const p1NeedsWhiteBonus = phase === PHASES.MOVE && pendingWhiteBonus.p1
  const p2NeedsWhiteBonus = phase === PHASES.MOVE && pendingWhiteBonus.p2

  // Valid moves for movement (pass silverquillImmunity for green wall bypass)
  const moveOpts = { silverquillImmunity }
  const validMovesP1 = p1NeedsMove ? getValidMoves(grid, mascots.p1, 'p1', moveOpts) : []
  const validMovesP2 = p2NeedsMove && !isAI ? getValidMoves(grid, mascots.p2, 'p2', moveOpts) : []
  const whiteBonusMovesP1 = p1NeedsWhiteBonus ? getValidMoves(grid, mascots.p1, 'p1', { bonus: true, silverquillImmunity }) : []
  const whiteBonusMovesP2 = p2NeedsWhiteBonus && !isAI ? getValidMoves(grid, mascots.p2, 'p2', { bonus: true, silverquillImmunity }) : []

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
        dispatch({ type: 'PLAY_CARD', payload: { cardIndex: play.cardIndex, row: play.row, col: play.col, playMode: play.playMode, discardIndices: play.discardIndices || [] } })
      } else {
        dispatch({ type: 'PASS' })
      }
    }, 700)
    return () => clearTimeout(t)
  }, [isAiPlayTurn, phase, winner])

  // === AI: use ability at start of move phase ===
  useEffect(() => {
    if (!isAI || phase !== PHASES.MOVE || winner) return
    if (pendingWhiteBonus.p1 || pendingWhiteBonus.p2) return
    if (pendingMoves.p2 !== null) return

    // AI tries ability
    const abilityAction = shouldUseAbility(state, 'p2')
    if (abilityAction && !abilityUsed.p2) {
      const t = setTimeout(() => {
        dispatch(abilityAction)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [isAI, phase, winner, pendingMoves.p2, pendingWhiteBonus, abilityUsed.p2])

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
      const bonusMoves = getValidMoves(grid, mascots.p2, 'p2', { bonus: true, silverquillImmunity })
      if (bonusMoves.length > 0) {
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

  // Play card helper — auto-selects discard from end of hand
  function playCard(cardIndex, row, col, playMode) {
    const player = playTurn
    const discardCost = state.playsThisTurn[player] // 0 for 1st, 1 for 2nd, 2 for 3rd...
    const hand = hands[player]

    // Check if player can afford the cost
    // They need: 1 card to play + discardCost cards to discard
    if (hand.length < 1 + discardCost) return // Can't afford

    // Auto-pick discards: pick cards from end of hand (excluding the played card)
    const discardIndices = []
    for (let i = hand.length - 1; i >= 0 && discardIndices.length < discardCost; i--) {
      if (i !== cardIndex) discardIndices.push(i)
    }

    dispatch({ type: 'PLAY_CARD', payload: { cardIndex, row, col, playMode, discardIndices } })
    setSelectedCardIndex(null)
    setCollegeChoice(null)
  }

  // Ability activation helpers
  function activateAbility(player, params = {}) {
    dispatch({ type: 'USE_ABILITY', payload: { player, params } })
    setAbilityPrompt(null)
    setPrismariPrompt(null)
    setQuandrixSelection(null)
  }

  // Tile click
  const handleTileClick = useCallback((row, col) => {
    if (winner) return

    // Quandrix tile selection mode
    if (quandrixSelection) {
      if (!quandrixSelection.tile1) {
        setQuandrixSelection({ ...quandrixSelection, tile1: { row, col } })
      } else {
        activateAbility(quandrixSelection.player, {
          tile1: quandrixSelection.tile1,
          tile2: { row, col },
        })
      }
      return
    }

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
      p1NeedsWhiteBonus, whiteBonusMovesP1, p2NeedsWhiteBonus, whiteBonusMovesP2,
      quandrixSelection])

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

  // Ability button display
  function renderAbilityButton(player) {
    const ability = mascotAbilities[player]
    if (!ability || abilityUsed[player]) return null
    if (phase !== PHASES.MOVE) return null
    if (pendingWhiteBonus.p1 || pendingWhiteBonus.p2) return null
    if (isAI && player === 'p2') return null

    const mascotName = MASCOTS[ability]?.name || ability

    return (
      <button
        className="btn btn--ability"
        onClick={() => {
          if (ability === 'prismari') {
            setPrismariPrompt({ player })
          } else if (ability === 'quandrix') {
            setQuandrixSelection({ player, tile1: null })
          } else {
            activateAbility(player, {})
          }
        }}
        style={{
          background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
          color: 'white',
          padding: '6px 14px',
          borderRadius: '6px',
          fontWeight: 700,
          fontSize: '11px',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {mascotName} Ability
      </button>
    )
  }

  return (
    <div className="game-screen">
      {/* TOP BAR */}
      <div className="top-bar">
        <button onClick={onExit} style={{ background: 'none', color: 'var(--text-muted)', fontSize: '12px', padding: '4px 8px' }}>
          &larr; Menu
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

      {/* COLLEGE CHOICE MODAL — just 2 color buttons */}
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
                Pick a color
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
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

      {/* PRISMARI DIRECTION MODAL */}
      <AnimatePresence>
        {prismariPrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={() => setPrismariPrompt(null)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--bg-medium)', borderRadius: '12px', padding: '24px', border: '2px solid var(--accent-gold)', maxWidth: '300px', textAlign: 'center' }}
            >
              <h3 style={{ fontFamily: 'Cinzel, serif', color: 'var(--accent-gold)', marginBottom: '16px', fontSize: '16px' }}>
                Kinetic Jaunt
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '16px' }}>
                Shift your mascot left or right
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                {mascots[prismariPrompt.player].col > 0 && (
                  <button onClick={() => activateAbility(prismariPrompt.player, { direction: 'left' })}
                    className="btn" style={{ padding: '10px 20px' }}>Left</button>
                )}
                {mascots[prismariPrompt.player].col < COLS - 1 && (
                  <button onClick={() => activateAbility(prismariPrompt.player, { direction: 'right' })}
                    className="btn" style={{ padding: '10px 20px' }}>Right</button>
                )}
                <button onClick={() => setPrismariPrompt(null)}
                  style={{ background: 'none', color: 'var(--text-muted)', padding: '8px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QUANDRIX SELECTION OVERLAY */}
      <AnimatePresence>
        {quandrixSelection && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', top: 0, left: 0, right: 0,
              background: 'rgba(79, 70, 229, 0.15)',
              padding: '8px 16px', textAlign: 'center', zIndex: 40,
              color: 'white', fontSize: '13px', fontWeight: 700,
            }}
          >
            {!quandrixSelection.tile1
              ? 'Vortex Warp: Click the FIRST tile to swap'
              : 'Now click the SECOND tile to swap with'}
            <button onClick={() => setQuandrixSelection(null)}
              style={{ marginLeft: '16px', background: 'none', color: '#ccc', fontSize: '12px', border: '1px solid #666', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>
              Cancel
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM BAR */}
      <div className="bottom-bar">
        <div className="controls-strip">
          {/* Play phase */}
          {phase === PHASES.PLAY && isHumanPlayTurn && (() => {
            const cost = state.playsThisTurn[playTurn]
            const canAfford = hands[playTurn].length >= 1 + cost
            const costLabel = cost === 0 ? 'free' : `costs ${cost} discard${cost > 1 ? 's' : ''}`
            return <>
              <span className="hint">
                {!canAfford
                  ? `Not enough cards to play (need ${1 + cost})`
                  : selectedCardIndex !== null
                    ? `Click a tile to place (${costLabel})`
                    : `${playTurnName}: play a card (${costLabel}) or pass`}
              </span>
              <button className="btn btn--primary" onClick={() => {
                setSelectedCardIndex(null)
                dispatch({ type: 'PASS' })
              }}>
                Pass
              </button>
            </>
          })()}

          {/* Waiting for AI/opponent to play */}
          {phase === PHASES.PLAY && !isHumanPlayTurn && (
            <span className="hint">{isAI ? 'AI deciding...' : `Waiting for ${playTurnName}...`}</span>
          )}

          {/* Move phase */}
          {p1NeedsMove && (
            <>
              <span className="hint">P1: choose your move</span>
              {renderAbilityButton('p1')}
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
              {renderAbilityButton('p2')}
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
