import { Agent, run, type AgentInputItem, assistant, system, user } from "@openai/agents";
import type { AgentOutputType, StreamedRunResult } from "@openai/agents-core";
import { fileSearchTool, webSearchTool } from "@openai/agents-openai";
import type { GrantAgentContext } from "@/lib/agent-context";
import { getOpenAIProvider } from "@/lib/openai";
import { ensureVectorStore } from "@/lib/vector-store";
import { normalizeRfpTool } from "@/server/tools/normalizeRfp";
import { coverageAndNextTool } from "@/server/tools/coverageAndNext";
import { draftSectionTool } from "@/server/tools/draftSection";
import { ingestFromUrlsTool } from "@/server/tools/ingestFromUrls";
import { tightenSectionTool } from "@/server/tools/tightenSection";
import { exportDocxTool } from "@/server/tools/exportDocx";
import { persistFactTool } from "@/server/tools/persistFact";
import { enqueueJobTool } from "@/server/tools/enqueueJob";
import { getCoverageTool } from "@/server/tools/getCoverage";

const DEFAULT_MODEL = process.env.GRANTED_MODEL ?? "gpt-4.1-mini";

export function buildGrantCoachAgent(vectorStoreId: string): Agent<GrantAgentContext, AgentOutputType> {
  getOpenAIProvider();
  return new Agent<GrantAgentContext, AgentOutputType>({
    name: "Granted Coach",
    instructions: `You help users unlock each grant section.
- Prefer file_search for authoritative answers; fall back to web search only when sources lack the fact.
- Ask the highest-impact question next. Keep responses concise and action-oriented.
- When a user confirms a detail, call persist_fact so coverage moves forward.
- Never fabricate values without citations.`,
    model: DEFAULT_MODEL,
    handoffDescription: "Guided grant-writing assistant with coverage awareness and drafting tools.",
    tools: [
      fileSearchTool(vectorStoreId),
      webSearchTool({ searchContextSize: "medium" }),
      ingestFromUrlsTool,
      normalizeRfpTool,
      coverageAndNextTool,
      draftSectionTool,
      tightenSectionTool,
      exportDocxTool,
      persistFactTool,
      enqueueJobTool,
      getCoverageTool,
    ],
  });
}

export interface RunGrantCoachOptions {
  sessionId: string;
  messages: { role: string; content: string }[];
}

export interface RunGrantCoachResult {
  context: GrantAgentContext;
  stream: StreamedRunResult<GrantAgentContext, ReturnType<typeof buildGrantCoachAgent>>;
}

export async function runGrantCoach({ sessionId, messages }: RunGrantCoachOptions): Promise<RunGrantCoachResult> {
  const { vectorStoreId } = await ensureVectorStore(sessionId);
  const agent = buildGrantCoachAgent(vectorStoreId);
  const context: GrantAgentContext = {
    sessionId,
    vectorStoreId,
  };

  const history: AgentInputItem[] = [
    system(
      "You operate inside a single-session workspace. Use the provided tools to update coverage, persist facts, and draft sections."
        + " Ask one focused question at a time.",
    ),
  ];

  for (const message of messages) {
    if (message.role === "assistant") {
      history.push(assistant(message.content));
    } else if (message.role === "system") {
      history.push(system(message.content));
    } else {
      history.push(user(message.content));
    }
  }

  const stream = await run(agent, history, {
    stream: true,
    context,
  });

  return { context, stream };
}
