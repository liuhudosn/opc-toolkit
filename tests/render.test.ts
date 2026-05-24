import { test, expect } from "bun:test";
import { renderPrompt } from "../src/lib/render.js";
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROMPTS_DIR = join(__dirname, "..", "src", "prompts");

test("renderPrompt throws when template file does not exist", () => {
  expect(() => renderPrompt("nonexistent", {})).toThrow("Prompt template not found");
});

test("renderPrompt throws when placeholder is missing a value", () => {
  const templatePath = join(PROMPTS_DIR, "test-render.md");
  mkdirSync(PROMPTS_DIR, { recursive: true });
  writeFileSync(templatePath, "Hello {{name}}, your item is {{item}}");

  try {
    expect(() => renderPrompt("test-render", { name: "Alice" })).toThrow(
      "Missing placeholder values: item",
    );
  } finally {
    unlinkSync(templatePath);
  }
});

test("renderPrompt interpolates all placeholders", () => {
  const templatePath = join(PROMPTS_DIR, "test-render.md");
  mkdirSync(PROMPTS_DIR, { recursive: true });
  writeFileSync(templatePath, "Hello {{name}}, your item is {{item}}. Price: {{price}}");

  try {
    const result = renderPrompt("test-render", {
      name: "Alice",
      item: "widget",
      price: "$10",
    });
    expect(result).toBe("Hello Alice, your item is widget. Price: $10");
  } finally {
    unlinkSync(templatePath);
  }
});

test("renderPrompt handles multi-occurrence of same placeholder", () => {
  const templatePath = join(PROMPTS_DIR, "test-render-multi.md");
  mkdirSync(PROMPTS_DIR, { recursive: true });
  writeFileSync(templatePath, "{{name}} said {{name}} likes {{name}}");

  try {
    const result = renderPrompt("test-render-multi", { name: "Bob" });
    expect(result).toBe("Bob said Bob likes Bob");
  } finally {
    unlinkSync(templatePath);
  }
});

test("renderPrompt preserves markdown structure", () => {
  const templatePath = join(PROMPTS_DIR, "test-render-md.md");
  mkdirSync(PROMPTS_DIR, { recursive: true });
  writeFileSync(
    templatePath,
    ["# {{title}}", "", "## Problem", "", "{{problem}}", "", "## Solution", "", "{{solution}}"].join(
      "\n",
    ),
  );

  try {
    const result = renderPrompt("test-render-md", {
      title: "My Idea",
      problem: "Users struggle with X",
      solution: "Build Y to fix it",
    });
    expect(result).toContain("# My Idea");
    expect(result).toContain("## Problem");
    expect(result).toContain("Users struggle with X");
    expect(result).toContain("## Solution");
    expect(result).toContain("Build Y to fix it");
  } finally {
    unlinkSync(templatePath);
  }
});