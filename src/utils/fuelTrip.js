const captured = value => value !== null && value !== undefined && value !== "";

export const isTripComplete = entry => Boolean(entry && captured(entry.end_km) && captured(entry.litres_filled_end));

export function previousTripDefaults(entries, allocation) {
  if (!allocation) return {};
  // Odometer readings determine vehicle sequence, regardless of record or trip dates.
  const previous = entries.filter(entry => {
    const sameAllocation = captured(allocation.id) && (allocation.allocation_type === "long_term"
      ? String(entry.lease_allocation_id) === String(allocation.id)
      : String(entry.safari_allocation_id) === String(allocation.id));
    return !sameAllocation && String(entry.vehicle_id) === String(allocation.vehicle_id) &&
      isTripComplete(entry);
  }).sort((a, b) => Number(b.end_km) - Number(a.end_km) || Number(b.id) - Number(a.id))[0];
  return previous ? { start_km: previous.end_km, litres_filled: previous.litres_filled_end } : {};
}
