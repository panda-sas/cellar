import { describe, expect, it } from "vitest";
import type { Protocol } from "../types";
import { compareProtocolDates, sortProtocolGroups } from "./protocol-dates";
import type { ProtocolGroup } from "./protocol-facets";

describe("protocol date sorting", () => {
  const dates = [null, "2026-01-03", "2025-12-31", undefined, "invalid", "2026-10-09"];
  it.each([false, true])("keeps missing dates last when descending=%s", (descending) => {
    const sorted = [...dates].sort(
      (a, b) => compareProtocolDates(a, b, descending) * (descending ? -1 : 1),
    );
    expect(sorted.slice(0, 3)).toEqual(
      descending
        ? ["2026-10-09", "2026-01-03", "2025-12-31"]
        : ["2025-12-31", "2026-01-03", "2026-10-09"],
    );
  });
  it("compares creation timestamps as instants, including offsets", () => {
    expect(compareProtocolDates("2026-01-01T01:00:00+02:00", "2025-12-31T23:30:00Z")).toBeLessThan(
      0,
    );
    expect(compareProtocolDates(null, null)).toBe(0);
  });
});

describe("library date ordering", () => {
  const make = (id: string, date: string | null) =>
    ({ id, name: id, last_run_date: date, created_at: date }) as Protocol;
  const groups: ProtocolGroup[] = [
    {
      key: "one",
      label: "One",
      count: 3,
      protocols: [make("Never", null), make("Older", "2025-01-01"), make("Newer", "2026-10-01")],
    },
    { key: "two", label: "Two", count: 1, protocols: [make("Other", "2026-12-01")] },
  ];
  it.each(["last_run_desc", "created_desc"] as const)(
    "sorts %s within groups, preserving input and putting missing dates last",
    (sort) => {
      const sorted = sortProtocolGroups(groups, sort);
      expect(sorted.map((g) => g.key)).toEqual(["one", "two"]);
      expect(sorted[0].protocols.map((p) => p.id)).toEqual(["Newer", "Older", "Never"]);
      expect(groups[0].protocols[0].id).toBe("Never");
    },
  );
  it.each(["last_run_asc", "created_asc"] as const)(
    "sorts %s with oldest dates first and missing dates last",
    (sort) => {
      expect(sortProtocolGroups(groups, sort)[0].protocols.map((p) => p.id)).toEqual([
        "Older",
        "Newer",
        "Never",
      ]);
    },
  );
  it("offers alphabetical ordering in both directions", () => {
    expect(sortProtocolGroups(groups, "name_asc")[0].protocols.map((p) => p.id)).toEqual([
      "Never",
      "Newer",
      "Older",
    ]);
    expect(sortProtocolGroups(groups, "name_desc")[0].protocols.map((p) => p.id)).toEqual([
      "Older",
      "Newer",
      "Never",
    ]);
  });
});
