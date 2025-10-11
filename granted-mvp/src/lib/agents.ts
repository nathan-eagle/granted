import { Agent, run, type AgentInputItem, assistant, system, user } from "@openai/agents";
import { fileSearchTool, webSearchTool } from "@openai/agents-openai";
import type { StreamedRunResult, AgentOutputType } from "@openai/agents-core";
import type { GrantAgentContext } from "@/lib/agent-context";
import { ensureVectorStore } from "@/lib/vector-store";
import { coverageAndNextTool } from "@/server/tools/coverageAndNext";
import { draftSectionTool } from "@/server/tools/draftSection";
import { exportDocxTool } from "@/server/tools/exportDocx";
import { ingestFromUrlsTool } from "@/server/tools/ingestFromUrls";
import { normalizeRfpTool } from "@/server/tools/normalizeRfp";
import { tightenSectionTool } from "@/server/tools/tightenSection";

const DEFAULT_MODEL = process.env.GRANTED_MODEL ?? "gpt-5";

export function buildGrantAgent(vectorStoreId: string): Agent<GrantAgentContext, AgentOutputType> {
  return new Agent<GrantAgentContext, AgentOutputType>({
    name: "Granted Assistant",
    instructions: `You are Granted, a collaborative grant assistant.
- Always summarize progress, cite sources, and track coverage slots.
- Offer exactly one actionable Fix-next suggestion per turn.
- Prefer File Search for authoritative answers and Web Search when materials are missing.
- Maintain provenance tags like [RFP], [ORG], [BIO:Name].`,
    handoffDescription: "Conversational grant strategist that orchestrates ingest, coverage, and drafting.",
    model: DEFAULT_MODEL,
    tools: [
      fileSearchTool(vectorStoreId),
      webSearchTool({ searchContextSize: "medium" }),
      ingestFromUrlsTool,
      normalizeRfpTool,
      draftSectionTool,
      coverageAndNextTool,
      tightenSectionTool,
      exportDocxTool,
    ],
  });
}

export interface RunAgentOptions {
  sessionId: string;
  messages: { role: string; content: string }[];
}

export interface StreamAgentResponse {
  context: GrantAgentContext;
  stream: StreamedRunResult<GrantAgentContext, ReturnType<typeof buildGrantAgent>>;
}

export async function streamAgentResponse({ sessionId, messages }: RunAgentOptions): Promise<StreamAgentResponse> {
  const { vectorStoreId } = await ensureVectorStore(sessionId);
  const agent = buildGrantAgent(vectorStoreId);
  const context: GrantAgentContext = {
    sessionId,
    vectorStoreId,
  };

  const history: AgentInputItem[] = [
    system(
      "You are working inside a single-session workspace. Uphold the Fix-next policy and emit JSON tool results when calling hosted tools.",
    ),
  ];

  messages.forEach(({ role, content }) => {
    if (role === "assistant") {
      history.push(assistant(content));
    } else if (role === "system") {
      history.push(system(content));
    } else {
      history.push(user(content));
    }
  });

  const stream = await run(agent, history, {
    stream: true,
    context,
  });

  return { stream, context };
}
