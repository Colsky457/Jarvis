import Reactor from './components/Reactor.jsx'
import { useVoice } from './hooks/useVoice.js'

export default function App() {
  const voice = useVoice({ onCommand: (cmd, speak) => {
    speak(`You said: ${cmd}`)
  } })

  return (
    <div className="app">
      <Reactor status={voice.status} />
      <div className="hud">
        <div className="status">{voice.status}</div>
        <div className="transcript">{voice.transcript}</div>
        {voice.status === 'idle' ? (
          <button onClick={voice.start}>Start Listening</button>
        ) : (
          <button onClick={voice.stop}>Stop</button>
        )}
      </div>
    </div>
  )
}
