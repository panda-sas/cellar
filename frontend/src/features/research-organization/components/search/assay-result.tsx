"use client";

import type { ComparisonChannel } from "../../lib/comparison-channels";
import type { AggregationMode } from "../../lib/use-aggregation-mode";
import type { ActivityValue } from "../../types";
import { AssayEvidence } from "./assay-evidence";
import { InterceptCell } from "./intercept-cell";

/** Render the executed search snapshot unchanged in each review surface. */
export function AssayResult({
  av,
  channel,
  mode,
}: {
  av: ActivityValue | undefined;
  channel: ComparisonChannel;
  mode: AggregationMode;
}) {
  if (channel.doseResponse)
    return <InterceptCell av={av} spec={channel.spec} isPrimary={channel.isPrimary} mode={mode} />;
  if (!av) return <span className="text-muted-foreground">—</span>;
  return (
    <AssayEvidence av={av} mode={mode}>
      <span className="font-mono text-xs">
        {av.qualifier === "nd"
          ? "ND"
          : av.qualifier === "excluded"
            ? "Excluded"
            : av.value == null
              ? "—"
              : `${av.qualifier && av.qualifier !== "=" ? `${av.qualifier} ` : ""}${av.value.toPrecision(4)} ${av.unit ?? ""}`}
      </span>
    </AssayEvidence>
  );
}
