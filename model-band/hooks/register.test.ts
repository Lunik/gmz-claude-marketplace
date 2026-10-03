import { test, expect } from 'claude-code/testing'
import { displayName } from './register'

test('displayName', () => {
  expect(displayName('claude-sonnet-5-5')).toBe('Sonnet 5.5')
  expect(displayName('claude-haiku-4-5-20251001')).toBe('Haiku 4.5')
  expect(displayName('claude-fable-5-1')).toBe('Fable 5.1')
})
