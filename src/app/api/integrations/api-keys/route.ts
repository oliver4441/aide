import { NextRequest, NextResponse } from "next/server";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { BusinessRole } from "@prisma/client";
import { createApiKey, listApiKeys, revokeApiKey, rotateApiKey } from "@/lib/apiKeys";

export const dynamic = "force-dynamic";

/**
 * ENT-09: manage machine API keys for the caller's business.
 * GET    — list keys (never returns hashes or plaintext)
 * POST   — create a key (returns plaintext once)
 * PATCH  — rotate a key (returns new plaintext once)
 * DELETE — revoke a key
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
    return NextResponse.json({ keys: await listApiKeys(businessId) });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    await assertManager(user.id, businessId);
    const body = await request.json();
    const { key, record } = await createApiKey({
      name: body?.name,
      scopes: body?.scopes,
      businessId,
      organizationId: body?.organizationId ?? null,
      createdById: user.id,
      expiresAt: body?.expiresAt ? new Date(body.expiresAt) : null,
    });
    return NextResponse.json({ key, record }, { status: 201 });
  } catch (err: any) {
    if (err?.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (err?.message && /scope|name/i.test(err.message)) {
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
    if (!id) return NextResponse.json({ error: "Key id is required" }, { status: 400 });
    const result = await rotateApiKey(id, businessId, user.id);
    if (!result) return NextResponse.json({ error: "Key not found or already revoked" }, { status: 404 });
    return NextResponse.json(result);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { user, businessId } = await requireBusiness(null, request);
    await assertManager(user.id, businessId);
    const id = request.nextUrl.searchParams.get("id") ?? "";
    if (!id) return NextResponse.json({ error: "Key id is required" }, { status: 400 });
    const result = await revokeApiKey(id, businessId, user.id);
    if (!result) return NextResponse.json({ error: "Key not found" }, { status: 404 });
    return NextResponse.json({ revoked: true, id: result.id });
  } catch (err) {
    return toAuthError(err);
  }
}
