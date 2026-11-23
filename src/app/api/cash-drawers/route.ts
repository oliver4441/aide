import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { toAuthError, resolveOrganization } from "@/lib/apiAuth";
import { hasPermission, Permission } from "@/lib/rbac";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrganization(null, request);

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      include: { business: { select: { organizationId: true } } },
    });

    if (!membership || membership.business.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");
    const terminalId = searchParams.get("terminalId");

    const where: any = { organizationId };
    if (branchId) where.branchId = branchId;
    if (terminalId) where.terminalId = terminalId;

    const drawers = await prisma.cashDrawer.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true } },
        terminal: { select: { id: true, name: true } },
      },
      orderBy: [{ branchId: "asc" }, { code: "asc" }],
    });

    return NextResponse.json(drawers);
  } catch (err) {
    return toAuthError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, organizationId } = await resolveOrganization(null, request);

    const membership = await prisma.businessMembership.findFirst({
      where: { userId: user.id },
      include: { business: { select: { organizationId: true } } },
    });

    if (!membership || membership.business.organizationId !== organizationId || !hasPermission(membership.role, Permission.SETTINGS_UPDATE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const branchId = typeof body?.branchId === "string" ? body.branchId : null;
    const terminalId = typeof body?.terminalId === "string" ? body.terminalId : null;

    if (!code || !name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    // Validate branch belongs to same organization
    if (branchId) {
      const branch = await prisma.business.findUnique({
        where: { id: branchId },
        select: { organizationId: true },
      });
      if (!branch || branch.organizationId !== organizationId) {
        return NextResponse.json({ error: "Invalid branch" }, { status: 400 });
      }
    }

    // Validate terminal belongs to same organization (and optionally branch)
    if (terminalId) {
      const terminal = await prisma.terminal.findUnique({
        where: { id: terminalId },
        select: { organizationId: true, branchId: true },
      });
      if (!terminal || terminal.organizationId !== organizationId) {
        return NextResponse.json({ error: "Invalid terminal" }, { status: 400 });
      }
      if (branchId && terminal.branchId !== branchId) {
        return NextResponse.json({ error: "Terminal does not belong to selected branch" }, { status: 400 });
      }
    }

    const drawer = await prisma.cashDrawer.create({
      data: {
        code,
        name,
        branchId,
        terminalId,
        organizationId,
      },
    });

    return NextResponse.json(drawer, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Unique constraint")) {
      return NextResponse.json({ error: "Cash drawer code already exists in this organization" }, { status: 409 });
    }
    return toAuthError(err);
  }
}