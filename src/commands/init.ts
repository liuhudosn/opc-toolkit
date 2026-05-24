import {
  loadConfig,
  saveConfig,
  configExists,
  getConfigPath,
  getProviderDefaults,
  type Config,
  type Provider,
} from "../lib/config.js";

export interface InitOptions {
  provider?: string;
  model?: string;
  baseUrl?: string;
  force?: boolean;
}

const VALID_PROVIDERS: Provider[] = ["openai", "anthropic", "openai-compatible", "ollama"];

export function init(opts: InitOptions): void {
  if (configExists() && !opts.force) {
    console.log(`Config already exists at ${getConfigPath()}. Use --force to overwrite.`);
    process.exit(0);
  }

  const existing = configExists() ? loadConfig() : null;
  const config: Config = existing ?? {
    provider: "openai-compatible",
    model: "",
    fast_model: "",
  };

  if (opts.provider) {
    if (!VALID_PROVIDERS.includes(opts.provider as Provider)) {
      throw new Error(
        `Invalid provider: ${opts.provider}. Must be one of: ${VALID_PROVIDERS.join(", ")}.`,
      );
    }
    config.provider = opts.provider as Provider;
    const defaults = getProviderDefaults(config.provider);
    config.model = defaults.model;
    config.fast_model = defaults.fast_model;
    if (defaults.base_url) {
      config.base_url = defaults.base_url;
    } else {
      delete config.base_url;
    }
  }

  if (opts.model) {
    config.model = opts.model;
  }

  if (opts.baseUrl !== undefined) {
    config.base_url = opts.baseUrl || undefined;
  }

  saveConfig(config);
  console.log(`Config written to ${getConfigPath()}`);
}