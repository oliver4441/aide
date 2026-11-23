import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import {
  provisionAccountingTenant,
  deactivateAccountingTenant,
} from "@/lib/accountingBridge.mjs";

export const dynamic = "force-dynamic";

// Server-side tenant registry; backed by persistent storage in production.
const tenantStore = new Map<string, any>();

const createTenantSchema = z.object({
  orgId: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  action: z.enum(["provision", "deactivate"]).optional().default("provision"),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = createTenantSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { user, businessId } = await requireBusiness(parsed.data.orgId ?? null, request);

    if (parsed.data.action === "deactivate") {
      const updated = deactivateAccountingTenant(tenantStore, businessId);
      if (!updated) {
        return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
      }
      return NextResponse.json({ tenant: updated });
    }

    const result = provisionAccountingTenant(tenantStore, {
      orgId: businessId,
      name: parsed.data.name ?? businessId,
      actorId: user.id,
    });

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    const authErr = toAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
