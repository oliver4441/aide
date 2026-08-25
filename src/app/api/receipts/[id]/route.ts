import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const sale = await prisma.sale.findUnique({
    where: { id: params.id },
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
}
