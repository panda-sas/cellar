import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SearchQuery } from "../types";

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  mode: "latest",
  setMode: vi.fn(),
  load: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));
vi.mock("../hooks/use-search", () => ({
  useExecuteSearch: () => ({ mutateAsync: mocks.mutateAsync }),
}));
vi.mock("../hooks/use-saved-searches", () => ({ useSavedSearches: () => ({ data: [] }) }));
vi.mock("../hooks/use-projects", () => ({ useProjects: () => ({ data: [] }) }));
vi.mock("../hooks/use-collections", () => ({ useCollections: () => ({ data: [] }) }));
vi.mock("@/features/tagging/hooks/use-tags", () => ({ useTags: () => ({ data: [] }) }));
vi.mock("@/features/screening-assay/hooks/use-protocols", () => ({
  useProtocols: () => ({ data: [] }),
}));
vi.mock("../hooks/use-report-config", () => ({
  useReportConfig: () => ({
    config: { imageSize: "small", visibleFields: { structure: [], properties: [], molecule: [] } },
    loadFromSavedSearch: mocks.load,
  }),
}));
vi.mock("../lib/use-aggregation-mode", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/use-aggregation-mode")>()),
  useAggregationMode: () => ({ mode: mocks.mode, setMode: mocks.setMode }),
}));
vi.mock("./search/search-form", () => ({
  SEARCH_PAGE_SIZE: 100,
  SearchForm: ({
    onSearch,
    onReset,
    collapsed,
  }: {
    onSearch: (q: SearchQuery, c: string[]) => void;
    onReset: () => void;
    collapsed: boolean;
  }) => (
    <div>
      <span>{collapsed ? "Filters collapsed" : "Filters expanded"}</span>
      {["A", "B"].map((value) => (
        <button
          key={value}
          type="button"
          onClick={() =>
            onSearch(
              { criteria: [{ type: "text", field: "name", operator: "contains", value }] },
              [],
            )
          }
        >
          Search {value}
        </button>
      ))}
      <button type="button" onClick={onReset}>
        Reset
      </button>
    </div>
  ),
}));
vi.mock("./search/results-grid", () => ({
  ResultsGrid: ({
    results,
    aggregationMode,
    toolbarLeft,
    summary,
    footer,
  }: {
    results: { id: string; name: string }[];
    aggregationMode: string;
    toolbarLeft: ReactNode;
    summary: ReactNode;
    footer: ReactNode;
  }) => (
    <div data-testid="results" data-mode={aggregationMode}>
      {toolbarLeft}
      {summary}
      {results.map((r) => (
        <span key={r.id}>{r.name}</span>
      ))}
      {footer}
    </div>
  ),
}));
vi.mock("./search/results-toolbar", () => ({
  ResultsToolbarLeft: ({ resultCount }: { resultCount: number | null }) => (
    <span>{resultCount ?? "Unknown"} results</span>
  ),
  ResultsToolbarActions: () => null,
  ResultsViewControls: () => null,
  ResultsSelectionActions: () => null,
}));
vi.mock("./search/compound-detail-sheet", () => ({ CompoundDetailSheet: () => null }));
vi.mock("./search/report-customizer", () => ({ ReportCustomizer: () => null }));
vi.mock("./search/save-search-dialog", () => ({ SaveSearchDialog: () => null }));
vi.mock("./search/search-structure-reference", () => ({ SearchStructureReference: () => null }));
vi.mock("@/shared/components/collection-picker-dialog", () => ({
  CollectionPickerDialog: () => null,
}));

import { SearchPage } from "./search-page";

