import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader,
  Maximize2,
  Minimize2,
  Search,
} from "lucide-react";
import { apiFetch } from "../utils/api";

const formatDateStr = (value) => {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
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

const formatLongDate = (value) => {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const extractVehicles = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.vehicles)) return payload.vehicles;
  return [];
};

const extractContracts = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.contracts)) return payload.contracts;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const normalizeVehicle = (vehicle) => {
  const item = vehicle?.attributes
    ? { ...vehicle.attributes, id: vehicle.id }
    : vehicle;
  return {
    id: Number(item?.id || 0),
    vehicleNo:
      item?.vehicle_no || item?.vehicleNo || item?.vehicle_number || "-",
    plateNo: item?.plate_no || item?.plateNo || item?.registration_no || "-",
    make: item?.make || "",
    model: item?.model || "",
    status: item?.status || "Available",
  };
};

const normalizeContract = (contract) => {
  const vehicleIds = Array.isArray(contract.vehicleIds)
    ? contract.vehicleIds.map(Number)
    : Array.isArray(contract.vehicles)
      ? contract.vehicles.map((v) => Number(v.id))
      : [];
  return {
    id: contract.id,
    vehicleIds,
    clientName: contract.clientName || contract.client_name || "",
    startDate: contract.startDate || contract.start_date || "",
    endDate: contract.endDate || contract.end_date || "",
    leaseType: contract.leaseType || contract.lease_type || "",
    monthlyRate: contract.monthlyRate ?? contract.monthly_rate ?? "",
    status: contract.status || "Active",
  };
};

// Same color palette as VehicleAvailability allocation cells.
const LEASE_COLOR_CLASSES = [
  "border-blue-300 bg-blue-100 text-blue-700",
  "border-teal-300 bg-teal-100 text-teal-700",
  "border-amber-300 bg-amber-100 text-amber-700",
  "border-fuchsia-300 bg-fuchsia-100 text-fuchsia-700",
  "border-lime-300 bg-lime-100 text-lime-700",
  "border-cyan-300 bg-cyan-100 text-cyan-700",
  "border-orange-300 bg-orange-100 text-orange-700",
  "border-violet-300 bg-violet-100 text-violet-700",
];

const colorClassForContract = (contractId) => {
  const key = String(contractId || "0");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % LEASE_COLOR_CLASSES.length;
  }
  return LEASE_COLOR_CLASSES[Math.abs(hash) % LEASE_COLOR_CLASSES.length];
};

