"use client";

import type { Molecule } from "@/features/chemical-registration/types";
import { Button } from "@/shared/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { useState } from "react";

export function ComparisonCompoundPicker({
  candidates,
  label,
  onPick,
  disabled,
  onLoadMore,
  loading,
}: {
  candidates: Molecule[];
  label: string;
  onPick: (id: string) => void;
  disabled?: boolean;
  onLoadMore?: () => void;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-0">
        <Command>
          <CommandInput
            aria-label="Find a compound in loaded results"
            placeholder="Find by ID or name…"
          />
          <p className="px-3 py-2 text-xs text-muted-foreground">
            Choose from loaded search results
          </p>
          <CommandList>
            <CommandEmpty>No matching compounds in the loaded results.</CommandEmpty>
            {candidates.map((mol) => (
              <CommandItem
                key={mol.id}
                value={`${mol.id} ${mol.registration_number ?? ""} ${mol.name ?? ""}`}
                onSelect={() => {
                  onPick(mol.id);
                  setOpen(false);
                }}
              >
                <span className="flex min-w-0 flex-col">
                  <span className="font-mono text-xs">{mol.registration_number ?? mol.id}</span>
                  <span className="truncate text-sm">{mol.name || "Unnamed"}</span>
                </span>
              </CommandItem>
            ))}
          </CommandList>
        </Command>
        {onLoadMore && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={onLoadMore}
              disabled={loading}
            >
              {loading ? "Loading…" : "Load more search results"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
