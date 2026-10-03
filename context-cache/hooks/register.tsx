import type { Register } from 'claude-code'

const CONTEXT_STEPS = [70, 85, 95]
const BIG = 20_000 // tokens: below this a cold cache costs little
const TICK = 1_000
const NEAR = 60_000 // ms left when the "cache about to expire" toast fires

// highest step crossed, 0 if none
export const step = (steps: number[], pct: number) => steps.filter(s => pct >= s).pop() ?? 0

export const color = (pct: number) => (pct >= 85 ? 'error' : pct >= 70 ? '#e0af68' : '#9ece6a')

export const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return s >= 60 ? `${Math.floor(s / 60)}m${String(s % 60).padStart(2, '0')}s` : `${s}s`
}

// share of the prompt the cache served, 0-100; undefined when nothing was sent
export const hitRate = (u: { input_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }) => {
  const total = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
  return total ? Math.round((u.cache_read_input_tokens / total) * 100) : undefined
}

const TTL_5M = 300_000
const TTL_1H = 3_600_000

// TTL of the cache entry a response just wrote, from the API's own `cache_creation` split;
// undefined when it wrote nothing or the field is absent
export const ttlOf = (u: object) => {
  const c = (u as { cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } }).cache_creation
  return c?.ephemeral_1h_input_tokens ? TTL_1H : c?.ephemeral_5m_input_tokens ? TTL_5M : undefined
}

// ponytail: 5m until a response reports otherwise; module vars reset on hot reload (cache unknown until next turn)
let ttl = TTL_5M
let ctxWarned = 0
let lastAt = 0
let hit: number | undefined
let isCacheNotified = false
let isNearNotified = false

export const register: Register = on => {
  // ponytail: 5m until a response reports otherwise; no usage split in the response = stays 5m
  // ponytail: module vars reset on hot reload; worst case a repeat toast, cache unknown until next turn

  on('session.start', ($, e, next) => {
    $.clock.every(TICK, async () => {
      const tokens = (await $.session.usage()).context.tokens ?? 0
      const left = lastAt ? lastAt + ttl - (await $.clock.now()) : undefined
      if (left !== undefined && left > 0 && left <= NEAR && tokens >= BIG && !isNearNotified) {
        isNearNotified = true
        $.ui.toast(`Cache expires in ${fmt(left)}: send a prompt to keep ${Math.round(tokens / 1000)}k tokens cached.`)
      }
      if (left !== undefined && left <= 0 && tokens >= BIG && !isCacheNotified) {
        isCacheNotified = true
        $.ui.toast(`Cache expired: next prompt re-reads ${Math.round(tokens / 1000)}k tokens uncached. Consider /compact first.`)
      }
      $.ui.invalidate('ui.render')
    })
    return next(e)
  })

  // every model request, not just turn end: tool-loop steps refresh cache + TTL too
  on('turn.step', async function* ($, e, next) {
    const res = yield* next(e)
    // main loop only: a subagent has its own cache entry
    if (res.usage && !e.agentId) {
      hit = hitRate(res.usage)
      ttl = ttlOf(res.usage) ?? ttl
      lastAt = await $.clock.now()
      isCacheNotified = false
      isNearNotified = false
      const wrote = res.usage.cache_creation_input_tokens
      if (wrote >= BIG && (hit ?? 0) < 20) {
        $.ui.toast(`Cache miss: re-wrote ${Math.round(wrote / 1000)}k tokens at full price`)
      }
      $.ui.invalidate('ui.render')
    }
    return res
  })

  on('session.measure', async ($, e, next) => {
    const pct = e.context.percent ?? 0
    const cs = step(CONTEXT_STEPS, pct)
    if (cs > ctxWarned) $.ui.toast(`Context ${pct}% full, consider /compact`)
    ctxWarned = cs // drops after /compact or /clear
    $.ui.invalidate('ui.render')
    return next(e)
  })

  // stacked above the usage bar (SessionMode, bottom right)
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const { percent, tokens = 0 } = (await $.session.usage()).context
    const left = lastAt ? lastAt + ttl - (await $.clock.now()) : undefined
    const isCache = left !== undefined && tokens >= BIG
    const other = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const line = (
      <Box>
        <Box width={11}><Text bold color="#7dcfff">Context</Text></Box>
        <Box>
          <Text color="#565f89"> ┃ </Text>
          <Box width={24}>
            <Text dimColor>Window </Text>
            <Text bold color={percent === undefined ? '#565f89' : color(percent)}>{percent === undefined ? '-' : `${percent}%`}</Text>
          </Box>
        </Box>
        <Box>
          <Text color="#565f89"> ┃ </Text>
          <Box width={24}>
            <Text dimColor>Cache hit </Text>
            <Text bold color={!isCache || hit === undefined ? '#565f89' : hit < 20 ? 'error' : '#c0caf5'}>{isCache && hit !== undefined ? `${hit}%` : '-'}</Text>
          </Box>
        </Box>
        <Box>
          <Text color="#565f89"> ┃ </Text>
          <Box>
            <Text dimColor>Cache TTL </Text>
            <Text bold color={!isCache ? '#565f89' : left > 0 ? '#c0caf5' : 'error'}>{!isCache ? '-' : left > 0 ? fmt(left) : 'expired'}</Text>
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
