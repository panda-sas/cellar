import { interceptOptionLabel } from "@/features/screening-assay/lib/intercept-label";
import type { InterceptSpec, Protocol } from "@/features/screening-assay/types";
import { READOUT_NORMALIZATION_LABELS } from "@/features/screening-assay/types";
import { expandParentTokens, resolveColumns } from "./protocol-column-id";

export interface ComparisonChannel {
  protocolId: string;
  readoutId: string | null;
  id: string;
  activityKey: string;
  protocolName: string;
  label: string;
  unit: string | null;
  spec: InterceptSpec | null;
  isPrimary: boolean;
  doseResponse: boolean;
  endpointType: string | null;
}

export function comparisonChannels(columns: string[], protocols: Protocol[]): ComparisonChannel[] {
  return resolveColumns([...new Set(expandParentTokens(columns, protocols))], protocols).map(
    (column) => {
      const protocol = protocols.find((p) => p.id === column.protocolId);
      const rd = protocol?.readout_definitions?.find((r) => r.id === column.readoutDefId);
      const specs = rd?.dose_response_config?.intercepts ?? [];
      const spec = column.interceptKey
        ? (specs.find(
            (s) => s.kind === column.interceptKey?.kind && s.level === column.interceptKey?.level,
          ) ?? null)
        : null;
      const normalization = column.prefix === "rd" ? column.colId.split(":")[3] : null;
      const normLabel = normalization
        ? (READOUT_NORMALIZATION_LABELS[
            normalization as keyof typeof READOUT_NORMALIZATION_LABELS
          ] ?? normalization)
        : null;
      return {
        protocolId: column.protocolId,
        readoutId: column.readoutDefId,
        id: column.colId,
        activityKey: column.prefix === "drc" ? `drc:${column.readoutDefId}` : column.colId,
        protocolName: protocol?.name ?? "Assay",
        label: spec
          ? interceptOptionLabel(rd?.name ?? "Endpoint", specs[0], spec)
          : `${rd?.name ?? "Readout"}${normLabel ? ` · ${normLabel}` : ""}`,
        unit:
          column.prefix === "drc"
            ? (protocol?.dose_unit ?? null)
            : normalization
              ? null
              : (rd?.unit ?? null),
        spec,
        isPrimary: !spec || spec === specs[0],
        doseResponse: column.prefix === "drc",
        endpointType: spec
          ? `${spec.kind}:${spec.level}:${spec.basis}`
          : (rd?.dose_response_config?.curve_type ?? null),
      };
    },
  );
}
