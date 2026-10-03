import { test, expect } from 'claude-code/testing'
import { parse, tierOf } from './register'

test('parse', () => {
  const out = 'Tokens saved (lifetime): 470.4K\nQuota preserved:   7.8%\n'
  expect(parse(out)).toEqual({ saved: '470.4K', preserved: '7.8%' })
  expect(parse('nope')).toBe(null)
  expect(tierOf('{"subscriptionType":"pro"}', '20x')).toBe('pro')
  expect(tierOf('{"subscriptionType":"max"}', '5x')).toBe('5x')
  expect(tierOf('nope', '20x')).toBe('20x')
})
