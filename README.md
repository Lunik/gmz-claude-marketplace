# gmz-claude-marketplace

Personal [Claude Code](https://claude.com/claude-code) plugin marketplace: small status bands for the terminal UI.

`model-band` sits above the prompt. The other bands share one grid at the bottom right of the screen, each row with a label and `┃`-separated cells. Every cell is rendered from the first frame and shows a dimmed `-` until its data is available.

```
Model Sonnet 5.5 ▾ ┃ Effort medium ▾
────────────────────────────────────────────────────────────────────────────────────────────
❯
────────────────────────────────────────────────────────────────────────────────────────────
  ⏵⏵ auto mode on (shift+tab to cycle)    LLM speed  ┃ TTFT 2.17s             ┃ Throughput 195.2 tok/s ┃ Requests 3
                                          Context    ┃ Window 17%             ┃ Cache hit 99%          ┃ Cache TTL 4m33s
                                          rtk        ┃ Tokens saved 566.8K    ┃ Quota preserved 9.4%
                                          Claude Pro ┃ session ▰▰▰▱▱▱▱▱▱▱ 32% ┃ week ▰▰▰▰▰▰▰▰▱▱ 82%
```

## Install

```
/plugin marketplace add Lunik/gmz-claude-marketplace
/plugin install usage-tracker@gmz-claude-marketplace
```

Repeat the second command for each plugin you want, then run `/reload-plugins`.

## Plugins

| Plugin | What it shows |
|---|---|
| `usage-tracker` | Subscription plan and the 5-hour (`session`) and 7-day (`week`) usage bars. Toasts at 80% and 90%. |
| `llm-speed` | Average time to first token, output tokens per second, number of requests. |
| `context-cache` | Context window fill, prompt cache hit rate and cache TTL countdown. Toasts at 70/85/95% context, on a cache miss, and shortly before the cache expires. |
| `rtk-quota` | Tokens saved and quota preserved, from [`rtk gain`](https://github.com/rtk-ai/rtk). Option `tier` (default `20x`) is used for Max plans; Pro is detected automatically. |
| `model-band` | Model and reasoning effort selectors above the prompt (not in the grid). Effort is read from `settings.json` until the first turn reports it. |

## Startup data

Bands fill in without waiting for a first message:

- `context-cache` and `model-band` read the session and your settings directly.
- `rtk-quota` runs `rtk gain` on the first render.
- `usage-tracker` fetches the usage windows from `https://api.anthropic.com/api/oauth/usage`. This reads your Claude Code OAuth token from the macOS keychain (`Claude Code-credentials`) inside a child `python3` process, so the token never appears in a command line, and sends it only to `api.anthropic.com`. Once the API answers a message, the engine's own figures take over. On other platforms, or if the lookup fails, the bars simply stay at `-` until the first response.

## Requirements

- Claude Code with plugin hooks (`ui.render`, `turn.step`, `session.measure`).
- `rtk` on `PATH` for `rtk-quota`.
- macOS and `python3` for the startup usage fetch in `usage-tracker`.

## Layout

Each plugin is a folder with `.claude-plugin/plugin.json` and `hooks/register.tsx`. Bump `version` in `plugin.json` on every change, otherwise installed copies are not refreshed.
