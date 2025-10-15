import type { StreamedRunResult } from "@openai/agents-core";
import type { GrantAgentContext } from "@/lib/agent-context";
import { buildGrantCoachAgent, runGrantCoach } from "@/server/agents/grantCoach";

export interface RunAgentOptions {
  sessionId: string;
  messages: { role: string; content: string }[];
}

export interface StreamAgentResponse {
  context: GrantAgentContext;
  stream: StreamedRunResult<GrantAgentContext, ReturnType<typeof buildGrantCoachAgent>>;
}

export async function streamAgentResponse(options: RunAgentOptions): Promise<StreamAgentResponse> {
  return runGrantCoach(options);
}
