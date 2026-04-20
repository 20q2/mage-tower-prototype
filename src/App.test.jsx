import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the main menu', () => {
    render(<App />)
    expect(screen.getByText('Mage Tower')).toBeInTheDocument()
  })
})
