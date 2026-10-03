export type Pet = {
  name: string
  generation: number
  hp: number // 0-100: fed by cache hits, drained by misses, hunger and quota
  xp: number
  commits: number
  kos: number
  lastSeen: number // ms epoch, for hunger and death between sessions
}

export type Boss = { name: string; hp: number; maxHp: number }

declare module 'claude-code' {
  interface PluginState {
    'clawd-gotchi': { pet: Pet; boss: Boss | null; activeAt: number }
  }
}
