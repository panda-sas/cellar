import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Protocol } from "../types";
import { ProtocolLibraryView } from "./protocol-library-view";

vi.mock("@/features/workspace-config/hooks/use-ontology-search", () => ({
  useTermsInUse: (slot: string) => ({
    data:
      slot === "organism"
        ? [
            {
              term_id: "NCBITaxon:1773",
              label: "Mycobacterium tuberculosis",
              ontology_source: "NCBITAXON",
              uri: null,
              short_label: "M. tuberculosis",
              protocol_count: 1,
            },
          ]
        : [],
  }),
}));

// Radix Collapsible items need pointer-event stubs in jsdom.
beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = vi.fn(() => false);
  }
  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = vi.fn();
  }
});

const p = (over: Partial<Protocol>): Protocol =>
  ({
    id: "x",
    name: "X",
    protocol_type: "biochemical",
    status: "active",
    category: null,
    targets: [],
    readout_definitions: [],
    ontology_annotations: null,
    protocol_version: 1,
    ...over,
  }) as unknown as Protocol;

const data: Protocol[] = [
  p({ id: "a", name: "Active Bio", protocol_type: "biochemical", status: "active" }),
  p({ id: "b", name: "Cell One", protocol_type: "cell_based", status: "active" }),
  p({ id: "c", name: "Old One", protocol_type: "biochemical", status: "retired" }),
];

describe("ProtocolLibraryView", () => {
  it("pre-excludes retired protocols by default", () => {
    render(<ProtocolLibraryView protocols={data} />);
    expect(screen.getByText("Active Bio")).toBeInTheDocument();
    expect(screen.queryByText("Old One")).not.toBeInTheDocument();
  });

  it("honors shared status filters, including retired, when switching views", () => {
    const change = vi.fn();
    const { rerender } = render(
      <ProtocolLibraryView
        protocols={data}
        selections={{ status: new Set(["retired"]) }}
        onSelectionsChange={change}
      />,
    );
    expect(screen.getByText("Old One")).toBeInTheDocument();
    expect(screen.queryByText("Active Bio")).not.toBeInTheDocument();
    rerender(
      <ProtocolLibraryView
        protocols={data}
        selections={{ status: new Set(["active"]), type: new Set(["cell_based"]) }}
        onSelectionsChange={change}
      />,
    );
    expect(screen.getByText("Cell One")).toBeInTheDocument();
    expect(screen.queryByText("Old One")).not.toBeInTheDocument();
    expect(screen.queryByText("Active Bio")).not.toBeInTheDocument();
  });

  it("sends facet changes back to shared filters without losing other selections", () => {
    const change = vi.fn();
    const selections = { status: new Set(["active"]) };
    render(
      <ProtocolLibraryView protocols={data} selections={selections} onSelectionsChange={change} />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Cell-Based" }));
    const next = change.mock.calls[0][0](selections);
    expect(next.status).toEqual(new Set(["active"]));
    expect(next.type).toEqual(new Set(["cell_based"]));
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(change).toHaveBeenLastCalledWith({});
  });

  it("filtering by a type facet narrows the list", () => {
    render(<ProtocolLibraryView protocols={data} />);
    // "Cell-Based" appears both as a facet value (role=checkbox) and as a row
    // type label — scope to the checkbox to avoid ambiguity.
    fireEvent.click(screen.getByRole("checkbox", { name: "Cell-Based" }));
    expect(screen.getByText("Cell One")).toBeInTheDocument();
    expect(screen.queryByText("Active Bio")).not.toBeInTheDocument();
  });

  describe("defaults", () => {
    const cat = [
      p({ id: "a", name: "Alpha", category: "Whole cell" }),
      p({ id: "b", name: "Beta", category: "Enzyme", status: "active" }),
    ];
    afterEach(() => localStorage.clear());

    it("changes row order and remembers the sort choice", () => {
      const dated = [
        p({
          id: "old",
          name: "Older",
          category: "Enzyme",
          created_at: "2025-01-01",
          last_run_date: "2025-01-01",
        }),
        p({
          id: "new",
          name: "Newer",
          category: "Enzyme",
          created_at: "2026-01-01",
          last_run_date: "2026-01-01",
        }),
      ];
      render(<ProtocolLibraryView protocols={dated} />);
      const newerComesFirst = () =>
        screen.getByText("Newer").compareDocumentPosition(screen.getByText("Older")) &
        Node.DOCUMENT_POSITION_FOLLOWING;
      expect(newerComesFirst()).toBeTruthy();
      fireEvent.keyDown(screen.getByRole("combobox", { name: "Sort protocols" }), { key: "Enter" });
      fireEvent.click(screen.getByRole("option", { name: "Created: oldest first" }));
      expect(newerComesFirst()).toBeFalsy();
      expect(localStorage.getItem("protocol-library-sort")).toBe("created_asc");
    });

    it("groups by category by default", () => {
      render(<ProtocolLibraryView protocols={cat} />);
      expect(screen.getByRole("combobox", { name: "Group protocols by" })).toHaveTextContent(
        "Category",
      );
      // Grouped by target (the old default) this would be a single "No target" bucket.
      expect(screen.queryByText("No target")).not.toBeInTheDocument();
      expect(screen.getAllByText("Whole cell").length).toBeGreaterThan(0);
    });

    it("a stored group-by preference wins", () => {
      localStorage.setItem("protocol-library-group-by", "type");
      render(<ProtocolLibraryView protocols={cat} />);
      expect(screen.getByRole("combobox", { name: "Group protocols by" })).toHaveTextContent(
        "Type",
      );
    });

    it("an unknown stored value falls back to category", () => {
      localStorage.setItem("protocol-library-group-by", "bogus");
      render(<ProtocolLibraryView protocols={cat} />);
      expect(screen.getByRole("combobox", { name: "Group protocols by" })).toHaveTextContent(
        "Category",
      );
    });

    it("shows the short label for an organism facet", () => {
      const mtb = p({
        id: "m",
        name: "Mtb",
        ontology_annotations: {
          organism: [
            {
              term_id: "NCBITaxon:1773",
              label: "Mycobacterium tuberculosis",
              ontology_source: "NCBITAXON",
              uri: null,
            },
          ],
        },
      });
      render(<ProtocolLibraryView protocols={[mtb]} />);
      // Shows the short label; its accessible name is the full one.
      expect(
        screen.getByRole("checkbox", { name: "Mycobacterium tuberculosis" }),
      ).toHaveTextContent("M. tuberculosis");
    });
  });
});
