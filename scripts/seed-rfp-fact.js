const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(envPath) {
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing env file at ${envPath}`);
  }
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    let value = trimmed.slice(idx + 1).trim();
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (value.startsWith("${") && value.endsWith("}")) {
      const ref = value.slice(2, -1);
      value = process.env[ref];
    }
    if (value !== undefined) {
      process.env[key] = value;
    }
  }
}

const envPath = path.join(__dirname, "..", "granted-mvp", ".env.local");
loadEnv(envPath);

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRole) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be configured.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false },
});

const [sessionId, slotId = "rfp-overview"] = process.argv.slice(2);

if (!sessionId) {
  console.error("Usage: node scripts/seed-rfp-fact.js <session-id> [slot-id]");
  process.exit(1);
}

const valueText = `Seeded ${slotId} fact for session ${sessionId}`;
const hash = crypto.createHash("sha256").update([slotId, valueText].join(":")).digest("hex");

async function main() {
  const payload = {
    session_id: sessionId,
    slot_id: slotId,
    value_text: valueText,
    value_json: null,
    confidence: 0.9,
    evidence_file_id: null,
    evidence_page: null,
    evidence_snippet: null,
    evidence_href: null,
    evidence_offsets: null,
    hash,
  };

  const { data: fact, error: upsertError } = await supabase
    .from("rfp_facts")
    .upsert(payload, { onConflict: "session_id,slot_id,hash" })
    .select()
    .single();

  if (upsertError) {
    console.error("Failed to insert fact", upsertError);
    process.exit(1);
  }

  await supabase.from("rfp_facts_events").insert({
    fact_id: fact.id,
    session_id: sessionId,
    kind: "ingested",
    payload: { inserted_via: "seed-script" },
  });

  console.log(`Seeded fact ${fact.id} for session ${sessionId}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
