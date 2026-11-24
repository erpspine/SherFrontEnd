import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFuelReport, validateFuelReportParameters, fuelReportCsvCell } from '../src/utils/fuelReport.js';
const p = { average: 7, good: 10, warning: 20, deduction: 50, price: 3000, monthlyPrices: { '2026-09': 3000 }, deductionMode: 'all' };
const entry = (extra = {}) => ({ vehicle_id: 1, driver_id: 1, end_km: 1500, litres_filled_end: 100, filled_at: '2026-09-01', vehicle: { plate_no: 'A' }, driver: { name: 'Driver' }, km_done: 500, litres_consumed: 150, vehicle_average: 3.33, ...extra });
const report = (entries, params = p) => buildFuelReport(entries, '2026-09-01', '2026-09-30', params);
test('inclusive dates aggregate total per vehicle', () => {
  const rows = report([entry(), entry({ filled_at: '2026-09-30', km_done: 1000, litres_consumed: 100, vehicle_average: 10 }), entry({ driver_id: 2 }), entry({ filled_at: '2026-10-01' })]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].trips, 3);
  assert.equal(rows[0].scoredTrips, 3);
  assert.equal(rows[0].litres, 400);
  assert.equal(rows[0].km, 2000);
  assert.equal(rows[0].expected, 285.71);
  assert.equal(rows[0].excess, 114.29);
  assert.equal(rows[0].deductionAmount, 342870);
  assert.equal(rows[0].average, 5);
  assert.equal(rows[0].status, 'Deduction');
});
test('status uses actual average with exact boundaries', () => {
  for (const [average, status] of [[6.4, 'Deduction'], [6.499, 'Deduction'], [6.5, 'Warning'], [6.9, 'Warning'], [6.999, 'Warning'], [7, 'Good'], [8, 'Good']]) {
    assert.equal(report([entry({ km_done: average * 1000, litres_consumed: 1000 })])[0].status, status);
  }
});
test('monthly prices are applied independently and missing prices remain unset', () => {
  const rows = buildFuelReport([entry(), entry({ filled_at: '2026-10-01' })], '', '', {
    average: 7, monthlyPrices: { '2026-09': 100, '2026-10': 200 },
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[1].deductionAmount, rows[0].deductionAmount * 2);
  assert.equal(report([entry()], { average: 7, monthlyPrices: {} })[0].deductionAmount, null);
  assert.equal(report([entry()], { average: 7, monthlyPrices: { '2026-09': 0 } })[0].deductionAmount, 0);
});
test('monthly target average drives expected litres', () => {
  const row = report([entry()], {
    average: 7,
    monthlyTargets: { '2026-09': 10 },
    monthlyPrices: { '2026-09': 100 },
  })[0];
  assert.equal(row.expected, 50);
  assert.equal(row.excess, 100);
  assert.equal(row.deductionAmount, 10000);
});
test('pending records do not distort calculated averages', () => {
  const row = report([entry(), entry({ vehicle_average: null, km_done: null, end_km: null })])[0];
  assert.equal(row.trips, 1); assert.equal(row.scoredTrips, 1); assert.equal(row.pendingTrips, 0);
  assert.equal(row.average, 3.33);
  assert.deepEqual(report([entry({ end_km: null })]), []);
  assert.deepEqual(report([entry({ litres_filled_end: null })]), []);
});
test('invalid parameters and safe CSV cells', () => {
  assert.equal(validateFuelReportParameters(p), '');
  for (const invalid of [{ price: '' }, { warning: 10 }, { deduction: 15 }, { good: -1 }, { price: 'NaN' }]) {
    assert.ok(validateFuelReportParameters({ ...p, ...invalid }));
  }
  assert.equal(fuelReportCsvCell('=SUM(A1)'), '"\'=SUM(A1)"');
  assert.equal(fuelReportCsvCell('A"B'), '"A""B"');
});
test('trip days include every trip and daily distance follows total KM divided by days', () => {
  const row = report([entry({ trip_days: 8 }), entry({ trip_days: 1, km_done: 400 }), entry({ trip_days: 2, vehicle_average: null, km_done: null, end_km: null })])[0];
  assert.equal(row.totalDays, 9);
  assert.equal(row.averageKmPerTrip, 100);
});
test('missing trip dates do not produce a misleading partial day total', () => {
  const row = report([entry({ trip_days: 8 }), entry()])[0];
  assert.equal(row.totalDays, null);
  assert.equal(row.averageKmPerTrip, null);
  assert.equal(report([entry({ trip_days: 0 })])[0].averageKmPerTrip, null);
});
