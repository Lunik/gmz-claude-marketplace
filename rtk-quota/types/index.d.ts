export type Gain = { saved: string; preserved: string }

declare module 'claude-code' {
  interface PluginState {
    'rtk-quota': { gain: Gain | null }
  }
}
