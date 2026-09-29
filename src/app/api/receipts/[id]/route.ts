import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { businessId } = await requireBusiness(null, request);

    // Scoped by businessId so a guessed sale id cannot read another
    // tenant's receipt.
    const sale = await prisma.sale.findFirst({
      where: { id: params.id, businessId },
      include: {
        items: true,
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

    return NextResponse.json({ sale });
  } catch (err) {
    return toAuthError(err);
  }
}
