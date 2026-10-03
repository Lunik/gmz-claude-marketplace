# clawd-gotchi

A retro RPG companion in two rows at the bottom left, under the prompt hint line: a pet that feeds on your session and fights failing test suites as bosses.

```
CLAWD      ┃ Nv.7 (◕ᴗ◕)            ┃ PV ▰▰▰▰▰▰▰▰▱▱ 80      ┃ XP ▰▰▰▱▱▱▱▱▱▱ 42c 3ko
PYTEST     ┃ boss (╬ ಠ_ಠ)          ┃ PV ▰▰▰▰▰▱▱▱▱▱         ┃ Échecs 3/6
```

With no boss out, the second row stays drawn with dim `-` cells. Both rows have fixed cell widths and sit under the hint line at the bottom left, so the footer never moves.

## Life

| Event | Effect |
|---|---|
| Request with a cache hit of 80% or more | +3 HP |
| Cache miss that re-writes 20k tokens or more | -15 HP and a toast |
| Request while a usage window is above 90% | -5 HP |
| Each Bash call | +1 XP |
| Successful `git commit` | +20 XP. Every 100 XP is a level, announced by a toast. |
| A day away | -10 HP |
| A week away | The pet leaves and a new egg hatches (next generation). |

## Animation

The face moves all the time, one frame every 400 ms, inside a fixed-width cell. Each mood has its own loop: it blinks, hops and hums when fed, throws punches during a fight, drools when hungry, shivers when sick, snores `zZz` asleep.

Events play a short reaction (3 seconds, highlighted) over the loop:

| Event | Reaction |
|---|---|
| Cache hit | `(◕ᴗ◕)♥` |
| Cache miss | `(>﹏<)!` |
| Level up | `\(★▽★)/` |
| Boss appears | `(°o°)!` |
| Boss loses HP | `(ง •_•)ง✦` |
| Boss K.O. | `ヽ(^▽^)ﾉ` |
| Commit | `(•ᴗ•)✓` |
| Failed command | `(・_・;)` |

The boss has its own loop too.

Mood follows HP and activity (no label when all is well): `affamé` below 50 HP, `malade` below 25 HP, `dort` after 5 minutes idle, `K.O.` at 0 HP, `au combat` while a boss is out.

## Boss fights

A Bash command that runs a test runner is a fight. The boss is named after the runner:

| Ecosystem | Runners (boss name) |
|---|---|
| JavaScript / TypeScript | `vitest`, `jest`, `mocha`, `jasmine`, `karma start`, `playwright test`, `cypress run`, `ava`, `node --test`, `bun test`, `deno test`, `nx test`, `turbo test`, `npm`/`pnpm`/`yarn test` |
| Python | `pytest`, `unittest`, `nose2`, `tox`, `nox`, `hatch test`, `manage.py test` (DJANGO) |
| Go, Rust, Zig | `go test`, `gotestsum`, `cargo test`, `cargo nextest`, `zig build test` |
| JVM | `mvn`/`mvnw` test/verify/install (MAVEN), `gradle`/`gradlew` test/check/build, `sbt test`, `lein test`, `clojure -X:test` |
| .NET | `dotnet test` |
| Ruby | `rspec`, `rails test`, `rake test` |
| PHP | `phpunit`, `pest`, `artisan test` |
| Elixir, Erlang | `mix test` (EXUNIT), `rebar3 eunit`/`ct` |
| Swift, Dart | `swift test`, `xcodebuild … test`, `flutter test`, `dart test` |
| C / C++, build tools | `ctest`, `meson test`, `bazel test`, `make test`/`check` |
| Haskell, R, Julia | `stack test`, `cabal test`, `testthat`/`devtools::test`, `Pkg.test` |
| Claude Code plugins | `claude plugin test` |

The runner is matched anywhere in the command, so `grep pytest notes.md` also summons a boss.

Fight rules:

- Failures with no boss out: a boss named after the runner appears, with one HP per failing test.
- Fewer failures: the boss loses HP, CLAWD gains 5 XP per fixed test.
- More failures: the boss heals.
- A clean run (no failures, exit 0): the boss is K.O., CLAWD gains 50 XP plus 10 per HP the boss had at most, and +20 HP.
- A run that crashes without a failure count changes nothing.

## Behavior

- The pet is kept across sessions in the plugin store. The boss lasts for the session.
- Failure counts are read from the runner's summary: `N failed`, `N failing`, `N failures`, `N fail`, `Failures: N, Errors: M` (summed), `failures=N`, `N of M failed`, `+P -N: Some tests failed`, `--- FAIL` lines, or `✗` lines as a last resort. The largest per-line total wins, so the final summary beats per-file lines.

## Options

| Option | Default | Meaning |
|---|---|---|
| `name` | `CLAWD` | Companion name, shown upper case, 10 characters at most. Used in the rows and the toasts. |
