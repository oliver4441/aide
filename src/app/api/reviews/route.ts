import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, resolveUser, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

/**
 * Anonymous reviewers still need a businessId (the column is required), so we
 * keep one dedicated platform row for them instead of attributing the review
 * to whichever real tenant happens to be oldest in the database.
 */
const PLATFORM_SLUG = "aide-platform-reviews";
const PLATFORM_ORG_SLUG = "aide-platform";

// Anonymous reviewers still need a businessId (the column is required). Keep one
// dedicated platform Organisation + Business row for them instead of attributing
// the review to whichever real tenant happens to be oldest in the database.
async function getPlatformOrgId(): Promise<string> {
  const existing = await prisma.organization.findUnique({
    where: { slug: PLATFORM_ORG_SLUG },
    select: { id: true },
  });
  if (existing) return existing.id;

  const created = await prisma.organization.create({
    data: {
      name: "Aide (platform)",
      legalName: "Aide (platform)",
      slug: PLATFORM_ORG_SLUG,
      baseCurrency: "KES",
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return created.id;
}

async function getPlatformBusinessId(): Promise<string> {
  const existing = await prisma.business.findUnique({
    where: { slug: PLATFORM_SLUG },
    select: { id: true, organizationId: true },
  });
  if (existing) {
    // Self-heal legacy rows created before AIDE-02 (nullable organizationId).
    if (!existing.organizationId) {
      await prisma.business.update({
        where: { id: existing.id },
        data: { organizationId: await getPlatformOrgId() },
      });
    }
    return existing.id;
  }

  const created = await prisma.business.create({
    data: {
      name: "Aide (platform reviews)",
      type: "OTHER",
      slug: PLATFORM_SLUG,
      organizationId: await getPlatformOrgId(),
    },
  });
  return created.id;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const rating = parseInt(body.rating, 10);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: "rating must be 1-5" }, { status: 400 });
    }

    // resolveUser returns null for anonymous callers — that's fine for reviews
    const user = await resolveUser(request);

    // Anonymous reviews still need a businessId, so fall back to a platform
    // placeholder rather than attaching them to an arbitrary real tenant.
    const memberBusinessId = user?.id
      ? (await prisma.businessMembership.findFirst({
          where: { userId: user.id },
          select: { businessId: true },
        }))?.businessId
      : undefined;

    const businessId = memberBusinessId ?? (await getPlatformBusinessId());

    const review = await prisma.review.create({
      data: {
        rating,
        categories: body.categories ?? [],
        comment: body.comment || null,
        contactEmail: body.contactEmail || null,
        businessId,
        userId: user?.id ?? null,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (err) {
    return toAuthError(err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const rating = searchParams.get("rating");

    const where: any = {};
    if (rating) where.rating = parseInt(rating, 10);

    const [reviews, total, avg] = await Promise.all([
      prisma.review.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.review.count({ where }),
      prisma.review.aggregate({ where, _avg: { rating: true } }),
    ]);

    return NextResponse.json({
      reviews,
      total,
      averageRating: avg._avg.rating ?? 0,
    });
  } catch (err) {
    return toAuthError(err);
  }
}
