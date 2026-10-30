import { useCallback, useEffect, useRef, useState } from 'react'

const WAKE_PHRASE = 'hey jarvis'
// Maximum characters allowed in a single voice command buffer.
const MAX_COMMAND_LENGTH = 200
// Maximum consecutive auto-restarts before giving up on recognition.
const MAX_RECOGNITION_RESTARTS = 5
// Delay (ms) before an idle recognition auto-restarts.
const RESTART_DELAY_MS = 250
// Silence window (ms) after a final result before dispatching the command.
const COMMAND_IDLE_MS = 1500

export function useVoice({ onCommand } = {}) {
  const [status, setStatus] = useState('idle') // idle | listening | hearing | speaking | error
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState(null)
  const recognitionRef = useRef(null)
  const listeningForCommandRef = useRef(false)
  const commandBufferRef = useRef('')
  const commandTimerRef = useRef(null)
  const restartAttemptsRef = useRef(0)

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return
    if (typeof text !== 'string' || !text.trim()) return
    setStatus('speaking')
    setError(null)
    const utter = new SpeechSynthesisUtterance(text)
    utter.onend = () => setStatus('listening')
    utter.onerror = (event) => {
      setStatus('listening')
      setError(`Speech synthesis failed: ${event.error}`)
    }
    window.speechSynthesis.speak(utter)
  }, [])

  const clearCommandTimer = useCallback(() => {
    if (commandTimerRef.current !== null) {
      clearTimeout(commandTimerRef.current)
      commandTimerRef.current = null
    }
  }, [])

  const resetCommandBuffer = useCallback(() => {
    clearCommandTimer()
    commandBufferRef.current = ''
    listeningForCommandRef.current = false
  }, [clearCommandTimer])

  const startRecognition = useCallback(() => {
    // Teardown any previous recognition instance first.
    const prev = recognitionRef.current
    if (prev) {
      try { prev.stop() } catch { /* suppressed intentionally */ }
      recognitionRef.current = null
    }
    setError(null)
    setStatus('listening')

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setTranscript('SpeechRecognition not supported (use Chrome).')
      setError('speech-not-supported')
      setStatus('error')
      return
    }

    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.maxAlternatives = 1

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        if (!r || !r[0]) continue
        const text = String(r[0].transcript ?? '').toLowerCase().trim()
        if (!text) continue

        if (r.isFinal) {
          if (listeningForCommandRef.current) {
            // Accumulate command words, bounded in length to prevent memory DoS.
            const next = (commandBufferRef.current + ' ' + text).trim()
            commandBufferRef.current = next.slice(0, MAX_COMMAND_LENGTH)
            setTranscript(commandBufferRef.current)
            clearCommandTimer()
            commandTimerRef.current = setTimeout(() => {
              const cmd = commandBufferRef.current
              resetCommandBuffer()
              if (cmd && onCommand) {
                onCommand(cmd, speak)
              }
            }, COMMAND_IDLE_MS)
          } else if (containsWakePhrase(text)) {
            listeningForCommandRef.current = true
            commandBufferRef.current = ''
            setStatus('hearing')
            setTranscript('Yes?')
            speak('Yes?')
          }
        } else {
          interim += text + ' '
          if (!listeningForCommandRef.current && containsWakePhrase(interim)) {
            listeningForCommandRef.current = true
            commandBufferRef.current = ''
            setStatus('hearing')
          }
        }
      }
    }

    rec.onerror = (event) => {
      const code = event.error
      // Only surface actionable errors; audio capture/timeout noise is common and non-fatal.
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setError('microphone-access-denied')
        setStatus('error')
        setTranscript('Microphone access denied.')
      } else if (import.meta.env.DEV) {
        console.warn('recognition error', code)
      }
    }

    rec.onend = () => {
      // Auto-restart only while the caller expects listening, bounded by attempt count.
      if (status === 'listening' && restartAttemptsRef.current < MAX_RECOGNITION_RESTARTS) {
        restartAttemptsRef.current += 1
        setTimeout(() => {
          try { rec.start() } catch { /* suppressed intentionally */ }
        }, RESTART_DELAY_MS)
      } else {
        restartAttemptsRef.current = 0
        if (status === 'listening') setStatus('idle')
      }
    }

    recognitionRef.current = rec
    try {
      rec.start()
    } catch {
      recognitionRef.current = null
      setError('recognition-start-failed')
      setStatus('error')
      setTranscript('Failed to start recognition.')
    }
  }, [onCommand, speak, clearCommandTimer, resetCommandBuffer, status])

  const stop = useCallback(() => {
    const rec = recognitionRef.current
    if (rec) {
      recognitionRef.current = null
      try { rec.stop() } catch { /* suppressed intentionally */ }
    }
    restartAttemptsRef.current = 0
    resetCommandBuffer()
    setStatus('idle')
    setError(null)
  }, [resetCommandBuffer])

  useEffect(() => {
    return () => {
      const rec = recognitionRef.current
      if (rec) {
        recognitionRef.current = null
        try { rec.stop() } catch { /* suppressed intentionally */ }
      }
      clearCommandTimer()
    }
  }, [clearCommandTimer])

  return { status, transcript, error, start: startRecognition, stop, speak }
}

/**
 * Match the wake phrase on word boundaries to reduce false positives from
 * substring matches (e.g. "shew jarvis now" would match a naive includes()).
 * Exported for testing.
 */
export function containsWakePhrase(text) {
  const regex = new RegExp(`\\b${WAKE_PHRASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  return regex.test(text)
}
