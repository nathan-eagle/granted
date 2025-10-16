"use server";

import type { GetRuntimeLogsResponseBody } from "@vercel/sdk/models/getruntimelogsop.js";

import { getVercelClient } from "@/lib/vercel";

export async function fetchDeploymentLogs(
  deploymentId: string,
): Promise<GetRuntimeLogsResponseBody[]> {
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!projectId) {
    throw new Error("VERCEL_PROJECT_ID is not set");
  }

  const vercel = await getVercelClient();

  const teamId = process.env.VERCEL_TEAM_ID;

  const logs = await vercel.logs.getRuntimeLogs({
    projectId,
    deploymentId,
    ...(teamId ? { teamId } : {}),
  });

  if (!logs) {
    return [];
  }

  return Array.isArray(logs) ? logs : [logs];
}
