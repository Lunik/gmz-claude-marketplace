import { test, expect } from 'claude-code/testing'
import { cells, color, planLabel, shown, step } from './register'

test('helpers', () => {
  expect(shown([{ kind: 'five_hour', percentUsed: 1 }, { kind: 'spend_limit', percentUsed: 1 }]).length).toBe(1)
  expect(step([80, 90], 79)).toBe(0)
  expect(step([80, 90], 85)).toBe(80)
  expect(cells(0)).toBe(0)
  expect(cells(43)).toBe(4)
  expect(cells(150)).toBe(10)
  expect(planLabel('{"subscriptionType":"pro"}')).toBe('Claude Pro')
  expect(planLabel('nope')).toBe('Claude')
  expect(color(10, [80, 90])).toBe('success')
  expect(color(85, [80, 90])).toBe('warning')
  expect(color(95, [80, 90])).toBe('error')
})
