# rtk-quota

Shows what [`rtk`](https://github.com/rtk-ai/rtk) saved you, from `rtk gain --quota`.

```
rtk ┃ Tokens saved 566.8K ┃ Quota preserved 9.4%
```

## Cells

| Cell | Meaning |
|---|---|
| `Tokens saved` | Lifetime tokens saved by rtk. |
| `Quota preserved` | Share of your subscription quota those savings represent. |

## Options

| Option | Default | Meaning |
|---|---|---|
| `tier` | `20x` | Subscription tier passed to `rtk gain --tier`: `pro`, `5x` or `20x`. |

`pro` is detected automatically from `claude auth status`. A Max plan cannot be told apart between 5x and 20x, so the option decides.

## Behavior

- Row in the bottom-right grid. Refreshed at session start and after every turn, and once on the first render so it also fills after a plugin reload.
- Shows `-` until `rtk gain` has answered.

## Requirements

`rtk` and `claude` on `PATH`.
