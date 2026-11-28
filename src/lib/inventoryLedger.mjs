/**
 * AIDE-10: pure inventory ledger math.
 *
 * Stock on hand is the signed sum of quantityDelta across movements for a
 * product. Moving weighted-average cost is recomputed from receipt-type
 * movements (RECEIPT, TRANSFER_IN, ADJUSTMENT with positive delta). Decimal
 * strings keep money exact; quantities are integers.
 */
export const MOVEMENT_TYPES = Object.freeze([
  'RECEIPT', 'SALE', 'RETURN', 'ADJUSTMENT', 'TRANSFER_IN', 'TRANSFER_OUT', 'WRITE_OFF',
]);

export function isValidMovementType(t) {
  return MOVEMENT_TYPES.includes(t);
}

/** Signed quantity on hand from a list of { quantityDelta } movements. */
export function stockOnHand(movements) {
  return movements.reduce((sum, m) => sum + Number(m.quantityDelta || 0), 0);
}

/**
 * Moving weighted-average unit cost for the currently held stock.
 * Only inbound movements at a positive cost contribute to the average.
 * Outbound movements consume stock at the running average (they do not
 * change the average of what remains).
 */
export function movingAverageCost(movements) {
  let qty = 0;
  let value = 0;
  for (const m of movements) {
    const d = Number(m.quantityDelta || 0);
    const cost = Number(m.unitCost || 0);
    if (d > 0) {
      qty += d;
      value += d * cost;
    } else if (d < 0) {
      // Consume at the current average; value follows quantity linearly.
      const avg = qty > 0 ? value / qty : 0;
      const consumed = Math.min(-d, qty);
      qty -= consumed;
      value = qty * avg;
    }
  }
  return { quantity: qty, totalValue: round4(value), averageCost: round4(qty > 0 ? value / qty : 0) };
}

export function round4(n) {
  return Math.round((Number(n) + Number.EPSILON) * 10000) / 10000;
}

/** Profit margin per product from aggregated sale lines. */
export function profitMargin(rows) {
  return rows.map((r) => {
    const revenue = round4(r.revenue);
    const cost = round4(r.cost);
    const profit = round4(revenue - cost);
    return {
      ...r,
      revenue,
      cost,
      profit,
      marginPercent: revenue > 0 ? round4((profit / revenue) * 100) : 0,
    };
  });
}

/** Validate a transfer request before any write. */
export function validateTransfer(input) {
  if (!input.fromWarehouseId || !input.toWarehouseId) return { ok: false, error: 'Source and destination warehouses are required' };
  if (input.fromWarehouseId === input.toWarehouseId) return { ok: false, error: 'Source and destination must differ' };
  if (!Array.isArray(input.lines) || input.lines.length === 0) return { ok: false, error: 'At least one line is required' };
  for (const line of input.lines) {
    if (!line.productId) return { ok: false, error: 'Every line needs a product' };
    const q = Number(line.quantity);
    if (!Number.isInteger(q) || q <= 0) return { ok: false, error: 'Quantities must be positive integers' };
    if (Number(line.available ?? 0) < q) return { ok: false, error: `Insufficient stock for ${line.productName || line.productId}` };
  }
  return { ok: true };
}
