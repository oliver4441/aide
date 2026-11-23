import test from 'node:test';
import assert from 'node:assert/strict';
import {
  shouldPostOperation,
  assertBalancedJournal,
  buildPosSaleJournal,
  buildRefundReversalJournal,
  buildMpesaSettlementJournal,
} from '../../src/lib/accountingPostingPolicy.mjs';

test('shouldPostOperation enforces lifecycle rules', () => {
  assert.equal(shouldPostOperation('pos_sale', 'draft'), false);
  assert.equal(shouldPostOperation('pos_sale', 'cancelled'), false);
  assert.equal(shouldPostOperation('pos_sale', 'completed'), true);
  assert.equal(shouldPostOperation('supplier_bill', 'approved'), true);
});

test('buildPosSaleJournal produces balanced journal for split payments, VAT, discount, and COGS', () => {
  const journal = buildPosSaleJournal({
    id: 'sale-1',
    branchId: 'br-1',
    terminalId: 'term-1',
    cashierId: 'cashier-1',
    currency: 'KES',
    grossTotal: '1160.00',
    discountTotal: '100.00',
    taxTotal: '160.00',
    cogsTotal: '600.00',
    payments: [
      { method: 'cash', amount: '500.00' },
      { method: 'mpesa', amount: '400.00' },
      { method: 'credit', amount: '160.00' },
    ],
  });

  assert.equal(journal.sourceEntity, 'pos_sale');
  assert.equal(journal.branchId, 'br-1');
  const check = assertBalancedJournal(journal.lines);
  assert.equal(check.balanced, true);
});

test('buildRefundReversalJournal and buildMpesaSettlementJournal produce balanced journals', () => {
  const refund = buildRefundReversalJournal({
    id: 'ref-1',
    total: '232.00',
    taxTotal: '32.00',
  });
  assert.equal(assertBalancedJournal(refund.lines).balanced, true);

  const settlement = buildMpesaSettlementJournal({
    id: 'set-1',
    grossAmount: '1000.00',
    feeAmount: '15.00',
  });
  assert.equal(assertBalancedJournal(settlement.lines).balanced, true);
});
