import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Boss, Pet } from '../types'

const DAY = 86_400_000
const IDLE = 300_000 // ms without activity before the pet falls asleep
const FRAME = 400 // ms per animation frame
const REACT = 3_000 // ms a reaction stays on the face
const WIDTH = 10
const CELL = 22 // last cell

const egg = (generation = 1, now = 0): Pet => ({ name: 'CLAWD', generation, hp: 80, xp: 0, commits: 0, kos: 0, lastSeen: now })

const petRef = atom({ plugin: 'clawd-gotchi', key: 'pet' } as const, egg())
const bossRef = atom({ plugin: 'clawd-gotchi', key: 'boss' } as const, null as Boss | null)
const activeRef = atom({ plugin: 'clawd-gotchi', key: 'activeAt' } as const, 0)

export const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
export const level = (xp: number) => 1 + Math.floor(xp / 100)

// test runner a Bash command invokes, as the boss's name; undefined when it runs no tests
// test runners a Bash command can invoke, first match wins; the name is the boss's
// ponytail: matched anywhere in the command, so `grep pytest notes.md` also summons PYTEST
const RUNNERS: [RegExp, string][] = [
  // JavaScript / TypeScript
  [/\bvitest\b/, 'VITEST'],
  [/\bjest\b/, 'JEST'],
  [/\bmocha\b/, 'MOCHA'],
  [/\bjasmine\b/, 'JASMINE'],
  [/\bkarma\s+start\b/, 'KARMA'],
  [/\bplaywright\s+test\b/, 'PLAYWRIGHT'],
  [/\bcypress\s+run\b/, 'CYPRESS'],
  [/\bava\b/, 'AVA'],
  [/\bnode\s+(?:\S+\s+)*--test\b/, 'NODE'],
  [/\bbun\s+test\b/, 'BUN'],
  [/\bdeno\s+test\b/, 'DENO'],
  [/\bnx\s+(?:run-many\s+(?:-t|--target[= ])\s*)?test\b|\bnx\s+affected\s+(?:-t|--target[= ])\s*test\b/, 'NX'],
  [/\bturbo\s+(?:run\s+)?test\b/, 'TURBO'],
  [/\bpnpm\s+(?:run\s+)?test\b/, 'PNPM'],
  [/\byarn\s+(?:run\s+)?test\b/, 'YARN'],
  [/\bnpm\s+(?:run\s+|run-script\s+)?(?:test|t)\b/, 'NPM'],
  // Python
  [/\bpy(?:\.)?test\b/, 'PYTEST'],
  [/\bunittest\b/, 'UNITTEST'],
  [/\bnose2\b/, 'NOSE'],
  [/\btox\b/, 'TOX'],
  [/\bnox\b/, 'NOX'],
  [/\bhatch\s+(?:run\s+\S*)?test\b/, 'HATCH'],
  [/\bmanage\.py\s+test\b/, 'DJANGO'],
  // Go, Rust, Zig
  [/\bgo\s+test\b|\bgotestsum\b/, 'GO'],
  [/\bcargo\s+(?:test|nextest)\b/, 'CARGO'],
  [/\bzig\s+(?:build\s+)?test\b/, 'ZIG'],
  // JVM
  [/\bmvnw?\b.*\b(?:test|verify|install)\b/, 'MAVEN'],
  [/\bgradlew?\b.*\b(?:test|check|build)\b/, 'GRADLE'],
  [/\bsbt\b.*\btest\b/, 'SBT'],
  [/\blein\s+test\b/, 'LEIN'],
  [/\bclojure\s+-[XM]:test\b/, 'CLOJURE'],
  // .NET
  [/\bdotnet\s+test\b/, 'DOTNET'],
  // Ruby
  [/\brspec\b/, 'RSPEC'],
  [/\brails\s+test\b/, 'RAILS'],
  [/\brake\s+(?:test|spec)\b/, 'RAKE'],
  // PHP
  [/\bphpunit\b/, 'PHPUNIT'],
  [/\bpest\b/, 'PEST'],
  [/\bartisan\s+test\b/, 'ARTISAN'],
  // Elixir, Erlang
  [/\bmix\s+test\b/, 'EXUNIT'],
  [/\brebar3\s+(?:eunit|ct)\b/, 'REBAR3'],
  // Swift, Dart
  [/\bswift\s+test\b/, 'SWIFT'],
  [/\bxcodebuild\b.*\btest\b/, 'XCODE'],
  [/\bflutter\s+test\b/, 'FLUTTER'],
  [/\bdart\s+test\b/, 'DART'],
  // C / C++ / build systems
  [/\bctest\b/, 'CTEST'],
  [/\bmeson\s+test\b/, 'MESON'],
  [/\bbazel\s+test\b/, 'BAZEL'],
  [/\bmake\s+(?:\S+\s+)*(?:test|check)\b/, 'MAKE'],
  // Haskell, R, Julia
  [/\bstack\s+test\b/, 'STACK'],
  [/\bcabal\s+test\b/, 'CABAL'],
  [/\btestthat\b|\bdevtools::test\b/, 'TESTTHAT'],
  [/\bPkg\.test\b/, 'JULIA'],
  // Claude Code plugins
  [/\bclaude\s+plugin\s+test\b/, 'CLAUDE'],
]

