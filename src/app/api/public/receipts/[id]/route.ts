import { NextRequest, NextResponse } from "next/server";

import { verifySaleToken } from "@/lib/shareToken";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Public, capability-scoped receipt for a customer who scanned the QR printed
 * on a receipt.
 *
 * This is the unauthenticated counterpart to `/api/receipts/[id]`, which stays
 * tenant-scoped and is what the dashboard uses. The difference is deliberate:
 * that route answers "is this caller allowed to read this sale", this one
 * answers "did this caller present the token printed on the receipt".
 *
 * Because a sale id on its own is enumerable (see `src/lib/shareToken.ts`), the
 * token is required and verified before any database read. A wrong or missing
 * token returns the same 404 as a sale that does not exist, so the endpoint
 * cannot be used to probe which ids are real.
 *
 * The projection is narrower than the authenticated route: no `cost`, no
 * `profit`, no `notes`, no `businessId`. Purchase cost and margin are the
 * merchant's business, not the customer's.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const token = request.nextUrl.searchParams.get("t");

  if (!verifySaleToken(params.id, token)) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  try {
    const sale = await prisma.sale.findUnique({
      where: { id: params.id },
      include: {
        items: {
          select: { id: true, name: true, quantity: true, price: true },
        },
        business: {
          select: {
            name: true,
            type: true,
            currency: true,
            taxRate: true,
            receiptFooter: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }

    return NextResponse.json({
      sale: {
        id: sale.id,
        total: sale.total,
        paid: sale.paid,
        change: sale.change,
        tax: sale.tax,
        taxRate: sale.taxRate,
        paymentMethod: sale.paymentMethod,
        cashier: sale.cashier,
        createdAt: sale.createdAt,
        items: sale.items,
        business: sale.business,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
