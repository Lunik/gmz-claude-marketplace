# llm-speed

Shows how fast the model answers in the current session.

```
LLM speed ┃ TTFT 2.17s ┃ Throughput 195.2 tok/s ┃ Requests 3
```

## Cells

| Cell | Meaning |
|---|---|
| `TTFT` | Average time to first token (text, thinking or tool call) over all requests. |
| `Throughput` | Output tokens divided by generation time (first token to end of response), over all requests. |
| `Requests` | Number of model requests counted. A tool-use loop makes several per turn. |

## Behavior

- Row in the bottom-right grid. Shows `-` until the first request completes.
- A request with no usage report or no first token is skipped.
- Numbers are averages for the session; they reset when the plugin reloads.