export const runner = (command: string) => RUNNERS.find(([re]) => re.test(command))?.[1]

// count before the word: "2 failed" (pytest, jest, vitest, cargo, gradle, playwright, deno, zig),
// "3 failing" (mocha), "2 failures" (rspec, mix, jasmine, swift, hspec), "2 fail" (bun, bazel),
// "1 error", "2 tests failed" (ctest, ava), "(2 FAILED)" (karma)
const BEFORE = /(\d+)\s+(?:(?:tests?|examples?|specs?)\s+)?(?:failed|failing|failures?|fail|errors?)\b/gi
// count after the word: "Failures: 2, Errors: 1" (maven, phpunit), "Failed: 2" (dotnet, rebar3),
// "failures=2, errors=1" (unittest), "failed 2" / "Failed 2" (sbt), "# fail 2" (node --test, tap)
const AFTER = /\b(?:failures|failed|fail|errors)\s*[:=]?\s*(\d+)/gi
// "2 of 10 failed" (cypress), "2 out of 10 tests failed" (tasty): the first number counts
const OF = /(\d+)\s+(?:out\s+)?of\s+\d+\s+(?:tests?\s+)?failed\b/gi
// "+8 -2: Some tests failed" (dart, flutter)
const DART = /\s-(\d+):\s+Some tests failed/g

const sum = (line: string, re: RegExp) => [...line.matchAll(re)].reduce((n, m) => n + Number(m[1]), 0)

// failing tests a runner reported, 0 when it reported none: the largest per-line total, so the
// final summary wins over per-file lines and "Failures: 2, Errors: 1" counts 3
export const failures = (text: string) => {
  const perLine = text.split('\n').map(line => {
    const of = sum(line, OF)
    const rest = line.replace(OF, '')
    return of + sum(rest, BEFORE) + sum(rest, AFTER) + sum(line, DART)
  })
  const goFails = (text.match(/^\s*--- FAIL\b/gm) ?? []).length
  const best = Math.max(0, goFails, ...perLine)
  return best || (text.match(/^\s*(?:✗|✕|✘|×)\s/gm) ?? []).length
}

export type Fight = { boss: Boss | null; xp: number; say?: string }

