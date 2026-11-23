export type ConflictEntityData = Record<string, unknown> & {
  updatedAt?: string | number | Date;
  deviceId?: string;
};

export interface ConflictInput {
  entityType: 'product' | 'sale';
  entityId: string;
  clientData: ConflictEntityData;
  serverData: ConflictEntityData;
  serverMovements?: { productId: string; delta: number; timestamp: string }[];
}

export interface ConflictResult {
  resolved: boolean;
  resolution: 'client-wins' | 'server-wins' | 'manual-review';
  mergedData?: ConflictEntityData;
  reason?: string;
}

function parseTimestamp(value: unknown): number {
  if (value === undefined || value === null) return 0;
  const ms = new Date(value as string | number | Date).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

export function resolveConflict(input: ConflictInput): ConflictResult {
  if (input.entityType === 'product') {
    const clientTime = parseTimestamp(input.clientData.updatedAt);
    const serverTime = parseTimestamp(input.serverData.updatedAt);

    if (clientTime > serverTime) {
      return { resolved: true, resolution: 'client-wins', mergedData: input.clientData };
    }
    if (serverTime > clientTime) {
      return { resolved: true, resolution: 'server-wins', mergedData: input.serverData };
    }

    const clientDeviceId = String(input.clientData.deviceId ?? '');
    const serverDeviceId = String(input.serverData.deviceId ?? '');
    if (clientDeviceId > serverDeviceId) {
      return { resolved: true, resolution: 'client-wins', mergedData: input.clientData };
    }
    return { resolved: true, resolution: 'server-wins', mergedData: input.serverData };
  }

  if (input.entityType === 'sale') {
    return { resolved: true, resolution: 'client-wins', mergedData: input.clientData };
  }

  return { resolved: false, resolution: 'manual-review', reason: 'Unknown entity type' };
}

export function checkStockOversell(
  productId: string,
  originalQuantity: number,
  movements: { delta: number; timestamp: string }[]
): { ok: boolean; finalQuantity: number; failedMovement?: any } {
  const sorted = [...movements].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  let qty = originalQuantity;

  for (const m of sorted) {
    qty += m.delta;
    if (qty < 0) {
      return { ok: false, finalQuantity: qty, failedMovement: m };
    }
  }

  return { ok: true, finalQuantity: qty };
}
