import { describe, expect, it } from 'vitest'
import { containsWakePhrase } from './useVoice.js'

describe('containsWakePhrase (word-boundary matching)', () => {
  it('matches the exact wake phrase', () => {
    expect(containsWakePhrase('hey jarvis')).toBe(true)
  })

  it('matches the wake phrase within a sentence', () => {
    expect(containsWakePhrase('hello, hey jarvis, are you there?')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(containsWakePhrase('HEY JARVIS')).toBe(true)
    expect(containsWakePhrase('Hey Jarvis')).toBe(true)
  })

  it('rejects substring false positives', () => {
    expect(containsWakePhrase('shew jarvis now')).toBe(false)
    expect(containsWakePhrase('heyjari sm')).toBe(false)
    expect(containsWakePhrase('jarvisx hey')).toBe(false)
  })

  it('rejects empty or unrelated input', () => {
    expect(containsWakePhrase('')).toBe(false)
    expect(containsWakePhrase('hello world')).toBe(false)
    expect(containsWakePhrase('jarvis')).toBe(false)
    expect(containsWakePhrase('hey')).toBe(false)
  })
})
