import OpenAI from "openai"

const apiKey = process.env.OPENAI_API_KEY as string
export const defaultModel = process.env.OPENAI_MODEL || "gpt-5-mini"

export const client = new OpenAI({ apiKey })

export async function completeFromSources({ prompt, sourcesText }: { prompt: string; sourcesText: string }) {
  const sys = `You are an expert grant-writing assistant. Ground outputs in the provided sources. If a fact is not supported, say so.`
  const user = `Prompt:\n${prompt}\n\nSources:\n${sourcesText.slice(0, 15000)}`

  const res = await client.responses.create({
    model: defaultModel,
    input: [
      { role: "system", content: sys },
      { role: "user", content: user },
    ],
  } as any)

  const text = (res as any)?.output_text || (res as any)?.choices?.[0]?.message?.content || ""
  return text
}