// one test run against the current boss
export const fight = (boss: Boss | null, name: string, failed: number, isError: boolean, hero = 'CLAWD'): Fight => {
  if (!boss) {
    if (failed > 0) return { boss: { name, hp: failed, maxHp: failed }, xp: 0, say: `Un boss ${name} surgit ! (${failed} PV)` }
    return { boss: null, xp: 0 }
  }
  if (failed === 0 && !isError) {
    const xp = 50 + 10 * boss.maxHp
    return { boss: null, xp, say: `${boss.name} est K.O. ! ${hero} gagne ${xp} XP !` }
  }
  // ponytail: a crashed run that reports no count leaves the boss as is
  if (failed === 0) return { boss, xp: 0 }
  if (failed < boss.hp) return { boss: { ...boss, hp: failed }, xp: 5 * (boss.hp - failed), say: `Coup critique ! ${boss.name} perd ${boss.hp - failed} PV !` }
  if (failed > boss.hp) return { boss: { ...boss, hp: failed, maxHp: Math.max(boss.maxHp, failed) }, xp: 0, say: `${boss.name} se soigne ! (${failed} PV)` }
  return { boss, xp: 0, say: `${boss.name} encaisse sans broncher...` }
}

export type Mood = 'ko' | 'sleep' | 'sick' | 'hungry' | 'fight' | 'happy'

export const mood = (pet: Pet, boss: Boss | null, idleMs: number): Mood =>
  pet.hp <= 0 ? 'ko' : idleMs > IDLE ? 'sleep' : pet.hp < 25 ? 'sick' : pet.hp < 50 ? 'hungry' : boss ? 'fight' : 'happy'

const LABELS: Record<Mood, string> = { happy: '', fight: 'au combat', hungry: 'affamé', sick: 'malade', sleep: 'dort', ko: 'K.O.' }

// idle loops, one frame per FRAME ms; leading spaces make it hop inside its fixed cell
const LOOPS: Record<Mood, string[]> = {
  happy: ['(◕ᴗ◕)', '(◕ᴗ◕)', '(◕ᴗ◕)', '(-ᴗ-)', '(◕ᴗ◕)', ' (◕ᴗ◕)', '  (◕ᴗ◕)', ' (◕ᴗ◕)', '(◕ᴗ◕)', '(◕‿◕)♪', '(◕‿◕) ♫', '(◕ᴗ◕)'],
  fight: ['(ง •_•)ง', '(ง •_•)ง', 'ᕦ(•_•)ᕤ', '(ง •_•)ง', ' (ง •_•)ง', '(ง -_-)ง', '(ง ˋ_ˊ)ง'],
  hungry: ['(◕︿◕)', '(◕︿◕)', '(-︿-)', '(◕﹃◕)', '(◕﹃◕).', '(◕﹃◕)..', '(◕︿◕)'],
  sick: ['(×﹏×)', '(+﹏+)', ' (×﹏×)', '(×﹏×)~', '~(+﹏+)'],
  sleep: ['(-.-)', '(-.-) z', '(-.-) zZ', '(-.-) zZz', '(-o-) zZ', '(-.-) z'],
  ko: ['(x_x)', '(x_x)', '(x_x)✝', '(x_x)'],
}

export type Reaction = 'hit' | 'miss' | 'level' | 'victory' | 'commit' | 'strike' | 'spawn' | 'error'

// short animations played over the loop for REACT ms after an event
const REACTIONS: Record<Reaction, string[]> = {
  hit: ['(◕ᴗ◕)♥', '(◕ᴗ◕) ♥', '(◕ᴗ◕)  ♥'],
  miss: ['(>﹏<)!', '(>﹏<) !', ' (>﹏<)!'],
  level: ['\\(★▽★)/', '/(★▽★)\\', '\\(★▽★)/', '✧(★▽★)✧'],
  victory: ['ヽ(^▽^)ﾉ', '\\(^▽^)/', 'ヽ(^▽^)ﾉ', '└(^▽^)┘'],
  commit: ['(•ᴗ•)✓', '(•ᴗ•) ✓', '(•ᴗ•)✓'],
  strike: ['(ง •_•)ง✦', '(ง •_•)ง ✦', '(ง •_•)ง  ✸'],
  spawn: ['(°o°)!', '(°o°)!!', '(°o°)!'],
  error: ['(・_・;)', '(・_・;) ', '(・_・;)'],
}

