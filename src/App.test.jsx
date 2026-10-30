import { vi } from 'vitest'
vi.mock('./components/Reactor.jsx', () => ({ default: () => null }))
import { render, screen } from '@testing-library/react'
import App from './App.jsx'

test('renders App', () => {
  render(<App />)
  expect(screen.getByText(/Start Listening/i)).toBeInTheDocument()
})
