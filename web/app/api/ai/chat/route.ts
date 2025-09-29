import { NextRequest, NextResponse } from "next/server"
import { client } from "../../../../lib/ai"

export async function POST(req: NextRequest) {
  const { messages } = await req.json()
  const res = await client.responses.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    input: messages || [{ role: "user", content: "Hello" }]
  } as any)
  const text = (res as any)?.output_text || (res as any)?.choices?.[0]?.message?.content || ""
  return NextResponse.json({ output: text })
}
