import type { ProtocolGroup } from "./protocol-facets";

/** AG Grid reverses the comparator for descending sorts; missing dates stay last. */
export function compareProtocolDates(
  a: string | null | undefined,
  b: string | null | undefined,
  descending = false,
): number {
  const left = a ? Date.parse(a) : Number.NaN;
  const right = b ? Date.parse(b) : Number.NaN;
  const leftMissing = Number.isNaN(left);
  const rightMissing = Number.isNaN(right);
  if (leftMissing && rightMissing) return 0;
  if (leftMissing || rightMissing) return (leftMissing ? 1 : -1) * (descending ? -1 : 1);
  return left - right;
}

export const PROTOCOL_SORT_OPTIONS = [
  { value: "last_run_desc", label: "Last run: newest first" },
  { value: "last_run_asc", label: "Last run: oldest first" },
  { value: "created_desc", label: "Created: newest first" },
  { value: "created_asc", label: "Created: oldest first" },
  { value: "name_asc", label: "Name: A–Z" },
  { value: "name_desc", label: "Name: Z–A" },
] as const;
export type ProtocolSort = (typeof PROTOCOL_SORT_OPTIONS)[number]["value"];

/** Keep group membership/order stable; sort the rows in each group without mutating input. */
export function sortProtocolGroups(groups: ProtocolGroup[], sort: ProtocolSort): ProtocolGroup[] {
  const descending = sort.endsWith("desc");
  return groups.map((group) => ({
    ...group,
    protocols: [...group.protocols].sort((a, b) => {
      const nameOrder = a.name.localeCompare(b.name, undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (sort.startsWith("name"))
        return nameOrder * (descending ? -1 : 1) || a.id.localeCompare(b.id);
      const field = sort.startsWith("created") ? "created_at" : "last_run_date";
      return (
        compareProtocolDates(a[field], b[field], descending) * (descending ? -1 : 1) ||
        nameOrder ||
        a.id.localeCompare(b.id)
      );
    }),
  }));
}
