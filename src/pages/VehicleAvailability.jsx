import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Loader,
  MapPin,
  UserCheck,
} from "lucide-react";
import { apiFetch } from "../utils/api";

const formatDateStr = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const formatMonthInput = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const filenameFromHeader = (disposition, fallback) => {
  if (!disposition) return fallback;

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1]);
  }

  const basicMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return fallback;
};

const normalizeVehicle = (vehicle) => {
  const item = vehicle?.attributes
    ? { ...vehicle.attributes, id: vehicle.id }
    : vehicle;

  return {
    id: Number(item?.id || item?.vehicle_id || item?.vehicleId || 0),
    vehicleNo:
      item?.vehicle_no ||
      item?.vehicleNo ||
      item?.vehicle_number ||
      item?.vehicleNumber ||
      item?.car_no ||
      item?.carNo ||
      "",
    plateNo:
      item?.plate_no ||
      item?.plateNo ||
      item?.registration_no ||
      item?.registrationNo ||
      item?.reg_no ||
      item?.regNo ||
      "",
    make: item?.make || "",
    model: item?.model || "",
    status: item?.status || "Available",
  };
};

const normalizeAllocation = (allocation) => ({
  id: allocation?.id || allocation?.lead_id || `${Math.random()}`,
  vehicleId: Number(
    allocation?.vehicle?.id ||
      allocation?.vehicleId ||
      allocation?.vehicle_id ||
      0,
  ),
  startDate:
    allocation?.lead?.start_date ||
    allocation?.lead?.startDate ||
    allocation?.start_date ||
    allocation?.startDate ||
    "",
  endDate:
    allocation?.lead?.end_date ||
    allocation?.lead?.endDate ||
    allocation?.end_date ||
    allocation?.endDate ||
    "",
  bookingRef:
    allocation?.lead?.booking_ref ||
    allocation?.lead?.bookingRef ||
    allocation?.booking_ref ||
    allocation?.bookingRef ||
    "-",
  routeParks:
    allocation?.lead?.route_parks ||
    allocation?.lead?.routeParks ||
    allocation?.route_parks ||
    allocation?.routeParks ||
    "-",
  status: allocation?.status || "Assigned",
  notes: allocation?.notes || "",
  vehicleNo:
    allocation?.vehicle?.vehicle_no ||
    allocation?.vehicle?.vehicleNo ||
    allocation?.vehicleNo ||
    allocation?.vehicle_no ||
    "Unknown",
  registrationNo:
    allocation?.vehicle?.registration_no ||
    allocation?.vehicle?.registrationNo ||
    allocation?.vehicle?.plate_no ||
    allocation?.vehicle?.plateNo ||
    allocation?.registration_no ||
    allocation?.registrationNo ||
    allocation?.plate_no ||
    allocation?.plateNo ||
    "Unknown",
  plateNo:
    allocation?.vehicle?.plate_no ||
    allocation?.vehicle?.plateNo ||
    allocation?.plate_no ||
    allocation?.plateNo ||
    "-",
  vehicleMake: allocation?.vehicle?.make || allocation?.make || "",
  vehicleModel: allocation?.vehicle?.model || allocation?.model || "",
  driverName:
    allocation?.driver?.name ||
    allocation?.driverName ||
    allocation?.driver_name ||
    "Unknown",
});

const extractVehicles = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.vehicles)) return payload.vehicles;
  return [];
};

const extractAllocations = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.safariAllocations))
    return payload.safariAllocations;
  if (Array.isArray(payload?.safari_allocations))
    return payload.safari_allocations;
  if (Array.isArray(payload?.allocations)) return payload.allocations;
  return [];
};

