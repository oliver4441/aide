import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { commitImport, requireImportRole, MAX_BODY_BYTES } from "@/lib/importServer";

export const dynamic = "force-dynamic";

/**
 * POST /api/imports/commit — persist a previously dry-run import.
 *
 * Body: { entity: "products"|"customers", fileName?: string,
 *         headers: string[], rows: any[][],
 *         mapping: Record<string, number|null>,
 *         duplicateStrategy?: "skip"|"merge", businessId?: string }
 *
 * Everything is written inside one transaction and recorded as an auditable
 * ImportBatch (with created ids + merge snapshots) so the import can be
 * rolled back later via /api/imports/[id]/rollback.
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

    const result = await commitImport(businessId, user.id, body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json(result);
  } catch (err) {
    return toAuthError(err);
  }
}
