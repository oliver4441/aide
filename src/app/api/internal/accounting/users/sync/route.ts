import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { mapAideRoleToAccountingRole } from "@/lib/accountingBridge.mjs";

export const dynamic = "force-dynamic";

const syncUserSchema = z.object({
  orgId: z.string().min(1).optional(),
  userId: z.string().min(1),
  aideRole: z.string().min(1),
  status: z.enum(["active", "suspended", "deactivated"]).default("active"),
});

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json().catch(() => ({}));
    const parsed = syncUserSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { businessId } = await requireBusiness(parsed.data.orgId ?? null, request);
    const accountingRole = mapAideRoleToAccountingRole(
      parsed.data.aideRole,
      parsed.data.status
    );

    return NextResponse.json({
      orgId: businessId,
      userId: parsed.data.userId,
      accountingRole,
      revoked: accountingRole === "none",
    });
  } catch (error) {
    const authErr = toAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
