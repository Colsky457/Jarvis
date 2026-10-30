import { useCallback } from 'react'
import Reactor from './components/Reactor.jsx'
import { useVoice } from './hooks/useVoice.js'

const MAX_COMMAND_LENGTH = 200

export default function App() {
  const onCommand = useCallback((cmd, speak) => {
    // Validate and sanitize the voice command before acting on it.
    if (typeof cmd !== 'string') return
    const cleaned = cmd.trim().replace(/[^\x20-\x7e\u00a0-\uffff]/g, '').slice(0, MAX_COMMAND_LENGTH)
    if (!cleaned) return
    speak(`You said: ${cleaned}`)
  }, [])

  const voice = useVoice({ onCommand })
  const busy = voice.status === 'speaking' || voice.status === 'error'

  return (
    <div className="app">
      <Reactor status={voice.status} />
      <div className="hud">
        <div className="status">{voice.status}</div>
        {voice.error && <div className="error">{voice.error}</div>}
        <div className="transcript">{voice.transcript}</div>
        {voice.status === 'idle' ? (
          <button disabled={busy} onClick={voice.start}>
            Start Listening
          </button>
        ) : (
          <button disabled={busy} onClick={voice.stop}>
            Stop
          </button>
        )}
      </div>
    </div>
  )
}
