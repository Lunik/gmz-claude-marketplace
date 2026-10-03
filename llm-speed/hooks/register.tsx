import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Speed } from '../types'

const speed = atom(
  { plugin: 'llm-speed', key: 'speed' } as const,
  { steps: 0, ttftMs: 0, tokens: 0, genMs: 0 } as Speed,
)

export const register: Register = on => {
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
      $.ui.invalidate('ui.render')
    }
    return result
  })

  // stacked above the usage bar (SessionMode, bottom right)
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    const s = await read($, speed)
    const other = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const line = (
      <Box>
        <Box width={11}><Text bold color="#7dcfff">LLM speed</Text></Box>
        <Box>
          <Text color="#565f89"> ┃ </Text>
          <Box width={24}>
            <Text dimColor>TTFT </Text>
            <Text bold color={s.steps ? '#c0caf5' : '#565f89'}>{s.steps ? `${(s.ttftMs / s.steps / 1000).toFixed(2)}s` : '-'}</Text>
          </Box>
        </Box>
        <Box>
          <Text color="#565f89"> ┃ </Text>
          <Box width={24}>
            <Text dimColor>Throughput </Text>
            <Text bold color={s.genMs ? '#c0caf5' : '#565f89'}>{s.genMs ? `${(s.tokens / (s.genMs / 1000)).toFixed(1)} tok/s` : '-'}</Text>
          </Box>
        </Box>
        <Box>
          <Text color="#565f89"> ┃ </Text>
          <Box>
            <Text dimColor>Requests </Text>
            <Text bold color={s.steps ? '#c0caf5' : '#565f89'}>{s.steps || '-'}</Text>
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
