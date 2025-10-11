import { tool } from "@openai/agents";
import { z } from "zod";
import { buildDocx } from "@/lib/docx";

export interface ExportDocxInput {
  markdown: string;
  filename?: string;
}

export interface ExportDocxResult {
  base64: string;
  filename: string;
}

export async function exportDocx({ markdown, filename }: ExportDocxInput): Promise<ExportDocxResult> {
  const buffer = await buildDocx({ markdown, filename });
  const finalName = filename ?? "grant-draft.docx";
  return {
    base64: buffer.toString("base64"),
    filename: finalName,
  };
}

export const exportDocxTool = tool({
  name: "export_docx",
  description: "Generate a DOCX file from markdown content.",
  parameters: z.object({
    markdown: z.string(),
    filename: z.string().nullable(),
  }),
  strict: true,
  async execute(input) {
    const result = await exportDocx({
      markdown: input.markdown,
      filename: input.filename ?? undefined,
    });
    return JSON.stringify(result);
  },
});
