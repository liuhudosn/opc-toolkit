# opc — Idea-stage CLI for AI-native one-person companies

`opc` operationalizes the **Idea stage** exercises from Anthropic's [Founder's Playbook](https://anthropic.com/founders-playbook) (Chapter 3). Seven independent commands guide you from rough hypothesis to "should I build this?" — with an LLM as structured devil's advocate.

## Install

```bash
bun install && bun link
```

Set one of these environment variables to pick your LLM provider:

| Env var | Provider | Default model |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI | `gpt-4o` / `gpt-4o-mini` |
| `ANTHROPIC_API_KEY` | Anthropic | `claude-sonnet-4-20250514` / `claude-haiku-4-5-20251001` |
| `DEEPSEEK_API_KEY` | DeepSeek (OpenAI-compat) | `deepseek-chat` |
| `GROQ_API_KEY` | Groq (OpenAI-compat) | `llama-3.3-70b` / `llama-3.1-8b` |
| (none) | Ollama (local) | `llama3.2` |

`opc` auto-detects your provider from env vars. Run `opc init` to write a config file with overrides.

## Quick walkthrough (fake idea)

```bash
opc init                                      # write ~/opc/.config/opc.json
opc idea new expense-tool                     # create workspace at ~/opc/expense-tool/

# Edit ~/opc/expense-tool/README.md with your rough hypothesis, then:

opc idea brief --idea expense-tool            # sharpen into testable hypothesis
opc idea kill --idea expense-tool             # adversarial pressure test
opc idea interview-prep --idea expense-tool   # generate interview framework
opc idea interview-audit 07-interviews/framework.md --idea expense-tool
opc idea exit-check --idea expense-tool       # evaluate the 3 exit criteria
```

## Commands

| Command | What it does |
|---|---|
| `opc init` | Bootstrap `~/opc/.config/opc.json` |
| `opc idea new <slug>` | Create `~/opc/<slug>/` workspace |
| `opc idea brief` | Sharpen hypothesis → `01-hypothesis.md` |
| `opc idea kill` | Adversarial critique → `02-kill.md` |
| `opc idea interview-prep` | Generate interview framework |
| `opc idea interview-audit <file>` | Flag leading/vague/future-facing questions |
| `opc idea exit-check` | Evaluate 3 exit criteria → `exit-check.md` |

All commands support `--idea <slug>` to target a workspace.

## Idea workspace layout

```
~/opc/<idea-slug>/
├── README.md               # you write this first
├── 01-hypothesis.md        # opc idea brief
├── 02-kill.md              # opc idea kill
├── 07-interviews/
│   ├── framework.md        # opc idea interview-prep
│   └── audit/<name>.md     # opc idea interview-audit
└── exit-check.md           # opc idea exit-check
```

## Config (`~/opc/.config/opc.json`)

```json
{
  "provider": "openai",
  "model": "gpt-4o",
  "fast_model": "gpt-4o-mini"
}
```

Valid providers: `openai`, `anthropic`, `openai-compatible`, `ollama`.

For `openai-compatible`, include `base_url`:

```json
{
  "provider": "openai-compatible",
  "model": "your-model",
  "fast_model": "your-fast-model",
  "base_url": "https://your-endpoint.com/v1"
}
```

Configure interactively: `opc init --provider openai --model gpt-4o`

## Coming next (v0.1)

`opc idea competitors`, `opc idea reviews`, `opc idea market-size`, `opc idea trends`, `opc idea interview-debrief`, `opc idea interview-synth`, `opc idea solution-stress`, `opc idea proto-spec`.

## Design

- **Local only.** No telemetry, no auth, no network calls except LLM.
- **Markdown on disk.** Outputs are plain `.md` files. Sync to Notion, GitHub, or wherever manually.
- **Provider-agnostic.** OpenAI, Anthropic, DeepSeek, Groq, Ollama, or any OpenAI-compatible endpoint. Detected from env vars; config file for overrides.
- **No over-abstraction.** Prompt templates are plain markdown with `{{placeholder}}` interpolation. No Handlebars, no DSL.