import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireBusiness, toAuthError } from "@/lib/apiAuth";

export const dynamic = "force-dynamic";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: "id required" }, { status: 400 });
    }
    const { user, businessId } = await requireBusiness(null, request);

    const result = await prisma.notification.updateMany({
      where: { id, userId: user.id, businessId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ deleted: result.count });
  } catch (err) {
    return toAuthError(err);
  }
}
