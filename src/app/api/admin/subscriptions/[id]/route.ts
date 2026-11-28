import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/platformAdmin.mjs";
import { iso, platformErrorResponse, recordPlatformAudit, requirePlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

/**
 * Subscription detail (AIDE-ADMIN-04).
 *
 * `providerState` is what the payment provider reports; `localOverrideNote` is
 * an approved administrative exception and never replaces provider state.
 */
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.VIEW_SUBSCRIPTIONS);

    const subscription = await prisma.platformSubscription.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
        provider: true,
        providerSubscriptionId: true,
        amount: true,
        currency: true,
        interval: true,
        trialStart: true,
        trialEnd: true,
        currentPeriodStart: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
        canceledAt: true,
        endedAt: true,
        localOverrideNote: true,
        createdAt: true,
        updatedAt: true,
        organization: {
          select: {
            id: true,
            name: true,
            status: true,
            billingEmail: true,
            baseCurrency: true,
            _count: { select: { businesses: true } },
          },
        },
        plan: { select: { id: true, key: true, name: true, description: true } },
        planVersion: {
          select: {
            id: true,
            version: true,
            status: true,
            displayName: true,
            price: true,
            currency: true,
            interval: true,
            trialDays: true,
            entitlements: true,
            limits: true,
            effectiveFrom: true,
          },
        },
        invoices: {
          orderBy: { issuedAt: "desc" },
          take: 20,
          select: {
            id: true,
            number: true,
            status: true,
            amount: true,
            amountPaid: true,
            currency: true,
            issuedAt: true,
            dueAt: true,
            paidAt: true,
            hostedUrl: true,
            payments: {
              orderBy: { attemptedAt: "desc" },
              take: 5,
              select: {
                id: true,
                status: true,
                amount: true,
                currency: true,
                failureCode: true,
                failureMessage: true,
                attemptedAt: true,
              },
            },
          },
        },
        events: {
          orderBy: { receivedAt: "desc" },
          take: 20,
          select: {
            id: true,
            providerEventId: true,
            type: true,
            status: true,
            attempts: true,
            receivedAt: true,
            processedAt: true,
            lastError: true,
          },
        },
        notes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: { id: true, body: true, authorEmail: true, createdAt: true },
        },
      },
    });

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
    }

    const auditRows = await prisma.platformAuditEvent.findMany({
      where: { entityType: "PlatformSubscription", entityId: subscription.id },
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

    await recordPlatformAudit({
      admin,
      action: "admin.subscription.view",
      entityType: "PlatformSubscription",
      entityId: subscription.id,
      metadata: { organizationId: subscription.organization.id },
    });

    return NextResponse.json({
      subscription: {
        ...subscription,
        amount: Number(subscription.amount),
        trialStart: iso(subscription.trialStart),
        trialEnd: iso(subscription.trialEnd),
        currentPeriodStart: iso(subscription.currentPeriodStart),
        currentPeriodEnd: iso(subscription.currentPeriodEnd),
        canceledAt: iso(subscription.canceledAt),
        endedAt: iso(subscription.endedAt),
        createdAt: iso(subscription.createdAt),
        updatedAt: iso(subscription.updatedAt),
        planVersion: {
          ...subscription.planVersion,
          price: Number(subscription.planVersion.price),
          effectiveFrom: iso(subscription.planVersion.effectiveFrom),
        },
        invoices: subscription.invoices.map((invoice) => ({
          ...invoice,
          amount: Number(invoice.amount),
          amountPaid: Number(invoice.amountPaid),
          issuedAt: iso(invoice.issuedAt),
          dueAt: iso(invoice.dueAt),
          paidAt: iso(invoice.paidAt),
          payments: invoice.payments.map((payment) => ({
            ...payment,
            amount: Number(payment.amount),
            attemptedAt: iso(payment.attemptedAt),
          })),
        })),
        events: subscription.events.map((event) => ({
          ...event,
          receivedAt: iso(event.receivedAt),
          processedAt: iso(event.processedAt),
        })),
        notes: subscription.notes.map((note) => ({ ...note, createdAt: iso(note.createdAt) })),
      },
      providerState: {
        source: "provider",
        note: "Status, periods and amount mirror the payment provider's subscription record. A local exception, if any, is shown separately and does not change provider state.",
        provider: subscription.provider,
        providerSubscriptionId: subscription.providerSubscriptionId,
        status: subscription.status,
      },
      audit: auditRows.map((row) => ({ ...row, createdAt: iso(row.createdAt) })),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
