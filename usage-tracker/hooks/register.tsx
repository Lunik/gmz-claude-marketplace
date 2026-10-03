import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

const LABELS: Record<string, string> = { five_hour: 'session', seven_day: 'week' }
const USAGE_STEPS = [80, 90]
const WIDTH = 10

// highest step crossed, 0 if none
export const step = (steps: number[], pct: number) => steps.filter(s => pct >= s).pop() ?? 0

export const color = (pct: number, [warn, bad]: number[]) =>
  pct >= bad ? 'error' : pct >= warn ? 'warning' : 'success'

export const cells = (pct: number) =>
  Math.round((Math.min(Math.max(pct, 0), 100) / 100) * WIDTH)

export const shown = (limits: SessionRateLimit[]) => limits.filter(l => l.kind in LABELS)

// `claude auth status` json -> "Claude Pro"; falls back to plain "Claude"
export const planLabel = (stdout: string) => {
  try {
    const t = JSON.parse(stdout).subscriptionType
    return typeof t === 'string' && t ? `Claude ${t[0].toUpperCase()}${t.slice(1)}` : 'Claude'
  } catch {
    return 'Claude'
  }
}

async function take($: EngineInterface, snap: Record<string, SessionRateLimit>, kind: string) {
  const l = (await $.session.usage()).rateLimits.find(r => r.kind === kind)
  if (l) snap[kind] = l
  $.ui.invalidate('ui.render')
}

// ponytail: a failed lookup keeps the last known plan
async function planOf($: EngineInterface, prev: string) {
  const r = await $.process.run(['claude', 'auth', 'status'], { timeoutMs: 15_000 }).catch(() => null)
  const p = planLabel(r?.stdout ?? '')
  return p === 'Claude' ? prev : p
}

export const register: Register = (on, options) => {
  // ponytail: module vars reset on hot reload; worst case a repeat toast
  const warned: Record<string, number> = {}
  // what the bar shows: session refreshed every step, week and plan every turn
  const snap: Record<string, SessionRateLimit> = {}
  let plan = 'Claude'

  on('session.start', async ($, e, next) => {
    await Promise.all([take($, snap, 'five_hour'), take($, snap, 'seven_day')]).catch(() => {})
    plan = await planOf($, plan)
    $.ui.invalidate('ui.render')
    return next(e)
  })

  on('turn.step', async function* ($, e, next) {
    const res = yield* next(e)
    if (!e.agentId) await take($, snap, 'five_hour').catch(() => {})
    return res
  })

  on('turn.complete', async ($, e, next) => {
    if (!e.agentId) {
      await take($, snap, 'seven_day').catch(() => {})
      plan = await planOf($, plan)
      $.ui.invalidate('ui.render')
    }
    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    for (const l of shown(e.rateLimits)) {
      const s = step(USAGE_STEPS, l.percentUsed)
      if (s > (warned[l.kind] ?? 0)) {
        $.ui.toast(`Claude ${LABELS[l.kind]} usage at ${Math.round(l.percentUsed)}%`)
      }
      warned[l.kind] = s // also resets after window reset
    }

    return next(e)
  })

  // bottom right, beside the prompt footer's mode labels
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const limits = Object.keys(LABELS).flatMap(k => snap[k] ?? [])
    const other = await next(e)
    if (!limits.length) return other

    const { Box, Text } = $.ui.resolve(e)
    const bar = (
      <Box>
        <Box width={11}><Text bold color="#7dcfff">{plan}</Text></Box>
        {limits.map((l, n) => (
          <Box key={l.kind}>
            <Text color="#565f89"> ┃ </Text>
            <Box width={n < limits.length - 1 ? 24 : undefined}>
              <Text dimColor>{LABELS[l.kind]} </Text>
              {Array.from({ length: WIDTH }, (_, i) => (
                <Text key={i} color={i < cells(l.percentUsed) ? color((i + 1) * (100 / WIDTH), USAGE_STEPS) : '#3b4261'}>
                  {i < cells(l.percentUsed) ? '▰' : '▱'}
                </Text>
              ))}
              <Text bold color={color(l.percentUsed, USAGE_STEPS)}> {Math.round(l.percentUsed)}%</Text>
            </Box>
          </Box>
        ))}
      </Box>
    )
    return other.type === 'engine' ? bar : (
      <Box flexDirection="column" alignItems="flex-start">
        {other}
        {bar}
      </Box>
    )
  })
}
