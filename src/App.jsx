import { useState } from 'react'

export default function App() {
  const [screen, setScreen] = useState('menu')

  return (
    <div style={{ minHeight: '100vh' }}>
      {screen === 'menu' && <div>Main Menu (placeholder)</div>}
      {screen === 'game' && <div>Game Screen (placeholder)</div>}
    </div>
  )
}
