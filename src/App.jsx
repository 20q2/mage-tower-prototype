import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import MainMenu from './components/MainMenu'
import GameScreen from './components/GameScreen'

export default function App() {
  const [gameConfig, setGameConfig] = useState(null)

  if (!gameConfig) {
    return <MainMenu onStartGame={setGameConfig} />
  }

  return (
    <AnimatePresence mode="wait">
      <GameScreen
        key={`${gameConfig.p1Deck}-${gameConfig.p2Deck}-${Date.now()}`}
        p1Deck={gameConfig.p1Deck}
        p2Deck={gameConfig.p2Deck}
        mode={gameConfig.mode}
        mascots={gameConfig.mascots}
        onExit={() => setGameConfig(null)}
      />
    </AnimatePresence>
  )
}
