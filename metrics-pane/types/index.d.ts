export type Speed = { steps: number; ttftMs: number; tokens: number; genMs: number }
export type Gain = { saved: string; preserved: string }

declare module 'claude-code' {
  interface PluginState {
    'metrics-pane': { speed: Speed; gain: Gain | null }
  }
}
