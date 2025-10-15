export function isFactsIngestionEnabled(): boolean {
  const flag = process.env.INGEST_FACTS_ENABLED;
  if (flag === undefined) {
    return process.env.NODE_ENV !== "production";
  }
  const normalized = flag.trim().toLowerCase();
  return !(normalized === "false" || normalized === "0" || normalized === "off");
}
