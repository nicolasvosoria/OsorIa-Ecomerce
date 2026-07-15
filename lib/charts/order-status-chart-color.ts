const ORDER_STATUS_CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export function orderStatusChartColor(index: number): string {
  return ORDER_STATUS_CHART_COLORS[index % ORDER_STATUS_CHART_COLORS.length]
}
