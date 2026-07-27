import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
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
    <div className="rounded-[18px] border border-white/60 bg-white/74 p-4 shadow-glass backdrop-blur-xl dark:border-white/10 dark:bg-white/8">
      <label className="mb-4 flex max-w-md items-center gap-2 rounded-2xl border border-navy-100/70 bg-white/85 px-4 py-3 text-sm shadow-sm dark:border-white/10 dark:bg-white/8">
        <Search className="h-4 w-4 text-charcoal/45 dark:text-white/45" />
        <span className="sr-only">Search</span>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={searchPlaceholder} className="w-full bg-transparent text-charcoal placeholder:text-charcoal/45 dark:text-white dark:placeholder:text-white/45" />
      </label>
      {filtered.length === 0 ? (
        <EmptyState title="No records found" message="The spreadsheet did not return records for this view or your filters removed all visible rows." />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-navy-100/60 bg-white dark:border-white/10 dark:bg-white/5">
          <table className="min-w-full divide-y divide-navy-100 text-left text-sm dark:divide-white/10">
            <thead className="sticky top-0 z-10 bg-[linear-gradient(90deg,#08152f,#153bb7_54%,#d7ab3d)] text-xs uppercase text-white shadow-sm">
              <tr>{columns.map((column) => <th key={column.key} className="whitespace-nowrap px-5 py-4 font-extrabold tracking-[0.08em]">{column.header}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-navy-100/70 dark:divide-white/10">
              {filtered.map((row, index) => (
                <tr key={index} className="transition odd:bg-navy-50/30 hover:bg-gold-100/20 dark:odd:bg-white/[0.03] dark:hover:bg-white/8">
                  {columns.map((column) => <td key={column.key} className="whitespace-nowrap px-5 py-4 font-medium text-charcoal/82 dark:text-white/82">{column.render(row) ?? "Not available"}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-navy-100/60 px-4 py-3 text-xs font-bold text-charcoal/55 dark:border-white/10 dark:text-white/55">
            <span>{filtered.length} live records</span>
            <div className="flex items-center gap-2 text-navy-900 dark:text-gold-100"><ChevronLeft className="h-4 w-4" /> <ChevronRight className="h-4 w-4" /></div>
          </div>
        </div>
      )}
    </div>
  );
}
