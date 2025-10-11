import { exportDocx } from "@/server/tools/exportDocx";

export const runtime = "nodejs";

interface ExportBody {
  markdown: string;
  filename?: string;
}

export async function POST(req: Request): Promise<Response> {
  const body = (await req.json()) as ExportBody;
  if (!body.markdown) {
    return new Response(JSON.stringify({ error: "Missing markdown" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { base64, filename } = await exportDocx(body);
  const buffer = Buffer.from(base64, "base64");
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
