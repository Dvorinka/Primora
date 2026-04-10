import { Show, For, createSignal, createMemo } from "solid-js";
import { Button, Input, Badge } from "./index";

export interface Column<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => any;
  width?: string;
  align?: "left" | "center" | "right";
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  searchable?: boolean;
  exportable?: boolean;
  onExport?: (data: T[]) => void;
}

export function DataTable<T extends Record<string, any>>(props: DataTableProps<T>) {
  const [sortKey, setSortKey] = createSignal<keyof T | string | null>(null);
  const [sortDirection, setSortDirection] = createSignal<"asc" | "desc">("asc");
  const [searchQuery, setSearchQuery] = createSignal("");
  const [currentPage, setCurrentPage] = createSignal(1);
  const [filters, setFilters] = createSignal<Record<string, string>>({});

  const pageSize = () => props.pageSize || 10;

  // Filter data
  const filteredData = createMemo(() => {
    let result = [...props.data];

    // Apply search
    if (searchQuery().trim()) {
      const query = searchQuery().toLowerCase();
      result = result.filter(row => {
        return props.columns.some(col => {
          const value = row[col.key as keyof T];
          return String(value).toLowerCase().includes(query);
        });
      });
    }

    // Apply column filters
    const activeFilters = filters();
    Object.entries(activeFilters).forEach(([key, value]) => {
      if (value.trim()) {
        result = result.filter(row => {
          const cellValue = row[key as keyof T];
          return String(cellValue).toLowerCase().includes(value.toLowerCase());
        });
      }
    });

    return result;
  });

  // Sort data
  const sortedData = createMemo(() => {
    const key = sortKey();
    if (!key) return filteredData();

    return [...filteredData()].sort((a, b) => {
      const aVal = a[key as keyof T];
      const bVal = b[key as keyof T];

      let comparison = 0;
      if (aVal < bVal) comparison = -1;
      if (aVal > bVal) comparison = 1;

      return sortDirection() === "asc" ? comparison : -comparison;
    });
  });

  // Paginate data
  const paginatedData = createMemo(() => {
    const start = (currentPage() - 1) * pageSize();
    const end = start + pageSize();
    return sortedData().slice(start, end);
  });

  const totalPages = createMemo(() => Math.ceil(sortedData().length / pageSize()));

  const handleSort = (key: keyof T | string) => {
    if (sortKey() === key) {
      setSortDirection(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const getSortIcon = (key: keyof T | string) => {
    if (sortKey() !== key) {
      return (
        <svg class="w-4 h-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }

    return sortDirection() === "asc" ? (
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="flex items-center justify-between gap-4">
        <Show when={props.searchable}>
          <Input
            placeholder="Search..."
            value={searchQuery()}
            onInput={(e) => {
              setSearchQuery(e.currentTarget.value);
              setCurrentPage(1);
            }}
            class="max-w-sm"
          />
        </Show>
        <div class="flex items-center gap-2">
          <Badge variant="secondary">
            {sortedData().length} {sortedData().length === 1 ? "row" : "rows"}
          </Badge>
          <Show when={props.exportable && props.onExport}>
            <Button
              variant="outline"
              size="sm"
              onClick={() => props.onExport?.(sortedData())}
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
          </Show>
        </div>
      </div>

      {/* Table */}
      <div class="border border-gray-200 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-200">
              <tr>
                <For each={props.columns}>
                  {(column) => (
                    <th
                      class={`px-4 py-3 text-${column.align || "left"} text-xs font-semibold text-gray-700 uppercase tracking-wider ${
                        column.sortable ? "cursor-pointer hover:bg-gray-100" : ""
                      }`}
                      style={column.width ? { width: column.width } : {}}
                      onClick={() => column.sortable && handleSort(column.key)}
                    >
                      <div class="flex items-center gap-2">
                        <span>{column.label}</span>
                        <Show when={column.sortable}>
                          {getSortIcon(column.key)}
                        </Show>
                      </div>
                    </th>
                  )}
                </For>
              </tr>
              {/* Filter row */}
              <Show when={props.columns.some(col => col.filterable)}>
                <tr class="bg-gray-50">
                  <For each={props.columns}>
                    {(column) => (
                      <th class="px-4 py-2">
                        <Show when={column.filterable}>
                          <Input
                            placeholder={`Filter ${column.label}...`}
                            value={filters()[column.key as string] || ""}
                            onInput={(e) => handleFilterChange(column.key as string, e.currentTarget.value)}
                            class="text-sm"
                            size="sm"
                          />
                        </Show>
                      </th>
                    )}
                  </For>
                </tr>
              </Show>
            </thead>
            <tbody class="divide-y divide-gray-200">
              <Show
                when={!props.loading && paginatedData().length > 0}
                fallback={
                  <tr>
                    <td colspan={props.columns.length} class="px-4 py-12 text-center text-gray-500">
                      <Show when={props.loading} fallback={props.emptyMessage || "No data available"}>
                        <div class="flex items-center justify-center gap-2">
                          <div class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" />
                          <span>Loading...</span>
                        </div>
                      </Show>
                    </td>
                  </tr>
                }
              >
                <For each={paginatedData()}>
                  {(row) => (
                    <tr
                      class={`hover:bg-gray-50 transition-colors ${props.onRowClick ? "cursor-pointer" : ""}`}
                      onClick={() => props.onRowClick?.(row)}
                    >
                      <For each={props.columns}>
                        {(column) => (
                          <td class={`px-4 py-3 text-${column.align || "left"} text-sm text-gray-900`}>
                            {column.render
                              ? column.render(row[column.key as keyof T], row)
                              : String(row[column.key as keyof T] ?? "")}
                          </td>
                        )}
                      </For>
                    </tr>
                  )}
                </For>
              </Show>
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <Show when={totalPages() > 1}>
          <div class="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <div class="text-sm text-gray-700">
              Showing {(currentPage() - 1) * pageSize() + 1} to{" "}
              {Math.min(currentPage() * pageSize(), sortedData().length)} of {sortedData().length}
            </div>
            <div class="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage() === 1}
                onClick={() => setCurrentPage(p => p - 1)}
              >
                Previous
              </Button>
              <div class="flex items-center gap-1">
                <For each={Array.from({ length: Math.min(5, totalPages()) }, (_, i) => {
                  const page = i + 1;
                  if (totalPages() <= 5) return page;
                  if (currentPage() <= 3) return page;
                  if (currentPage() >= totalPages() - 2) return totalPages() - 4 + i;
                  return currentPage() - 2 + i;
                })}>
                  {(page) => (
                    <button
                      class={`px-3 py-1 text-sm rounded ${
                        currentPage() === page
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                      onClick={() => setCurrentPage(page)}
                    >
                      {page}
                    </button>
                  )}
                </For>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage() === totalPages()}
                onClick={() => setCurrentPage(p => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}
