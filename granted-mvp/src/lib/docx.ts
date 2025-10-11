import { Document, HeadingLevel, Paragraph, Packer, TextRun } from "docx";

export interface DocxExportOptions {
  markdown: string;
  filename?: string;
}

const BODY_FONT = "Times New Roman";
const BODY_SIZE = 24; // docx uses half-points; 24 = 12pt
const PAGE_MARGIN_TWIPS = 1440; // 1" margins

function paragraphFromLine(line: string): Paragraph {
  if (line.startsWith("# ")) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_1,
      children: [
        new TextRun({ text: line.replace(/^#\s+/, ""), font: BODY_FONT, size: BODY_SIZE }),
      ],
    });
  }

  if (line.startsWith("## ")) {
    return new Paragraph({
      heading: HeadingLevel.HEADING_2,
      children: [
        new TextRun({ text: line.replace(/^##\s+/, ""), font: BODY_FONT, size: BODY_SIZE }),
      ],
    });
  }

  return new Paragraph({
    spacing: { line: 240, lineRule: "exact" },
    children: [new TextRun({ text: line, font: BODY_FONT, size: BODY_SIZE })],
  });
}

export async function buildDocx({ markdown }: DocxExportOptions): Promise<Buffer> {
  const lines = markdown
    .split(/\n{2,}/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  const document = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: PAGE_MARGIN_TWIPS,
              bottom: PAGE_MARGIN_TWIPS,
              left: PAGE_MARGIN_TWIPS,
              right: PAGE_MARGIN_TWIPS,
            },
          },
        },
        children: lines.map((line) => paragraphFromLine(line)),
      },
    ],
  });

  return Packer.toBuffer(document);
}
