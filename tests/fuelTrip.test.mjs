import test from 'node:test';
import assert from 'node:assert/strict';
import { isTripComplete, previousTripDefaults } from '../src/utils/fuelTrip.js';
const trip = extra => ({ id: 1, vehicle_id: 1, filled_at: '2026-09-01', end_km: 1500, litres_filled_end: 80, ...extra });
test('defaults use the latest completed trip for the selected vehicle regardless of dates', () => {
  const entries = [trip(), trip({ id: 2, vehicle_id: 2, end_km: 9000 }), trip({ id: 3, end_km: 2000, litres_filled_end: 60 }), trip({ id: 4, end_km: 3000, litres_filled_end: null }), trip({ id: 5, filled_at: '2026-10-01', end_km: 4000 })];
  assert.deepEqual(previousTripDefaults(entries, { vehicle_id: 1, start_date: '2026-09-10' }), { start_km: 4000, litres_filled: 80 });
  assert.deepEqual(previousTripDefaults(entries, { vehicle_id: 3 }), {});
});
test('zero end fuel is captured, missing end readings are incomplete', () => {
  assert.equal(isTripComplete(trip({ litres_filled_end: 0 })), true);
  for (const value of [null, undefined, '']) {
    assert.equal(isTripComplete(trip({ end_km: value })), false);
    assert.equal(isTripComplete(trip({ litres_filled_end: value })), false);
  }
});

test('trip dates never exclude the latest vehicle readings', () => {
  const lastin = trip({ id: 26, vehicle_id: 3, lease_allocation_id: 438, filled_at: '2026-09-16', end_km: 16106, litres_filled_end: '142.27', lease_allocation: { start_date: '2026-08-27', end_date: '2026-09-03' } });
  const stettner = { id: 624, allocation_type: 'long_term', vehicle_id: 3, start_date: '2026-09-04' };
  const laterTrip = trip({ vehicle_id: 3, lease_allocation_id: 700, end_km: 18000, lease_allocation: { start_date: '2026-09-11', end_date: '2026-09-15' } });
  assert.deepEqual(previousTripDefaults([lastin, laterTrip], stettner), { start_km: 18000, litres_filled: 80 });
});
test('a trip cannot supply its own beginning readings', () => {
  assert.deepEqual(previousTripDefaults([trip({ lease_allocation_id: 438 })], { id: 438, allocation_type: 'long_term', vehicle_id: 1, start_date: '2026-09-10' }), {});
});
