import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Gain } from '../types'

const gain = atom({ plugin: 'rtk-quota', key: 'gain' } as const, null as Gain | null)

export const parse = (out: string): Gain | null => {
  const saved = /Tokens saved[^:]*:\s*(\S+)/.exec(out)?.[1]
  const preserved = /Quota preserved:\s*(\S+)/.exec(out)?.[1]
  return saved && preserved ? { saved, preserved } : null
}

// `claude auth status` subscriptionType -> rtk tier; max (5x or 20x) is not told apart, so the option decides
export const tierOf = (stdout: string, fallback: string) => {
  try {
    return JSON.parse(stdout).subscriptionType === 'pro' ? 'pro' : fallback
  } catch {
    return fallback
  }
}

// ponytail: module var resets on hot reload; costs one extra `claude auth status`
let authOut = ''
// ponytail: after a hot reload no session.start/turn.complete fires; one lazy fetch on first render fills the row
let primed = false

async function refresh($: EngineInterface, fallback: string) {
  if (!authOut) {
    const auth = await $.process.run(['claude', 'auth', 'status'], { timeoutMs: 15_000 }).catch(() => null)
    authOut = auth?.stdout ?? ''
  }
  const tier = tierOf(authOut, fallback)
  const { stdout } = await $.process.run(['rtk', 'gain', '--quota', '--tier', tier])
  const g = parse(stdout)
  if (g) {
    await update($, gain, () => g)
    $.ui.invalidate('ui.render')
  }
}

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await refresh($, String(options.tier ?? '20x')).catch(() => {})
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($, String(options.tier ?? '20x')).catch(() => {})
    return next(e)
  })

  // stacked above the usage bar (SessionMode, bottom right)
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const g = await read($, gain)
    if (!g && !primed) {
      primed = true
      void refresh($, String(options.tier ?? '20x')).catch(() => {})
    }
    const other = await next(e)
    if (!g) return other
    const { Box, Text } = $.ui.resolve(e)
    const line = (
      <Box>
        <Box width={11}><Text bold color="#7dcfff">rtk</Text></Box>
        <Box>
          <Text color="#565f89"> ┃ </Text>
          <Box width={24}>
            <Text dimColor>Tokens saved </Text>
            <Text bold color="#c0caf5">{g.saved}</Text>
          </Box>
        </Box>
        <Box>
          <Text color="#565f89"> ┃ </Text>
          <Box>
            <Text dimColor>Quota preserved </Text>
            <Text bold color="#c0caf5">{g.preserved}</Text>
          </Box>
        </Box>
      </Box>
    )
    return other.type === 'engine' ? line : (
      <Box flexDirection="column" alignItems="flex-start">
        {other}
        {line}
      </Box>
    )
  })
}
