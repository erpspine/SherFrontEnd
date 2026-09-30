import { isTripComplete } from "./fuelTrip.js";
export const defaultFuelReportParameters = {
  average: 7, good: 10, warning: 20, deduction: 50, price: '', deductionMode: 'all',
};

export function validateFuelReportParameters(p) {
  if (['average', 'good', 'warning', 'deduction', 'price'].some(key => p[key] === '' || !Number.isFinite(Number(p[key])) || Number(p[key]) < 0)) {
    return 'Enter non-negative numbers for all thresholds and price per litre.';
  }
  if (!(Number(p.good) < Number(p.warning) && Number(p.warning) < Number(p.deduction))) {
    return 'Good must be below Warning, and Warning must be below Deduction.';
  }
  if (!['all', 'above'].includes(p.deductionMode)) return 'Select a deduction basis.';
  return '';
}

const round = n => Math.round((n + Number.EPSILON) * 100) / 100;

// Incomplete trips must not affect report counts, days, drivers, or totals.
export function buildFuelReport(entries, from, to, parameters) {
  const groups = new Map();
  for (const entry of entries) {
    if (!isTripComplete(entry)) continue;
    const date = String(entry.filled_at || '').slice(0, 10);
    if (!date || (from && date < from) || (to && date > to)) continue;
    const month = date.slice(0, 7);
    const key = String(entry.vehicle_id) + ':' + month;
    if (!groups.has(key)) groups.set(key, {
      key, month, vehicle: entry.vehicle?.plate_no || 'Unknown vehicle',
      drivers: new Set(), trips: 0, scoredTrips: 0, pendingTrips: 0,
      litres: 0, km: 0, totalDays: 0, missingDays: false,
    });
    const row = groups.get(key);
    row.drivers.add(entry.driver?.name || 'Unassigned');
    row.trips++;
    if (entry.trip_days == null || !Number.isFinite(Number(entry.trip_days)) || Number(entry.trip_days) <= 0) row.missingDays = true;
    else row.totalDays += Number(entry.trip_days);
    const eligible = entry.vehicle_average !== null && entry.vehicle_average !== undefined &&
      Number(entry.litres_consumed) > 0 && entry.km_done !== null;
    if (!eligible) { row.pendingTrips++; continue; }
    row.scoredTrips++;
    row.litres += Number(entry.litres_consumed);
    row.km += Number(entry.km_done);
  }
  return [...groups.values()].map(({ drivers, missingDays, ...row }) => {
    const expected = row.scoredTrips ? row.km / Number(parameters.average || 7) : null;
    const excess = row.scoredTrips ? round(Math.max(0, row.litres - expected)) : null;
    const average = row.litres > 0 ? row.km / row.litres : null;
    const targetMap = parameters.monthlyTargets ?? parameters.targetAverages;
    const targetValue = targetMap ? targetMap[row.month] : parameters.targetAverage
    const targetAverage = targetValue == null ? (targetMap ? null : 6.5) : Number(targetValue);
    const status = average === null ? 'Pending' : targetAverage === null ? 'Target not set' : average < targetAverage ? 'Deduction' : average < 7 ? 'Warning' : 'Good';
    const price = parameters.monthlyPrices?.[row.month] ?? null;
    const deductionAmount = status === 'Target not set' ? null : status === 'Deduction' ? (price === null ? null : round(excess * Number(price))) : 0;
    return {
      ...row,
      totalDays: missingDays ? null : row.totalDays,
      averageKmPerTrip: !missingDays && row.totalDays > 0 && row.scoredTrips ? round(row.km / row.totalDays) : null,
      driver: [...drivers].join(', '), price, litres: row.scoredTrips ? round(row.litres) : null,
      km: row.scoredTrips ? row.km : null, average: row.litres > 0 ? round(row.km / row.litres) : null,
      expected: row.scoredTrips ? round(expected) : null, excess, status, deductionAmount,
    };
  }).sort((a, b) => a.vehicle.localeCompare(b.vehicle) || a.month.localeCompare(b.month));
}

export function fuelReportCsvCell(value) {
  let text = String(value ?? '');
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
