import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { EmptyState } from "./State";

export type Column<T> = { key: string; header: string; render: (row: T) => ReactNode };

export function DataTable<T>({ columns, rows, searchPlaceholder = "Search records" }: { columns: Column<T>[]; rows: T[]; searchPlaceholder?: string }) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    if (!search) return rows;
    const needle = search.toLowerCase();
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(needle));
  }, [rows, search]);

  return (
    <div>
      <label className="mb-4 flex max-w-md items-center gap-2 rounded-lg border border-forest-100 bg-white px-3 py-2 text-sm dark:border-white/10 dark:bg-white/5">
        <Search className="h-4 w-4 text-charcoal/45 dark:text-white/45" />
        <span className="sr-only">Search</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-charcoal placeholder:text-charcoal/45 dark:text-white dark:placeholder:text-white/45" />
      </label>
      {filtered.length === 0 ? (
        <EmptyState title="No records found" message="The spreadsheet did not return records for this view or your filters removed all visible rows." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-forest-100 bg-white dark:border-white/10 dark:bg-white/5">
          <table className="min-w-full divide-y divide-forest-100 text-left text-sm dark:divide-white/10">
            <thead className="bg-forest-50/80 text-xs uppercase text-forest-900 dark:bg-white/5 dark:text-gold-100">
              <tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-4 py-3 font-bold">{column.header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-forest-100 dark:divide-white/10">
              {filtered.map((row, index) => (
                <tr key={index} className="hover:bg-forest-50/60 dark:hover:bg-white/5">
                  {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-4 py-3 text-charcoal/80 dark:text-white/80">{column.render(row) ?? "Not available"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