export const face = (m: Mood, frame: number, reaction?: Reaction) => {
  const frames = reaction ? REACTIONS[reaction] : LOOPS[m]
  return frames[frame % frames.length] ?? ''
}

const BOSS = ['(╬ ಠ_ಠ)', '(╬ಠ_ಠ )', '(╬ ಠ_ಠ)', '(╬ ಠoಠ)', '(╬ ಠ_ಠ)', '(╬ಠ_ಠ )']

// hunger between sessions: 10 HP per day away; a week away is a K.O. and a new egg
export const wake = (pet: Pet, now: number): { pet: Pet; say?: string } => {
  const away = pet.lastSeen ? now - pet.lastSeen : 0
  if (away > 7 * DAY) return { pet: egg(pet.generation + 1, now), say: `${pet.name} est parti... Un nouvel œuf éclot (génération ${pet.generation + 1}).` }
  return { pet: { ...pet, hp: clamp(pet.hp - Math.floor(away / DAY) * 10), lastSeen: now } }
}

const save = async ($: EngineInterface, fn: (p: Pet) => Pet) => {
  const now = await $.clock.now()
  const before = await read($, petRef)
  const after = { ...fn(before), lastSeen: now }
  await update($, petRef, () => after)
  await update($, activeRef, () => now)
  await $.store.set('pet', after)
  if (level(after.xp) > level(before.xp)) {
    $.ui.toast(`${after.name} monte au niveau ${level(after.xp)} !`)
    await react($, 'level')
  }
}

const bar = (pct: number, color: string, Text: any) =>
  Array.from({ length: WIDTH }, (_, i) => (
    <Text key={i} color={i < Math.round(pct / WIDTH) ? color : '#3b4261'}>{i < Math.round(pct / WIDTH) ? '▰' : '▱'}</Text>
  ))

const hpColor = (pct: number) => (pct < 25 ? 'error' : pct < 50 ? '#e0af68' : '#9ece6a')

// ponytail: module var; the first render after a hot reload starts it again
let ticking = false
let frame = 0
// ponytail: module var; a hot reload drops a reaction in progress
let reaction: { kind: Reaction; until: number } | undefined
const react = async ($: EngineInterface, kind: Reaction) => {
  reaction = { kind, until: (await $.clock.now()) + REACT }
  $.ui.invalidate('ui.render')
}
const startTick = ($: EngineInterface) => {
  if (ticking) return
  ticking = true
  $.clock.every(FRAME, () => {
    frame += 1
    $.ui.invalidate('ui.render')
  })
}

// the companion's name from the `name` option, fit to the 11-column label
export const petName = (name: unknown) => String(name ?? '').trim().toUpperCase().slice(0, 10) || 'CLAWD'

// ponytail: module var, set again by every register (a reload or a new `name`)
let hero = 'CLAWD'

