#!/usr/bin/env bun
import { cac } from "cac";
import { init } from "./commands/init.js";
import { ideaNew } from "./commands/idea-new.js";
import { ideaBrief } from "./commands/idea-brief.js";
import { ideaKill } from "./commands/idea-kill.js";
import { ideaInterviewPrep } from "./commands/idea-interview-prep.js";
import { ideaInterviewAudit } from "./commands/idea-interview-audit.js";
import { ideaExitCheck } from "./commands/idea-exit-check.js";

const cli = cac("opc");

// ── opc init ──────────────────────────────────────────────────────────────────

cli
  .command("init", "Bootstrap ~/opc/.config/opc.json")
  .option("--provider <provider>", "LLM provider: openai, anthropic, openai-compatible, or ollama")
  .option("--model <model>", "Override the default model")
  .option("--base-url <url>", "Override the API base URL (for openai-compatible)")
  .option("--force", "Overwrite existing config")
  .action((opts: { provider?: string; model?: string; baseUrl?: string; force?: boolean }) => {
    try {
      init(opts);
    } catch (e: unknown) {
      console.error(`Error: ${(e as Error).message}`);
      process.exit(1);
    }
  });

// ── opc idea ──────────────────────────────────────────────────────────────────
// cac does not support nested subcommands on Command, so we manually dispatch.

cli
  .command("idea [...args]", "Idea-stage workflow (run `opc idea --help` for subcommands)")
  .allowUnknownOptions()
  .option("--idea <slug>", "Idea slug or path")
  .option("--persona <name>", "Target persona (repeatable)")
  .example("opc idea new <slug>                    Create a new idea workspace")
  .example("opc idea brief                         Sharpen hypothesis into testable form")
  .example("opc idea kill                          Adversarial pressure-test (devil's advocate)")
  .example("opc idea interview-prep                Generate customer-discovery interview framework")
  .example("opc idea interview-audit <file>        Audit interview questions for bias")
  .example("opc idea exit-check                    Evaluate the 3 Idea-stage exit criteria")
  .action(async (args: string[], opts: Record<string, unknown>) => {
    if (args.length === 0) {
      console.log("Usage: opc idea <subcommand> [options]\n");
      console.log("Subcommands:");
      console.log("  new <slug>              Create a new idea workspace");
      console.log("  brief                   Sharpen your hypothesis into a testable form");
      console.log("  kill                    Adversarial pressure-test (devil\u2019s advocate)");
      console.log("  interview-prep          Generate customer discovery interview framework");
      console.log("  interview-audit <file>  Audit interview questions for bias");
      console.log("  exit-check              Evaluate Idea-stage exit criteria");
      return;
    }

    const sub = args[0];
    const rest = args.slice(1);

    try {
      switch (sub) {
        case "new": {
          const slug = rest[0];
          if (!slug) {
            console.error("Error: Missing <slug> argument. Usage: opc idea new <slug>");
            process.exit(1);
          }
          ideaNew({ slug });
          break;
        }
        case "brief": {
          const idea = opts["idea"] as string | undefined;
          await ideaBrief({ idea });
          break;
        }
        case "kill": {
          const idea = opts["idea"] as string | undefined;
          await ideaKill({ idea });
          break;
        }
        case "interview-prep": {
          const idea = opts["idea"] as string | undefined;
          const rawPersona = opts["persona"] as string | string[] | undefined;
          const personas = Array.isArray(rawPersona)
            ? rawPersona
            : rawPersona
              ? [rawPersona]
              : ["target-user"];
          await ideaInterviewPrep({ idea, persona: personas });
          break;
        }
        case "interview-audit": {
          const file = rest[0];
          if (!file) {
            console.error("Error: Missing <file> argument. Usage: opc idea interview-audit <file>");
            process.exit(1);
          }
          const idea = opts["idea"] as string | undefined;
          await ideaInterviewAudit({ file, idea });
          break;
        }
        case "exit-check": {
          const idea = opts["idea"] as string | undefined;
          await ideaExitCheck({ idea });
          break;
        }
        default:
          console.error(`Error: Unknown subcommand "idea ${sub}".`);
          console.error("Available: new, brief, kill, interview-prep, interview-audit, exit-check");
          process.exit(1);
      }
    } catch (e: unknown) {
      console.error(`Error: ${(e as Error).message}`);
      process.exit(1);
    }
  });

cli.help();
cli.version("0.1.0");
cli.parse();
