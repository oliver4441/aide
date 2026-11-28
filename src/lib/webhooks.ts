/**
 * ENT-09: signed webhook delivery + inbound verification.
 *
 * Outbound: one WebhookDelivery row per (subscription, event). Dispatch signs
 * `${t}.${rawBody}` with the subscription secret and records failures with a
 * backoff for the next attempt. Inbound verification rejects stale timestamps
 * and nonces that have already been seen (single-use replay protection).
 */
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import {
  signPayload,
  signatureHeader,
  verifySignature,
  generateNonce,
  normalizeEvents,
} from "./webhookCore.mjs";

const MAX_ATTEMPTS = 5;
const BACKOFF_SECONDS = [0, 60, 300, 900, 3600];

export interface SubscribeInput {
  url: string;
  events: unknown;
  businessId: string;
  createdById?: string | null;
}

function normalizeUrl(raw: string): string | null {
  try {
    const u = new URL(String(raw ?? ""));
    if (u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export async function createSubscription(input: SubscribeInput) {
  const url = normalizeUrl(input.url);
  const events = normalizeEvents(input.events);
  if (!url) throw new Error("Webhook URL must be a valid https URL");
  if (!events || events.length === 0) throw new Error("At least one valid event is required");

  const secret = `whsec_${randomBytes(32).toString("hex")}`;
  const record = await prisma.webhookSubscription.create({
    data: { url, events, secret, businessId: input.businessId },
    select: { id: true, url: true, events: true, active: true, createdAt: true },
  });
  await recordAudit({
    action: "webhook.subscribe",
    entityType: "WebhookSubscription",
    entityId: record.id,
    summary: `Subscribed ${url} to ${events.join(", ")}`,
    metadata: { url, events },
    actorId: input.createdById ?? null,
    businessId: input.businessId,
  });
  // Secret is returned once so it can be stored by the subscriber.
  return { secret, record };
}

export async function listSubscriptions(businessId: string) {
  return prisma.webhookSubscription.findMany({
    where: { businessId },
    select: {
      id: true, url: true, events: true, active: true, createdAt: true, updatedAt: true,
      _count: { select: { deliveries: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function rotateSecret(id: string, businessId: string) {
  const record = await prisma.webhookSubscription.findFirst({ where: { id, businessId } });
  if (!record) return null;
  const secret = `whsec_${randomBytes(32).toString("hex")}`;
  await prisma.webhookSubscription.update({ where: { id }, data: { secret } });
  await recordAudit({
    action: "webhook.secret_rotate",
    entityType: "WebhookSubscription",
    entityId: id,
    summary: "Rotated webhook signing secret",
    actorId: null,
    businessId,
  });
  return { secret };
}

/** Publish an event to all active subscriptions for a business. */
export async function publishEvent(businessId: string, event: string, payload: unknown) {
  const subscriptions = await prisma.webhookSubscription.findMany({
    where: { businessId, active: true },
  });
  const rawBody = JSON.stringify({
    id: randomBytes(16).toString("hex"),
    type: event,
    createdAt: new Date().toISOString(),
    data: payload,
  });
  const payloadHash = createHash("sha256").update(rawBody).digest("hex");
  const deliveries = [];
  for (const sub of subscriptions) {
    const events = Array.isArray(sub.events)
      ? (sub.events as unknown[]).filter((e): e is string => typeof e === "string")
      : [];
    if (!events.includes(event)) continue;
    const delivery = await prisma.webhookDelivery.create({
      data: { subscriptionId: sub.id, event, payloadHash, status: "PENDING" },
    });
    // Fire-and-forget; the worker/retry loop picks up PENDING rows.
    void deliver(delivery.id);
    deliveries.push(delivery.id);
  }
  return deliveries;
}

/** Attempt one delivery. Exported so a cron/worker can drive retries. */
export async function deliver(deliveryId: string): Promise<void> {
  const delivery = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { subscription: true },
  });
  if (!delivery || delivery.status === "DELIVERED") return;
  if (delivery.attempts >= MAX_ATTEMPTS) {
    await prisma.webhookDelivery.update({ where: { id: deliveryId }, data: { status: "DEAD_LETTER" } });
    return;
  }

  const timestamp = String(Math.floor(Date.now() / 1000));
  const rawBody = JSON.stringify({ deliveryId, event: delivery.event });
  const sig = signatureHeader(delivery.subscription.secret, timestamp, rawBody);
  const nonce = generateNonce();

  try {
    const res = await fetch(delivery.subscription.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        [SIGNATURE_HEADER]: sig,
        [NONCE_HEADER]: nonce,
      },
      body: rawBody,
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { status: "DELIVERED", attempts: { increment: 1 }, deliveredAt: new Date(), lastError: null },
    });
  } catch (err: any) {
    const attempts = delivery.attempts + 1;
    const status = attempts >= MAX_ATTEMPTS ? "DEAD_LETTER" : "PENDING";
    const delay = BACKOFF_SECONDS[Math.min(attempts, BACKOFF_SECONDS.length - 1)];
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        attempts,
        lastError: String(err?.message ?? err).slice(0, 500),
        nextAttemptAt: new Date(Date.now() + delay * 1000),
      },
    });
  }
}

export interface InboundVerifyInput {
  secret: string;
  rawBody: string;
  signatureHeader?: string | null;
  nonce?: string | null;
}

/**
 * Verify an inbound signed request with timestamp tolerance and nonce replay
 * protection. The nonce row is created atomically — a duplicate fails.
 */
export async function verifyInbound(input: InboundVerifyInput) {
  const result = verifySignature(input.secret, input.rawBody, input.signatureHeader ?? "");
  if (!result.ok) return result;
  if (!input.nonce || input.nonce.length > 128) {
    return { ok: false, error: "Missing nonce" };
  }
  try {
    await prisma.webhookNonce.create({ data: { nonce: input.nonce } });
  } catch {
    return { ok: false, error: "Replayed nonce" };
  }
  return { ok: true as const, timestamp: result.timestamp };
}

// Avoid importing constants at module load in a way bundlers might tree-shake.
const SIGNATURE_HEADER = "aide-signature";
const NONCE_HEADER = "aide-nonce";
