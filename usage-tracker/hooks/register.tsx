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

// OAuth usage endpoint -> windows, so session/week show before the first API response.
// Token is read inside the child process (macOS keychain) and never reaches argv.
const FETCH = `
import sys,json,subprocess,urllib.request
t=json.loads(subprocess.check_output(['security','find-generic-password','-s','Claude Code-credentials','-w']))['claudeAiOauth']['accessToken']
r=urllib.request.Request('https://api.anthropic.com/api/oauth/usage',headers={'Authorization':'Bearer '+t,'anthropic-beta':'oauth-2025-04-20'})
sys.stdout.write(urllib.request.urlopen(r,timeout=10).read().decode())
`

export const parseUsage = (stdout: string): SessionRateLimit[] => {
  try {
    const j = JSON.parse(stdout)
    return Object.keys(LABELS).flatMap(kind =>
      typeof j[kind]?.utilization === 'number'
        ? [{ kind, percentUsed: Math.round(j[kind].utilization * 10) / 10, resetsAt: j[kind].resets_at }]
        : [],
    )
  } catch {
    return []
  }
}

// ponytail: macOS keychain only; elsewhere or on failure the bar waits for the first response
async function seed($: EngineInterface, snap: Record<string, SessionRateLimit>) {
  const r = await $.process.run(['python3', '-c', FETCH], { timeoutMs: 15_000 }).catch(() => null)
  for (const l of parseUsage(r?.stdout ?? '')) snap[l.kind] ??= l
  $.ui.invalidate('ui.render')
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
  // ponytail: after a hot reload session.start does not fire; the first render loads what it would have
  let primed = false

  on('session.start', async ($, e, next) => {
    await Promise.all([take($, snap, 'five_hour'), take($, snap, 'seven_day')]).catch(() => {})
    await seed($, snap)
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
    if (!primed) {
      primed = true
      void Promise.all([take($, snap, 'five_hour'), take($, snap, 'seven_day'), planOf($, plan).then(p => (plan = p))])
        .then(() => seed($, snap))
        .catch(() => {})
    }
    const limits = Object.keys(LABELS).map(k => [k, snap[k]] as const)
    const other = await next(e)

    const { Box, Text } = $.ui.resolve(e)
    const bar = (
      <Box>
        <Box width={11}><Text bold color="#7dcfff">{plan}</Text></Box>
        {limits.map(([kind, l], n) => (
          <Box key={kind}>
            <Text color="#565f89"> ┃ </Text>
            <Box width={n < limits.length - 1 ? 24 : undefined}>
              <Text dimColor>{LABELS[kind]} </Text>
              {Array.from({ length: WIDTH }, (_, i) => (
                <Text key={i} color={l && i < cells(l.percentUsed) ? color((i + 1) * (100 / WIDTH), USAGE_STEPS) : '#3b4261'}>
                  {l && i < cells(l.percentUsed) ? '▰' : '▱'}
                </Text>
              ))}
              <Text bold color={l ? color(l.percentUsed, USAGE_STEPS) : '#565f89'}> {l ? `${Math.round(l.percentUsed)}%` : '-'}</Text>
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
