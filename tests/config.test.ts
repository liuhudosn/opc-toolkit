import { test, expect, beforeEach, afterEach } from "bun:test";
import {
  loadConfig,
  saveConfig,
  configExists,
  getConfigPath,
  requireApiKey,
  type Config,
} from "../src/lib/config.js";
import { mkdirSync, rmSync, existsSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), "opc", ".config");
const CONFIG_FILE = join(CONFIG_DIR, "opc.json");

const ALL_TEST_ENV_KEYS = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "DEEPSEEK_API_KEY",
  "GROQ_API_KEY",
  "QINIU_API_KEY",
  "OPENAI_BASE_URL",
];

function clearAllEnvKeys() {
  for (const key of ALL_TEST_ENV_KEYS) {
    delete process.env[key];
  }
}

const originalEnv = { ...process.env };

beforeEach(() => {
  if (existsSync(CONFIG_FILE)) rmSync(CONFIG_FILE);
  if (existsSync(CONFIG_DIR)) rmSync(CONFIG_DIR, { recursive: true });
});

afterEach(() => {
  process.env = { ...originalEnv };
  clearAllEnvKeys();
  if (existsSync(CONFIG_FILE)) rmSync(CONFIG_FILE);
});

test("loadConfig detects OPENAI_API_KEY → openai provider", () => {
  clearAllEnvKeys();
  process.env.OPENAI_API_KEY = "sk-openai-test";
  const config = loadConfig();
  expect(config.provider).toBe("openai");
  expect(config.model).toBe("gpt-4o");
  expect(config.fast_model).toBe("gpt-4o-mini");
});

test("loadConfig detects ANTHROPIC_API_KEY → anthropic provider", () => {
  clearAllEnvKeys();
  process.env.ANTHROPIC_API_KEY = "sk-ant-test";
  const config = loadConfig();
  expect(config.provider).toBe("anthropic");
});

test("loadConfig detects DEEPSEEK_API_KEY → openai-compatible with deepseek base_url", () => {
  clearAllEnvKeys();
  process.env.DEEPSEEK_API_KEY = "sk-deepseek-test";
  const config = loadConfig();
  expect(config.provider).toBe("openai-compatible");
  expect(config.model).toBe("deepseek-chat");
  expect(config.base_url).toBe("https://api.deepseek.com/v1");
});

test("loadConfig detects GROQ_API_KEY → openai-compatible with groq base_url", () => {
  clearAllEnvKeys();
  process.env.GROQ_API_KEY = "gsk-groq-test";
  const config = loadConfig();
  expect(config.provider).toBe("openai-compatible");
  expect(config.model).toBe("llama-3.3-70b-versatile");
  expect(config.base_url).toBe("https://api.groq.com/openai/v1");
});

test("loadConfig falls back to openai-compatible defaults when no API keys exist", () => {
  clearAllEnvKeys();
  const config = loadConfig();
  expect(config.provider).toBe("openai-compatible");
});

test("config file overrides env detection", () => {
  process.env.QINIU_API_KEY = "sk-test";
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(
    CONFIG_FILE,
    JSON.stringify({ provider: "openai", model: "custom-model", fast_model: "custom-fast" }),
  );
  const config = loadConfig();
  expect(config.provider).toBe("openai");
  expect(config.model).toBe("custom-model");
  expect(config.fast_model).toBe("custom-fast");
});

test("legacy qiniu provider normalizes to openai-compatible on load", () => {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(
    CONFIG_FILE,
    JSON.stringify({ provider: "qiniu", model: "legacy-model", fast_model: "legacy-fast" }),
  );
  const config = loadConfig();
  expect(config.provider).toBe("openai-compatible");
  expect(config.model).toBe("legacy-model");
});

test("saveConfig writes and loadConfig reads back", () => {
  const config: Config = {
    provider: "openai",
    model: "gpt-4o",
    fast_model: "gpt-4o-mini",
    base_url: "https://custom.openai.com/v1",
  };
  saveConfig(config);
  expect(configExists()).toBe(true);
  const loaded = loadConfig();
  expect(loaded.provider).toBe("openai");
  expect(loaded.model).toBe("gpt-4o");
  expect(loaded.base_url).toBe("https://custom.openai.com/v1");
});

test("config with api_key returns it from requireApiKey", () => {
  clearAllEnvKeys();
  const config: Config = {
    provider: "openai",
    model: "gpt-4o",
    fast_model: "gpt-4o-mini",
    api_key: "sk-from-config",
  };
  expect(requireApiKey(config)).toBe("sk-from-config");
});

test("ollama provider requires no API key", () => {
  clearAllEnvKeys();
  const config: Config = {
    provider: "ollama",
    model: "llama3.2",
    fast_model: "llama3.2",
  };
  expect(requireApiKey(config)).toBe("");
});

test("requireApiKey throws with clear message when no key found", () => {
  clearAllEnvKeys();
  const config: Config = {
    provider: "openai",
    model: "gpt-4o",
    fast_model: "gpt-4o-mini",
  };
  expect(() => requireApiKey(config)).toThrow("OPENAI_API_KEY");
});

test("requireApiKey falls back to any known env key", () => {
  clearAllEnvKeys();
  process.env.ANTHROPIC_API_KEY = "sk-ant-fallback";
  const config: Config = {
    provider: "openai",
    model: "gpt-4o",
    fast_model: "gpt-4o-mini",
  };
  expect(requireApiKey(config)).toBe("sk-ant-fallback");
});