import { test, expect } from 'claude-code/testing'
import { face, failures, fight, level, mood, petName, runner, wake } from './register'

const pet = { name: 'CLAWD', generation: 1, hp: 80, xp: 0, commits: 0, kos: 0, lastSeen: 0 }

test('runners', () => {
  const cases: [string, string | undefined][] = [
    ['cd web && npx vitest run', 'VITEST'],
    ['npx jest --ci', 'JEST'],
    ['npx mocha test/', 'MOCHA'],
    ['npx playwright test', 'PLAYWRIGHT'],
    ['npx cypress run', 'CYPRESS'],
    ['node --test test/', 'NODE'],
    ['bun test', 'BUN'],
    ['deno test -A', 'DENO'],
    ['pnpm test', 'PNPM'],
    ['yarn run test', 'YARN'],
    ['npm t', 'NPM'],
    ['npm run test -- --watch=false', 'NPM'],
    ['uv run pytest -x', 'PYTEST'],
    ['python -m unittest discover', 'UNITTEST'],
    ['tox -e py312', 'TOX'],
    ['python manage.py test', 'DJANGO'],
    ['go test ./...', 'GO'],
    ['cargo nextest run', 'CARGO'],
    ['zig build test', 'ZIG'],
    ['./mvnw -q verify', 'MAVEN'],
    ['./gradlew test', 'GRADLE'],
    ['sbt clean test', 'SBT'],
    ['dotnet test', 'DOTNET'],
    ['bundle exec rspec', 'RSPEC'],
    ['bin/rails test', 'RAILS'],
    ['vendor/bin/phpunit', 'PHPUNIT'],
    ['./vendor/bin/pest', 'PEST'],
    ['mix test', 'EXUNIT'],
    ['rebar3 eunit', 'REBAR3'],
    ['swift test', 'SWIFT'],
    ['flutter test', 'FLUTTER'],
    ['dart test', 'DART'],
    ['ctest --output-on-failure', 'CTEST'],
    ['make -j4 check', 'MAKE'],
    ['bazel test //...', 'BAZEL'],
    ['stack test', 'STACK'],
    ['Rscript -e "devtools::test()"', 'TESTTHAT'],
    ['claude plugin test .', 'CLAUDE'],
    ['ls -la', undefined],
    ['git status', undefined],
  ]
  for (const [command, name] of cases) expect([command, runner(command)]).toEqual([command, name])
})

