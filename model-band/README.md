# model-band

Lets you switch model and reasoning effort without typing a command.

```
Model Sonnet 5.5 ▾ ┃ Effort medium ▾
```

## Behavior

- Band above the prompt, not in the bottom-right grid.
- Selecting a model runs `/model <id>`, selecting an effort runs `/effort <level>`.
- Offered models: Fable 5.1, Opus 5.5, Sonnet 5.5, Haiku 4.5. The current model is always shown, even if it is not in the list.
- Efforts: `low`, `medium`, `high`, `xhigh`, `max`.
- Before any turn has run, the effort is read from `settings.json` (`modelSettings.<model>.effortLevel`, else `effortLevel`). After that it follows what the turn reports.

## Customizing

The model and effort lists are the `MODELS` and `EFFORTS` constants in `hooks/register.tsx`. Bump `version` in `plugin.json` after editing.