const statusBadgeClass = (status) => {
  switch (String(status || "").toLowerCase()) {
    case "active":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "completed":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "cancelled":
    case "canceled":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

export default function LeaseCalendar() {
  const [vehicles, setVehicles] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentDate, setCurrentDate] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selectedMonth, setSelectedMonth] = useState(() =>
    formatMonthInput(new Date()),
  );
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState(0);
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError("");
      try {
        const [vehiclesRes, contractsRes, allocationsRes] = await Promise.all([
          apiFetch("/vehicles"),
          apiFetch("/lease-contracts"),
          apiFetch("/lease-allocations"),
        ]);
        const vehiclesPayload = await vehiclesRes.json().catch(() => ({}));
        if (!vehiclesRes.ok) {
          throw new Error(
            vehiclesPayload?.message || "Failed to load vehicles.",
          );
        }
        const contractsPayload = await contractsRes.json().catch(() => ({}));
        if (!contractsRes.ok) {
          throw new Error(
            contractsPayload?.message || "Failed to load lease contracts.",
          );
        }
        const allocationsPayload = await allocationsRes
          .json()
          .catch(() => ({}));
        if (!allocationsRes.ok) {
          throw new Error(
            allocationsPayload?.message || "Failed to load lease allocations.",
          );
        }
        setVehicles(
          extractVehicles(vehiclesPayload)
            .map(normalizeVehicle)
            .filter((v) => v.id > 0),
        );
        setContracts(extractContracts(contractsPayload).map(normalizeContract));
        const allocList = Array.isArray(allocationsPayload?.allocations)
          ? allocationsPayload.allocations
          : Array.isArray(allocationsPayload?.data)
            ? allocationsPayload.data
            : Array.isArray(allocationsPayload)
              ? allocationsPayload
              : [];
        setAllocations(allocList);
      } catch (loadError) {
        setError(loadError?.message || "Failed to load lease calendar data.");
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

  // Map vehicleId -> contracts overlapping the visible month (used for the
  // "Lease Details" panel when a cell is clicked).
  const contractsByVehicleInMonth = useMemo(() => {
    const map = new Map();
    if (calendarDates.length === 0) return map;
    const monthStartKey = formatDateStr(calendarDates[0]);
    const monthEndKey = formatDateStr(calendarDates[calendarDates.length - 1]);

    contracts.forEach((contract) => {
      if (String(contract.status).toLowerCase() === "cancelled") return;
      const cStart = formatDateStr(contract.startDate);
      const cEnd = formatDateStr(contract.endDate);
      if (!cStart || !cEnd) return;
      if (cEnd < monthStartKey || cStart > monthEndKey) return;
      contract.vehicleIds.forEach((vid) => {
        if (!map.has(vid)) map.set(vid, []);
        map.get(vid).push(contract);
      });
    });
    return map;
  }, [contracts, calendarDates]);

  // Set of vehicle IDs that belong to any non-cancelled lease contract
  // (regardless of month). These are the rows always displayed.
  const allLeasedVehicleIds = useMemo(() => {
    const set = new Set();
    contracts.forEach((c) => {
      if (String(c.status).toLowerCase() === "cancelled") return;
      c.vehicleIds.forEach((vid) => set.add(Number(vid)));
    });
    return set;
  }, [contracts]);

  // Map vehicleId -> allocations overlapping the visible month.
  const allocationsByVehicleInMonth = useMemo(() => {
    const map = new Map();
    if (calendarDates.length === 0) return map;
    const monthStartKey = formatDateStr(calendarDates[0]);
    const monthEndKey = formatDateStr(calendarDates[calendarDates.length - 1]);

    allocations.forEach((a) => {
      if (String(a.status).toLowerCase() === "cancelled") return;
      const s = a.startDate || a.start_date;
      const e = a.endDate || a.end_date;
      const aStart = formatDateStr(s);
      const aEnd = formatDateStr(e);
      if (!aStart || !aEnd) return;
      if (aEnd < monthStartKey || aStart > monthEndKey) return;
      const vid = Number(a.vehicleId || a.vehicle_id || 0);
      if (!vid) return;
      if (!map.has(vid)) map.set(vid, []);
      map.get(vid).push({
        ...a,
        startDate: s,
        endDate: e,
      });
    });
    return map;
  }, [allocations, calendarDates]);

  // Always show vehicles that are leased on any contract (not just the current
  // month).
  const leasedVehicles = useMemo(() => {
    return vehicles.filter((v) => allLeasedVehicleIds.has(Number(v.id)));
  }, [vehicles, allLeasedVehicleIds]);

  const getAllocationForVehicleDate = (vehicleId, date) => {
    const list = allocationsByVehicleInMonth.get(Number(vehicleId)) || [];
    const dateKey = formatDateStr(date);
    return list.find((a) => {
      const s = formatDateStr(a.startDate);
      const e = formatDateStr(a.endDate);
      return dateKey >= s && dateKey <= e;
    });
  };

  const filteredVehicles = useMemo(() => {
    const term = vehicleSearch.trim().toLowerCase();
    if (!term) return leasedVehicles;
    return leasedVehicles.filter((v) =>
      [v.vehicleNo, v.plateNo, v.make, v.model]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [leasedVehicles, vehicleSearch]);

  const getContractForVehicleDate = (vehicleId, date) => {
    const list = contractsByVehicleInMonth.get(Number(vehicleId)) || [];
    const dateKey = formatDateStr(date);
    return list.find((c) => {
      const s = formatDateStr(c.startDate);
      const e = formatDateStr(c.endDate);
      return dateKey >= s && dateKey <= e;
    });
  };

  const applyCalendarMonth = (date) => {
    setCurrentDate(new Date(date.getFullYear(), date.getMonth(), 1));
    setSelectedMonth(formatMonthInput(date));
    setSelectedVehicleId(0);
    setSelectedDateKey("");
  };

  const handleMonthInputChange = (value) => {
    setSelectedMonth(value);
    if (!value) return;
    const [y, m] = value.split("-").map(Number);
    if (Number.isFinite(y) && Number.isFinite(m)) {
      setCurrentDate(new Date(y, m - 1, 1));
      setSelectedVehicleId(0);
      setSelectedDateKey("");
    }
  };

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const selectedContract = useMemo(() => {
    if (!selectedVehicleId || !selectedDateKey) return null;
    return getContractForVehicleDate(selectedVehicleId, selectedDateKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId, selectedDateKey, contractsByVehicleInMonth]);

  const selectedAllocation = useMemo(() => {
    if (!selectedVehicleId || !selectedDateKey) return null;
    return getAllocationForVehicleDate(selectedVehicleId, selectedDateKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVehicleId, selectedDateKey, allocationsByVehicleInMonth]);

  const calendarContainerClassName = isFullscreen
    ? "fixed inset-0 z-40 flex flex-col rounded-none border-0 bg-white p-4 shadow-none"
    : "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";

  const calendarViewportClassName = isFullscreen
    ? "min-h-0 flex-1 overflow-auto"
    : "max-h-[70vh] overflow-auto";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader className="mx-auto mb-3 h-8 w-8 animate-spin text-sher-teal" />
          <p className="text-slate-600">Loading lease calendar...</p>
        </div>
      </div>
    );
  }

  const activeCount = contracts.filter(
    (c) => String(c.status).toLowerCase() === "active",
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Lease Calendar</h1>
          <p className="mt-1 text-sm text-slate-500">
            All vehicles currently under a lease contract. Highlighted days show
            trip allocations from Lease Allocations.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600">
        Loaded: {contracts.length} lease contracts ({activeCount} active) |
        Showing: {filteredVehicles.length} leased vehicle(s) | Allocations this
        month:{" "}
        {Array.from(allocationsByVehicleInMonth.values()).reduce(
          (sum, arr) => sum + arr.length,
          0,
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Month
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => handleMonthInputChange(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-sher-teal focus:outline-none"
            />
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Search Vehicle
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                placeholder="Vehicle no, plate, make or model"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm focus:border-sher-teal focus:outline-none"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => applyCalendarMonth(new Date())}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Today
          </button>
        </div>
      </div>

      <div className={calendarContainerClassName}>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Calendar className="h-5 w-5 text-sher-teal" />
            {monthYear}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsFullscreen((current) => !current)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50"
              title={isFullscreen ? "Exit full screen" : "Full screen"}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() =>
                applyCalendarMonth(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() - 1,
                    1,
                  ),
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                applyCalendarMonth(
                  new Date(
                    currentDate.getFullYear(),
                    currentDate.getMonth() + 1,
                    1,
                  ),
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 transition hover:bg-slate-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {filteredVehicles.length === 0 ? (
          <div className="space-y-3 py-10 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-slate-400" />
            <p className="font-medium text-slate-700">
              No vehicles are currently under a lease contract
            </p>
          </div>
        ) : (
          <>
            <div className={calendarViewportClassName}>
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 top-0 z-30 min-w-[180px] border-b border-slate-200 bg-slate-50 px-3 py-3 text-left font-semibold text-slate-700">
                      Vehicle
                    </th>
                    {calendarDates.map((date, idx) => (
                      <th
                        key={idx}
                        className="sticky top-0 z-20 min-w-[60px] border-b border-slate-200 bg-slate-50 px-2 py-3 text-center text-xs font-semibold text-slate-700"
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
                  {filteredVehicles.map((vehicle) => (
                    <tr
                      key={vehicle.id}
                      className="border-b border-slate-200 transition hover:bg-slate-50"
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
                          <span className="mt-1 inline-flex w-fit rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                            On Lease
                          </span>
                        </div>
                      </td>

                      {calendarDates.map((date, idx) => {
                        const allocation = getAllocationForVehicleDate(
                          vehicle.id,
                          date,
                        );
                        const isAllocated = Boolean(allocation);
                        const dateKey = formatDateStr(date);
                        const isSelectedCell =
                          Number(selectedVehicleId || 0) ===
                            Number(vehicle.id || 0) &&
                          selectedDateKey === dateKey;

                        const allocContractId = allocation
                          ? Number(
                              allocation.leaseContractId ||
                                allocation.lease_contract_id ||
                                0,
                            )
                          : 0;
                        const allocContract = allocContractId
                          ? contracts.find(
                              (c) => Number(c.id) === allocContractId,
                            )
                          : null;
                        const allocClient =
                          allocation?.contract?.clientName ||
                          allocation?.clientName ||
                          allocContract?.clientName ||
                          "Lease Trip";
                        const allocDriver =
                          allocation?.driver?.name ||
                          allocation?.driverName ||
                          "";

                        return (
                          <td
                            key={idx}
                            onClick={() => {
                              if (!isAllocated) return;
                              setSelectedVehicleId(Number(vehicle.id || 0));
                              setSelectedDateKey(dateKey);
                              setIsDetailsModalOpen(true);
                            }}
                            className={`group relative border-r border-slate-200 px-2 py-3 text-center transition ${
                              isAllocated
                                ? "cursor-pointer bg-slate-100 hover:bg-slate-200"
                                : "hover:bg-slate-50"
                            } ${isSelectedCell ? "ring-2 ring-cyan-400/70" : ""}`}
                            title={
                              isAllocated
                                ? `${allocClient} — ${formatLongDate(allocation.startDate)} to ${formatLongDate(allocation.endDate)}${allocDriver ? " — Driver: " + allocDriver : ""}`
                                : ""
                            }
                          >
                            {isAllocated ? (
                              <div className="flex items-center justify-center">
                                <div className="w-full space-y-1 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-left">
                                  <div
                                    className={`rounded border px-1 py-0.5 text-[10px] font-semibold ${colorClassForContract(allocContractId)}`}
                                  >
                                    <div className="truncate">
                                      {allocClient}
                                    </div>
                                    <div className="truncate text-[9px] font-medium opacity-80">
                                      {allocDriver ||
                                        allocation.status ||
                                        "Allocated"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Details modal */}
            {isDetailsModalOpen && selectedContract && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  setSelectedVehicleId(0);
                  setSelectedDateKey("");
                }}
              >
                <div
                  className="max-h-[85vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-900">
                          Lease Details ({formatLongDate(selectedDateKey)})
                        </h3>
                        <p className="text-xs text-slate-600">
                          {selectedContract.clientName || "Lease"} — Contract #
                          {selectedContract.id}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDetailsModalOpen(false);
                          setSelectedVehicleId(0);
                          setSelectedDateKey("");
                        }}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Close
                      </button>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="border-b border-slate-200/80 bg-[linear-gradient(140deg,rgba(99,102,241,0.08),rgba(56,189,248,0.08))] px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-800">
                            {selectedContract.clientName || "Lease"} — #
                            {selectedContract.id}
                          </div>
                          <span
                            className={`rounded-md border px-2 py-1 text-xs ${statusBadgeClass(selectedContract.status)}`}
                          >
                            {selectedContract.status}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-3 p-4 text-xs md:grid-cols-3">
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">
                            Lease Type
                          </div>
                          <div className="mt-1 font-semibold text-slate-800">
                            {selectedContract.leaseType || "-"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">
                            Start Date
                          </div>
                          <div className="mt-1 font-semibold text-slate-800">
                            {formatLongDate(selectedContract.startDate)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">
                            End Date
                          </div>
                          <div className="mt-1 font-semibold text-slate-800">
                            {formatLongDate(selectedContract.endDate)}
                          </div>
                        </div>
                        {selectedContract.monthlyRate && (
                          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                            <div className="text-[10px] uppercase tracking-wide text-slate-500">
                              Monthly Rate
                            </div>
                            <div className="mt-1 font-semibold text-slate-800">
                              {selectedContract.monthlyRate}
                            </div>
                          </div>
                        )}
                        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                          <div className="text-[10px] uppercase tracking-wide text-slate-500">
                            Vehicles in Contract
                          </div>
                          <div className="mt-1 font-semibold text-slate-800">
                            {selectedContract.vehicleIds.length}
                          </div>
                        </div>
                      </div>
                      {selectedAllocation && (
                        <div className="border-t border-slate-200 bg-slate-50/40 px-4 py-3">
                          <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                            Trip Allocation
                          </div>
                          <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-3">
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                Driver
                              </div>
                              <div className="mt-1 font-semibold text-slate-800">
                                {selectedAllocation.driver?.name ||
                                  selectedAllocation.driverName ||
                                  "Unassigned"}
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                Allocation Period
                              </div>
                              <div className="mt-1 font-semibold text-slate-800">
                                {formatLongDate(selectedAllocation.startDate)} —{" "}
                                {formatLongDate(selectedAllocation.endDate)}
                              </div>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                Status
                              </div>
                              <div className="mt-1 font-semibold text-slate-800">
                                {selectedAllocation.status || "Allocated"}
                              </div>
                            </div>
                            {(selectedAllocation.itinerary ||
                              selectedAllocation.fuelNotes ||
                              selectedAllocation.fuel_notes) && (
                              <div className="rounded-xl border border-slate-200 bg-white p-3 md:col-span-3">
                                {selectedAllocation.itinerary && (
                                  <>
                                    <div className="text-[10px] uppercase tracking-wide text-slate-500">
                                      Itinerary
                                    </div>
                                    <div className="mt-1 whitespace-pre-line text-slate-700">
                                      {selectedAllocation.itinerary}
                                    </div>
                                  </>
                                )}
                                {(selectedAllocation.fuelNotes ||
                                  selectedAllocation.fuel_notes) && (
                                  <>
                                    <div className="mt-2 text-[10px] uppercase tracking-wide text-slate-500">
                                      Fuel Notes
                                    </div>
                                    <div className="mt-1 whitespace-pre-line text-slate-700">
                                      {selectedAllocation.fuelNotes ||
                                        selectedAllocation.fuel_notes}
                                    </div>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
