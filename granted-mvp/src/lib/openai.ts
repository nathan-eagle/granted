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

const apiKey = process.env.OPENAI_API_KEY;

export const openai = new OpenAI({
  apiKey,
  organization: process.env.OPENAI_ORG,
  project: process.env.OPENAI_PROJECT,
});

const provider = new OpenAIProvider({
  openAIClient: openai,
  apiKey,
  organization: process.env.OPENAI_ORG,
  project: process.env.OPENAI_PROJECT,
  useResponses: true,
});

if (apiKey) {
  setDefaultOpenAIKey(apiKey);
  setDefaultOpenAIClient(openai);
  setDefaultModelProvider(provider);
}

export { provider as openAIProvider };
