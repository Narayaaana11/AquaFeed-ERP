import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
  /** Optional mobile card renderer. If provided, shown on mobile instead of the table. */
  mobileCard?: (row: T, index: number) => ReactNode;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export function DataTable<T>({ columns, data, emptyTitle, emptyDescription, emptyAction, mobileCard, page, totalPages, onPageChange }: DataTableProps<T>) {
  const isEmpty = data.length === 0;

  return (
    <div>
      {/* Mobile card list — only when mobileCard prop is provided */}
      {mobileCard && !isEmpty && (
        <div className="sm:hidden space-y-3">
          {data.map((row, i) => (
            <div key={i}>{mobileCard(row, i)}</div>
          ))}
        </div>
      )}

      {/* Desktop table (also shown on mobile when no mobileCard provided) */}
      <div className={cn("bg-surface rounded-xl border border-border shadow-card overflow-hidden", mobileCard && !isEmpty ? "hidden sm:block" : "")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap",
                      col.className
                    )}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isEmpty ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <p className="font-display font-semibold text-foreground">{emptyTitle ?? "No data yet"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{emptyDescription ?? "Nothing to display here."}</p>
                    {emptyAction && <div className="mt-4 flex justify-center">{emptyAction}</div>}
                  </td>
                </tr>
              ) : (
                data.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-border last:border-0 hover:bg-background transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3.5", col.className)}>
                        {col.cell(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty state when mobileCard is provided — shown on mobile */}
      {mobileCard && isEmpty && (
        <div className="sm:hidden bg-surface rounded-xl border border-border shadow-card p-10 flex flex-col items-center text-center">
          <p className="font-display font-semibold text-foreground">{emptyTitle ?? "No data yet"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{emptyDescription ?? "Nothing to display here."}</p>
          {emptyAction && <div className="mt-4 flex justify-center">{emptyAction}</div>}
        </div>
      )}

      {/* Pagination Controls */}
      {page !== undefined && totalPages !== undefined && onPageChange && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 h-8 rounded-md border border-border bg-surface text-sm font-medium disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 h-8 rounded-md border border-border bg-surface text-sm font-medium disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
