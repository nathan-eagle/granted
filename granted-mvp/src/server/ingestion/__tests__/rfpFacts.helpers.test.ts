import { describe, it, expect } from "vitest";
import { parseMoney, parseDateTime, scoreConfidence, hashCanonical } from "@/server/ingestion/rfpFacts";

describe("parseMoney", () => {
  it("parses plain dollar amounts", () => {
    const result = parseMoney("$1,250,000");
    expect(result).toEqual({ usd: 1250000, raw: "$1,250,000" });
  });

  it("handles shorthand multipliers", () => {
    const result = parseMoney("up to $2 million");
    expect(result).toEqual({ usd: 2000000, raw: "up to $2 million" });
  });

  it("returns null when no currency is present", () => {
    expect(parseMoney("see budget section")) .toBeNull();
  });
});

describe("parseDateTime", () => {
  it("parses ISO formatted strings", () => {
    const result = parseDateTime("2025-01-31T17:00:00Z");
    expect(result).toEqual({ iso: "2025-01-31T17:00:00.000Z", raw: "2025-01-31T17:00:00Z" });
  });

  it("returns null for unparseable values", () => {
    expect(parseDateTime("Submission window TBD")) .toBeNull();
  });
});

describe("scoreConfidence", () => {
  it("boosts confidence when evidence and canonical values exist", () => {
    const scored = scoreConfidence(0.6, true, "datetime", { iso: "2025-01-31T17:00:00.000Z" });
    expect(scored).toBe(0.82);
  });

  it("caps low-confidence values", () => {
    const scored = scoreConfidence(0.3, false, "text", null);
    expect(scored).toBeCloseTo(0.5);
  });
});

describe("hashCanonical", () => {
  it("produces stable hashes for matching facts", () => {
    const a = hashCanonical("rfp.title", "Amazing Program", { foo: "bar" }, { file_id: "file-1" });
    const b = hashCanonical("rfp.title", "Amazing Program", { foo: "bar" }, { file_id: "file-1" });
    expect(a).toBe(b);
  });

  it("changes when evidence differs", () => {
    const a = hashCanonical("rfp.title", "Amazing Program", null, { file_id: "file-1" });
    const b = hashCanonical("rfp.title", "Amazing Program", null, { file_id: "file-2" });
    expect(a).not.toBe(b);
  });
});
