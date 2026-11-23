/**
 * AIDE-22: client-side import file parsing.
 *
 * CSV via papaparse, Excel (.xlsx/.xls) via SheetJS (loaded lazily so the
 * main bundle stays small). Files are parsed in the browser; only the
 * extracted rows — never the binary file — are sent to the API, which keeps
 * us inside serverless body-size limits. Row and file-size caps come from
 * IMPORT_LIMITS (shared with the server).
 */
import Papa from "papaparse";
import { IMPORT_LIMITS } from "@/lib/importEngine.mjs";

export interface ParsedSheet {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface ParseResult {
  fileName: string;
  fileSize: number;
  sheets: ParsedSheet[];
}

const ACCEPTED_EXTENSIONS = ["csv", "tsv", "xlsx", "xls"];

function padToLength(row: string[], length: number): string[] {
  const out = row.slice(0, length);
  while (out.length < length) out.push("");
  return out;
}

function buildSheet(name: string, aoa: unknown[][]): ParsedSheet {
  const raw = aoa.map((r) =>
    Array.isArray(r) ? r.map((cell) => (cell === null || cell === undefined ? "" : String(cell))) : [String(r ?? "")]
  );
  // Drop trailing fully-empty rows
  while (raw.length && raw[raw.length - 1].every((c) => c.trim() === "")) raw.pop();
  const headers = (raw[0] ?? []).map((h) => h.trim());
  // Drop trailing fully-empty header columns
  let width = headers.length;
  while (width > 0 && headers[width - 1].trim() === "") width--;
  const trimmedHeaders = headers.slice(0, width);
  const dataRows = raw.slice(1).map((r) => padToLength(r, width));
  return { name, headers: trimmedHeaders, rows: dataRows };
}

function assertRowLimit(dataRowCount: number) {
  if (dataRowCount > IMPORT_LIMITS.maxRows) {
    throw new Error(
      `File has ${dataRowCount} data rows; the limit is ${IMPORT_LIMITS.maxRows} rows per import. Split it into smaller files and import them one at a time.`
    );
  }
}

export async function parseImportFile(file: File): Promise<ParseResult> {
  const maxMb = IMPORT_LIMITS.maxFileBytes / (1024 * 1024);
  if (file.size > IMPORT_LIMITS.maxFileBytes) {
    throw new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(1)} MB). The maximum is ${maxMb} MB.`);
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ACCEPTED_EXTENSIONS.includes(ext) && file.type !== "text/csv") {
    throw new Error("Unsupported file type. Upload a .csv or .xlsx file.");
  }

  if (ext === "csv" || ext === "tsv" || file.type === "text/csv") {
    const text = await file.text();
    const parsed = Papa.parse<string[]>(text, {
      skipEmptyLines: "greedy",
      dynamicTyping: false,
    });
    const aoa = (parsed.data as string[][]) ?? [];
    assertRowLimit(Math.max(0, aoa.length - 1));
    const sheet = buildSheet("CSV", aoa);
    if (sheet.headers.length === 0 || sheet.rows.length === 0) {
      throw new Error("The file does not contain any data rows.");
    }
    return { fileName: file.name, fileSize: file.size, sheets: [sheet] };
  }

  // .xlsx / .xls
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheets: ParsedSheet[] = [];
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      raw: false,
      defval: "",
      blankrows: false,
    });
    sheets.push(buildSheet(sheetName, aoa as unknown[][]));
  }
  const nonEmpty = sheets.filter((s) => s.rows.length > 0);
  if (nonEmpty.length === 0) {
    throw new Error("The workbook does not contain any data rows.");
  }
  assertRowLimit(Math.max(...nonEmpty.map((s) => s.rows.length)));
  return { fileName: file.name, fileSize: file.size, sheets: nonEmpty };
}