const allocationStatusColor = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "assigned":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "confirmed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "completed":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "cancelled":
    case "canceled":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function VehicleAvailability() {
  const [vehicles, setVehicles] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState(0);
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    formatMonthInput(new Date()),
  );
  const [rangeStartDate, setRangeStartDate] = useState("");
  const [rangeEndDate, setRangeEndDate] = useState("");
  const [showOnlyAvailableInRange, setShowOnlyAvailableInRange] =
    useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [exportType, setExportType] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const vehiclesRes = await apiFetch("/vehicles");
        const vehiclesPayload = await vehiclesRes.json().catch(() => ({}));

        if (!vehiclesRes.ok) {
          throw new Error(
            vehiclesPayload?.message ||
              `Vehicles request failed (${vehiclesRes.status})`,
          );
        }

        const normalizedVehicles = extractVehicles(vehiclesPayload)
          .map(normalizeVehicle)
          .filter((item) => item.id > 0);

        setVehicles(normalizedVehicles);

        const endpoints = [
          "/safari-allocations",
          "/allocations",
          "/vehicle-allocations",
        ];

        let allocationsData = [];
        for (const endpoint of endpoints) {
          try {
            const allocationsRes = await apiFetch(endpoint);
            if (!allocationsRes.ok) continue;
            const payload = await allocationsRes.json().catch(() => ({}));
            allocationsData = extractAllocations(payload);
            if (allocationsData.length > 0) break;
          } catch {
            // Try next endpoint.
          }
        }

        const normalizedAllocations = allocationsData
          .map(normalizeAllocation)
          .filter((item) => item.vehicleId && item.startDate && item.endDate);

        setAllocations(normalizedAllocations);

        if (normalizedVehicles.length === 0) {
          setError("No vehicles found in the system.");
        }
      } catch (loadError) {
        setError(
          loadError?.message ||
            "Failed to load vehicle availability data. Please try again.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const calendarDates = useMemo(() => {
    const start = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      1,
    );
    const end = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0,
    );
    const list = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      list.push(new Date(d));
    }

    return list;
  }, [currentDate]);

  // Always show all days of the current calendar month — the date range only
  // affects which vehicles are marked as unavailable, not the visible columns.
  const visibleCalendarDates = calendarDates;

  const filteredVehicles = useMemo(() => {
    const term = vehicleSearch.trim().toLowerCase();
    if (!term) return vehicles;

    return vehicles.filter((vehicle) =>
      [vehicle.vehicleNo, vehicle.plateNo, vehicle.make, vehicle.model]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [vehicles, vehicleSearch]);

  const getBookingsForDate = (vehicleId, date) => {
    const dateKey = formatDateStr(date);
    const targetVehicleId = Number(vehicleId || 0);

    return allocations.filter((allocation) => {
      if (Number(allocation.vehicleId || 0) !== targetVehicleId) return false;

      const start = formatDateStr(allocation.startDate);
      const end = formatDateStr(allocation.endDate);

      return dateKey >= start && dateKey <= end;
    });
  };

  const rangesOverlap = (startA, endA, startB, endB) => {
    const fromA = formatDateStr(startA);
    const toA = formatDateStr(endA);
    const fromB = formatDateStr(startB);
    const toB = formatDateStr(endB);

    if (!fromA || !toA || !fromB || !toB) return false;

    return fromA <= toB && toA >= fromB;
  };

  const isDateRangeValid = useMemo(() => {
    if (!rangeStartDate || !rangeEndDate) return false;
    return formatDateStr(rangeStartDate) <= formatDateStr(rangeEndDate);
  }, [rangeStartDate, rangeEndDate]);

  const availableVehiclesInDateRange = useMemo(() => {
    if (!isDateRangeValid) return [];

    return filteredVehicles.filter((vehicle) => {
      const vehicleId = Number(vehicle.id || 0);
      if (!vehicleId) return false;

      const isStatusAvailable =
        String(vehicle.status || "").toLowerCase() === "available";
      if (!isStatusAvailable) return false;

      const hasOverlappingBooking = allocations.some((allocation) => {
        if (Number(allocation.vehicleId || 0) !== vehicleId) return false;

        const isCancelled = ["cancelled", "canceled"].includes(
          String(allocation.status || "").toLowerCase(),
        );
        if (isCancelled) return false;

        return rangesOverlap(
          allocation.startDate,
          allocation.endDate,
          rangeStartDate,
          rangeEndDate,
        );
      });

      return !hasOverlappingBooking;
    });
  }, [
    filteredVehicles,
    allocations,
    isDateRangeValid,
    rangeStartDate,
    rangeEndDate,
  ]);

  const vehiclesForTable = useMemo(() => {
    if (!isDateRangeValid || !showOnlyAvailableInRange) {
      return filteredVehicles;
    }

    return availableVehiclesInDateRange;
  }, [
    filteredVehicles,
    availableVehiclesInDateRange,
    isDateRangeValid,
    showOnlyAvailableInRange,
  ]);

  const selectedBookings = useMemo(() => {
    if (!selectedVehicleId || !selectedDateKey) return [];
    return getBookingsForDate(selectedVehicleId, selectedDateKey);
  }, [selectedDateKey, selectedVehicleId, allocations]);

  const selectedVehicle = useMemo(() => {
    const id = Number(selectedVehicleId || 0);
    return vehicles.find((vehicle) => Number(vehicle.id) === id) || null;
  }, [vehicles, selectedVehicleId]);

  const applyCalendarMonth = (date) => {
    const monthValue = formatMonthInput(date);
    if (!monthValue) return;

    setSelectedMonth(monthValue);
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedDateKey("");
    setSelectedVehicleId(0);
  };

  const resetFilters = () => {
    const now = new Date();
    const defaultMonth = formatMonthInput(now);

    setVehicleSearch("");
    setSelectedMonth(defaultMonth);
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setRangeStartDate("");
    setRangeEndDate("");
    setShowOnlyAvailableInRange(true);
    setSelectedDateKey("");
    setSelectedVehicleId(0);
  };

  const handleExport = async (type) => {
    setError("");
    setIsExporting(true);
    setExportType(type);

    try {
      const params = new URLSearchParams();
      if (selectedMonth) {
        params.set("month", selectedMonth);
      }

      const response = await apiFetch(
        `/vehicle-availability/export/${type}?${params.toString()}`,
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || `Failed to export ${type}.`);
      }

      const blob = await response.blob();
      const defaultName = `vehicle-availability-${selectedMonth || formatMonthInput(new Date())}.${type === "pdf" ? "pdf" : "csv"}`;
      const filename = filenameFromHeader(
        response.headers.get("content-disposition"),
        defaultName,
      );

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (exportError) {
      setError(exportError?.message || "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setExportType("");
    }
  };

  const isRangeFilterActive = Boolean(selectedMonth);

  // Generate the full list of dates in the selected month.
  const rangeDates = useMemo(() => {
    if (!selectedMonth) return [];

    const [year, month] = selectedMonth.split("-").map(Number);
    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return [];
    }

    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);

    const list = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      list.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return list;
  }, [selectedMonth]);

  const unavailableVehicleIds = useMemo(() => {
    if (!isRangeFilterActive || rangeDates.length === 0) {
      return new Set();
    }

    const ids = new Set();

    filteredVehicles.forEach((vehicle) => {
      const vehicleId = Number(vehicle.id || 0);
      if (!vehicleId) return;

      // A vehicle is "unavailable" only if every single day in the range is booked.
      const isBookedForEveryRangeDate = rangeDates.every(
        (date) => getBookingsForDate(vehicleId, date).length > 0,
      );

      if (isBookedForEveryRangeDate) {
        ids.add(vehicleId);
      }
    });

    return ids;
  }, [filteredVehicles, isRangeFilterActive, rangeDates, allocations]);

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader className="mx-auto mb-3 h-8 w-8 animate-spin text-sher-teal" />
          <p className="text-slate-600">Loading vehicle availability...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Vehicle Availability Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            View all vehicles and their booking dates at a glance
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleExport("excel")}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            {exportType === "excel" ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Exporting Excel...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export Excel
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleExport("pdf")}
            disabled={isExporting}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-60"
          >
            {exportType === "pdf" ? (
              <>
                <Loader className="h-4 w-4 animate-spin" />
                Exporting PDF...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export PDF
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {vehicles.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
          Loaded: {vehicles.length} vehicles, {allocations.length} bookings |
          Showing: {vehiclesForTable.length} vehicles
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
          >
            Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Search Vehicle
            </label>
            <input
              type="text"
              value={vehicleSearch}
              onChange={(event) => setVehicleSearch(event.target.value)}
              placeholder="Vehicle no, plate, make, model"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-sher-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => {
                const val = event.target.value;
                setSelectedMonth(val);
                if (val) {
                  const d = new Date(`${val}-01T00:00:00`);
                  if (!Number.isNaN(d.getTime())) setCurrentDate(d);
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none [color-scheme:light] focus:border-sher-gold"
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Availability From
            </label>
            <input
              type="date"
              value={rangeStartDate}
              onChange={(event) => setRangeStartDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none [color-scheme:light] focus:border-sher-gold"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
              Availability To
            </label>
            <input
              type="date"
              value={rangeEndDate}
              min={rangeStartDate || undefined}
              onChange={(event) => setRangeEndDate(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none [color-scheme:light] focus:border-sher-gold"
            />
          </div>

          <div className="flex items-end">
            <label className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={showOnlyAvailableInRange}
                onChange={(event) =>
                  setShowOnlyAvailableInRange(event.target.checked)
                }
                className="h-4 w-4 rounded border-slate-300 text-sher-gold focus:ring-sher-gold"
              />
              Show Only Available In Range
            </label>
          </div>
        </div>

        {rangeStartDate && rangeEndDate && !isDateRangeValid && (
          <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
            Date range is invalid. "Availability To" must be after or equal to
            "Availability From".
          </div>
        )}

        {isDateRangeValid && (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Available vehicles from {rangeStartDate} to {rangeEndDate}:{" "}
            <span className="font-semibold">
              {availableVehiclesInDateRange.length}
            </span>
            {showOnlyAvailableInRange
              ? " (table filtered to only available vehicles)"
              : ""}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Calendar className="h-5 w-5 text-sher-teal" />
            {monthYear}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => {
                applyCalendarMonth(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 1,
                    1,
                  ),
                );
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                applyCalendarMonth(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    1,
                  ),
                );
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {vehicles.length === 0 ? (
          <div className="space-y-3 py-10 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-400" />
            <p className="font-medium text-slate-700">No Vehicles Found</p>
          </div>
        ) : visibleCalendarDates.length === 0 ? (
          <div className="space-y-3 py-10 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-400" />
            <p className="font-medium text-slate-700">
              No dates in selected range
            </p>
          </div>
        ) : vehiclesForTable.length === 0 ? (
          <div className="space-y-3 py-10 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-400" />
            <p className="font-medium text-slate-700">
              {isDateRangeValid && showOnlyAvailableInRange
                ? "No vehicles are available in the selected date range"
                : "No vehicles match your search"}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 min-w-[180px] border-b border-slate-200 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-700">
                      Vehicle
                    </th>
                    {visibleCalendarDates.map((date, idx) => (
                      <th
                        key={idx}
                        className="min-w-[60px] border-b border-slate-200 px-2 py-3 text-center text-xs font-semibold text-slate-700"
                      >
                        <div className="font-medium">
                          {date.toLocaleDateString("en-US", { day: "numeric" })}
                        </div>
                        <div className="text-slate-500">
                          {date.toLocaleDateString("en-US", {
                            weekday: "short",
                          })}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehiclesForTable.map((vehicle) => {
                    const vehicleId = Number(vehicle.id || 0);
                    const isDisabledInRange =
                      unavailableVehicleIds.has(vehicleId);

                    return (
                      <tr
                        key={vehicle.id}
                        className={`border-b border-slate-200 transition ${
                          isDisabledInRange
                            ? "bg-slate-100/80 text-slate-400"
                            : "hover:bg-slate-50"
                        }`}
                      >
                        <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-3 font-medium text-slate-900">
                          <div className="flex flex-col">
                            <span className="font-semibold">
                              {vehicle.vehicleNo}
                            </span>
                            <span className="text-xs text-slate-500">
                              {vehicle.plateNo}
                            </span>
                            <span className="text-xs text-slate-500">
                              {vehicle.make} {vehicle.model}
                            </span>
                            {isDisabledInRange && (
                              <span className="mt-1 inline-flex w-fit rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-700">
                                No Availability in Range
                              </span>
                            )}
                          </div>
                        </td>

                        {visibleCalendarDates.map((date, idx) => {
                          const bookings = getBookingsForDate(vehicle.id, date);
                          const isBooked = bookings.length > 0;
                          const dateKey = formatDateStr(date);
                          const isSelectedCell =
                            Number(selectedVehicleId || 0) ===
                              Number(vehicle.id || 0) &&
                            selectedDateKey === dateKey;

                          return (
                            <td
                              key={idx}
                              onClick={() => {
                                if (isDisabledInRange) return;
                                if (!isBooked) return;
                                const nextVehicleId = Number(vehicle.id || 0);
                                const alreadySelected =
                                  Number(selectedVehicleId || 0) ===
                                    nextVehicleId &&
                                  selectedDateKey === dateKey;

                                if (alreadySelected) {
                                  setSelectedVehicleId(0);
                                  setSelectedDateKey("");
                                  return;
                                }

                                setSelectedVehicleId(nextVehicleId);
                                setSelectedDateKey(dateKey);
                              }}
                              className={`group relative border-r border-slate-200 px-2 py-3 text-center transition ${
                                isDisabledInRange
                                  ? "cursor-not-allowed bg-slate-100"
                                  : isBooked
                                    ? "cursor-pointer bg-rose-500/20 hover:bg-rose-500/35"
                                    : "hover:bg-slate-50"
                              } ${isSelectedCell ? "ring-2 ring-cyan-400/70" : ""}`}
                              title={
                                isDisabledInRange
                                  ? "No availability in selected range"
                                  : isBooked
                                    ? bookings
                                        .map((booking) => booking.bookingRef)
                                        .filter(Boolean)
                                        .join(", ")
                                    : ""
                              }
                            >
                              {isDisabledInRange ? (
                                <div className="flex items-center justify-center">
                                  <div className="w-full rounded-md border border-slate-300 bg-slate-100 px-2 py-1">
                                    <span className="text-xs font-semibold text-slate-500">
                                      Disabled
                                    </span>
                                  </div>
                                </div>
                              ) : isBooked ? (
                                <div className="flex items-center justify-center">
                                  <div className="w-full rounded-md border border-rose-300 bg-rose-100 px-2 py-1">
                                    <span className="text-xs font-semibold text-rose-700">
                                      {bookings.length > 1
                                        ? `Booked (${bookings.length})`
                                        : "Booked"}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-center">
                                  <div className="w-full rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1">
                                    <CheckCircle2 className="mx-auto h-3 w-3 text-emerald-600" />
                                  </div>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-6">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
                  Allocation Details ({selectedDateKey || "Select a booked day"}
                  )
                </h4>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                    {selectedBookings.length} allocation(s)
                  </span>
                  {selectedDateKey && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedVehicleId(0);
                        setSelectedDateKey("");
                      }}
                      className="rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>

              {selectedBookings.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Click any booked day cell to view Safari, Vehicle, and Driver
                  details.
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedBookings.map((alloc, index) => (
                    <div
                      key={`${selectedDateKey}-${alloc.vehicleId}-${alloc.id}-${index}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                    >
                      <div className="border-b border-slate-200/80 bg-[linear-gradient(140deg,rgba(251,191,36,0.08),rgba(56,189,248,0.08))] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-800">
                            Safari: {alloc.bookingRef}
                          </div>
                          <span
                            className={`rounded-md border px-2 py-1 text-xs ${allocationStatusColor(alloc.status)}`}
                          >
                            {alloc.status || "Assigned"}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 p-4 text-xs md:grid-cols-3">
                        <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-slate-600">
                          <div className="mb-2 flex items-center gap-2 text-amber-700">
                            <MapPin className="h-3.5 w-3.5" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                              Safari Details
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {alloc.routeParks}
                            </p>
                            <p>
                              {alloc.startDate || "-"} to {alloc.endDate || "-"}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3 text-slate-600">
                          <div className="mb-2 flex items-center gap-2 text-cyan-700">
                            <Car className="h-3.5 w-3.5" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                              Vehicle Details
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {alloc.vehicleNo ||
                                selectedVehicle?.vehicleNo ||
                                "Unknown"}
                            </p>
                            <p>
                              Registration No:{" "}
                              {alloc.registrationNo || alloc.plateNo}
                            </p>
                            <p>
                              {alloc.vehicleMake} {alloc.vehicleModel}
                            </p>
                          </div>
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-slate-600">
                          <div className="mb-2 flex items-center gap-2 text-emerald-700">
                            <UserCheck className="h-3.5 w-3.5" />
                            <p className="text-[10px] font-semibold uppercase tracking-[0.08em]">
                              Driver Details
                            </p>
                          </div>
                          <div>
                            <p className="font-medium text-slate-800">
                              {alloc.driverName}
                            </p>
                            <p>{alloc.notes || "No notes"}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
          </div>
          <span className="text-sm text-slate-700">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-md border border-rose-300 bg-rose-100 px-3 py-1.5">
            <span className="text-xs font-semibold text-rose-700">Booked</span>
          </div>
          <span className="text-sm text-slate-700">Booked</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Vehicles
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {vehicles.length}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Bookings
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-900">
            {allocations.length}
          </div>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Currently Booked
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-700">
            {
              new Set(
                allocations
                  .filter((allocation) => {
                    const today = formatDateStr(new Date());
                    const start = formatDateStr(allocation.startDate);
                    const end = formatDateStr(allocation.endDate);
                    return today >= start && today <= end;
                  })
                  .map((allocation) => Number(allocation.vehicleId || 0)),
              ).size
            }
          </div>
        </div>
      </div>
    </div>
  );
}
