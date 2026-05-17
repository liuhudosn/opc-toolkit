# Plan: opc-toolkit v0 — Idea-stage CLI for AI-native one-person companies

## Goal

Build a CLI tool `opc` (Bun + TypeScript, distributed via `bun link` / `npm link`) that operationalizes the **Idea stage** exercises from Anthropic's *Founder's Playbook* (May 14 2026). Each subcommand is independently callable and produces markdown artifacts in a per-idea workspace at `~/opc/<idea-slug>/`. v0 ships **7 commands** covering the loop: `formulate hypothesis → adversarial critique → plan customer interviews → audit interview questions → check Idea-stage exit criteria`. All other playbook exercises are explicitly deferred to v0.1.

## Constraints / non-goals

- **v0 covers Idea stage only.** No MVP / Launch / Scale work in this iteration.
- **Do not reproduce mature SaaS.** No outreach (Apollo/Instantly own this), no transcription (Otter/Fireflies/Granola), no large-scale interview synthesis (Dovetail). For interview synthesis we provide a thin command that takes user-pasted notes — not a transcript pipeline.
- **No web UI, no Notion sync, no MCP server in v0.** Outputs are markdown files on disk; user can sync to whatever they want manually.
- **LLM provider must be pluggable.** Default to Qiniu (OpenAI-compatible at `https://api.qnaigc.com/v1`, model `deepseek/deepseek-v4-pro` for reasoning + `deepseek/deepseek-v4-flash` for short tasks) since `$QINIU_API_KEY` exists in user env. Also support Anthropic when `$ANTHROPIC_API_KEY` is set. Detection by env var presence + optional `~/opc/.config/opc.json` override.
- **No telemetry, no auth, no network calls except LLM.** Local-only tool.
- **Don't ship an over-engineered prompt-template DSL.** Each command's prompt lives in `src/prompts/<cmd>.md` as a plain markdown file with `{{placeholder}}` interpolation. No Handlebars, no Mustache, no Jinja.
- **Don't pre-build commands that aren't in v0's 7-command scope.** Specifically, do NOT scaffold stubs for `competitors`, `reviews`, `market-size`, `trends`, `interview-debrief`, `interview-synth`, `solution-stress`, `proto-spec`. Those are v0.1; adding empty stubs now creates dead surface area.

## Out-of-scope exercises (deferred to v0.1, do not implement)

These map to playbook exercises but are NOT v0:
- `opc idea competitors` — tier-mapped competitive landscape
- `opc idea reviews` — competitor review mining for unmet needs
- `opc idea market-size` — TAM/SAM/SOM with assumption surfacing
- `opc idea trends` — 3 external trends as tailwind/headwind
- `opc idea interview-debrief` — single-interview confirmed/challenged/surprising
- `opc idea interview-synth` — every-5-interviews batch synthesis with bias check
- `opc idea solution-stress` — 3 critical assumptions + consequences
- `opc idea proto-spec` — single core interaction spec for Claude-Code prototyping

Mention them in `README.md` as "coming next" so users know v0 is a slice, not the whole thing.

## Touched files (everything under `/home/huduson/code/opc-toolkit/`)

Existing (do not modify, already set up by Phase 1):
- `.claude/settings.json`, `.claude/reviews/.gitignore`, `scripts/handoff.sh`, `scripts/review.sh`, `.gitignore`, `docs/founders-playbook.pdf`, `PLAN.md` (this file)

To create:

