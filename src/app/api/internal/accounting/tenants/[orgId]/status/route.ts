import { NextRequest, NextResponse } from "next/server";
import { requireUser, accessibleBusinessIds, toAuthError } from "@/lib/apiAuth";
import { resolveTrustedAccountingTenant, TENANT_LIFECYCLE } from "@/lib/accountingBridge.mjs";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: { orgId: string } }
) {
  try {
    const user = await requireUser(request);
    const allowedIds = await accessibleBusinessIds(user);
    const resolvedOrgId = resolveTrustedAccountingTenant(allowedIds, context.params.orgId);

    if (!resolvedOrgId || resolvedOrgId !== context.params.orgId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      orgId: resolvedOrgId,
      status: TENANT_LIFECYCLE.ACTIVE,
      isolated: true,
    });
  } catch (error) {
    const authErr = toAuthError(error);
    if (authErr) return authErr;
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
