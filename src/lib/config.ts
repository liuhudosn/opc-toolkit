import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), "opc", ".config");
const CONFIG_FILE = join(CONFIG_DIR, "opc.json");

// ── Provider type ────────────────────────────────────────────────────────────

export type Provider = "openai" | "anthropic" | "openai-compatible" | "ollama";

// Legacy: v0.0 used "qiniu" — normalize to "openai-compatible" on load.
const LEGACY_PROVIDERS: Record<string, Provider> = {
  qiniu: "openai-compatible",
};

function normalizeProvider(raw: string): Provider {
  if (raw in LEGACY_PROVIDERS) {
    return LEGACY_PROVIDERS[raw];
  }
  const valid: Provider[] = ["openai", "anthropic", "openai-compatible", "ollama"];
  if (valid.includes(raw as Provider)) {
    return raw as Provider;
  }
  return "openai-compatible";
}

// ── Config shape ─────────────────────────────────────────────────────────────

export interface Config {
  provider: Provider;
  model: string;
  fast_model: string;
  base_url?: string;
  api_key?: string;
}

// ── Per-provider defaults ────────────────────────────────────────────────────

interface ProviderDefaults {
  model: string;
  fast_model: string;
  base_url?: string;
  env_key: string;
}

const PROVIDER_DEFAULTS: Record<Provider, ProviderDefaults> = {
  openai: {
    model: "gpt-4o",
    fast_model: "gpt-4o-mini",
    env_key: "OPENAI_API_KEY",
  },
  anthropic: {
    model: "claude-sonnet-4-20250514",
    fast_model: "claude-haiku-4-5-20251001",
    env_key: "ANTHROPIC_API_KEY",
  },
  "openai-compatible": {
    model: "deepseek/deepseek-v4-pro",
    fast_model: "deepseek/deepseek-v4-flash",
    base_url: "https://api.qnaigc.com/v1",
    env_key: "QINIU_API_KEY",
  },
  ollama: {
    model: "llama3.2",
    fast_model: "llama3.2",
    base_url: "http://localhost:11434/v1",
    env_key: "",
  },
};

// ── Env-var auto-detection ───────────────────────────────────────────────────

interface DetectedProvider {
  provider: Provider;
  model: string;
  fast_model: string;
  base_url?: string;
}

const DETECT_CHAIN: Array<{
  env: string;
  resolve: (key: string) => DetectedProvider;
}> = [
  {
    env: "OPENAI_API_KEY",
    resolve: () => ({
      provider: "openai",
      model: PROVIDER_DEFAULTS.openai.model,
      fast_model: PROVIDER_DEFAULTS.openai.fast_model,
    }),
  },
  {
    env: "ANTHROPIC_API_KEY",
    resolve: () => ({
      provider: "anthropic",
      model: PROVIDER_DEFAULTS.anthropic.model,
      fast_model: PROVIDER_DEFAULTS.anthropic.fast_model,
    }),
  },
  {
    env: "DEEPSEEK_API_KEY",
    resolve: () => ({
      provider: "openai-compatible",
      model: "deepseek-chat",
      fast_model: "deepseek-chat",
      base_url: "https://api.deepseek.com/v1",
    }),
  },
  {
    env: "GROQ_API_KEY",
    resolve: () => ({
      provider: "openai-compatible",
      model: "llama-3.3-70b-versatile",
      fast_model: "llama-3.1-8b-instant",
      base_url: "https://api.groq.com/openai/v1",
    }),
  },
  {
    env: "QINIU_API_KEY",
    resolve: () => ({
      provider: "openai-compatible",
      model: PROVIDER_DEFAULTS["openai-compatible"].model,
      fast_model: PROVIDER_DEFAULTS["openai-compatible"].fast_model,
      base_url: PROVIDER_DEFAULTS["openai-compatible"].base_url,
    }),
  },
  {
    env: "OPENAI_API_KEY",
    resolve: () => {
      const openaiBaseUrl = process.env.OPENAI_BASE_URL;
      if (openaiBaseUrl) {
        return {
          provider: "openai-compatible" as const,
          model: "gpt-4o",
          fast_model: "gpt-4o-mini",
          base_url: openaiBaseUrl,
        };
      }
      return {
        provider: "openai" as const,
        model: PROVIDER_DEFAULTS.openai.model,
        fast_model: PROVIDER_DEFAULTS.openai.fast_model,
      };
    },
  },
];

function detectFromEnv(): Config {
  for (const entry of DETECT_CHAIN) {
    const key = process.env[entry.env];
    if (key) {
      const d = entry.resolve(key);
      return {
        provider: d.provider,
        model: d.model,
        fast_model: d.fast_model,
        base_url: d.base_url,
      };
    }
  }

  // No API key detected — return openai-compatible defaults; user must configure.
  return {
    provider: "openai-compatible",
    model: PROVIDER_DEFAULTS["openai-compatible"].model,
    fast_model: PROVIDER_DEFAULTS["openai-compatible"].fast_model,
    base_url: PROVIDER_DEFAULTS["openai-compatible"].base_url,
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export function loadConfig(): Config {
  if (existsSync(CONFIG_FILE)) {
    const raw = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
    const provider = normalizeProvider(raw.provider ?? "openai-compatible");
    const defaults = PROVIDER_DEFAULTS[provider];
    return {
      provider,
      model: raw.model ?? defaults.model,
      fast_model: raw.fast_model ?? defaults.fast_model,
      base_url: raw.base_url ?? defaults.base_url,
      api_key: raw.api_key,
    };
  }
  return detectFromEnv();
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}

// ── API key resolution ──────────────────────────────────────────────────────

const ENV_KEY_NAMES: Record<Provider, string> = {
  openai: "OPENAI_API_KEY",
  anthropic: "ANTHROPIC_API_KEY",
  "openai-compatible": "OPENAI_API_KEY",
  ollama: "",
};

const ALL_ENV_KEYS = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "DEEPSEEK_API_KEY", "GROQ_API_KEY", "QINIU_API_KEY"];

export function requireApiKey(config: Config): string {
  if (config.api_key) return config.api_key;

  if (config.provider === "ollama") return "";

  const primaryEnv = ENV_KEY_NAMES[config.provider];
  if (primaryEnv) {
    const key = process.env[primaryEnv];
    if (key) return key;
  }

  for (const name of ALL_ENV_KEYS) {
    const key = process.env[name];
    if (key) return key;
  }

  throw new Error(
    `No API key found for provider "${config.provider}".\n` +
      `  Set $${ENV_KEY_NAMES[config.provider] || "OPENAI_API_KEY"} environment variable,\n` +
      `  or run "opc init --provider <provider>" to configure.`,
  );
}

export function getProviderDefaults(provider: Provider): ProviderDefaults {
  return PROVIDER_DEFAULTS[provider];
}