test('failure counts', () => {
  const cases: [string, string, number][] = [
    ['pytest', '=== 2 failed, 1 error, 40 passed in 1.2s ===', 3],
    ['jest', 'Test Suites: 1 failed, 2 passed, 3 total\nTests:       3 failed, 10 passed, 13 total', 3],
    ['vitest', ' Tests  2 failed | 8 passed (10)', 2],
    ['mocha', '  8 passing (20ms)\n  3 failing', 3],
    ['node --test', '# pass 8\n# fail 2', 2],
    ['bun', ' 3 pass\n 2 fail\nRan 5 tests', 2],
    ['karma', 'Executed 10 of 10 (2 FAILED)', 2],
    ['cypress', '  ✖  2 of 10 failed (20%)', 2],
    ['go', '--- FAIL: TestA (0.00s)\n--- FAIL: TestB (0.00s)\nFAIL\nFAIL\texample.com/x\t0.1s', 2],
    ['cargo', 'test result: FAILED. 3 passed; 2 failed; 0 ignored', 2],
    ['zig', '2 passed; 1 failed.', 1],
    ['maven', '[ERROR] Tests run: 4, Failures: 1, Errors: 0\n[ERROR] Tests run: 10, Failures: 2, Errors: 1, Skipped: 0', 3],
    ['gradle', '10 tests completed, 2 failed', 2],
    ['sbt', '[error] Failed: Total 10, Failed 2, Errors 0, Passed 8', 2],
    ['dotnet', 'Failed!  - Failed:     2, Passed:     8, Skipped:     0, Total:    10', 2],
    ['rspec', '10 examples, 2 failures', 2],
    ['minitest', '10 runs, 20 assertions, 2 failures, 1 errors, 0 skips', 3],
    ['phpunit', 'Tests: 10, Assertions: 20, Failures: 2, Errors: 1.', 3],
    ['pest', '  Tests:    2 failed, 8 passed (10 assertions)', 2],
    ['unittest', 'FAILED (failures=2, errors=1)', 3],
    ['mix', '10 tests, 2 failures', 2],
    ['rebar3', 'Failed: 2.  Skipped: 0.  Passed: 8.', 2],
    ['swift', 'Executed 10 tests, with 2 failures (0 unexpected) in 0.1 seconds', 2],
    ['dart', '00:02 +8 -2: Some tests failed.', 2],
    ['ctest', '80% tests passed, 2 tests failed out of 10', 2],
    ['bazel', 'Executed 5 out of 5 tests: 3 tests pass and 2 fail locally.', 2],
    ['tasty', '2 out of 10 tests failed (0.01s)', 2],
    ['testthat', '[ FAIL 2 | WARN 0 | SKIP 0 | PASS 8 ]', 2],
    ['symbols', '  ✗ adds\n  ✓ subtracts\n  ✗ divides', 2],
    ['green', '10 passed in 0.4s', 0],
    ['cargo green', 'test result: ok. 5 passed; 0 failed; 0 ignored', 0],
  ]
  for (const [name, text, n] of cases) expect([name, failures(text)]).toEqual([name, n])
})

test('boss fight', () => {
  const spawn = fight(null, 'PYTEST', 5, true)
  expect(spawn.boss).toEqual({ name: 'PYTEST', hp: 5, maxHp: 5 })
  const hit = fight(spawn.boss, 'PYTEST', 2, true)
  expect(hit.boss?.hp).toBe(2)
  expect(hit.xp).toBe(15)
  expect(fight(hit.boss, 'PYTEST', 4, true).boss?.hp).toBe(4)
  const ko = fight(hit.boss, 'PYTEST', 0, false)
  expect(ko.boss).toBeNull()
  expect(ko.xp).toBe(100)
  expect(fight(hit.boss, 'PYTEST', 0, true).boss).toEqual(hit.boss)
  expect(fight(null, 'JEST', 0, false)).toEqual({ boss: null, xp: 0 })
})

test('pet life', () => {
  expect(level(250)).toBe(3)
  expect(mood(pet, null, 0)).toBe('happy')
  expect(mood(pet, null, 600_000)).toBe('sleep')
  expect(mood({ ...pet, hp: 10 }, null, 0)).toBe('sick')
  expect(mood(pet, { name: 'X', hp: 1, maxHp: 1 }, 0)).toBe('fight')
  expect(face('happy', 3)).toBe('(-ᴗ-)')
  expect(face('happy', 15)).toBe('(-ᴗ-)')
  expect(face('happy', 3, 'level')).toBe('✧(★▽★)✧')
  expect(face('sleep', 2)).toBe('(-.-) zZ')
  expect(wake({ ...pet, lastSeen: 1 }, 1 + 2 * 86_400_000).pet.hp).toBe(60)
  const reborn = wake({ ...pet, lastSeen: 1 }, 1 + 8 * 86_400_000)
  expect(reborn.pet.generation).toBe(2)
  expect(reborn.say).toBeDefined()
})


test('companion name', () => {
  expect(petName('gribouille le grand')).toBe('GRIBOUILLE')
  expect(petName('  ')).toBe('CLAWD')
  expect(petName(undefined)).toBe('CLAWD')
  expect(fight({ name: 'JEST', hp: 1, maxHp: 2 }, 'JEST', 0, false, 'BOB').say).toBe('JEST est K.O. ! BOB gagne 70 XP !')
})
