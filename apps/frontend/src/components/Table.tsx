import { type JSX, For, Show, splitProps } from "solid-js";

interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  align?: "left" | "center" | "right";
  render?: (value: T[keyof T], row: T, index: number) => JSX.Element;
}

interface TableProps<T> extends JSX.HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  rowKey?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  stickyHeader?: boolean;
}

export function Table<T extends Record<string, unknown>>(props: TableProps<T>) {
  const [local, rest] = splitProps(props, [
    "columns",
    "data",
    "rowKey",
    "onRowClick",
    "loading",
    "emptyMessage",
    "stickyHeader",
    "children",
    "class",
  ]);

  const getKeyValue = (row: T, key: keyof T | string): unknown => {
    if (typeof key === "string" && key.includes(".")) {
      const keys = key.split(".");
      let value: unknown = row;
      for (const k of keys) {
        value = (value as Record<string, unknown>)?.[k];
      }
      return value;
    }
    return row[key as keyof T];
  };

  const alignClass = (align?: "left" | "center" | "right") => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  return (
    <div class="table-container">
      <table class={`table ${local.class ?? ""}`} {...rest}>
        <thead class={local.stickyHeader ? "sticky top-0 z-10" : ""}>
          <tr>
            <For each={local.columns}>
              {(column) => (
                <th
                  class={alignClass(column.align)}
                  style={{ width: column.width }}
                >
                  {column.header}
                </th>
              )}
            </For>
          </tr>
        </thead>
        <tbody>
          <Show when={!local.loading && local.data.length === 0}>
            <tr>
              <td
                colspan={local.columns.length}
                class="py-8 text-center text-text-3"
              >
                {local.emptyMessage ?? "No data available"}
              </td>
            </tr>
          </Show>
          <For each={local.data}>
            {(row, index) => (
              <tr
                class={local.onRowClick ? "cursor-pointer" : ""}
                onClick={() => local.onRowClick?.(row)}
                data-row-key={local.rowKey?.(row)}
              >
                <For each={local.columns}>
                  {(column) => {
                    const value = getKeyValue(row, column.key);
                    return (
                      <td class={alignClass(column.align)}>
                        <Show
                          when={column.render}
                          fallback={String(value ?? "")}
                        >
                          {column.render!(
                            value as T[keyof T],
                            row,
                            index()
                          )}
                        </Show>
                      </td>
                    );
                  }}
                </For>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  );
}

interface DataTableProps<T> extends JSX.HTMLAttributes<HTMLDivElement> {
  columns: Column<T>[];
  data: T[];
  rowKey?: (row: T) => string | number;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  emptyMessage?: string;
  pageSize?: number;
  showPagination?: boolean;
}

export function DataTable<T extends Record<string, unknown>>(
  props: DataTableProps<T>
) {
  const [local, rest] = splitProps(props, [
    "columns",
    "data",
    "rowKey",
    "onRowClick",
    "loading",
    "emptyMessage",
    "pageSize",
    "showPagination",
    "children",
    "class",
  ]);

  return (
    <div class={`space-y-4 ${local.class ?? ""}`} {...rest}>
      <Table
        columns={local.columns}
        data={local.data}
        rowKey={local.rowKey}
        onRowClick={local.onRowClick}
        loading={local.loading}
        emptyMessage={local.emptyMessage}
        stickyHeader
      />
      <Show when={local.children}>{local.children}</Show>
    </div>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showPageNumbers?: boolean;
}

export function Pagination(props: PaginationProps) {
  const pages = () => {
    const pages: (number | "ellipsis")[] = [];
    const total = props.totalPages;
    const current = props.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("ellipsis");
      for (
        let i = Math.max(2, current - 1);
        i <= Math.min(total - 1, current + 1);
        i++
      ) {
        pages.push(i);
      }
      if (current < total - 2) pages.push("ellipsis");
      pages.push(total);
    }

    return pages;
  };

  return (
    <nav class="flex items-center justify-between" aria-label="Pagination">
      <div class="text-xs text-text-3">
        Page {props.currentPage} of {props.totalPages}
      </div>
      <div class="flex items-center gap-1">
        <button
          class="btn-ghost btn-sm"
          onClick={() => props.onPageChange(props.currentPage - 1)}
          disabled={props.currentPage === 1}
          aria-label="Previous page"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <Show when={props.showPageNumbers ?? true}>
          <For each={pages()}>
            {(page) =>
              page === "ellipsis" ? (
                <span class="px-2 text-text-3">...</span>
              ) : (
                <button
                  class={`btn-sm ${page === props.currentPage ? "btn-primary" : "btn-ghost"}`}
                  onClick={() => props.onPageChange(page)}
                  aria-current={page === props.currentPage ? "page" : undefined}
                >
                  {page}
                </button>
              )
            }
          </For>
        </Show>
        <button
          class="btn-ghost btn-sm"
          onClick={() => props.onPageChange(props.currentPage + 1)}
          disabled={props.currentPage === props.totalPages}
          aria-label="Next page"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
