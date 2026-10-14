import { describe, expect, it } from "vitest";
import type { SearchQuery } from "../../types";
import { countSearchCriteria, decomposeQuery } from "./search-form";

const act = (protocol_id: string) => ({ type: "activity" as const, protocol_id, where: [] });

describe("decomposeQuery", () => {
  it("round-trips 'A and (B or C)' without turning it into 'A or B or C'", () => {
    // composeCriteria emits a mixed and/or row list as [A, group(or, B, C)];
    // decomposing must give B the "and" that joins the group to A, or the
    // next Search silently ORs everything.
    const query: SearchQuery = {
      logic: "and",
      criteria: [act("A"), { type: "group", logic: "or", criteria: [act("B"), act("C")] }],
    };
    const { activityCriteria, protocolConjunctions } = decomposeQuery(query);
    expect(activityCriteria.map((c) => c.protocol_id)).toEqual(["A", "B", "C"]);
    expect(protocolConjunctions).toEqual(["and", "and", "or"]);
  });
});

describe("countSearchCriteria", () => {
  it("counts assay criteria inside OR groups instead of counting the group as one filter", () => {
    expect(
      countSearchCriteria([{ type: "group", logic: "or", criteria: [act("A"), act("B")] }]),
    ).toBe(2);
  });

  it("counts nested groups and other filters without inflating the count", () => {
    expect(
      countSearchCriteria([
        act("A"),
        {
          type: "group",
          logic: "or",
          criteria: [act("B"), { type: "group", logic: "and", criteria: [act("C")] }],
        },
        { type: "project", project_ids: ["p1", "p2"] },
      ]),
    ).toBe(4);
    expect(countSearchCriteria([])).toBe(0);
  });
});
