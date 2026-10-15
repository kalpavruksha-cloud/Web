import type { ReactElement } from "react";
import { ResponsiveContainer } from "recharts";

export function AdminChartFrame({ children, height = 288 }: { children: ReactElement; height?: number }) {
  return <div className="w-full min-w-0" style={{ height, minWidth: 0 }}>
    <ResponsiveContainer width="100%" height={height} minWidth={0} minHeight={height}>{children}</ResponsiveContainer>
  </div>;
}

export function AdminChartEmpty({ message = "No dated spreadsheet records are available for this chart." }: { message?: string }) {
  return <div role="status" className="flex min-h-52 items-center justify-center rounded-lg border border-dashed border-forest-100 px-5 text-center text-sm text-charcoal/70 dark:border-white/15 dark:text-white/70">{message}</div>;
}
