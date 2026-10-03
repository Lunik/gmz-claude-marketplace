# usage-tracker

Shows your Claude subscription plan and how much of the 5-hour (`session`) and 7-day (`week`) usage windows you have used.

```
Claude Pro ┃ session ▰▰▰▱▱▱▱▱▱▱ 32% ┃ week ▰▰▰▰▰▰▰▰▱▱ 82%
```

## Behavior

- Row in the bottom-right grid. Bars have 10 cells, colored green below 80%, orange from 80%, red from 90%.
- Toast when a window first crosses 80% and again at 90%. The toast rearms after the window resets.
- The plan label comes from `claude auth status` (`Claude Pro`, `Claude Max`, ...), `Claude` if unknown.
- `session` refreshes after every model request, `week` and the plan after every turn.
- Shows `-` and empty bars until data is available.

## Startup data

Rate limits normally arrive with the first API response. To show them earlier, the plugin queries `https://api.anthropic.com/api/oauth/usage` at session start and on the first render:

- The OAuth token is read from the macOS keychain (`Claude Code-credentials`) inside a child `python3` process, so it never appears in a command line, and is sent only to `api.anthropic.com`.
- Values from this call only fill empty windows. The engine's own figures replace them once a response arrives.
- On other platforms, or if the lookup fails, the bars stay at `-` until the first response.

## Requirements

`claude` on `PATH` (plan lookup). macOS and `python3` for the startup fetch.
