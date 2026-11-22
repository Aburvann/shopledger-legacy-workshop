const test = require('node:test');
const assert = require('node:assert/strict');

const invoice = require('../lib/invoice');
const pricing = require('../lib/pricing');
const orders = require('../lib/orders');

test('invoice uses the billed HSN GST slab and matches the order tax and total', () => {
  const items = [{ id: 1, name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  const billed = pricing.computeTotals(items, '');
  const order = { id: 1, items, total: billed.total };
  const invoiced = invoice.computeInvoiceFigures(order);

  assert.equal(billed.tax, 50);
  assert.equal(billed.total, 1050);
  assert.equal(invoiced.tax, billed.tax);
  assert.equal(invoiced.total, billed.total);
  assert.equal(invoiced.rows[0].gstPercent, billed.lines[0].gstPercent);
});

test('invoice applies the same coupon discount and taxable GST calculation as the order', () => {
  const items = [{ id: 1, name: 'Rice', hsn: '1006', price: 1000, qty: 1 }];
  const billed = pricing.computeTotals(items, 'WELCOME');
  const invoiced = invoice.computeInvoiceFigures({ items, coupon: 'WELCOME', total: billed.total });

  assert.equal(billed.discount, 50);
  assert.equal(billed.total, 997.5);
  assert.equal(invoiced.discount, billed.discount);
  assert.equal(invoiced.tax, billed.tax);
  assert.equal(invoiced.total, billed.total);

  const cappedItems = [{ name: 'Goods', price: 5000, qty: 1, gstRate: 18 }];
  const cappedInvoice = invoice.computeInvoiceFigures({ items: cappedItems, coupon: 'SAVE10' });
  assert.equal(cappedInvoice.discount, 150);
});

test('invoice agrees with the recorded order total and omits the reconciliation warning', () => {
  const db = { nextOrderId: 1, orders: [] };
  const item = { id: 7, name: 'Rice', hsn: '1006', price: 1000, qty: 1 };
  const order = orders.add(db, {
    items: [item], subtotal: 1000, discount: 0, tax: 50, total: 1050
  });
  const invoiced = invoice.computeInvoiceFigures(order);

  assert.equal(order.total, 1050);
  assert.equal(invoiced.total, order.total);
  assert.doesNotMatch(invoice.render(order), /differs from Order Ledger recorded total/);
  assert.equal(db.orders.length, 1);
});
