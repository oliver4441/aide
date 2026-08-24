export interface ConflictInput {
  entityType: 'product' | 'sale';
  entityId: string;
  clientData: any;
  serverData: any;
  serverMovements?: { productId: string; delta: number; timestamp: string }[];
}

export interface ConflictResult {
  resolved: boolean;
  resolution: 'client-wins' | 'server-wins' | 'manual-review';
  mergedData?: any;
  reason?: string;
}

export function resolveConflict(input: ConflictInput): ConflictResult {
  if (input.entityType === 'product') {
    const clientTime = new Date(input.clientData.updatedAt).getTime();
    const serverTime = new Date(input.serverData.updatedAt).getTime();

    if (clientTime > serverTime) {
      return { resolved: true, resolution: 'client-wins', mergedData: input.clientData };
    }
    if (serverTime > clientTime) {
      return { resolved: true, resolution: 'server-wins', mergedData: input.serverData };
    }

    if (input.clientData.deviceId > input.serverData.deviceId) {
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
