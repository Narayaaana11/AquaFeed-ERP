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
}

export function DataTable<T>({ columns, data, emptyTitle, emptyDescription, emptyAction }: DataTableProps<T>) {
  return (
    <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-display font-semibold text-muted-foreground uppercase tracking-wide",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
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
  );
}
