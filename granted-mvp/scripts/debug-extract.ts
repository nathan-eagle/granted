import path from "path";
import { fileURLToPath } from "url";
import { config as loadEnv } from "dotenv";
import { ensureVectorStore } from "@/lib/vector-store";
import { loadDiscoveredDoD } from "@/server/discovery/discoveredDoD";
import { extractFactsFromDiscoveredDoD } from "@/server/ingestion/discoveredFacts";
import { fetchFactsForSession } from "@/server/ingestion/rfpFacts";
import type { DiscoveredDoD } from "@/lib/discovered-dod";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

loadEnv({ path: path.join(projectRoot, ".env.local"), override: false });
loadEnv({ path: path.join(projectRoot, ".env"), override: false });

interface CliOptions {
  sessionId: string;
  slot?: string;
  dryRun: boolean;
}

function parseArgs(): CliOptions {
  const argv = process.argv.slice(2);
  let sessionId: string | undefined;
  let slot: string | undefined;
  let dryRun = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--session" || arg === "-s") {
      sessionId = argv[i + 1];
      i += 1;
    } else if (arg === "--slot" || arg === "-t") {
      slot = argv[i + 1];
      i += 1;
    } else if (arg === "--dry-run" || arg === "--dryRun") {
      dryRun = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  if (!sessionId) {
    printHelp();
    throw new Error("--session <id> is required");
  }

  return { sessionId, slot, dryRun };
}

function printHelp(): void {
  console.log(`Usage: pnpm tsx scripts/debug-extract.ts --session <sessionId> [--slot <slotId|all>] [--dry-run]\n\n`);
}

function filterDoD(dod: DiscoveredDoD, slotArg?: string): DiscoveredDoD {
  if (!slotArg || slotArg === "all") {
    return dod;
  }
  const slotIds = new Set(slotArg.split(",").map((value) => value.trim()).filter(Boolean));
  const sections = dod.sections
    .map((section) => ({
      ...section,
      slots: section.slots.filter((slot) => slotIds.has(slot.slotId)),
    }))
    .filter((section) => section.slots.length > 0);
  return {
    ...dod,
    sections,
  };
}

async function main(): Promise<void> {
  const options = parseArgs();
  const { sessionId, slot, dryRun } = options;

  console.log(`Session: ${sessionId}`);
  const { vectorStoreId } = await ensureVectorStore(sessionId);
  console.log(`Vector store: ${vectorStoreId}`);

  const dodRecord = await loadDiscoveredDoD(sessionId);
  if (!dodRecord) {
    console.warn("No discovered DoD stored for this session.");
    return;
  }

  const selectedDoD = filterDoD(dodRecord.dod, slot);
  if (selectedDoD.sections.length === 0) {
    console.warn("No matching slots were found in the discovered DoD.");
    return;
  }

  console.log(`DoD version: v${dodRecord.version}`);
  console.log(`Sections inspected: ${selectedDoD.sections.length}`);

  const existingFacts = await fetchFactsForSession(sessionId);
  const existingHashes = new Set(existingFacts.map((fact) => fact.hash));

  const result = await extractFactsFromDiscoveredDoD({
    sessionId,
    dod: selectedDoD,
    vectorStoreId,
    modelId: process.env.GRANTED_INGEST_MODEL ?? process.env.GRANTED_MODEL ?? "gpt-4.1-mini",
    existingHashes,
    dryRun,
  });

  console.log(`Attempts: ${result.attempts}`);
  console.log(`Skipped (existing or empty): ${result.skipped}`);

  if (dryRun) {
    console.log("Candidates (dry run – nothing inserted):");
    for (const candidate of result.candidates) {
      console.log(JSON.stringify({
        slotId: candidate.slotId,
        valueText: candidate.valueText,
        confidence: candidate.confidence,
        hasEvidence: Boolean(candidate.evidence?.snippet || candidate.evidence?.href || candidate.evidence?.file_id),
        valueJson: candidate.valueJson,
      }, null, 2));
    }
  } else {
    if (result.inserted.length === 0) {
      console.log("No new facts were inserted.");
    } else {
      console.log("Inserted facts:");
      for (const fact of result.inserted) {
        console.log(JSON.stringify({
          id: fact.id,
          slotId: fact.slotId,
          valueText: fact.valueText,
          confidence: fact.confidence,
          evidence: fact.evidence,
        }, null, 2));
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
