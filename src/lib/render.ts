import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function findProjectRoot(startDir: string): string {
  let current = startDir;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (existsSync(join(current, "package.json"))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      throw new Error("Could not find project root (no package.json found)");
    }
    current = parent;
  }
}

const PROJECT_ROOT = findProjectRoot(__dirname);
const PROMPTS_DIR = join(PROJECT_ROOT, "src", "prompts");

export function renderPrompt(name: string, vars: Record<string, string>): string {
  const promptPath = join(PROMPTS_DIR, `${name}.md`);

  if (!existsSync(promptPath)) {
    throw new Error(`Prompt template not found: ${name}.md`);
  }

  const template = readFileSync(promptPath, "utf-8");
  const missing: string[] = [];

  const result = template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    if (!(key in vars)) {
      missing.push(key);
      return `{{${key}}}`;
    }
    return vars[key];
  });

  if (missing.length > 0) {
    throw new Error(`Missing placeholder values: ${missing.join(", ")}`);
  }

  return result;
}