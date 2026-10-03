export type Speed = { steps: number; ttftMs: number; tokens: number; genMs: number }

declare module 'claude-code' {
  interface PluginState {
    'llm-speed': { speed: Speed }
  }
}
