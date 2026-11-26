"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Upload,
  FileSpreadsheet,
  Package,
  Users,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Undo2,
  Download,
  History,
  ArrowLeft,
  ArrowRight,
  XCircle,
  FileText,
  Receipt,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import { parseImportFile, type ParseResult } from "@/lib/importParse";
import {
  FIELD_DEFS,
  autoDetectMapping,
  IMPORT_LIMITS,
} from "@/lib/importEngine.mjs";
import { cn } from "@/lib/utils";

type Entity = "products" | "customers" | "sales";
type Tab = "new" | "history";
type Step = "entity" | "file" | "map" | "review" | "done";

interface DryRunRow {
  row: number;
  index: number;
  status: "ok" | "duplicate" | "error" | "empty";
  errors: string[];
  data: Record<string, unknown> | null;
  duplicateOf?: number | string | null;
  existingId?: string;
  provided?: string[];
}

interface DryRunResponse {
  ok: true;
  entity: string;
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  emptyCount: number;
  rows: DryRunRow[];
  errorReport: Array<{ row: number; errors: string[] }>;
}

interface CommitResponse {
  ok: boolean;
  batchId?: string;
  fileName?: string;
  totalRows?: number;
  createdCount?: number;
  updatedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  errorReport?: Array<{ row: number; errors: string[] }>;
  error?: string;
}

interface ImportBatchRecord {
  id: string;
  fileName: string;
  entity: "PRODUCTS" | "CUSTOMERS" | "SALES";
  status: "COMPLETED" | "ROLLED_BACK";
  duplicateStrategy: "SKIP" | "MERGE";
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  createdAt: string;
  rolledBackAt: string | null;
  createdBy: { name: string | null; email: string | null } | null;
  errorReport?: Array<{ row: number; errors: string[] }>;
}

const ENTITY_OPTIONS: Array<{
  key: Entity;
  title: string;
  description: string;
  fields: string;
  icon: typeof Package;
}> = [
  {
    key: "products",
    title: "Products",
    description: "Inventory items with prices, stock quantities, SKUs and categories.",
    fields: "name · sku · buying/selling price · quantity · low-stock · category",
    icon: Package,
  },
  {
    key: "customers",
    title: "Customers",
    description: "Customer records with contact details, codes and credit limits.",
    fields: "name · customer code · email · phone · address · city · credit limit",
    icon: Users,
  },
  {
    key: "sales",
    title: "Sales history",
    description: "Historical sales with date, receipt number, payment method and line items. Append-only — duplicates are skipped.",
    fields: "date · receipt · customer · payment method · item · qty · price · cost · tax",
    icon: Receipt,
  },
];

const STEP_LABELS: Array<{ key: Step; label: string }> = [
  { key: "entity", label: "1. What" },
  { key: "file", label: "2. File" },
  { key: "map", label: "3. Map columns" },
  { key: "review", label: "4. Validate & import" },
  { key: "done", label: "5. Done" },
];

