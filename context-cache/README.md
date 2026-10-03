# context-cache

Shows how full the context window is and how the prompt cache is doing.

```
Context ┃ Window 17% ┃ Cache hit 99% ┃ Cache TTL 4m33s
```

## Cells

| Cell | Meaning |
|---|---|
| `Window` | Context fill. Green below 70%, orange from 70%, red from 85%. |
| `Cache hit` | Share of the last prompt served from cache. Red below 20%. |
| `Cache TTL` | Countdown to cache expiry, from the TTL the API reports for the entry it just wrote (5 minutes or 1 hour). `expired` once it ran out. |

`Cache hit` and `Cache TTL` only show once the context holds at least 20k tokens, below that a cold cache costs little. Until then, and before the first response, they read `-`.

## Toasts

- Context crosses 70%, 85% or 95%: consider `/compact`.
- Cache miss: a response re-wrote 20k+ tokens at full price with a hit rate under 20%.
- Cache expires in 60 seconds: send a prompt to keep it.
- Cache expired: the next prompt re-reads the context uncached.

## Behavior

- Row in the bottom-right grid, refreshed every second.
- Only the main conversation counts; a subagent has its own cache entry.
