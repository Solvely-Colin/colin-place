const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Deterministic server-safe formatting for YYYY-MM-DD strings — no Date
// parsing, so no timezone drift between server and client renders.
export function formatDate(ymd: string): string {
  const [y, m, d] = ymd.split("-");
  const month = MONTHS[Number(m) - 1] ?? m;
  return `${month} ${Number(d)}, ${y}`;
}
