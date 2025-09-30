import OpenAI from "openai"

const apiKey = process.env.OPENAI_API_KEY as string
const model = process.env.OPENAI_MODEL || "gpt-4o"

export const client = new OpenAI({ apiKey })

export async function completeFromSources({ prompt, sourcesText }: { prompt: string; sourcesText: string }) {
  // Simple prompt composition: keep it short; cite via bracket numbers if possible
  const sys = `You are an expert grant-writing assistant. Use the provided source excerpts faithfully. If unsure, say so.`
  const user = `Prompt:
${prompt}

Sources (may include multiple docs):
${sourcesText.slice(0, 15000)}`
  const res = await client.responses.create({
    model,
    input: [
      { role: "system", content: sys },
      { role: "user", content: user }
    ],
  } as any)
  const text = (res as any)?.output_text || (res as any)?.choices?.[0]?.message?.content || ""
  return text
}
