import OpenAI from "openai";
import {
  OpenAIProvider,
  setDefaultOpenAIClient,
  setDefaultOpenAIKey,
} from "@openai/agents-openai";
import { setDefaultModelProvider } from "@openai/agents-core";

if (process.env.NODE_ENV !== "production" && !process.env.OPENAI_LOG) {
  process.env.OPENAI_LOG = "debug";
}
if (process.env.NODE_ENV !== "production" && !process.env.DEBUG) {
  process.env.DEBUG = "@openai/agents*";
}

let cachedClient: OpenAI | null = null;
let cachedProvider: OpenAIProvider | null = null;

function ensureApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return key;
}

export function getOpenAI(): OpenAI {
  if (!cachedClient) {
    const apiKey = ensureApiKey();
    cachedClient = new OpenAI({
      apiKey,
      organization: process.env.OPENAI_ORG,
      project: process.env.OPENAI_PROJECT,
    });
  }
  return cachedClient;
}

export function getOpenAIProvider(): OpenAIProvider {
  if (!cachedProvider) {
    const apiKey = ensureApiKey();
    const openAIClient = getOpenAI();
    cachedProvider = new OpenAIProvider({
      openAIClient,
      organization: process.env.OPENAI_ORG,
      project: process.env.OPENAI_PROJECT,
      useResponses: true,
    });
    setDefaultOpenAIKey(apiKey);
    setDefaultOpenAIClient(openAIClient);
    setDefaultModelProvider(cachedProvider);
  }
  return cachedProvider;
}
