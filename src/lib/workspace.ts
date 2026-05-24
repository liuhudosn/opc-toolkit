import { existsSync, readFileSync, mkdirSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative, resolve, dirname, basename } from "node:path";

const OPC_DIR = join(homedir(), "opc");
const MARKER_FILE = ".opc-idea";

export function resolveIdea(slug?: string): string {
  if (slug) {
    const dir = join(OPC_DIR, slug);
    if (!existsSync(dir)) {
      throw new Error(`Idea workspace not found: ${dir}`);
    }
    return dir;
  }

  if (process.env.OPC_CURRENT_IDEA) {
    const dir = join(OPC_DIR, process.env.OPC_CURRENT_IDEA);
    if (!existsSync(dir)) {
      throw new Error(
        `OPC_CURRENT_IDEA points to non-existent workspace: ${dir}`,
      );
    }
    return dir;
  }

  let current = process.cwd();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (existsSync(join(current, MARKER_FILE))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }

  throw new Error(
    "No idea workspace found. Use --idea <slug> to specify one, or run from inside an idea directory.",
  );
}

export function readSection(filePath: string, heading: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const headingLine = `## ${heading}`;
  let inSection = false;
  const sectionLines: string[] = [];

  for (const line of lines) {
    if (!inSection && line.trimStart() === headingLine) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (line.trimStart().startsWith("## ")) {
        break;
      }
      sectionLines.push(line);
    }
  }

  if (!inSection) {
    throw new Error(`Section "${heading}" not found in ${relative(process.cwd(), filePath)}`);
  }

  return sectionLines.join("\n").trim();
}

export function readFile(filePath: string): string {
  if (!existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }
  return readFileSync(filePath, "utf-8");
}

export function writeArtifact(ideaDir: string, filename: string, content: string): void {
  const dir = dirname(join(ideaDir, filename));
  mkdirSync(dir, { recursive: true });

  const filePath = join(dir, basename(filename));
  writeFileSync(filePath, content);
}

export function getOpcDir(): string {
  return OPC_DIR;
}

export function createIdeaDir(slug: string): string {
  const dir = join(OPC_DIR, slug);
  if (existsSync(dir)) {
    throw new Error(`Idea workspace already exists: ${dir}`);
  }
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, MARKER_FILE), "");
  return dir;
}

export function listArtifacts(ideaDir: string): string[] {
  const results: string[] = [];

  function walk(current: string) {
    const entries = readdirSync(current);
    for (const entry of entries) {
      if (entry === MARKER_FILE) continue;
      const full = join(current, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (entry.endsWith(".md")) {
        results.push(relative(ideaDir, full));
      }
    }
  }

  walk(ideaDir);
  return results.sort();
}