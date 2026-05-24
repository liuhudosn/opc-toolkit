import { test, expect, beforeEach, afterEach } from "bun:test";
import {
  resolveIdea,
  readSection,
  writeArtifact,
  createIdeaDir,
  listArtifacts,
  getOpcDir,
  readFile,
} from "../src/lib/workspace.js";
import {
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
  readFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";

const OPC_DIR = join(homedir(), "opc");
const TEST_SLUG = "test-workspace-ts";
const TEST_DIR = join(OPC_DIR, TEST_SLUG);

beforeEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  delete process.env.OPC_CURRENT_IDEA;
});

afterEach(() => {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true });
  }
  delete process.env.OPC_CURRENT_IDEA;
});

test("createIdeaDir creates workspace with README", () => {
  const dir = createIdeaDir(TEST_SLUG);
  expect(dir).toBe(TEST_DIR);
  expect(existsSync(TEST_DIR)).toBe(true);
  expect(existsSync(join(TEST_DIR, ".opc-idea"))).toBe(true);
});

test("createIdeaDir throws when workspace exists", () => {
  mkdirSync(TEST_DIR, { recursive: true });
  expect(() => createIdeaDir(TEST_SLUG)).toThrow("already exists");
});

test("resolveIdea by explicit slug", () => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, ".opc-idea"), "");
  const dir = resolveIdea(TEST_SLUG);
  expect(dir).toBe(TEST_DIR);
});

test("resolveIdea by OPC_CURRENT_IDEA env", () => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, ".opc-idea"), "");
  process.env.OPC_CURRENT_IDEA = TEST_SLUG;
  const dir = resolveIdea();
  expect(dir).toBe(TEST_DIR);
});

test("resolveIdea throws when slug does not exist", () => {
  expect(() => resolveIdea("nonexistent-slug-xyz")).toThrow("not found");
});

test("resolveIdea throws when no workspace found", () => {
  expect(() => resolveIdea()).toThrow("No idea workspace found");
});

test("readSection extracts markdown section content", () => {
  mkdirSync(TEST_DIR, { recursive: true });
  const readme = [
    "# Test Idea",
    "",
    "Some intro text",
    "",
    "## Hypothesis (rough)",
    "",
    "This is my hypothesis",
    "It spans multiple lines",
    "",
    "## Why I think this",
    "",
    "Because I experienced it firsthand",
    "",
    "## Who I think has this problem",
    "",
    "Engineering managers at mid-size companies",
  ].join("\n");
  writeFileSync(join(TEST_DIR, "README.md"), readme);

  const hypothesis = readSection(join(TEST_DIR, "README.md"), "Hypothesis (rough)");
  expect(hypothesis).toBe("This is my hypothesis\nIt spans multiple lines");
});

test("readSection throws when heading not found", () => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, "README.md"), "# No matching heading");

  expect(() => readSection(join(TEST_DIR, "README.md"), "Hypothesis (rough)")).toThrow(
    "not found",
  );
});

test("readSection throws when file not found", () => {
  expect(() => readSection(join(TEST_DIR, "nonexistent.md"), "Any heading")).toThrow(
    "File not found",
  );
});

test("readFile returns full file content", () => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, "test.txt"), "hello world");

  expect(readFile(join(TEST_DIR, "test.txt"))).toBe("hello world");
});

test("readFile throws when file not found", () => {
  expect(() => readFile(join(TEST_DIR, "nonexistent.txt"))).toThrow("File not found");
});

test("writeArtifact creates nested directories and writes file", () => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeArtifact(TEST_DIR, "07-interviews/framework.md", "# Framework\n\nHello");

  const target = join(TEST_DIR, "07-interviews/framework.md");
  expect(existsSync(target)).toBe(true);
  expect(readFileSync(target, "utf-8")).toBe("# Framework\n\nHello");
});

test("listArtifacts returns sorted markdown files excluding .opc-idea", () => {
  mkdirSync(TEST_DIR, { recursive: true });
  writeFileSync(join(TEST_DIR, ".opc-idea"), "");
  writeFileSync(join(TEST_DIR, "01-hypothesis.md"), "a");
  writeFileSync(join(TEST_DIR, "02-kill.md"), "b");
  writeFileSync(join(TEST_DIR, "exit-check.md"), "c");
  mkdirSync(join(TEST_DIR, "07-interviews/audit"), { recursive: true });
  writeFileSync(join(TEST_DIR, "07-interviews/audit/framework.md"), "d");

  const artifacts = listArtifacts(TEST_DIR);
  expect(artifacts).toContain("01-hypothesis.md");
  expect(artifacts).toContain("02-kill.md");
  expect(artifacts).toContain("exit-check.md");
  expect(artifacts).toContain("07-interviews/audit/framework.md");
  expect(artifacts).not.toContain(".opc-idea");
});

test("getOpcDir returns correct path", () => {
  expect(getOpcDir()).toBe(OPC_DIR);
});