import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { BusinessRole } from "@prisma/client";
import { createSubscription, listSubscriptions, rotateSecret } from "@/lib/webhooks";

export const dynamic = "force-dynamic";

/**
 * ENT-09: manage signed webhook subscriptions for the caller's business.
 * GET   — list subscriptions (never returns the signing secret)
 * POST  — subscribe (returns the secret once)
 * PATCH — rotate the signing secret (returns it once)
 */
const ADMIN_ROLES: BusinessRole[] = [BusinessRole.OWNER, BusinessRole.MANAGER];

async function assertManager(userId: string, businessId: string) {
  const membership = await prisma.businessMembership.findUnique({
    where: { userId_businessId: { userId, businessId } },
    select: { role: true },
  });
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    const err: any = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    await assertManager(user.id, businessId);
    return NextResponse.json({ subscriptions: await listSubscriptions(businessId) });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    await assertManager(user.id, businessId);
    const body = await request.json();
    const { secret, record } = await createSubscription({
      url: body?.url,
      events: body?.events,
      businessId,
      createdById: user.id,
    });
    return NextResponse.json({ secret, record }, { status: 201 });
  } catch (err: any) {
    if (err?.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (err?.message && /url|event/i.test(err.message)) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return toAuthError(err);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    await assertManager(user.id, businessId);
    const body = await request.json();
    const id = String(body?.id ?? "");
    if (!id) return NextResponse.json({ error: "Subscription id is required" }, { status: 400 });
    const result = await rotateSecret(id, businessId);
    if (!result) return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    return toAuthError(err);
  }
}
