"use client";

import { StatusBadge } from "@/shared/components/status-badge";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { formatDate, formatDateTime } from "@/shared/lib/format-date";
import { Copy, MoreHorizontal } from "lucide-react";
import { protocolTextMatch } from "../lib/protocol-facets";
import { PROTOCOL_TYPE_LABELS, type Protocol } from "../types";
import { TargetChips } from "./target-chips";

interface ProtocolLibraryRowProps {
  protocol: Protocol;
  datesLoading?: boolean;
  datesError?: boolean;
  onSelect?: (protocolId: string) => void;
  /** Active library search; a non-name hit says which field matched. */
  search?: string;
  /** Starts a new protocol from this one; leave out for roles that cannot create protocols. */
  onNewFrom?: (protocol: Protocol) => void;
}

const NAME_FLAG_BADGE: Record<string, string> = {
  needs_facts: "incomplete name",
  needs_discriminator: "needs discriminator",
  name_conflict: "name conflict",
};

export function ProtocolLibraryRow({
  protocol,
  datesLoading = false,
  datesError = false,
  onSelect,
  search,
  onNewFrom,
}: ProtocolLibraryRowProps) {
  const match = search ? protocolTextMatch(protocol, search) : null;
  return (
    <div className="flex items-center rounded-md border-b hover:bg-muted">
      <button
        type="button"
        onClick={() => onSelect?.(protocol.id)}
        className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2 px-3 py-3 text-left text-sm"
      >
        <span className="min-w-0 flex-[1_1_240px] space-y-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-words font-medium">{protocol.name}</span>
            <StatusBadge status={protocol.status} />
            {protocol.name_flag && (
              <Badge variant="warning">
                {NAME_FLAG_BADGE[protocol.name_flag] ?? protocol.name_flag}
              </Badge>
            )}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-mono">{protocol.code}</span>
            <span>{PROTOCOL_TYPE_LABELS[protocol.protocol_type] ?? protocol.protocol_type}</span>
            {protocol.category && <span>{protocol.category}</span>}
            <span>
              {protocol.readout_definitions.length}{" "}
              {protocol.readout_definitions.length === 1 ? "readout" : "readouts"}
            </span>
            {protocol.targets.length > 0 && <TargetChips targets={protocol.targets} />}
          </span>
          {match && match.field !== "name" && (
            <span className="block break-words text-xs text-muted-foreground">
              matched {match.field}: {match.value}
            </span>
          )}
        </span>
        <span className="flex max-w-full shrink-0 flex-wrap gap-x-5 gap-y-1 text-xs tabular-nums sm:flex-col">
          <span title={formatDateTime(protocol.created_at) || "Creation date unavailable"}>
            <span className="mr-2 text-muted-foreground">Created</span>
            {protocol.created_at ? (
              <time dateTime={protocol.created_at}>{formatDate(protocol.created_at)}</time>
            ) : (
              "Unknown"
            )}
          </span>
          <span>
            <span className="mr-2 text-muted-foreground">Last run</span>
            {protocol.last_run_date ? (
              <time dateTime={protocol.last_run_date}>{formatDate(protocol.last_run_date)}</time>
            ) : datesLoading ? (
              "Loading…"
            ) : datesError || protocol.last_run_date === undefined ? (
              "Unavailable"
            ) : (
              "No runs"
            )}
          </span>
        </span>
      </button>
      {onNewFrom && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="mr-1 h-7 w-7 shrink-0 p-0"
              aria-label={`Actions for ${protocol.code ?? protocol.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onNewFrom(protocol)}>
              <Copy className="mr-2 h-4 w-4" />
              New protocol from this
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
