import { loadConfig, requireApiKey, type Config } from "./config.js";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

export interface ChatOptions {
  system: string;
  user: string;
  fast?: boolean;
  max_tokens?: number;
}

const DEFAULT_MAX_TOKENS = 4096;

export async function chat(opts: ChatOptions): Promise<string> {
  const config = loadConfig();
  const apiKey = requireApiKey(config);

  if (config.provider === "anthropic") {
    return chatAnthropic(config, apiKey, opts);
  }
  return chatOpenAIProtocol(config, apiKey, opts);
}

async function chatOpenAIProtocol(
  config: Config,
  apiKey: string,
  opts: ChatOptions,
): Promise<string> {
  const client = new OpenAI({
    apiKey: apiKey || "ollama",
    baseURL: config.base_url ?? "https://api.openai.com/v1",
  });

  const model = opts.fast ? config.fast_model : config.model;
  const maxTokens = opts.max_tokens ?? DEFAULT_MAX_TOKENS;

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
    temperature: 0.7,
    max_tokens: maxTokens,
  });

  const choice = response.choices[0];
  const content = choice?.message?.content;
  if (!content) {
    throw new Error("LLM returned empty response");
  }
  if (choice.finish_reason === "length") {
    throw new Error(
      `LLM output was truncated (max_tokens=${maxTokens}). Re-run with a larger budget via --max-tokens, or split the input.`,
    );
  }
  return content;
}

async function chatAnthropic(
  config: Config,
  apiKey: string,
  opts: ChatOptions,
): Promise<string> {
  const client = new Anthropic({ apiKey });

  const model = opts.fast ? config.fast_model : config.model;
  const maxTokens = opts.max_tokens ?? DEFAULT_MAX_TOKENS;

  const response = await client.messages.create({
    model,
    system: opts.system,
    messages: [{ role: "user", content: opts.user }],
    temperature: 0.7,
    max_tokens: maxTokens,
  });

  const block = response.content[0];
  if (block?.type !== "text") {
    throw new Error("LLM returned non-text response");
  }
  if (response.stop_reason === "max_tokens") {
    throw new Error(
      `LLM output was truncated (max_tokens=${maxTokens}). Re-run with a larger budget via --max-tokens, or split the input.`,
    );
  }
  return block.text;
}