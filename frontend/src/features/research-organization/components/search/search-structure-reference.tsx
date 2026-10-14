"use client";

import { StructureRenderer } from "@/shared/components/chemistry";
import { detectQueryKind } from "@/shared/lib/rdkit/detect-query-kind";
import type { StructureCriterion } from "../../types";

export function SearchStructureReference({ criterion }: { criterion?: StructureCriterion }) {
  if (!criterion) return null;
  const query =
    criterion.search_type === "substructure"
      ? (criterion.smiles_or_smarts ?? criterion.smarts)
      : criterion.smiles;
  if (!query) return null;
  const queryKind =
    criterion.search_type === "substructure"
      ? (criterion.query_kind ?? detectQueryKind(query))
      : "smiles";
  return (
    <div className="flex flex-col items-start gap-x-5 gap-y-2 rounded-lg border bg-card px-4 py-2 sm:flex-row sm:items-center">
      <StructureRenderer
        smiles={query}
        queryKind={queryKind}
        width={200}
        height={130}
        className="shrink-0 self-center sm:self-auto"
      />
      <div className="w-full min-w-0 flex-1 space-y-1 text-sm sm:w-auto">
        <p className="font-medium">Query structure</p>
        {criterion.search_type === "substructure" ? (
          <>
            <p className="text-muted-foreground">
              Matching atoms and bonds are highlighted in the result structures.
            </p>
            {criterion.generalized && (
              <p className="text-xs text-muted-foreground">
                Tautomer and variant matches may have no literal substructure to highlight.
              </p>
            )}
          </>
        ) : criterion.search_type === "similarity" ? (
          <>
            <p className="text-muted-foreground">
              {criterion.mode === "scaffold_hop"
                ? "Feature-class fingerprints · Tanimoto"
                : criterion.mode === "fragment_in_target"
                  ? "Query feature coverage · Asymmetric Tversky (α=1, β=0)"
                  : "Morgan/ECFP4 fingerprints · Tanimoto"}{" "}
              · ≥ {Math.round((criterion.threshold ?? 0.7) * 100)}%
            </p>
            <p className="text-xs text-muted-foreground">
              Similarity compares fingerprints. A 100% score does not establish chemical identity.
            </p>
          </>
        ) : (
          <p className="text-muted-foreground">Exact structure search</p>
        )}
      </div>
    </div>
  );
}
