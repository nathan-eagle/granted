import "server-only";

import { Vercel } from "@vercel/sdk";

let cachedClient: Vercel | null = null;

export async function getVercelClient(): Promise<Vercel> {
  if (cachedClient) {
    return cachedClient;
  }

  const token = process.env.VERCEL_TOKEN;
  if (!token) {
    throw new Error("VERCEL_TOKEN is not set");
  }

  cachedClient = new Vercel({
    bearerToken: token,
  });

  return cachedClient;
}