function deferred() {
  let resolve!: (value: unknown) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const response = (name: string) => ({
  items: [{ id: name, name }],
  next_cursor: null,
  total_count: 1,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mode = "latest";
});

describe("search result provenance", () => {
  it("preserves the initial total when later pages omit it", async () => {
    mocks.mutateAsync
      .mockResolvedValueOnce({
        ...response("Compound A"),
        total_count: 201,
        next_cursor: "page-2",
      })
      .mockResolvedValueOnce({ ...response("Compound B"), total_count: null });
    render(<SearchPage />);
    fireEvent.click(screen.getByText("Search A"));
    await screen.findByText("Compound A");
    expect(screen.getByText("201 results")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Load More"));
    await screen.findByText("Compound B");
    expect(screen.getByText("Compound A")).toBeInTheDocument();
    expect(screen.getByText("201 results")).toBeInTheDocument();
    expect(screen.queryByText("Load More")).not.toBeInTheDocument();
    expect(mocks.mutateAsync.mock.calls.at(-1)?.[0].cursor).toBe("page-2");
  });
  it("retains the successful query and rows during a failed rerun, then retries the failed query", async () => {
    mocks.mutateAsync.mockResolvedValueOnce(response("Compound A"));
    render(<SearchPage />);
    fireEvent.click(screen.getByText("Search A"));
    await screen.findByText("Compound A");
    expect(screen.getByText("Filters collapsed")).toBeInTheDocument();
    const pending = deferred();
    mocks.mutateAsync.mockReturnValueOnce(pending.promise);
    fireEvent.click(screen.getByText("Search B"));
    expect(screen.getByText(/Updating results/)).toBeInTheDocument();
    expect(screen.getByText(/Name contains “A”/)).toBeInTheDocument();
    expect(screen.queryByText(/Name contains “B”/)).not.toBeInTheDocument();
    await act(async () => pending.reject(new Error("Search service unavailable")));
    expect(screen.getByRole("alert")).toHaveTextContent("Search service unavailable");
    expect(screen.getByText("Compound A")).toBeInTheDocument();
    mocks.mutateAsync.mockResolvedValueOnce(response("Compound B"));
    fireEvent.click(screen.getByText("Retry"));
    await screen.findByText("Compound B");
    expect(screen.getByText(/Name contains “B”/)).toBeInTheDocument();
    expect(mocks.mutateAsync.mock.calls.at(-1)?.[0].input.query.criteria[0].value).toBe("B");
  });
  it("does not restore results when a request completes after Reset", async () => {
    const pending = deferred();
    mocks.mutateAsync.mockReturnValueOnce(pending.promise);
    render(<SearchPage />);
    fireEvent.click(screen.getByText("Search A"));
    fireEvent.click(screen.getByText("Reset"));
    await act(async () => pending.resolve(response("Stale compound")));
    expect(screen.queryByText("Stale compound")).not.toBeInTheDocument();
    expect(screen.getByText("Filters expanded")).toBeInTheDocument();
  });
  it("ignores an older response that arrives after the newer search", async () => {
    const older = deferred();
    const newer = deferred();
    mocks.mutateAsync.mockReturnValueOnce(older.promise).mockReturnValueOnce(newer.promise);
    render(<SearchPage />);
    fireEvent.click(screen.getByText("Search A"));
    fireEvent.click(screen.getByText("Search B"));
    await act(async () => newer.resolve(response("New compound")));
    await act(async () => older.resolve(response("Old compound")));
    expect(screen.getByText("New compound")).toBeInTheDocument();
    expect(screen.queryByText("Old compound")).not.toBeInTheDocument();
    expect(screen.getByText(/Name contains “B”/)).toBeInTheDocument();
  });
  it("keeps the executed aggregation on the grid when changing aggregation fails", async () => {
    mocks.mutateAsync.mockResolvedValueOnce(response("Compound A"));
    const view = render(<SearchPage />);
    fireEvent.click(screen.getByText("Search A"));
    await screen.findByText("Compound A");
    mocks.mutateAsync.mockRejectedValueOnce(new Error("Aggregation unavailable"));
    mocks.mode = "gmean";
    view.rerender(<SearchPage />);
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Aggregation unavailable"),
    );
    expect(screen.getByTestId("results")).toHaveAttribute("data-mode", "latest");
  });
});
