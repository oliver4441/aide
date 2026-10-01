import { NextRequest, NextResponse } from "next/server";

import { requireBusiness, toAuthError } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { buildShareUrl } from "@/lib/shareToken";

export const dynamic = "force-dynamic";

/**
 * Mints the signed, shareable link for a sale — the one the POS puts in the QR
 * code on a printed receipt and in the "Send to Customer" message.
 *
 * Authentication is required and the sale is scoped to the caller's business,
 * so a shop can only mint links for its own sales. The signature is computed
 * server-side because the HMAC key must never reach the browser.
 *
 * GET rather than POST: this reads nothing and changes nothing, it is just a
 * pure function of (sale, caller), and the client caches the result.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { businessId } = await requireBusiness(null, request);

    const sale = await prisma.sale.findFirst({
      where: { id: params.id, businessId },
      select: { id: true },
    });

    // Same 404 as a sale that does not exist, so ids cannot be probed across
    // tenants.
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    return NextResponse.json({
      url: buildShareUrl(SITE_URL, sale.id),
    });
  } catch (err) {
    return toAuthError(err);
  }
}
