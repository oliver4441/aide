import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { analyzeImport, requireImportRole, MAX_BODY_BYTES } from "@/lib/importServer";

export const dynamic = "force-dynamic";

/**
 * POST /api/imports/validate — dry run.
 *
 * Body: { entity: "products"|"customers", headers: string[], rows: any[][],
 *         mapping: Record<string, number|null>, businessId?: string }
 *
 * Never writes. Returns per-row status (ok | duplicate | error | empty),
 * totals and the full error report.
 */
export async function POST(request: NextRequest) {
  try {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Import payload is too large" }, { status: 413 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const businessIdHint = typeof body.businessId === "string" ? body.businessId : null;
    const { user, businessId, businessIds } = await requireBusiness(businessIdHint, request);
    if (businessIdHint && !businessIds.includes(businessIdHint)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await requireImportRole(user, businessId, String(body.entity ?? ""), "write");

    const analysis = await analyzeImport(businessId, body);
    if (!analysis.ok) {
      return NextResponse.json({ error: analysis.error }, { status: 400 });
    }

    // Strip the internal dedupeKey; keep everything the wizard needs.
    const rows = (analysis as any).rows.map(({ dedupeKey, ...row }: any) => row);
    return NextResponse.json({ ...analysis, rows });
  } catch (err) {
    return toAuthError(err);
  }
}
