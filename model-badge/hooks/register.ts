import type { Register } from 'claude-code'

// "claude-sonnet-5-5" -> "sonnet-5-5"; drops "claude-" and a trailing -YYYYMMDD
export const short = (model: string) => model.replace(/^claude-/, '').replace(/-\d{8}$/, '')

export const badge = (model: string, effort?: string | number) =>
  effort === undefined ? short(model) : `${short(model)} · ${effort}`

export const register: Register = on => {
  // ponytail: module vars reset on hot reload; effort shows again after the next turn step
  let effort: string | number | undefined
  let model = ''

  on('turn.step', async function* ($, e, next) {
    if (!e.agentId && (e.effort !== effort || e.model !== model)) {
      effort = e.effort
      model = e.model
      $.ui.invalidate('ui.render')
    }
    return yield* next(e)
  })

  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    const m = model || (await $.session.model())
    return next({ ...e, tail: badge(m, effort) })
  })
}
