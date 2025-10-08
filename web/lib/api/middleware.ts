import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

const rateStore = new Map<string, { count: number; expires: number }>()

export type RequestContext = {
  requestId: string
  ip: string
  startedAt: number
}

const WINDOW_MS = 60_000
const MAX_REQUESTS = 120

function checkRateLimit(ip: string) {
  const now = Date.now()
  const entry = rateStore.get(ip)
  if (entry && entry.expires > now) {
    entry.count += 1
    if (entry.count > MAX_REQUESTS) {
      return false
    }
    return true
  }
  rateStore.set(ip, { count: 1, expires: now + WINDOW_MS })
  return true
}

export type InstrumentedHandler = (
  req: NextRequest,
  ctx: RequestContext
) => Promise<NextResponse>

export function withApiInstrumentation(handler: InstrumentedHandler) {
  return async function instrumented(req: NextRequest) {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown"
    const requestId = req.headers.get("x-request-id") || randomUUID()

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "x-request-id": requestId } }
      )
    }

    const startedAt = Date.now()
    const ctx: RequestContext = { requestId, ip, startedAt }

    try {
      const res = await handler(req, ctx)
      await prisma.eventLog.create({
        data: {
          level: res.status >= 500 ? "error" : "info",
          message: "api.request",
          requestId,
          data: {
            method: req.method,
            url: req.nextUrl.pathname,
            status: res.status,
            durationMs: Date.now() - startedAt,
            ip,
          },
        },
      })
      res.headers.set("x-request-id", requestId)
      return res
    } catch (error) {
      await prisma.eventLog.create({
        data: {
          level: "error",
          message: "api.request.error",
          requestId,
          data: {
            method: req.method,
            url: req.nextUrl.pathname,
            ip,
            error: (error as Error)?.message ?? String(error),
          },
        },
      })
      return NextResponse.json(
        { error: "Internal Server Error" },
        { status: 500, headers: { "x-request-id": requestId } }
      )
    }
  }
}
