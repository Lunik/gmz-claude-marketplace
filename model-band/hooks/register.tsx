import type { EngineInterface, Register } from 'claude-code'

// "claude-sonnet-5-5" -> "Sonnet 5.5"; drops "claude-" and a trailing -YYYYMMDD
export const displayName = (model: string) => {
  const [name, ...ver] = model.replace(/^claude-/, '').replace(/-\d{8}$/, '').split('-')
  return [name[0].toUpperCase() + name.slice(1), ver.join('.')].filter(Boolean).join(' ')
}

// ponytail: fixed list; a model not in it still shows (as current) but is not offered
const MODELS = ['claude-fable-5-1', 'claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5-20251001']
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max']

// effort before any turn: the per-model setting, else the global one
const savedEffort = async ($: EngineInterface, m: string) => {
  const s = (await $.settings.read().catch(() => ({}))) as { effortLevel?: string; modelSettings?: Record<string, { effortLevel?: string }> }
  return s.modelSettings?.[m]?.effortLevel ?? s.effortLevel
}

export const register: Register = on => {
  // ponytail: module vars reset on hot reload; model/effort show again after the next turn step
  let model = ''
  let effort: string | number | undefined

  on('turn.step', async function* ($, e, next) {
    if (!e.agentId && e.index === 0 && (e.effort !== effort || e.model !== model)) {
      effort = e.effort
      model = e.model
      $.ui.invalidate('ui.render')
    }
    return yield* next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const m = model || (await $.session.model())
    if (!m) return next(e)
    effort ??= await savedEffort($, m)

    const { Box, Text, Select } = $.ui.resolve(e)
    const modelIds = MODELS.includes(m) ? MODELS : [m, ...MODELS]
    // stack under whatever another plugin drew here; the engine's own default is no tree
    const other = await next(e)
    const line = (
      <Box>
        <Text bold color="#7dcfff">Model </Text>
        <Select
          key="model"
          value={m}
          options={modelIds.map(id => ({ value: id, label: displayName(id) }))}
          onSelect={id => {
            model = id
            void $.command.run({ command: 'model', args: id })
            $.ui.invalidate('ui.render')
          }}
        />
        {effort !== undefined && (
          <Box>
            <Text color="#565f89"> ┃ </Text>
            <Text bold color="#7dcfff">Effort </Text>
            <Select
              key="effort"
              value={String(effort)}
              options={EFFORTS.map(v => ({ value: v }))}
              onSelect={v => {
                effort = v
                void $.command.run({ command: 'effort', args: v })
                $.ui.invalidate('ui.render')
              }}
            />
          </Box>
        )}
      </Box>
    )
    return other.type === 'engine' ? line : (
      <Box flexDirection="column">
        {other}
        {line}
      </Box>
    )
  })
}
