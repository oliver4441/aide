import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS } from "@/lib/platformAdmin.mjs";
import { iso, platformErrorResponse, recordPlatformAudit, requirePlatformAdmin } from "@/lib/platformAuth";

export const dynamic = "force-dynamic";

/**
 * Organization detail (AIDE-ADMIN-04).
 *
 * Scoped to a single organization id: branches, members, subscription,
 * entitlements, invoices, webhook events, notes and audit trail. Nothing here
 * crosses into another organization's records.
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { admin } = await requirePlatformAdmin(PERMISSIONS.VIEW_ORGANIZATIONS);
    const id = params.id;

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        legalName: true,
        slug: true,
        taxId: true,
        baseCurrency: true,
        status: true,
        billingEmail: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { businesses: true, warehouses: true, terminals: true } },
        businesses: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            type: true,
            currency: true,
            createdAt: true,
            _count: { select: { products: true, sales: true } },
          },
        },
        platformSubscription: {
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
            plan: { select: { id: true, key: true, name: true } },
            planVersion: {
              select: {
                id: true,
                version: true,
                displayName: true,
                price: true,
                currency: true,
                interval: true,
                trialDays: true,
                entitlements: true,
                limits: true,
                effectiveFrom: true,
                status: true,
              },
            },
          },
        },
        platformInvoices: {
          orderBy: { issuedAt: "desc" },
          take: 20,
          select: {
            id: true,
            number: true,
            providerInvoiceId: true,
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
                attemptedAt: true,
              },
            },
          },
        },
        platformEvents: {
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
          },
        },
        platformNotes: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            body: true,
            authorEmail: true,
            createdAt: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found." }, { status: 404 });
    }

    const [memberCount, auditRows] = await Promise.all([
      prisma.businessMembership.count({
        where: { business: { organizationId: id } },
      }),
      prisma.platformAuditEvent.findMany({
        where: { entityType: "Organization", entityId: id },
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
      }),
    ]);

    const limits = (organization.platformSubscription?.planVersion.limits ?? {}) as Record<
      string,
      number | null
    >;
    const usage = [
      { key: "branches", label: "Branches", used: organization._count.businesses },
      { key: "members", label: "Members", used: memberCount },
      { key: "warehouses", label: "Warehouses", used: organization._count.warehouses },
      { key: "terminals", label: "Terminals", used: organization._count.terminals },
    ].map((row) => {
      const limit = typeof limits[row.key] === "number" ? limits[row.key] : null;
      return {
        ...row,
        limit,
        unlimited: limit === null,
        overLimit: limit !== null && row.used > limit,
      };
    });

    await recordPlatformAudit({
      admin,
      action: "admin.organization.view",
      entityType: "Organization",
      entityId: id,
    });

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        legalName: organization.legalName,
        slug: organization.slug,
        taxId: organization.taxId,
        baseCurrency: organization.baseCurrency,
        status: organization.status,
        billingEmail: organization.billingEmail,
        createdAt: iso(organization.createdAt),
        updatedAt: iso(organization.updatedAt),
      },
      counts: {
        branches: organization._count.businesses,
        warehouses: organization._count.warehouses,
        terminals: organization._count.terminals,
        members: memberCount,
      },
      businesses: organization.businesses.map((branch) => ({
        id: branch.id,
        name: branch.name,
        type: branch.type,
        currency: branch.currency,
        createdAt: iso(branch.createdAt),
        products: branch._count.products,
        sales: branch._count.sales,
      })),
      subscription: organization.platformSubscription
        ? {
            id: organization.platformSubscription.id,
            status: organization.platformSubscription.status,
            provider: organization.platformSubscription.provider,
            providerSubscriptionId: organization.platformSubscription.providerSubscriptionId,
            amount: Number(organization.platformSubscription.amount),
            currency: organization.platformSubscription.currency,
            interval: organization.platformSubscription.interval,
            trialStart: iso(organization.platformSubscription.trialStart),
            trialEnd: iso(organization.platformSubscription.trialEnd),
            currentPeriodStart: iso(organization.platformSubscription.currentPeriodStart),
            currentPeriodEnd: iso(organization.platformSubscription.currentPeriodEnd),
            cancelAtPeriodEnd: organization.platformSubscription.cancelAtPeriodEnd,
            canceledAt: iso(organization.platformSubscription.canceledAt),
            endedAt: iso(organization.platformSubscription.endedAt),
            localOverrideNote: organization.platformSubscription.localOverrideNote,
            createdAt: iso(organization.platformSubscription.createdAt),
            plan: organization.platformSubscription.plan,
            planVersion: {
              ...organization.platformSubscription.planVersion,
              price: Number(organization.platformSubscription.planVersion.price),
              effectiveFrom: iso(organization.platformSubscription.planVersion.effectiveFrom),
            },
          }
        : null,
      usage,
      invoices: organization.platformInvoices.map((invoice) => ({
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
      events: organization.platformEvents.map((event) => ({
        ...event,
        receivedAt: iso(event.receivedAt),
        processedAt: iso(event.processedAt),
      })),
      notes: organization.platformNotes.map((note) => ({
        ...note,
        createdAt: iso(note.createdAt),
      })),
      audit: auditRows.map((row) => ({ ...row, createdAt: iso(row.createdAt) })),
    });
  } catch (err) {
    return platformErrorResponse(err);
  }
}
