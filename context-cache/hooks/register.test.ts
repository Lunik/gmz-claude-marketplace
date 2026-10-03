import { test, expect } from 'claude-code/testing'
import { color, fmt, hitRate, step, ttlOf } from './register'

test('helpers', () => {
  expect(step([70, 85, 95], 69)).toBe(0)
  expect(step([70, 85, 95], 100)).toBe(95)
  expect(color(10)).toBe('#9ece6a')
  expect(color(70)).toBe('#e0af68')
  expect(color(90)).toBe('error')
  expect(hitRate({ input_tokens: 10, cache_read_input_tokens: 90, cache_creation_input_tokens: 0 })).toBe(90)
  expect(hitRate({ input_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 })).toBeUndefined()
  expect(ttlOf({ cache_creation: { ephemeral_5m_input_tokens: 10, ephemeral_1h_input_tokens: 0 } })).toBe(300_000)
  expect(ttlOf({ cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 10 } })).toBe(3_600_000)
  expect(ttlOf({ cache_creation: { ephemeral_5m_input_tokens: 0, ephemeral_1h_input_tokens: 0 } })).toBeUndefined()
  expect(ttlOf({})).toBeUndefined()
  expect(fmt(-5)).toBe('0s')
  expect(fmt(192_000)).toBe('3m12s')
})
