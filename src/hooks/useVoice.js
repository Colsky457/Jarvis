import { useCallback, useEffect, useRef, useState } from 'react'

const WAKE_PHRASE = 'hey jarvis'

export function useVoice({ onCommand } = {}) {
  const [status, setStatus] = useState('idle') // idle | listening | hearing | speaking
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef(null)
  const listeningForCommandRef = useRef(false)
  const commandBufferRef = useRef('')
  const commandTimerRef = useRef(null)

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window)) return
    setStatus('speaking')
    const utter = new SpeechSynthesisUtterance(text)
    utter.onend = () => setStatus('listening')
    window.speechSynthesis.speak(utter)
  }, [])

  const startRecognition = useCallback(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setTranscript('SpeechRecognition not supported (use Chrome).')
      return
    }
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'

    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i]
        const text = r[0].transcript.toLowerCase().trim()
        if (r.isFinal) {
          if (listeningForCommandRef.current) {
            commandBufferRef.current += ' ' + text
            setTranscript(commandBufferRef.current.trim())
            clearTimeout(commandTimerRef.current)
            commandTimerRef.current = setTimeout(() => {
              const cmd = commandBufferRef.current.trim()
              commandBufferRef.current = ''
              listeningForCommandRef.current = false
              if (cmd) {
                onCommand?.(cmd, speak)
              }
            }, 1500)
          } else if (text.includes(WAKE_PHRASE)) {
            listeningForCommandRef.current = true
            commandBufferRef.current = ''
            setStatus('hearing')
            setTranscript('Yes?')
            speak('Yes?')
          }
        } else {
          interim += text + ' '
          if (!listeningForCommandRef.current && interim.includes(WAKE_PHRASE)) {
            listeningForCommandRef.current = true
            commandBufferRef.current = ''
            setStatus('hearing')
          }
        }
      }
    }

    rec.onerror = (e) => {
      if (import.meta.env.DEV) console.warn('recognition error', e.error)
    }
    rec.onend = () => {
      // auto-restart
      try { rec.start() } catch (e) { void e }
    }

    recognitionRef.current = rec
    try { rec.start() } catch (e) { void e }
    setStatus('listening')
  }, [onCommand, speak])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setStatus('idle')
  }, [])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      clearTimeout(commandTimerRef.current)
    }
  }, [])

  return { status, transcript, start: startRecognition, stop, speak }
}
