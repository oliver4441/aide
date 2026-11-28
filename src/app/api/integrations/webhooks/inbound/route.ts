import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyInbound } from "@/lib/webhooks";
import { SIGNATURE_HEADER, NONCE_HEADER, TIMESTAMP_HEADER } from "@/lib/webhookCore.mjs";

export const dynamic = "force-dynamic";

/**
 * ENT-09: inbound signed webhook receiver.
 *
 * Looks up the subscription by the `x-aide-subscription` header, reads its
 * signing secret, verifies the HMAC over the exact raw body, enforces the
 * timestamp tolerance and rejects replayed nonces. The consumer can replace
 * the stub dispatch below with its own event handling.
 */
export async function POST(request: NextRequest) {
  const subscriptionId = request.headers.get("x-aide-subscription") ?? "";
  if (!subscriptionId) {
    return NextResponse.json({ error: "Missing subscription id" }, { status: 400 });
  }

  const subscription = await prisma.webhookSubscription.findUnique({
    where: { id: subscriptionId },
    select: { id: true, secret: true, active: true, businessId: true },
  });
  if (!subscription || !subscription.active) {
    return NextResponse.json({ error: "Unknown subscription" }, { status: 404 });
  }

  const rawBody = await request.text();
  const verification = await verifyInbound({
    secret: subscription.secret,
    rawBody,
    signatureHeader: request.headers.get(SIGNATURE_HEADER),
    nonce: request.headers.get(NONCE_HEADER),
  });
  if (!verification.ok) {
    return NextResponse.json({ error: verification.error }, { status: 401 });
  }

  // Verified — the event can now be processed idempotently by the consumer.
  return NextResponse.json({ received: true, businessId: subscription.businessId });
}