function downloadCsv(filename: string, lines: Array<[number, string]>) {
  const escape = (value: string) => `"${String(value).replace(/"/g, '""')}"`;
  const content = ["row,error", ...lines.map(([row, error]) => `${row},${escape(error)}`)].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function errorLines(report: Array<{ row: number; errors: string[] }>): Array<[number, string]> {
  return report.flatMap((entry) => entry.errors.map((e) => [entry.row, e] as [number, string]));
}

export default function ImportPageInner() {
  const [tab, setTab] = useState<Tab>("new");

  // --- wizard state ---
  const [step, setStep] = useState<Step>("entity");
  const [entity, setEntity] = useState<Entity>("products");
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<Record<string, number | null>>({});
  const [duplicateStrategy, setDuplicateStrategy] = useState<"skip" | "merge">("skip");
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [dryRun, setDryRun] = useState<DryRunResponse | null>(null);
  const [result, setResult] = useState<CommitResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- history state ---
  const [batches, setBatches] = useState<ImportBatchRecord[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [rollbackTarget, setRollbackTarget] = useState<ImportBatchRecord | null>(null);
  const [rollbackBusy, setRollbackBusy] = useState(false);
  const [rollbackSummary, setRollbackSummary] = useState<string | null>(null);

  const sheet = parsed?.sheets[sheetIndex] ?? null;
  const fieldDefs = useMemo(() => FIELD_DEFS[entity] ?? [], [entity]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    setHistoryError(null);
    try {
      const res = await fetch("/api/imports");
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed to load import history (${res.status})`);
      }
      setBatches(await res.json());
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : "Failed to load import history");
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  const resetWizard = useCallback(() => {
    setStep("entity");
    setParsing(false);
    setParseError(null);
    setParsed(null);
    setSheetIndex(0);
    setMapping({});
    setDuplicateStrategy("skip");
    setValidating(false);
    setCommitting(false);
    setActionError(null);
    setDryRun(null);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const startEntity = (next: Entity) => {
    setEntity(next);
    setParsed(null);
    setDryRun(null);
    setResult(null);
    setParseError(null);
    setActionError(null);
    setStep("file");
  };

  const applyMappingFor = useCallback(
    (headers: string[], nextEntity: Entity) => {
      const detected = autoDetectMapping(headers, nextEntity) as Record<string, number>;
      const full: Record<string, number | null> = {};
      for (const def of FIELD_DEFS[nextEntity]) full[def.key] = detected[def.key] ?? null;
      setMapping(full);
    },
    []
  );

  const handleFile = useCallback(
    async (file: File | undefined | null) => {
      if (!file) return;
      setParsing(true);
      setParseError(null);
      setDryRun(null);
      setResult(null);
      setActionError(null);
      try {
        const result_ = await parseImportFile(file);
        setParsed(result_);
        setSheetIndex(0);
        applyMappingFor(result_.sheets[0].headers, entity);
      } catch (err) {
        setParsed(null);
        setParseError(err instanceof Error ? err.message : "Could not parse the file");
      } finally {
        setParsing(false);
      }
    },
    [applyMappingFor, entity]
  );

  const selectSheet = useCallback(
    (index: number) => {
      setSheetIndex(index);
      setDryRun(null);
      const nextSheet = parsed?.sheets[index];
      if (nextSheet) applyMappingFor(nextSheet.headers, entity);
    },
    [applyMappingFor, entity, parsed?.sheets]
  );

  const requiredMapped = useMemo(
    () =>
      fieldDefs
        .filter((def: any) => def.required)
        .every((def: any) => mapping[def.key] !== null && mapping[def.key] !== undefined),
    [fieldDefs, mapping]
  );

  const payload = useMemo(() => {
    if (!sheet) return null;
    return {
      entity,
      fileName: parsed?.fileName,
      headers: sheet.headers,
      rows: sheet.rows,
      mapping,
      duplicateStrategy,
    };
  }, [entity, parsed?.fileName, sheet, mapping, duplicateStrategy]);

  const runValidation = useCallback(async () => {
    if (!payload) return;
    setValidating(true);
    setActionError(null);
    try {
      const res = await fetch("/api/imports/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Validation failed (${res.status})`);
      setDryRun(data as DryRunResponse);
    } catch (err) {
      setDryRun(null);
      setActionError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }, [payload]);

  const commit = useCallback(async () => {
    if (!payload) return;
    setCommitting(true);
    setActionError(null);
    try {
      const res = await fetch("/api/imports/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => null)) as CommitResponse | null;
      if (!res.ok) throw new Error(data?.error ?? `Import failed (${res.status})`);
      setResult(data);
      setStep("done");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setCommitting(false);
    }
  }, [payload]);

  const rollback = useCallback(async () => {
    if (!rollbackTarget) return;
    setRollbackBusy(true);
    setRollbackSummary(null);
    try {
      const res = await fetch(`/api/imports/${rollbackTarget.id}/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Rollback failed (${res.status})`);
      const blocked = Array.isArray(data?.blocked) ? data.blocked.length : 0;
      setRollbackSummary(
        `Rolled back ${rollbackTarget.fileName}: deleted ${data?.deletedProducts ?? 0} products, ` +
          `${data?.deletedCustomers ?? 0} customers, ${data?.deletedSales ?? 0} sales and ` +
          `${data?.deletedCategories ?? 0} empty categories; ` +
          `restored ${data?.restored ?? 0} merged record(s).` +
          (blocked ? ` ${blocked} record(s) were kept because they are in use.` : "")
      );
      setRollbackTarget(null);
      await loadHistory();
    } catch (err) {
      setRollbackSummary(err instanceof Error ? err.message : "Rollback failed");
      setRollbackTarget(null);
    } finally {
      setRollbackBusy(false);
    }
  }, [loadHistory, rollbackTarget]);

  const importableCount = dryRun ? dryRun.validCount + (duplicateStrategy === "merge" ? dryRun.rows.filter((r) => r.status === "duplicate" && r.existingId).length : 0) : 0;

  const stepIndex = STEP_LABELS.findIndex((s) => s.key === step);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-rule pb-6">
        <div>
          <p className="np-kicker mb-1">Data Migration</p>
          <h1 className="font-display text-2xl md:text-3xl font-black text-ink mb-1">Data Import</h1>
          <p className="font-display text-sm text-secondary">
            Bring historical data in from CSV or Excel — column mapping, dry-run validation,
            duplicate handling and one-click undo.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("new")}
            className={cn("np-btn", tab === "new" && "np-btn--accent")}
          >
            <Upload className="w-4 h-4" /> New Import
          </button>
          <button
            onClick={() => setTab("history")}
            className={cn("np-btn", tab === "history" && "np-btn--accent")}
          >
            <History className="w-4 h-4" /> Import History
          </button>
        </div>
      </div>

      {tab === "new" && (
        <>
          {/* Stepper */}
          <div className="flex flex-wrap gap-2">
            {STEP_LABELS.map((s, i) => (
              <span
                key={s.key}
                className={cn(
                  "font-display text-[11px] font-bold uppercase tracking-wider border px-2 py-1",
                  i < stepIndex && "border-rule text-secondary",
                  i === stepIndex && "border-accent text-accent",
                  i > stepIndex && "border-rule/60 text-secondary/50"
                )}
              >
                {s.label}
              </span>
            ))}
          </div>

          {/* STEP 1 — entity */}
          {step === "entity" && (
            <div className="grid md:grid-cols-2 gap-4">
              {ENTITY_OPTIONS.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.key}
                    onClick={() => startEntity(option.key)}
                    className="border border-rule p-6 text-left hover:border-ink transition-colors group"
                  >
                    <Icon className="w-8 h-8 text-secondary group-hover:text-ink mb-3" strokeWidth={1.5} />
                    <h2 className="font-display text-lg font-black text-ink">{option.title}</h2>
                    <p className="font-display text-sm text-secondary mt-1">{option.description}</p>
                    <p className="font-mono text-[10px] text-secondary/70 mt-3 uppercase tracking-wide">
                      {option.fields}
                    </p>
                    <span className="inline-flex items-center gap-1 mt-4 font-display text-xs font-bold text-accent uppercase tracking-wider">
                      Start import <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* STEP 2 — file */}
          {step === "file" && (
            <div className="space-y-4">
              <div className="border border-rule border-dashed p-8 text-center">
                <FileSpreadsheet className="w-10 h-10 text-secondary mx-auto mb-3" strokeWidth={1.5} />
                <p className="font-display text-base font-bold text-ink">
                  Choose a CSV or Excel file
                </p>
                <p className="font-display text-xs text-secondary mt-1">
                  Max {IMPORT_LIMITS.maxFileBytes / (1024 * 1024)} MB · max {IMPORT_LIMITS.maxRows} rows · .csv, .xlsx
                  {" "}— the first row must contain column headers
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.tsv,.xlsx,.xls,text/csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsing}
                  className="np-btn np-btn--accent mt-4 mx-auto"
                >
                  {parsing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Parsing…
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" /> Choose file
                    </>
                  )}
                </button>
                {parseError && (
                  <p className="font-display text-xs text-red-600 dark:text-red-400 mt-3">{parseError}</p>
                )}
              </div>

              {parsed && sheet && (
                <div className="border border-rule p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-sm font-bold text-ink flex items-center gap-2">
                        <FileText className="w-4 h-4 text-secondary" /> {parsed.fileName}
                      </p>
                      <p className="font-display text-xs text-secondary mt-0.5">
                        {sheet.rows.length} data rows · {sheet.headers.length} columns
                      </p>
                    </div>
                    {parsed.sheets.length > 1 && (
                      <label className="font-display text-xs text-secondary flex items-center gap-2">
                        Sheet
                        <select
                          value={sheetIndex}
                          onChange={(e) => selectSheet(Number(e.target.value))}
                          className="border border-rule bg-ground text-ink px-2 py-1.5 font-display text-xs"
                        >
                          {parsed.sheets.map((s, i) => (
                            <option key={s.name} value={i}>
                              {s.name} ({s.rows.length} rows)
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="overflow-x-auto border border-rule">
                    <table className="min-w-full text-xs font-mono">
                      <thead>
                        <tr className="bg-rule/20">
                          {sheet.headers.map((h, i) => (
                            <th key={i} className="text-left px-2 py-1.5 text-ink font-bold whitespace-nowrap">
                              {h || <span className="text-secondary/50">(empty)</span>}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sheet.rows.slice(0, IMPORT_LIMITS.previewRows).map((row, i) => (
                          <tr key={i} className="border-t border-rule/60">
                            {row.map((cell, j) => (
                              <td key={j} className="px-2 py-1.5 whitespace-nowrap">{cell}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="font-display text-[10px] text-secondary">Showing first {Math.min(sheet.rows.length, IMPORT_LIMITS.previewRows)} rows.</p>
                </div>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep("entity")} className="np-btn">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => setStep("map")}
                  disabled={!sheet}
                  className="np-btn np-btn--accent disabled:opacity-40"
                >
                  Continue to column mapping <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — mapping */}
          {step === "map" && sheet && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border border-rule p-4">
                <div>
                  <p className="font-display text-sm font-bold text-ink">Map columns to {entity === "products" ? "products" : "customers"} fields</p>
                  <p className="font-display text-xs text-secondary mt-0.5">
                    We auto-detected sensible matches — adjust anything that looks wrong. Blank cells never overwrite existing data when merging.
                  </p>
                </div>
                <button onClick={() => applyMappingFor(sheet.headers, entity)} className="np-btn !py-1.5 !text-xs">
                  Auto-detect again
                </button>
              </div>

              <div className="border border-rule divide-y divide-rule">
                {fieldDefs.map((def: any) => {
                  const value = mapping[def.key];
                  const mapped = value !== null && value !== undefined;
                  return (
                    <div key={def.key} className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 items-center px-4 py-3">
                      <label htmlFor={`map-${def.key}`} className="font-display text-sm text-ink">
                        <span className="font-bold">{def.label}</span>
                        {def.required && <span className="text-accent"> *</span>}
                        <span className="block sm:inline text-[10px] text-secondary sm:ml-2 font-mono">{def.type}</span>
                      </label>
                      <select
                        id={`map-${def.key}`}
                        value={mapped ? String(value) : ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMapping((prev) => ({ ...prev, [def.key]: v === "" ? null : Number(v) }));
                          setDryRun(null);
                        }}
                        className={cn(
                          "w-full border bg-ground text-ink px-3 py-2 font-display text-sm",
                          mapped ? "border-rule" : def.required ? "border-accent" : "border-rule"
                        )}
                      >
                        <option value="">— Skip —</option>
                        {sheet.headers.map((h, i) => (
                          <option key={i} value={i}>
                            {i + 1}. {h || `(empty column ${i + 1})`}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              {!requiredMapped && (
                <p className="font-display text-xs text-accent flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Map all required (*) fields before continuing.
                </p>
              )}
              {actionError && (
                <p className="font-display text-xs text-red-600 dark:text-red-400">{actionError}</p>
              )}

              <div className="flex justify-between">
                <button onClick={() => setStep("file")} className="np-btn">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => {
                    setStep("review");
                    setDryRun(null);
                  }}
                  disabled={!requiredMapped}
                  className="np-btn np-btn--accent disabled:opacity-40"
                >
                  Continue to validation <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4 — review / dry run + commit */}
          {step === "review" && sheet && (
            <div className="space-y-4">
              {!dryRun && (
                <div className="border border-rule p-6 text-center space-y-3">
                  <p className="font-display text-sm text-secondary">
                    Run a dry run first. Nothing is written to your books until you confirm — you will see
                    row-level errors, duplicates and exactly what will be created.
                  </p>
                  <button onClick={runValidation} disabled={validating} className="np-btn np-btn--accent mx-auto">
                    {validating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Validating…
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" /> Run dry-run validation
                      </>
                    )}
                  </button>
                  <div>
                    <button onClick={() => setStep("map")} className="np-btn !py-1.5 !text-xs">
                      <ArrowLeft className="w-4 h-4" /> Back to mapping
                    </button>
                  </div>
                </div>
              )}

              {actionError && (
                <p className="font-display text-xs text-red-600 dark:text-red-400 border border-rule p-3">{actionError}</p>
              )}

              {dryRun && (
                <>
                  {/* Summary cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Rows in file", value: dryRun.totalRows },
                      { label: "Ready to import", value: dryRun.validCount },
                      { label: "Duplicates", value: dryRun.duplicateCount },
                      { label: "Errors", value: dryRun.errorCount },
                    ].map((card) => (
                      <div key={card.label} className="border border-rule p-3 text-center">
                        <p className="font-display text-2xl font-black text-ink">{card.value}</p>
                        <p className="font-display text-[10px] uppercase tracking-wider text-secondary mt-1">{card.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Duplicate strategy */}
                  <div className="border border-rule p-4">
                    <p className="font-display text-sm font-bold text-ink mb-2">Duplicates</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-2 font-display text-sm text-ink cursor-pointer">
                        <input
                          type="radio"
                          name="dup-strategy"
                          checked={duplicateStrategy === "skip"}
                          onChange={() => setDuplicateStrategy("skip")}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-bold">Skip duplicates</span>
                          <span className="block text-xs text-secondary">Rows matching an existing record (by SKU / customer code / phone / email / name) are left out of the import.</span>
                        </span>
                      </label>
                      <label className="flex items-start gap-2 font-display text-sm text-ink cursor-pointer">
                        <input
                          type="radio"
                          name="dup-strategy"
                          checked={duplicateStrategy === "merge"}
                          onChange={() => setDuplicateStrategy("merge")}
                          className="mt-1"
                        />
                        <span>
                          <span className="font-bold">Merge into existing</span>
                          <span className="block text-xs text-secondary">Matched records are updated — only fields actually present in your file are changed, and an undo restores the prior values.</span>
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Problem rows */}
                  {(dryRun.errorCount > 0 || dryRun.duplicateCount > 0) && (
                    <div className="border border-rule">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-rule">
                        <p className="font-display text-xs font-bold uppercase tracking-wider text-secondary">
                          Rows needing attention ({dryRun.errorCount + dryRun.duplicateCount})
                        </p>
                        {dryRun.errorReport.length > 0 && (
                          <button
                            onClick={() =>
                              downloadCsv(
                                `aide-import-errors-${Date.now()}.csv`,
                                errorLines(dryRun.errorReport)
                              )
                            }
                            className="np-btn !py-1 !px-2 !text-[10px]"
                          >
                            <Download className="w-3 h-3" /> Error report
                          </button>
                        )}
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-rule/60">
                        {dryRun.rows
                          .filter((r) => r.status === "error" || r.status === "duplicate")
                          .map((r) => (
                            <div key={r.row} className="flex items-start gap-3 px-4 py-2 text-xs font-mono">
                              <span className="text-secondary w-10 shrink-0">row {r.row}</span>
                              {r.status === "error" ? (
                                <span className="text-red-600 dark:text-red-400">{r.errors.join("; ")}</span>
                              ) : (
                                <span className="text-secondary">
                                  duplicate of {r.duplicateOf === "existing record" ? "an existing record" : `row ${r.duplicateOf}`}
                                  {duplicateStrategy === "merge" && r.existingId ? " — will be merged" : " — will be skipped"}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <button onClick={() => setStep("map")} className="np-btn">
                      <ArrowLeft className="w-4 h-4" /> Back to mapping
                    </button>
                    <div className="flex items-center gap-3">
                      <button onClick={runValidation} disabled={validating} className="np-btn !py-2 !text-xs">
                        {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Re-run dry run"}
                      </button>
                      <button
                        onClick={commit}
                        disabled={committing || importableCount === 0}
                        className="np-btn np-btn--accent disabled:opacity-40"
                        title={importableCount === 0 ? "Nothing to import" : undefined}
                      >
                        {committing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Importing…
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4" /> Import {importableCount} row{importableCount === 1 ? "" : "s"}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 5 — done */}
          {step === "done" && result && (
            <div className="border border-rule p-8 text-center space-y-4">
              <CheckCircle2 className="w-12 h-12 text-accent mx-auto" strokeWidth={1.5} />
              <div>
                <h2 className="font-display text-xl font-black text-ink">Import complete</h2>
                <p className="font-display text-sm text-secondary mt-1">
                  {result.fileName} · {result.totalRows} rows processed
                </p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-2xl mx-auto">
                {[
                  { label: "Created", value: result.createdCount ?? 0 },
                  { label: "Merged", value: result.updatedCount ?? 0 },
                  { label: "Skipped", value: result.skippedCount ?? 0 },
                  { label: "Failed", value: result.failedCount ?? 0 },
                ].map((card) => (
                  <div key={card.label} className="border border-rule p-3">
                    <p className="font-display text-2xl font-black text-ink">{card.value}</p>
                    <p className="font-display text-[10px] uppercase tracking-wider text-secondary">{card.label}</p>
                  </div>
                ))}
              </div>
              {(result.failedCount ?? 0) > 0 && result.errorReport && result.errorReport.length > 0 && (
                <button
                  onClick={() => downloadCsv(`aide-import-errors-${Date.now()}.csv`, errorLines(result.errorReport!))}
                  className="np-btn !text-xs mx-auto"
                >
                  <Download className="w-4 h-4" /> Download error report
                </button>
              )}
              <p className="font-display text-xs text-secondary">
                Everything is recorded in Import History — you can undo this entire import with one click.
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <button
                  onClick={() => {
                    resetWizard();
                    setTab("history");
                  }}
                  className="np-btn"
                >
                  <History className="w-4 h-4" /> View import history
                </button>
                <button onClick={resetWizard} className="np-btn np-btn--accent">
                  <Upload className="w-4 h-4" /> Import another file
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── History tab ─────────────────────────────────────────── */}
      {tab === "history" && (
        <div className="space-y-4">
          {rollbackSummary && (
            <p className="border border-rule p-3 font-display text-xs text-ink">{rollbackSummary}</p>
          )}
          {historyError && (
            <p className="border border-rule p-3 font-display text-xs text-red-600 dark:text-red-400">{historyError}</p>
          )}
          {loadingHistory && (
            <div className="flex items-center gap-2 text-secondary font-display text-sm py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading import history…
            </div>
          )}
          {!loadingHistory && batches && batches.length === 0 && (
            <div className="border border-rule p-8 text-center">
              <p className="font-display text-sm text-secondary">
                No imports yet. Your first import will appear here with a full audit trail.
              </p>
              <button onClick={() => setTab("new")} className="np-btn np-btn--accent mt-4 mx-auto">
                <Upload className="w-4 h-4" /> Start your first import
              </button>
            </div>
          )}
          <div className="space-y-0">
            {batches?.map((batch) => {
              const undoable = batch.status === "COMPLETED" && batch.createdCount + batch.updatedCount > 0;
              return (
                <div key={batch.id} className="flex items-start justify-between gap-4 border-b border-rule py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-display text-sm font-black text-ink truncate">{batch.fileName}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider border border-rule px-1.5 py-0.5 text-secondary">
                        {batch.entity === "PRODUCTS" ? "Products" : "Customers"}
                      </span>
                      <span
                        className={cn(
                          "font-mono text-[10px] uppercase tracking-wider px-1.5 py-0.5 border",
                          batch.status === "COMPLETED" ? "border-accent/40 text-accent" : "border-rule text-secondary line-through"
                        )}
                      >
                        {batch.status === "COMPLETED" ? "Completed" : "Rolled back"}
                      </span>
                    </div>
                    <p className="font-display text-xs text-secondary mt-1">
                      {formatDate(batch.createdAt)} · {batch.createdBy?.name ?? batch.createdBy?.email ?? "Unknown user"} · strategy:{" "}
                      {batch.duplicateStrategy.toLowerCase()}
                    </p>
                    <p className="font-display text-xs text-secondary mt-0.5">
                      {batch.totalRows} rows → {batch.createdCount} created · {batch.updatedCount} merged ·{" "}
                      {batch.skippedCount} skipped · {batch.failedCount} failed
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    {undoable && (
                      <button onClick={() => setRollbackTarget(batch)} className="np-btn !py-1.5 !text-xs">
                        <Undo2 className="w-4 h-4" /> Undo import
                      </button>
                    )}
                    {(batch.errorReport?.length ?? 0) > 0 && (
                      <button
                        onClick={() =>
                          downloadCsv(
                            `aide-import-errors-${batch.id}.csv`,
                            errorLines(batch.errorReport ?? [])
                          )
                        }
                        className="np-btn !py-1.5 !text-xs"
                      >
                        <Download className="w-4 h-4" /> Errors ({batch.errorReport!.length})
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rollback confirmation modal */}
      {rollbackTarget && (
        <div className="fixed inset-0 bg-ink/50 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="rollback-title">
          <div className="bg-ground border border-ink w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 id="rollback-title" className="font-display text-lg font-black text-ink flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-accent" /> Undo import
              </h2>
              <button onClick={() => setRollbackTarget(null)} className="p-1 text-secondary hover:text-ink" aria-label="Close">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="font-display text-sm text-ink">
              This will undo <span className="font-bold">{rollbackTarget.fileName}</span>:
            </p>
            <ul className="font-display text-xs text-secondary list-disc pl-5 space-y-1">
              <li>Delete the {rollbackTarget.createdCount} record(s) this import created (records already used in sales or referenced elsewhere are kept and reported).</li>
              <li>Restore the prior values of the {rollbackTarget.updatedCount} record(s) it merged.</li>
              <li>Remove any empty categories the import created.</li>
            </ul>
            <p className="font-display text-[10px] text-secondary">The import batch stays in history, marked as rolled back — the audit trail is preserved.</p>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setRollbackTarget(null)} className="np-btn flex-1" disabled={rollbackBusy}>
                Keep import
              </button>
              <button onClick={rollback} className="np-btn np-btn--accent flex-1" disabled={rollbackBusy}>
                {rollbackBusy ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Rolling back…
                  </>
                ) : (
                  <>
                    <Undo2 className="w-4 h-4" /> Undo import
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer note */}
      <p className="font-display text-[10px] text-secondary border-t border-rule pt-4">
        Imported products and customers appear everywhere else in Aide immediately (inventory, POS, customers, invoices).{" "}
        <Link href="/dashboard/inventory" className="text-accent hover:underline">Go to inventory</Link> ·{" "}
        <Link href="/dashboard/customers" className="text-accent hover:underline">Go to customers</Link>
      </p>
    </div>
  );
}
