import { test, expect } from 'claude-code/testing'
import { badge, short } from './register'

test('badge', () => {
  expect(short('claude-haiku-4-5-20251001')).toBe('haiku-4-5')
  expect(short('claude-sonnet-5-5')).toBe('sonnet-5-5')
  expect(badge('claude-opus-5-5', 'high')).toBe('opus-5-5 · high')
  expect(badge('claude-opus-5-5')).toBe('opus-5-5')
})
