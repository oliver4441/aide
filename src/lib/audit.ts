import { prisma } from "./prisma";
import { sanitizeAuditMetadata } from "./auditCore.mjs";

export type AuditInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  summary?: string | null;
  metadata?: unknown;
  actorId?: string | null;
  businessId?: string | null;
  organizationId?: string | null;
};

/**
 * AIDE-19 / AIDE-03: append one audit event.
 *
 * Audit writes must never break the operation they describe, so failures are
 * logged and swallowed. Callers should invoke this after the primary write has
 * succeeded. There is deliberately no update/delete counterpart: the trail is
 * append-only at the application level.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditEvent.create({
      data: {
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        summary: input.summary ?? null,
        metadata: (sanitizeAuditMetadata(input.metadata) ?? undefined) as never,
        actorId: input.actorId ?? null,
        businessId: input.businessId ?? null,
        organizationId: input.organizationId ?? null,
      },
    });
  } catch (err) {
    console.error("audit write failed", err);
  }
}
