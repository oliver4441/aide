import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/platformAdmin.mjs";
import { iso, platformErrorResponse, recordPlatformAudit, requirePlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

/**
 * Record a support note against exactly one organization, subscription or
 * invoice (AIDE-ADMIN-04/06). Available to every platform role, including
 * read-only support, and always audited.
 */
export async function POST(request: NextRequest) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.RECORD_NOTES);
    const body = await request.json().catch(() => ({}));

    const organizationId = typeof body.organizationId === "string" ? body.organizationId : null;
    const subscriptionId = typeof body.subscriptionId === "string" ? body.subscriptionId : null;
    const invoiceId = typeof body.invoiceId === "string" ? body.invoiceId : null;
    const targets = [organizationId, subscriptionId, invoiceId].filter(Boolean);
    if (targets.length !== 1) {
      return NextResponse.json(
        { error: "Attach the note to exactly one organization, subscription or invoice." },
        { status: 400 }
      );
    }

    const text = String(body.body ?? "").trim();
    if (text.length < 3 || text.length > 2000) {
      return NextResponse.json(
        { error: "A note must be between 3 and 2000 characters." },
        { status: 400 }
      );
    }

    let exists = false;
    if (organizationId) {
      exists = Boolean(
        await prisma.organization.findUnique({ where: { id: organizationId }, select: { id: true } })
      );
    } else if (subscriptionId) {
      exists = Boolean(
        await prisma.platformSubscription.findUnique({
          where: { id: subscriptionId },
          select: { id: true },
        })
      );
    } else if (invoiceId) {
      exists = Boolean(
        await prisma.platformInvoice.findUnique({ where: { id: invoiceId }, select: { id: true } })
      );
    }

    if (!exists) {
      return NextResponse.json({ error: "That record could not be found." }, { status: 404 });
    }

    const note = await prisma.platformSupportNote.create({
      data: {
        organizationId,
        subscriptionId,
        invoiceId,
        body: text,
        authorId: admin.id,
        authorEmail: admin.email,
      },
      select: { id: true, body: true, authorEmail: true, createdAt: true },
    });

    await recordPlatformAudit({
      admin,
      action: "admin.note.create",
      entityType: organizationId
        ? "Organization"
        : subscriptionId
          ? "PlatformSubscription"
          : "PlatformInvoice",
      entityId: organizationId ?? subscriptionId ?? invoiceId,
      metadata: { noteId: note.id },
    });

    return NextResponse.json(
      { note: { ...note, createdAt: iso(note.createdAt) } },
      { status: 201 }
    );
  } catch (err) {
    return platformErrorResponse(err);
  }
}
