import OpenAI from "openai";

export const GITHUB_MODELS_ENDPOINT = "https://models.github.ai/inference";
export const PARSE_MODEL = "openai/gpt-4o-mini";

export function createLlmClient(): OpenAI {
  const token = process.env.GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("GITHUB_TOKEN missing — add it to .env (server-side only).");
  }
  return new OpenAI({ baseURL: GITHUB_MODELS_ENDPOINT, apiKey: token });
}