```
opc-toolkit/
├── package.json                           NEW — name "opc-toolkit", bin "opc"
├── tsconfig.json                          NEW — strict TS, target ES2022, module ESNext
├── bunfig.toml                            NEW — bun config (test runner, etc.)
├── README.md                              NEW — usage + design rationale (≤120 lines)
├── src/
│   ├── cli.ts                             NEW — entry point, sub-command router using `cac`
│   ├── commands/
│   │   ├── init.ts                        NEW — bootstrap ~/opc/.config/opc.json
│   │   ├── idea-new.ts                    NEW — create ~/opc/<slug>/ with README skeleton
│   │   ├── idea-brief.ts                  NEW — sharpen hypothesis to testable form
│   │   ├── idea-kill.ts                   NEW — adversarial pressure-test (devil's advocate)
│   │   ├── idea-interview-prep.ts         NEW — generate interview framework per persona
│   │   ├── idea-interview-audit.ts        NEW — flag leading/future-facing/broad questions
│   │   └── idea-exit-check.ts             NEW — evaluate the 3 exit criteria
│   ├── lib/
│   │   ├── llm.ts                         NEW — provider-agnostic chat() function
│   │   ├── workspace.ts                   NEW — find/load/write idea workspace files
│   │   ├── config.ts                      NEW — load/save ~/opc/.config/opc.json
│   │   └── render.ts                      NEW — load prompt template, interpolate {{vars}}
│   └── prompts/
│       ├── idea-brief.md                  NEW — prompt template (see playbook page 11)
│       ├── idea-kill.md                   NEW — prompt template (see playbook pages 11–12)
│       ├── idea-interview-prep.md         NEW — prompt template (see playbook page 13)
│       ├── idea-interview-audit.md        NEW — prompt template (see playbook page 13)
│       └── idea-exit-check.md             NEW — prompt template (see playbook page 9)
└── tests/
    ├── workspace.test.ts                  NEW — workspace dir resolution + file I/O
    ├── render.test.ts                     NEW — prompt template interpolation
    └── config.test.ts                     NEW — config load/save + env detection
```

**Prompt templates must be derived from the playbook's exact framings**, not invented. The playbook PDF is at `docs/founders-playbook.pdf`; pages 9–14 cover the Idea stage. Quote the relevant exercise text verbatim into each template's "task" section, then add structured-output instructions. **Do not paraphrase the playbook's intent — copy its question framings directly** because the user's whole rationale for using this playbook is its specific, validated framings.

## Idea-workspace layout (created by `opc idea new`)

```
~/opc/<idea-slug>/
├── README.md                # idea title + rough hypothesis (user edits this)
├── 01-hypothesis.md         # output of `opc idea brief`
├── 02-kill.md               # output of `opc idea kill`
├── 07-interviews/
│   ├── framework.md         # output of `opc idea interview-prep`
│   └── audit/
│       └── <draft-name>.md  # output of `opc idea interview-audit <file>`
└── exit-check.md            # output of `opc idea exit-check`
```

Numbered slots (`03-` through `06-`, `08-`, `09-`) are reserved for v0.1 commands without churn later.

## Steps (intended for opencode + omo execution; sisyphus, follow in order)

1. **Initialize package**: create `package.json` (name `opc-toolkit`, bin `{ "opc": "dist/cli.js" }`, type `module`), `tsconfig.json` (strict, ES2022, NodeNext), `bunfig.toml`. Add deps: `cac` (CLI), `openai` (works for OpenAI-compatible Qiniu), `@anthropic-ai/sdk` (for Anthropic native), `zod` (input validation). Dev deps: `@types/node`. Run `bun install`.

2. **Implement `src/lib/config.ts`**: `loadConfig()` reads `~/opc/.config/opc.json`, falls back to env-var detection. Schema: `{ provider: "qiniu"|"anthropic", model: string, fast_model: string, base_url?: string }`. Default if no config file: provider `qiniu`, model `deepseek/deepseek-v4-pro`, fast_model `deepseek/deepseek-v4-flash`, base_url `https://api.qnaigc.com/v1`. Refuse to run any LLM command if no API key in env.

3. **Implement `src/lib/llm.ts`**: single async `chat({ system, user, fast?: boolean }): Promise<string>` function. Routes to Qiniu via `openai` SDK (with `baseURL`) or to Anthropic via `@anthropic-ai/sdk`. `fast: true` selects the fast_model, otherwise the main model. No streaming in v0 — return full string.

4. **Implement `src/lib/workspace.ts`**: `resolveIdea(slug?: string): string` finds idea dir by explicit slug arg OR by walking up from `cwd` looking for a `.opc-idea` marker file OR by reading `$OPC_CURRENT_IDEA`. `readSection(path, heading)` extracts a markdown H2 section. `writeArtifact(ideaDir, filename, content)` writes (overwriting) and prints relative path.

5. **Implement `src/lib/render.ts`**: `renderPrompt(name: string, vars: Record<string, string>): string` reads `src/prompts/<name>.md`, interpolates `{{key}}` with values from `vars`. Throws if any placeholder is missing a value. No conditionals, no loops — keep dumb.

