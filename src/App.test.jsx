import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from './App.jsx'

describe('App security behavior', () => {
  it('renders App and shows the start button', () => {
    render(<App />)
    expect(screen.getByText(/Start Listening/i)).toBeInTheDocument()
  })

  it('displays an error when SpeechRecognition is unsupported', () => {
    // jsdom does not implement SpeechRecognition, so startRecognition takes the
    // "not supported" branch and transitions to the error state.
    render(<App />)
    const start = screen.getByText(/Start Listening/i)
    start.click()
    // An error banner should appear and the transcript should explain why.
    expect(screen.getByText(/SpeechRecognition not supported/i)).toBeInTheDocument()
    expect(screen.queryByText(/Start Listening/i)).not.toBeInTheDocument()
  })
})
