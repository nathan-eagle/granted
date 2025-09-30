import { NextRequest, NextResponse } from "next/server"
import { client, defaultModel } from "../../../../lib/ai"

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  const res = await client.responses.create({
    model: defaultModel,
    input: messages || [{ role: "user", content: "Hello" }]
  } as any)
  const text = (res as any)?.output_text || (res as any)?.choices?.[0]?.message?.content || ""
  return NextResponse.json({ output: text })
}