6. **Implement `src/commands/init.ts`**: accepts `--provider`, `--model`, `--force` flags; writes `~/opc/.config/opc.json`. Idempotent — if file exists, print path and exit 0 unless `--force`.

7. **Implement `src/commands/idea-new.ts`**: takes `<slug>` arg; creates `~/opc/<slug>/` with a `README.md` skeleton (sections: `# <slug>`, `## Hypothesis (rough)`, `## Why I think this`, `## Who I think has this problem`). Errors if dir exists. Touches `.opc-idea` marker file inside.

8. **Implement `src/commands/idea-brief.ts`**: reads idea workspace's `README.md` "Hypothesis (rough)" + "Who I think has this problem" + "Why I think this" sections. Renders `prompts/idea-brief.md` with those values. Calls `chat()` (main model). Output schema: testable hypothesis paragraph + bullet list (who, frequency, severity, current behavior). Writes `01-hypothesis.md`. **Prompt must explicitly forbid generic answers and require concrete specificity** (the playbook's exact criterion on page 9).

9. **Implement `src/commands/idea-kill.ts`**: reads `01-hypothesis.md`. Renders `prompts/idea-kill.md` (the adversarial template). Calls `chat()` (main model — this is the highest-reasoning task). Output: 5+ structured counterarguments, 3 disconfirming-evidence directions to investigate, 2 plausible pivots. Writes `02-kill.md`. The prompt MUST instruct the model to argue *against* the idea, NOT to balance — the playbook is explicit on this (pages 10–11).

10. **Implement `src/commands/idea-interview-prep.ts`**: reads `01-hypothesis.md` + accepts `--persona <name>` flag (multi-allowed). Renders `prompts/idea-interview-prep.md`. Generates ordered interview framework per persona: opening, problem-context questions (asking about *past* behavior, not future intent — Mom Test rule from page 13), follow-up probes for deflection, closing. Writes `07-interviews/framework.md` with one section per persona.

11. **Implement `src/commands/idea-interview-audit.ts`**: takes `<file.md>` arg pointing to draft questions. Renders `prompts/idea-interview-audit.md`. Output: per-question table with flags `LEADING | FUTURE-FACING | TOO-BROAD | SOCIALLY-DESIRABLE | OK` plus rewrite suggestion. Writes `07-interviews/audit/<basename>.md`.

12. **Implement `src/commands/idea-exit-check.ts`**: reads all artifacts in idea workspace. Renders `prompts/idea-exit-check.md`. Output: per-criterion verdict (Met / Partially-Met / Not-Met) + missing evidence enumerated + recommended next action (continue Idea / move to MVP / pivot). Writes `exit-check.md`.

13. **Wire up `src/cli.ts`** with `cac`: register all subcommands, support `opc idea <subcmd>` namespace via cac sub-parsers. Provide global flags `--provider`, `--model`, `--idea <slug>`. Add `--help` examples per command.

14. **Write tests** (`bun test`):
    - `tests/workspace.test.ts`: idea-dir resolution by all three mechanisms; section extraction handles missing headings.
    - `tests/render.test.ts`: missing placeholder throws; multi-occurrence interpolation works; markdown structure preserved.
    - `tests/config.test.ts`: env-var detection; config-file overrides env; missing API key throws clear error.
    - **Do not write LLM-call tests** — those are integration tests, out of scope for v0. Mock `chat()` if any command-level tests are added.

15. **Add build script**: `bun build src/cli.ts --target=bun --outdir=dist`. Make `dist/cli.js` executable, `bun link` for local global install.

16. **Write `README.md`** (~120 lines max): one-paragraph what-it-is, install (`bun install && bun link`), 5-minute walkthrough on a fake idea (`opc init` → `opc idea new test` → edit README → `opc idea brief` → `opc idea kill` → ...), config schema, deferred commands list (the v0.1 set above).

## Acceptance criteria

