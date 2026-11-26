import ReportDateInput from "../components/ReportDateInput";
import { formatReportDate } from "../utils/reportDate";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import Swal from "sweetalert2";
import {
  ArrowUpRight,
  ArrowRightLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  Loader2,
  FileSpreadsheet,
  Fuel,
  Gauge,
  Info,
  X,
  Pencil,
  Printer,
  Search,
  Trash2,
} from "lucide-react";
import { isTripComplete, previousTripDefaults } from "../utils/fuelTrip";
import { apiFetch } from "../utils/api";
import { hasPermission } from "../utils/auth";

const empty = {
  filled_at: `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
  litres_filled: "",
  litres_filled_end: "",
  extra_litres: "0",
  start_km: "",
  end_km: "",
};
const fields = [
  ["filled_at", "Full refill date", "date"],
  ["litres_filled", "Litres filled at beginning", "number"],
  ["litres_filled_end", "Litres filled at end of safari (optional)", "number"],
  ["extra_litres", "Extra litres during safari", "number"],
  ["start_km", "Start KM", "number"],
  ["end_km", "End KM (optional until return)", "number"],
];
const fmt = (n) =>
  n === null || n === undefined
    ? "—"
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
const vehicleLabel = (v) =>
  v?.plate_no || "—";
const allocationKey = (allocation) =>
  `${allocation?.allocation_type || "safari"}:${allocation?.id}`;
const allocationGroupKey = (allocation) =>
  allocation?.allocation_type === "long_term"
    ? allocationKey(allocation)
    : `safari:${allocation?.lead_id || allocation?.lead?.id || allocation?.id}`;
const entryKey = (entry) =>
  entry.lease_allocation_id
    ? `long_term:${entry.lease_allocation_id}`
    : `safari:${entry.safari_allocation_id}`;
const averageClass = (average) =>
  average === null || average === undefined
    ? ""
    : Number(average) < 6.5
      ? "bg-red-100 text-red-800"
      : Number(average) < 7
        ? "bg-yellow-100 text-yellow-800"
        : "bg-green-100 text-green-800";

export default function FuelManagement() {
  const [data, setData] = useState({
    allocations: [],
    entries: [],
    profiles: [],
    transfer_vehicles: [],
  });
  const [selectedSafari, setSelectedSafari] = useState("");
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState(empty);
  const [transferForm, setTransferForm] = useState(empty);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showSafariModal, setShowSafariModal] = useState(false);
  const [search, setSearch] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const [completedOnly, setCompletedOnly] = useState(false);
  const [incompleteOnly, setIncompleteOnly] = useState(false);
  async function load() {
    const response = await apiFetch("/fuel-management");
    const payload = await response.json();
    if (!response.ok)
      throw new Error(payload.message || "Unable to load fuel management.");
    setData(payload);
  }
  useEffect(() => {
    load()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!showTransferModal && !showSafariModal) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !saving) {
        setShowTransferModal(false);
        setShowSafariModal(false);
      }
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [showTransferModal, showSafariModal, saving]);
  const availableAllocations = useMemo(
    () =>
      data.allocations.filter(
        (allocation) =>
          allocationKey(allocation) === selected ||
          !data.entries.some(
            (entry) =>
              entryKey(entry) === allocationKey(allocation) &&
              isTripComplete(entry),
          ),
      ),
    [data.allocations, data.entries, selected],
  );
  const safariOptions = useMemo(() => {
    const groups = new Map();
    for (const allocation of availableAllocations) {
      const value = allocationGroupKey(allocation);
      const current = groups.get(value);
      const vehicleCount = (current?.vehicleCount || 0) + 1;
      const drivers = current?.drivers || new Set();
      drivers.add(allocation.driver?.name || "Unassigned driver");
      groups.set(value, {
        value,
        vehicleCount,
        allocation,
        drivers,
      });
    }

    return Array.from(groups.values()).map(({ value, vehicleCount, allocation, drivers }) => ({
      value,
      label:
        allocation.allocation_type === "long_term"
          ? `Long term #${allocation.id} · ${allocation.group_name || allocation.lease_contract?.group_name || allocation.lease_contract?.client_name || "Lease"} · ${Array.from(drivers).join(", ")}`
          : `Safari · ${allocation.lead?.group_name || "Safari"} · ${allocation.lead?.booking_ref || "No booking reference"} · ${Array.from(drivers).join(", ")}${vehicleCount > 1 ? ` · ${vehicleCount} vehicles` : ""}`,
    }));
  }, [availableAllocations]);
  const safariVehicleOptions = useMemo(
    () =>
      availableAllocations
        .filter(
          (allocation) => allocationGroupKey(allocation) === selectedSafari,
        )
        .map((allocation) => ({
          value: allocationKey(allocation),
          label: `${vehicleLabel(allocation.vehicle)} · ${allocation.driver?.name || "Unassigned driver"}`,
        })),
    [availableAllocations, selectedSafari],
  );
  const allocation = data.allocations.find(
    (a) => allocationKey(a) === selected,
  );
  const existing = data.entries.find((e) => entryKey(e) === selected);
  function selectSafari(id) {
    setShowSafariModal(true);
    setMessage("");
    const a = data.allocations.find((item) => allocationKey(item) === id);
    const entry = data.entries.find((item) => entryKey(item) === id);
    setSelectedSafari(a ? allocationGroupKey(a) : "");
    setSelected(id);
    setForm(
      entry
        ? Object.fromEntries(fields.map(([key]) => [key, entry[key] ?? ""]))
        : { ...empty, ...previousTripDefaults(data.entries, a) },
    );
  }
  function selectSafariGroup(groupId) {
    setSelectedSafari(groupId);
    setSelected("");
    setForm({ ...empty });
    setMessage("");

    const matches = availableAllocations.filter(
      (item) => allocationGroupKey(item) === groupId,
    );
    if (matches.length === 1) {
      selectSafari(allocationKey(matches[0]));
    }
  }
  function selectSafariVehicle(allocationId) {
    if (allocationId) {
      selectSafari(allocationId);
      return;
    }
    setSelected("");
    setForm({ ...empty });
    setMessage("");
  }
  async function save(event) {
    event.preventDefault();
    if (saveLock.current || !allocation) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(
        `/fuel-management/${allocation.allocation_type === "long_term" ? "long-term" : "safari"}/${allocation.id}`,
        {
          method: "PUT",
          body: { ...form, end_km: form.end_km === "" ? null : form.end_km, litres_filled_end: form.litres_filled_end === "" ? null : form.litres_filled_end },
        },
      );
      const payload = await response.json();
      if (!response.ok)
        throw new Error(
          payload.errors
            ? Object.values(payload.errors).flat().join(" ")
            : payload.message,
        );
      setSelected("");
      setSelectedSafari("");
      setForm({ ...empty });
      setShowSafariModal(false);
      setMessage("Fuel entry saved.");
      try {
        await load();
      } catch {
        window.location.reload();
      }
    } catch (e) {
      setError(e.message);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  async function saveTransfer(event) {
    event.preventDefault();
    const vehicle = data.transfer_vehicles?.[0];
    if (saveLock.current || !vehicle) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await apiFetch(selectedTransfer ? `/fuel-management/transfer/${selectedTransfer.id}` : "/fuel-management/transfer", {
        method: selectedTransfer ? "PUT" : "POST",
        body: { ...transferForm, end_km: transferForm.end_km === "" ? null : transferForm.end_km, litres_filled_end: transferForm.litres_filled_end === "" ? null : transferForm.litres_filled_end },
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.errors ? Object.values(payload.errors).flat().join(" ") : payload.message);
      setSelectedTransfer(null);
      setTransferForm({ ...empty });
      setShowTransferModal(false);
      setMessage("Transfer fuel entry saved.");
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  }
  const rows = useMemo(
    () =>
      data.entries.filter((e) => {
        const text = [
          e.safari_allocation?.lead?.booking_ref,
          e.safari_allocation?.lead?.group_name,
          e.lease_allocation?.group_name,
          e.lease_allocation?.lease_contract?.client_name,
          vehicleLabel(e.vehicle),
          e.driver?.name,
        ]
          .join(" ")
          .toLowerCase();
        return (
          ((!completedOnly && !incompleteOnly) ||
            (completedOnly && isTripComplete(e)) ||
            (incompleteOnly && !isTripComplete(e))) &&
          text.includes(search.toLowerCase()) &&
          (!vehicleId || String(e.vehicle_id) === vehicleId) &&
          (!driverId || String(e.driver_id || "") === driverId) &&
          (!dateFrom || e.filled_at >= dateFrom) &&
          (!dateTo || e.filled_at <= dateTo)
        );
      }),
    [data.entries, search, vehicleId, driverId, dateFrom, dateTo, completedOnly, incompleteOnly],
  );
  const vehicleOptions = useMemo(
    () =>
      [...new Map(data.entries.map((e) => [e.vehicle_id, e.vehicle])).entries()]
        .filter(([id]) => id)
        .sort(([, first], [, second]) =>
          vehicleLabel(first).localeCompare(vehicleLabel(second)),
        ),
    [data.entries],
  );
  const driverOptions = useMemo(
    () =>
      [...new Map(data.entries.map((e) => [e.driver_id, e.driver])).entries()]
        .filter(([id, driver]) => id && driver)
        .sort(([, first], [, second]) =>
          (first?.name || "").localeCompare(second?.name || ""),
        ),
    [data.entries],
  );
  const clearFilters = () => {
    setSearch("");
    setVehicleId("");
    setDriverId("");
    setDateFrom("");
    setDateTo("");
    setCompletedOnly(false);
    setIncompleteOnly(false);
  };
  const exportRows = rows.map((e) => ({
    safari:
      e.safari_allocation?.lead?.booking_ref ||
      e.lease_allocation?.lease_contract?.client_name ||
      "",
    vehicle: vehicleLabel(e.vehicle),
    driver: e.driver?.name || "Unassigned",
    date: formatReportDate(e.filled_at),
    litres_beginning: e.litres_filled,
    litres_end: e.litres_filled_end,
    extra_litres: e.extra_litres,
    consumed_litres: e.litres_consumed,
    start_km: e.start_km,
    end_km: e.end_km,
    km_done: e.km_done,
    average_km_per_litre: e.vehicle_average,
  }));
  const csvValue = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const exportCsv = () => {
    const headers = Object.keys(
      exportRows[0] || {
        safari: "",
        vehicle: "",
        driver: "",
        date: "",
        litres_beginning: "",
        litres_end: "",
        extra_litres: "",
        consumed_litres: "",
        start_km: "",
        end_km: "",
        km_done: "",
        average_km_per_litre: "",
      },
    );
    const content = [
      headers,
      ...exportRows.map((row) => headers.map((key) => row[key])),
    ]
      .map((line) => line.map(csvValue).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob(["\ufeff" + content], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "safari-fuel-averages.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportExcel = () => {
    const headers = [
      "Safari / Booking",
      "Vehicle",
      "Driver",
      "Date",
      "Litres beginning",
      "Litres end",
      "Extra litres",
      "Consumed litres",
      "Start KM",
      "End KM",
      "KM done",
      "Average km/L",
    ];
    const body = exportRows.map((row) => [
      row.safari,
      row.vehicle,
      row.driver,
      row.date,
      row.litres_beginning,
      row.litres_end,
      row.extra_litres,
      row.consumed_litres,
      row.start_km,
      row.end_km,
      row.km_done,
      row.average_km_per_litre,
    ]);
    const table = `<table><thead><tr>${headers.map((header) => `<th>${header}</th>`).join("")}</tr></thead><tbody>${body
      .map(
        (line) =>
          `<tr>${line
            .map(
              (value) =>
                `<td>${String(value ?? "")
                  .replaceAll("&", "&amp;")
                  .replaceAll("<", "&lt;")}</td>`,
            )
            .join("")}</tr>`,
      )
      .join("")}</tbody></table>`;
    const url = URL.createObjectURL(
      new Blob([`<html><meta charset="utf-8"><body>${table}</body></html>`], {
        type: "application/vnd.ms-excel",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "safari-fuel-averages.xls";
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportPdf = async () => {
    const params = new URLSearchParams({
      vehicleId,
      driverId,
      dateFrom,
      dateTo,
    });
    if (search) params.set("search", search);
    try {
      const response = await apiFetch(
        `/fuel-management/export/pdf?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Unable to generate the fuel PDF.");
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url;
      link.download = "safari-fuel-averages.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    }
  };
  const deleteEntry = async (entry) => {
    const result = await Swal.fire({
      title: "Delete fuel entry?",
      text: `Delete the fuel entry for ${vehicleLabel(entry.vehicle)}? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#dc2626",
      focusCancel: true,
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      allowEscapeKey: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          const type = entry.is_transfer ? "transfer" : (entry.lease_allocation_id ? "long-term" : "safari");
          const id = entry.is_transfer ? entry.id : (entry.lease_allocation_id || entry.safari_allocation_id);
          const response = await apiFetch(`/fuel-management/${type}/${id}`, {
            method: "DELETE",
          });
          const payload = await response.json();
          if (!response.ok)
            throw new Error(payload.message || "Unable to delete fuel entry.");
          return true;
        } catch (error) {
          Swal.showValidationMessage("Unable to delete fuel entry.");
          const validation = Swal.getValidationMessage();
          if (validation) validation.textContent = error.message || "Unable to delete fuel entry.";
          return false;
        }
      },
    });
    if (!result.isConfirmed) return;
    setError("");
    setMessage("Fuel entry deleted.");
    if (selected === entryKey(entry)) {
      setSelected("");
      setSelectedSafari("");
      setForm(empty);
    }
    try {
      await load();
    } catch {
      setData(current => ({ ...current, entries: current.entries.filter(item => item.id !== entry.id) }));
      setError("Fuel entry deleted, but records could not refresh. Please refresh the page.");
    }
    await Swal.fire({
      icon: "success",
      title: "Deleted",
      text: "Fuel entry deleted successfully.",
      timer: 1500,
      showConfirmButton: false,
    });
  };
  const completed = rows.filter((e) => e.driver_average !== null);
  const consumed = completed.reduce(
    (sum, e) => sum + Number(e.litres_consumed),
    0,
  );
  const distance = completed.reduce((sum, e) => sum + Number(e.km_done), 0);
  return (
    <div className="min-h-full space-y-6 bg-slate-50/70 p-4 sm:p-6">
      {saving && <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" role="status" aria-live="polite"><div className="bg-white rounded-xl p-6 flex items-center gap-3"><Loader2 className="w-6 h-6 animate-spin text-blue-600" />Saving and refreshing fuel records…</div></div>}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-sher-teal px-5 py-6 text-white shadow-xl sm:px-8 sm:py-8">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-sher-gold/20 blur-2xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sher-gold">
              <Fuel className="h-3.5 w-3.5" /> Fleet operations
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Fuel Management</h1>
            <p className="mt-2 max-w-xl !text-white text-sm sm:text-base">
              Capture refills, track consumption, and keep every safari’s fuel story in one place.
            </p>
          </div>
          <Link to="/fuel-report" className="inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-lg transition hover:-translate-y-0.5 hover:bg-sher-gold">
            View consumption report <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      {error && (
        <div role="alert" className="p-3 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="p-3 bg-green-50 text-green-700 rounded-lg"
        >
          {message}
        </div>
      )}
      {loading ? (
        <p role="status" className="flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" />Loading fuel records…</p>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4 print:hidden sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                  <h2 className="font-semibold text-slate-900">
                  Filter safari fuel
                </h2>
                  <p className="text-sm text-slate-500">
                  Filter the list by search, vehicle, driver, or date.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sher-teal hover:bg-slate-50"
                  onClick={exportCsv}
                  title="Export filtered rows as CSV"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sher-teal hover:bg-slate-50"
                  onClick={exportExcel}
                  title="Export filtered rows for Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-sher-teal hover:bg-slate-50"
                  onClick={exportPdf}
                  title="Print filtered rows or save as PDF"
                >
                  <Printer className="w-4 h-4" /> PDF Report
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <input
                aria-label="Search fuel records"
                placeholder="Search booking, vehicle or driver"
                className="min-w-[220px] flex-1 rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 outline-none transition focus:border-sher-teal focus:ring-4 focus:ring-sher-teal/10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Filter by vehicle"
                className="rounded-xl border border-slate-200 bg-white p-2.5 outline-none focus:border-sher-teal"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
              >
                <option value="">All vehicles</option>
                {vehicleOptions.map(([id, vehicle]) => (
                  <option key={id} value={id}>
                    {vehicleLabel(vehicle)}
                  </option>
                ))}
              </select>
              <select
                aria-label="Filter by driver"
                className="rounded-xl border border-slate-200 bg-white p-2.5 outline-none focus:border-sher-teal"
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
              >
                <option value="">All drivers</option>
                {driverOptions.map(([id, driver]) => (
                  <option key={id} value={id}>
                    {driver.name}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                From
                <ReportDateInput
                  aria-label="Filter from date"
                  type="date"
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-900 outline-none focus:border-sher-teal"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                To
                <ReportDateInput
                  aria-label="Filter to date"
                  type="date"
                  className="rounded-xl border border-slate-200 p-2.5 text-slate-900 outline-none focus:border-sher-teal"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="rounded-xl border border-slate-200 px-3 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Safaris", rows.length],
              [
                "Incomplete trips",
                rows.filter((e) => !isTripComplete(e)).length,
              ],
              ["Fuel consumed • scored safaris (L)", completed.length ? fmt(consumed) : "—"],
              [
                "Fleet average • scored safaris (km/L)",
                consumed ? fmt(distance / consumed) : "—",
              ],
            ].map(([label, value]) => (
              <div key={label} className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-5">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
                  <Gauge className="h-4 w-4 text-sher-teal transition group-hover:text-sher-gold" />
                </div>
                <p className="text-2xl font-bold tracking-tight text-slate-900">{value}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            {data.transfer_vehicles?.length > 0 && (
              <button type="button" onClick={() => { setSelectedTransfer(null); setTransferForm({ ...empty }); setShowTransferModal(true); }} className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700">
                Record transfer fuel
              </button>
            )}
            <button type="button" onClick={() => { setSelectedSafari(""); setSelected(""); setForm({ ...empty }); setShowSafariModal(true); }} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700">
              Record safari fuel
            </button>
          </div>
          {data.transfer_vehicles?.length > 0 && showTransferModal && (<>
            <div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" onClick={() => !saving && setShowTransferModal(false)} />
            <form role="dialog" aria-modal="true" aria-labelledby="transfer-fuel-title" onSubmit={saveTransfer} className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(92vh,760px)] w-[min(94vw,860px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl print:hidden">
              <div className="relative overflow-hidden bg-gradient-to-br from-amber-600 via-orange-600 to-rose-600 px-5 py-5 text-white sm:px-7 sm:py-6">
                <div className="absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl" />
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-white/15 p-3 ring-1 ring-white/20"><ArrowRightLeft className="h-6 w-6" /></div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-100">Fleet operations</p>
                      <h2 id="transfer-fuel-title" className="mt-1 text-2xl font-bold tracking-tight">{selectedTransfer ? "Edit transfer fuel" : "Record transfer fuel"}</h2>
                      <p className="mt-1 max-w-xl text-sm text-amber-50">Capture fuel and odometer readings for a transfer vehicle outside a safari job card.</p>
                    </div>
                  </div>
                  <button type="button" aria-label="Close transfer fuel modal" onClick={() => setShowTransferModal(false)} className="rounded-xl p-2 text-white/80 transition hover:bg-white/15 hover:text-white"><X className="h-5 w-5" /></button>
                </div>
              </div>
              <div className="overflow-y-auto p-5 sm:p-7">
                <div className="grid gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-sm sm:grid-cols-3">
                  <div><span className="block text-xs font-semibold uppercase tracking-wide text-amber-700">Vehicle</span><strong className="mt-1 block text-slate-900">{vehicleLabel(data.transfer_vehicles[0])}</strong></div>
                  <div><span className="block text-xs font-semibold uppercase tracking-wide text-amber-700">Driver</span><strong className="mt-1 block text-slate-900">{data.transfer_vehicles[0].assigned_driver?.name || "Unassigned"}</strong></div>
                  <div><span className="block text-xs font-semibold uppercase tracking-wide text-amber-700">Record type</span><strong className="mt-1 block text-slate-900">Transfer fuel</strong></div>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {fields.map(([key, label, type]) => (
                    <label key={key} className="text-sm font-semibold text-slate-700"><span>{label}{!["end_km", "litres_filled_end"].includes(key) && <span className="ml-1 text-rose-500">*</span>}</span>
                      {type === "date" ? <ReportDateInput required className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-normal text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10" value={transferForm[key]} onChange={(e) => setTransferForm({ ...transferForm, [key]: e.target.value })} /> : <input type={type} disabled={saving} required={!['end_km', 'litres_filled_end'].includes(key)} min={key === 'end_km' ? transferForm.start_km : '0'} step={key.endsWith('_km') ? '1' : '0.01'} className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-normal text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/10" value={transferForm[key]} onChange={(e) => setTransferForm({ ...transferForm, [key]: e.target.value })} />}
                    </label>
                  ))}
                </div>
                <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><p>KM done: <strong className="text-slate-900">{isTripComplete(transferForm) && transferForm.start_km !== "" ? fmt(Number(transferForm.end_km) - Number(transferForm.start_km)) : "—"}</strong>. Average is calculated after end KM and end litres are entered.</p></div>
              </div>
              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
                <button type="button" onClick={() => setShowTransferModal(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900">Cancel</button>
                <button disabled={saving || !hasPermission(selectedTransfer ? "odometer-logs.update" : "odometer-logs.create")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-600/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saving ? "Saving…" : selectedTransfer ? "Update transfer entry" : "Save transfer entry"}</button>
              </div>
            </form>
          </>)}
          {showSafariModal && <><div className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm" onClick={() => !saving && setShowSafariModal(false)} /><form role="dialog" aria-modal="true" aria-labelledby="safari-fuel-title" onSubmit={save} className="fixed left-1/2 top-1/2 z-50 flex max-h-[min(92vh,820px)] w-[min(94vw,900px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl print:hidden">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-sher-teal px-5 py-5 text-white sm:px-7 sm:py-6">
              <div className="absolute -right-8 -top-16 h-48 w-48 rounded-full bg-sher-gold/20 blur-2xl" />
              <div className="relative flex items-start justify-between gap-4">
                <div className="flex items-start gap-3"><div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15"><CalendarDays className="h-6 w-6 text-sher-gold" /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-sher-gold">Safari operations</p><h2 id="safari-fuel-title" className="mt-1 text-2xl font-bold tracking-tight">{existing ? "Edit safari fuel" : "Record safari fuel"}</h2><p className="mt-1 max-w-xl text-sm text-slate-300">Log the refill and odometer readings for a safari or lease allocation.</p></div></div>
                <button type="button" aria-label="Close safari fuel modal" onClick={() => setShowSafariModal(false)} className="rounded-xl p-2 text-white/70 transition hover:bg-white/10 hover:text-white"><X className="h-5 w-5" /></button>
              </div>
            </div>
            <div className="overflow-y-auto p-5 sm:p-7">
            <div className="text-sm">
              <label htmlFor="fuel-safari" className="mb-1.5 block text-sm font-semibold text-slate-700">Safari or allocation <span className="text-rose-500">*</span></label>
              <Select
                inputId="fuel-safari"
                name="safari_allocation_id"
                options={safariOptions}
                value={
                  safariOptions.find(
                    (option) => option.value === selectedSafari,
                  ) || null
                }
                onChange={(option) =>
                  selectSafariGroup(option?.value || "")
                }
                isDisabled={saving}
                isSearchable
                isClearable
                required
                placeholder="Search safari, booking, vehicle or driver…"
                noOptionsMessage={() => "No matching safaris"}
                classNamePrefix="safari-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    minHeight: 48,
                    borderRadius: 12,
                    borderColor: "#e2e8f0",
                    boxShadow: "none",
                  }),
                  menu: (base) => ({ ...base, zIndex: 20 }),
                }}
              />
            </div>
            {selectedSafari && safariVehicleOptions.length > 1 && (
              <div className="text-sm">
                  <label htmlFor="fuel-vehicle" className="mb-1.5 block text-sm font-semibold text-slate-700">Vehicle <span className="text-rose-500">*</span></label>
                <Select
                  inputId="fuel-vehicle"
                  name="vehicle_allocation_id"
                  options={safariVehicleOptions}
                  value={
                    safariVehicleOptions.find(
                      (option) => option.value === selected,
                    ) || null
                  }
                  onChange={(option) =>
                    selectSafariVehicle(option?.value || "")
                  }
                  isDisabled={saving}
                  isSearchable
                  isClearable
                  required
                  placeholder="Select the vehicle for this safari…"
                  noOptionsMessage={() => "No available vehicles"}
                  classNamePrefix="safari-vehicle-select"
                  styles={{
                    control: (base) => ({
                      ...base,
                      minHeight: 48,
                      borderRadius: 12,
                      borderColor: "#e2e8f0",
                      boxShadow: "none",
                    }),
                    menu: (base) => ({ ...base, zIndex: 20 }),
                  }}
                />
              </div>
            )}
            {allocation && (
              <>
                <div className="mt-5 grid gap-3 rounded-2xl border border-teal-100 bg-teal-50/70 p-4 text-sm md:grid-cols-3">
                  <p>
                    {allocation.allocation_type === "long_term"
                      ? "Lease"
                      : "Booking"}
                    :{" "}
                    <strong>
                      {allocation.allocation_type === "long_term"
                        ? allocation.group_name ||
                          allocation.lease_contract?.client_name ||
                          "—"
                        : allocation.lead?.booking_ref || "—"}
                    </strong>
                  </p>
                  <p>
                    Car: <strong>{vehicleLabel(allocation.vehicle)}</strong>
                  </p>
                  <p>
                    Driver:{" "}
                    <strong>{allocation.driver?.name || "Unassigned"}</strong>
                  </p>
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {fields.map(([key, label, type]) => (
                    <label key={key} className="text-sm font-semibold text-slate-700">
                      {label}{!["end_km", "litres_filled_end"].includes(key) && <span className="ml-1 text-rose-500">*</span>}
                      {type === "date" ? <ReportDateInput
                        required className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-normal text-slate-900 outline-none transition focus:border-sher-teal focus:bg-white focus:ring-4 focus:ring-sher-teal/10"
                        value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      /> : <input
                        type={type}
                        disabled={saving}
                        required={!["end_km", "litres_filled_end"].includes(key)}
                        min={key === "end_km" ? form.start_km : "0"}
                        step={key.endsWith("_km") ? "1" : "0.01"}
                        className="mt-1.5 block w-full rounded-xl border border-slate-200 bg-slate-50 p-3 font-normal text-slate-900 outline-none transition focus:border-sher-teal focus:bg-white focus:ring-4 focus:ring-sher-teal/10"
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                      />}
                    </label>
                  ))}
                </div>
                <div className="mt-5 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-sher-teal" /><p>
                  KM done:{" "}
                  <strong>
                    {isTripComplete(form) && form.start_km !== ""
                      ? fmt(Number(form.end_km) - Number(form.start_km))
                      : "—"}
                  </strong>
                  . You can save beginning readings now. Average is calculated only after end KM and end litres are entered.
                </p></div>
              </>
            )}
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:px-7">
              <button type="button" onClick={() => setShowSafariModal(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white hover:text-slate-900">Cancel</button>
              {allocation && <button
                  disabled={
                    saving ||
                    !hasPermission(
                      existing
                        ? "odometer-logs.update"
                        : "odometer-logs.create",
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-slate-950 to-sher-teal px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}{saving
                    ? "Saving…"
                    : existing
                      ? "Update entry"
                      : "Save entry"}
                </button>}
            </div>
          </form></>}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:border-0">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
              <div>
                <h2 className="font-semibold text-slate-900">Safari fuel and averages</h2>
                <div className="mt-3 flex flex-wrap gap-3" aria-label="Filter units by completion status">
                  <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${completedOnly ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-700"}`}>
                    <input className="h-4 w-4 accent-emerald-600" type="checkbox" checked={completedOnly} onChange={e => setCompletedOnly(e.target.checked)} />
                    Complete units
                  </label>
                  <label className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${incompleteOnly ? "border-amber-300 bg-amber-50 text-amber-800" : "border-slate-200 bg-white text-slate-700"}`}>
                    <input className="h-4 w-4 accent-amber-600" type="checkbox" checked={incompleteOnly} onChange={e => setIncompleteOnly(e.target.checked)} />
                    Incomplete units
                  </label>
                </div>
                <p className="text-sm text-gray-600">Benchmark: 7 km/L · Red: &lt;6.5 · Yellow: 6.5–&lt;7 · Green: ≥7</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Click Edit to add end KM or extra fuel after a safari returns.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead className="bg-gray-50">
                  <tr>
                    {[
                      "Safari / Booking",
                      "Car",
                      "Driver",
                      "Refill date",
                      "Litres filled at beginning",
                      "Litres filled at end",
                      "Extra L",
                      "Consumed L",
                      "Start KM",
                      "End KM",
                      "KM done",
                      "Average km/L",
                                      "",
                    ].map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e) => (
                    <tr key={e.id} className="border-t">
                      <td className="px-4 py-3">
                        {e.is_transfer ? "Transfer"
                        : e.lease_allocation_id
                          ? e.lease_allocation?.group_name ||
                            e.lease_allocation?.lease_contract?.group_name ||
                            e.lease_allocation?.lease_contract?.client_name ||
                            "Long-term lease"
                          : e.safari_allocation?.lead?.group_name || "Safari"}
                        <div className="text-xs text-gray-500">
                          {e.is_transfer ? "Transfer fuel · no job card"
                          : e.lease_allocation_id
                            ? `Long term #${e.lease_allocation_id}${e.lease_allocation?.lease_contract?.client_name ? ` · ${e.lease_allocation.lease_contract.client_name}` : ""}`
                            : [
                                e.safari_allocation_id ? `#${e.safari_allocation_id}` : null,
                                e.safari_allocation?.lead?.booking_ref || "No booking reference",
                              ].filter(Boolean).join(" · ")}
                        </div>
                      </td>
                      <td className="px-4 py-3">{vehicleLabel(e.vehicle)}</td>
                      <td className="px-4 py-3">
                        {e.driver?.name || "Unassigned"}
                      </td>
                      <td className="px-4 py-3">{formatReportDate(e.filled_at)}</td>
                      {[
                        "litres_filled",
                        "litres_filled_end",
                        "extra_litres",
                        "litres_consumed",
                        "start_km",
                        "end_km",
                        "km_done",
                        "vehicle_average",
                      ].map((k) => (
                        <td key={k} className={`px-4 py-3 ${k === "vehicle_average" ? averageClass(e[k]) + " font-semibold" : ""}`}>
                          {fmt(e[k])}
                        </td>
                      ))}
                      <td className="px-4 py-3 print:hidden">
                        <div className="flex items-center gap-3">
                          <button
                            className="inline-flex items-center gap-1 text-blue-600"
                            title="Edit fuel entry"
                            onClick={() => {
                              if (e.is_transfer) {
                                setSelectedTransfer(e);
                                setTransferForm(Object.fromEntries(fields.map(([key]) => [key, e[key] ?? ""])));
                                setShowTransferModal(true);
                                window.scrollTo({ top: 0, behavior: "smooth" });
                                return;
                              }
                              selectSafari(entryKey(e));
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            <Pencil className="w-4 h-4" /> Edit
                          </button>
                          <button
                            className="inline-flex items-center gap-1 text-red-600"
                            title="Delete fuel entry"
                            onClick={() => deleteEntry(e)}
                          >
                            <Trash2 className="w-4 h-4" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <p className="p-8 text-center text-gray-500">
                  No fuel entries match. Select a safari above to record its
                  fuel.
                </p>
              )}
            </div>
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>
              Fuel after safari = end litres entered on this safari. Consumption = extra litres + fuel after
              safari. Average = total distance ÷ total fuel consumed.
            </p>
            <p>
              Fuel average benchmark: 7 km/L. Red: below 6.5 km/L; yellow: 6.5 to below 7 km/L; green: 7 km/L or above.
              Pending or flagged entries are excluded from the fleet average.
              Enter both end KM and end litres to complete a trip.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