export const register: Register = (on, options) => {
  hero = petName(options.name)

  on('session.start', async ($, e, next) => {
    const stored = (await $.store.get('pet')) as Pet | undefined
    const { pet, say } = wake(stored ?? egg(1, await $.clock.now()), await $.clock.now())
    const named = { ...pet, name: hero }
    await update($, petRef, () => named)
    await update($, activeRef, () => named.lastSeen)
    await $.store.set('pet', named)
    if (say) $.ui.toast(say)
    startTick($)
    return next(e)
  })

  // cache hits feed, misses poison; quota above 90% drains
  on('turn.step', async function* ($, e, next) {
    const res = yield* next(e)
    const u = res.usage
    if (!u || e.agentId) return res
    const total = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
    const hit = total ? u.cache_read_input_tokens / total : 1
    const quota = Math.max(0, ...(await $.session.usage()).rateLimits.map(r => r.percentUsed))
    const delta = (hit >= 0.8 ? 3 : 0) - (hit < 0.2 && u.cache_creation_input_tokens >= 20_000 ? 15 : 0) - (quota >= 90 ? 5 : 0)
    if (delta <= -15) {
      $.ui.toast(`Cache miss ! ${hero} encaisse un coup critique...`)
      await react($, 'miss')
    } else if (delta > 0) await react($, 'hit')
    await save($, p => ({ ...p, hp: clamp(p.hp + delta) }))
    return res
  })

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const ran = await next(e)
    if (ran.deny !== undefined) return ran
    const text = ran.text ?? ''
    const name = runner(e.command)
    let xp = 1
    if (name) {
      const before = await read($, bossRef)
      const f = fight(before, name, failures(text), ran.isError === true, hero)
      await update($, bossRef, () => f.boss)
      if (f.say) $.ui.toast(f.say)
      await react($, !before && f.boss ? 'spawn' : before && !f.boss ? 'victory' : f.xp ? 'strike' : 'error')
      xp += f.xp
      if (f.xp && !f.boss) await save($, p => ({ ...p, kos: p.kos + 1, hp: clamp(p.hp + 20) }))
    }
    const isCommit = /\bgit\s+commit\b/.test(e.command) && !ran.isError
    if (isCommit) await react($, 'commit')
    else if (!name && ran.isError) await react($, 'error')
    await save($, p => ({ ...p, xp: p.xp + xp + (isCommit ? 20 : 0), commits: p.commits + (isCommit ? 1 : 0) }))
    return ran
  })

  on('tool.call', async ($, e, next) => {
    const now = await $.clock.now()
    await update($, activeRef, () => now)
    return next(e)
  })

  // under the hint line at the bottom left (PromptHint), the engine's line kept above
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    startTick($)
    const pet = await read($, petRef)
    const boss = await read($, bossRef)
    const idle = (await $.clock.now()) - (await read($, activeRef))
    const now = await $.clock.now()
    const m = mood(pet, boss, idle)
    const r = reaction && reaction.until > now && m !== 'ko' ? reaction.kind : undefined
    const other = await next(e)
    const { Box, Text } = $.ui.resolve(e)
    const sep = <Text color="#565f89"> ┃ </Text>
    const dash = <Text color="#565f89">-</Text>
    // fixed cell widths: the rows never change size, so the footer never jumps
    const rows = (
      <Box flexDirection="column" alignItems="flex-start">
        <Box>
          <Box width={11}><Text bold color="#bb9af7">{hero}</Text></Box>
          {sep}
          <Box width={24}>
            <Text dimColor>Nv.{level(pet.xp)} </Text>
            <Text bold color={r ? '#e0af68' : '#c0caf5'}>{face(m, frame, r)}</Text>
            <Text dimColor> {LABELS[m]}</Text>
          </Box>
          {sep}
          <Box width={24}>
            <Text dimColor>PV </Text>
            {bar(pet.hp, hpColor(pet.hp), Text)}
            <Text bold color={hpColor(pet.hp)}> {pet.hp}</Text>
          </Box>
          {sep}
          <Box width={CELL}>
            <Text dimColor>XP </Text>
            {bar(pet.xp % 100, '#7dcfff', Text)}
            <Text dimColor> {pet.commits}c {pet.kos}ko</Text>
          </Box>
        </Box>
        <Box>
          <Box width={11}><Text bold color={boss ? '#f7768e' : '#565f89'}>{boss?.name ?? 'Boss'}</Text></Box>
          {sep}
          <Box width={24}>
            {boss ? <Box><Text dimColor>boss </Text><Text bold color="#f7768e">{BOSS[frame % BOSS.length]}</Text></Box> : dash}
          </Box>
          {sep}
          <Box width={24}>
            <Text dimColor>PV </Text>
            {boss ? bar((boss.hp / boss.maxHp) * 100, '#f7768e', Text) : dash}
          </Box>
          {sep}
          <Box width={CELL}>
            <Text dimColor>Échecs </Text>
            {boss ? <Text bold color="#f7768e">{boss.hp}/{boss.maxHp}</Text> : dash}
          </Box>
        </Box>
      </Box>
    )
    return (
      <Box flexDirection="column" alignItems="flex-start">
        {other}
        {rows}
      </Box>
    )
  })
}
