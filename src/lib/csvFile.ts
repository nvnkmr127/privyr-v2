// Client-side pre-flight for CSV uploads. Catches the obvious problems before we read the file
// into memory and hand it to a Server Action (which has a ~1MB body limit), so the user gets a
// clear message instead of an opaque "Body exceeded limit" failure.

const MAX_BYTES = 1_000_000; // matches the Server Action body limit

// Returns a user-facing problem string, or null if the file looks importable.
export function validateCsvFile(file: File): string | null {
  const name = file.name.toLowerCase();
  const looksCsv = name.endsWith(".csv") || file.type === "text/csv" || file.type === "application/vnd.ms-excel";
  if (!looksCsv) return "Please choose a .csv file.";
  if (file.size === 0) return "This file is empty. Please choose a CSV with at least a header row and one lead.";
  if (file.size > MAX_BYTES) return "This file is too large (over ~1 MB). Split it into smaller batches and try again.";
  return null;
}
