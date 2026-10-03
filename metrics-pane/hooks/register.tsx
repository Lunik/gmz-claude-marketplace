import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Gain, Speed } from '../types'

const PANE = 'metrics'
const speed = atom(
  { plugin: 'metrics-pane', key: 'speed' } as const,
  { steps: 0, ttftMs: 0, tokens: 0, genMs: 0 } as Speed,
)
const gain = atom({ plugin: 'metrics-pane', key: 'gain' } as const, null as Gain | null)

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

async function refresh($: EngineInterface, fallback: string) {
  if (!authOut) {
    const auth = await $.process.run(['claude', 'auth', 'status'], { timeoutMs: 15_000 }).catch(() => null)
    authOut = auth?.stdout ?? ''
  }
  const tier = tierOf(authOut, fallback)
  const { stdout } = await $.process.run(['rtk', 'gain', '--quota', '--tier', tier])
  const g = parse(stdout)
  if (g) await update($, gain, () => g)
}

export const register: Register = (on, options) => {
  const tier = String(options.tier ?? '20x')

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'metrics', description: 'Open the metrics pane (rtk, LLM speed)' })
    void $.ui.open({ id: PANE, title: 'Metrics' })
    await refresh($, tier).catch(() => {})
    return next(e)
  })

  on('command.run', { command: 'metrics' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Metrics' })
    return { text: 'Metrics pane opened.' }
  })

  on('turn.complete', async ($, e, next) => {
    await refresh($, tier).catch(() => {})
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const start = await $.clock.now()
    let first = 0

    const result = yield* (async function* () {
      const stream = next(e)
      for await (const c of stream) {
        if (!first && (c.kind === 'text' || c.kind === 'thinking' || c.kind === 'tool')) {
          first = await $.clock.now()
        }
        yield c
      }
      return stream.result
    })()

    // ponytail: steps without usage or a first token are skipped
    const tokens = result?.usage?.output_tokens ?? 0
    if (first && tokens) {
      const end = await $.clock.now()
      await update($, speed, s => ({
        steps: s.steps + 1,
        ttftMs: s.ttftMs + (first - start),
        tokens: s.tokens + tokens,
        genMs: s.genMs + (end - first),
      }))
    }
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const [s, g] = [await read($, speed), await read($, gain)]
    const { Box, Text } = $.ui.resolve(e)
    if (!s.steps && !g) return <Text dimColor>No data yet.</Text>

    const row = (label: string, value: string | number, color: string) => (
      <Box key={label}>
        <Text dimColor>{label.padEnd(17)}</Text>
        <Text bold color={color}>{value}</Text>
      </Box>
    )
    const ttft = (s.ttftMs / Math.max(s.steps, 1) / 1000).toFixed(2)
    const tps = s.genMs ? (s.tokens / (s.genMs / 1000)).toFixed(1) : '–'

    return (
      <Box flexDirection="column">
        {g && (
          <Box flexDirection="column">
            <Text bold color="#7dcfff">♻ rtk</Text>
            {row('Tokens saved', g.saved, '#9ece6a')}
            {row('Quota preserved', g.preserved, '#e0af68')}
          </Box>
        )}
        {g && s.steps > 0 && <Text> </Text>}
        {s.steps > 0 && (
          <Box flexDirection="column">
            <Text bold color="#7dcfff">⚡ LLM speed</Text>
            {row('TTFT avg', `${ttft}s`, '#9ece6a')}
            {row('Throughput', `${tps} tok/s`, '#e0af68')}
            {row('Requests', s.steps, '#bb9af7')}
          </Box>
        )}
      </Box>
    )
  })
}