- [ ] `bun install` succeeds with no peer-dependency warnings
- [ ] `bun run tsc --noEmit` passes (zero TS errors)
- [ ] `bun test` passes (all 3 test files green)
- [ ] `bun build src/cli.ts --target=bun --outdir=dist` produces a working executable
- [ ] `bun link` then `opc --help` lists all 7 subcommands with one-line descriptions
- [ ] `opc init` (with `$QINIU_API_KEY` set, no `~/opc/.config/opc.json`) creates the config file with Qiniu defaults
- [ ] `opc idea new sample-idea` creates `~/opc/sample-idea/README.md` with expected sections + `.opc-idea` marker
- [ ] After filling `README.md` with a rough hypothesis, `opc idea brief --idea sample-idea` produces `01-hypothesis.md` containing a who/frequency/severity/current-behavior bullet list
- [ ] `opc idea kill --idea sample-idea` produces `02-kill.md` with at least 5 counterarguments structured as headers
- [ ] `opc idea interview-prep --idea sample-idea --persona "founder"` produces `07-interviews/framework.md` with at least 8 questions, none of them future-facing ("would you...")
- [ ] `opc idea interview-audit 07-interviews/framework.md --idea sample-idea` flags any future-facing question with `FUTURE-FACING`
- [ ] `opc idea exit-check --idea sample-idea` produces `exit-check.md` with verdicts on all 3 criteria
- [ ] Removing `$QINIU_API_KEY` and `$ANTHROPIC_API_KEY` then running any LLM command produces a clear error message naming both env vars
- [ ] `README.md` exists, ≤ 120 lines, includes the deferred-commands list

## Notes for the executor (sisyphus)

1. **The playbook PDF is the source of truth for prompt content.** Read `docs/founders-playbook.pdf` pages 9–14 (Idea stage) before writing any prompt template. Quote its exact framings — particularly the four sharpening questions on page 9 ("who exactly has it, how often, how severely, what they currently do about it") and the Mom-Test pattern on page 13 ("tell me about the last time you dealt with this problem"). Use Python with `fitz` (PyMuPDF, already installed) to extract text — `pdftotext` is not installed.

2. **Provider plumbing is a known gotcha.** Qiniu speaks OpenAI protocol at `https://api.qnaigc.com/v1`; Anthropic native uses `@anthropic-ai/sdk`. Don't try to make Anthropic speak OpenAI protocol or vice versa — keep two adapter functions inside `llm.ts` and dispatch on `config.provider`. The user's `$QINIU_API_KEY` is a 67-char string starting with `sk-`.

3. **DO NOT add error-handling abstractions.** No retry middleware, no circuit breakers, no token-bucket rate limiters in v0. If `chat()` throws, let it propagate to the CLI handler which prints `error.message` and exits 1. Internal-tool, single-user — premature.

4. **Markdown section parsing is not robust parsing.** `readSection` should split on `^## ` headings — sufficient for files we control. Don't pull in `remark` / `unified`. If users hand-edit markdown badly, error messages should say "section X not found in Y".

5. **The "kill" command's value is its bias.** When writing `prompts/idea-kill.md`, the system prompt MUST tell the model: "You are a critic, not a balanced advisor. Do not offer encouragement. Do not soft-pedal weaknesses." Default LLM behavior is to balance — we explicitly want imbalance here. The playbook is unambiguous about this on pages 10–11.

6. **The interview-audit output schema is fixed.** Markdown table with exactly 4 columns: `Question | Flag | Why | Rewrite`. Flag values are exactly one of the enum: `LEADING`, `FUTURE-FACING`, `TOO-BROAD`, `SOCIALLY-DESIRABLE`, `OK`. Reject other values in the prompt instructions.

7. **Workspace resolution priority** (highest first): explicit `--idea <slug>` flag → `$OPC_CURRENT_IDEA` env → walk-up from `cwd` looking for `.opc-idea` marker → error.

8. **If the plan turns out to be wrong, stop and report — do not improvise.** The deferred-command list at the top of this plan is a hard line; do not add v0.1 commands "while you're at it." If a step seems like it needs a v0.1 capability, surface it instead of expanding scope.

9. **README.md max 120 lines is a real constraint.** Don't fluff it. Skip "Why this exists?" prose, point at the playbook URL instead. Skip TOC — it's short enough.

10. **Tests must use Bun's built-in test runner**, not vitest/jest. `import { test, expect } from "bun:test"`.
