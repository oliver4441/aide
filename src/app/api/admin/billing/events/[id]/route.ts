import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, hasPermission } from "@/lib/platformAdmin.mjs";
import { redactPayload, sanitizeFailureMessage } from "@/lib/platformBilling.mjs";
import {
  iso,
  platformErrorResponse,
  recordPlatformAudit,
  requirePlatformAdmin,
} from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

/** Minimum gap between replays of the same event, per server instance. */
const REPLAY_COOLDOWN_MS = 30_000;
const lastReplayAt = new Map<string, number>();

/** Webhook event detail with a redacted payload and processing history. */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.VIEW_EVENTS);

    const event = await prisma.platformWebhookEvent.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        providerEventId: true,
        type: true,
        status: true,
        attempts: true,
        receivedAt: true,
        processedAt: true,
        lastError: true,
        correlationId: true,
        payloadSummary: true,
        organization: { select: { id: true, name: true } },
        subscription: {
          select: { id: true, status: true, plan: { select: { name: true } } },
        },
        invoice: { select: { id: true, number: true, status: true } },
      },
    });

    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }

    const history = await prisma.platformAuditEvent.findMany({
      where: { entityType: "PlatformWebhookEvent", entityId: event.id },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        action: true,
        actorEmail: true,
        actorRole: true,
        reason: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      canReplay: hasPermission(admin.role, PERMISSIONS.REPLAY_EVENTS),
      event: {
        ...event,
        receivedAt: iso(event.receivedAt),
        processedAt: iso(event.processedAt),
        lastError: sanitizeFailureMessage(event.lastError),
        // Stored payloads are already redacted; redact again defensively so a
        // future writer cannot leak a secret through this read path.
        payloadSummary: redactPayload(event.payloadSummary),
      },
      history: history.map((row) => ({ ...row, createdAt: iso(row.createdAt) })),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}

/**
 * Safe replay (AIDE-ADMIN-06).
 *
 * Only super admins may replay, only failed/dead-lettered events can be
 * replayed, a reason is mandatory, and the state transition is guarded by a
 * conditional update so two operators cannot process the same event twice.
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.REPLAY_EVENTS);
    const body = await request.json().catch(() => ({}));
    const reason = String(body.reason ?? "").trim();
    if (reason.length < 10) {
      return NextResponse.json(
        { error: "Give a reason of at least 10 characters. It is kept in the audit trail." },
        { status: 400 }
      );
    }

    const event = await prisma.platformWebhookEvent.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, attempts: true, providerEventId: true },
    });
    if (!event) {
      return NextResponse.json({ error: "Event not found." }, { status: 404 });
    }
    if (event.status !== "FAILED" && event.status !== "DEAD_LETTER") {
      return NextResponse.json(
        {
          error: `Only failed or dead-lettered events can be replayed. This event is ${event.status.toLowerCase().replace("_", " ")}.`,
        },
        { status: 409 }
      );
    }

    const last = lastReplayAt.get(event.id);
    if (last && Date.now() - last < REPLAY_COOLDOWN_MS) {
      return NextResponse.json(
        { error: "This event was replayed moments ago. Wait before retrying again." },
        { status: 429 }
      );
    }

    const updated = await prisma.platformWebhookEvent.updateMany({
      where: { id: event.id, status: { in: ["FAILED", "DEAD_LETTER"] } },
      data: {
        status: "PENDING",
        attempts: { increment: 1 },
        lastError: null,
        processedAt: null,
        correlationId: `replay_${Date.now().toString(36)}`,
      },
    });

    if (updated.count !== 1) {
      return NextResponse.json(
        { error: "This event is already being processed by another operator." },
        { status: 409 }
      );
    }

    lastReplayAt.set(event.id, Date.now());

    await recordPlatformAudit({
      admin,
      action: "admin.webhook.replay",
      entityType: "PlatformWebhookEvent",
      entityId: event.id,
      reason,
      before: { status: event.status, attempts: event.attempts },
      after: { status: "PENDING", attempts: event.attempts + 1 },
      metadata: { providerEventId: event.providerEventId },
    });

    return NextResponse.json({
      ok: true,
      status: "PENDING",
      message: "Event queued for reprocessing. The provider processor owns the retry.",
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
