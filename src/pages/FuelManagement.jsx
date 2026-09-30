import ReportDateInput from "../components/ReportDateInput";
import { formatReportDate } from "../utils/reportDate";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import Select from "react-select";
import Swal from "sweetalert2";
import {
  Download,
  Loader2,
  FileSpreadsheet,
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
  });
  const [selected, setSelected] = useState("");
  const [form, setForm] = useState(empty);
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
  const safariOptions = useMemo(
    () =>
      data.allocations.filter((a) => allocationKey(a) === selected || !data.entries.some(e => entryKey(e) === allocationKey(a) && isTripComplete(e))).map((a) => ({
        value: allocationKey(a),
        label:
          a.allocation_type === "long_term"
            ? `Long term #${a.id} · ${a.group_name || a.lease_contract?.group_name || a.lease_contract?.client_name || "Lease"} · ${vehicleLabel(a.vehicle)} · ${a.driver?.name || "Unassigned"}`
            : `Safari #${a.id} · ${a.lead?.group_name || "Safari"} · ${a.lead?.booking_ref || "No booking reference"} · ${vehicleLabel(a.vehicle)} · ${a.driver?.name || "Unassigned"}`,
      })),
    [data.allocations, data.entries, selected],
  );
  const allocation = data.allocations.find(
    (a) => allocationKey(a) === selected,
  );
  const existing = data.entries.find((e) => entryKey(e) === selected);
  function selectSafari(id) {
    setSelected(id);
    setMessage("");
    const a = data.allocations.find((item) => allocationKey(item) === id);
    const entry = data.entries.find((item) => entryKey(item) === id);
    setForm(
      entry
        ? Object.fromEntries(fields.map(([key]) => [key, entry[key] ?? ""]))
        : { ...empty, ...previousTripDefaults(data.entries, a) },
    );
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
      setForm({ ...empty });
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
          const type = entry.lease_allocation_id ? "long-term" : "safari";
          const id = entry.lease_allocation_id || entry.safari_allocation_id;
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
    <div className="p-6 space-y-6">
      {saving && <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center" role="status" aria-live="polite"><div className="bg-white rounded-xl p-6 flex items-center gap-3"><Loader2 className="w-6 h-6 animate-spin text-blue-600" />Saving and refreshing fuel records…</div></div>}
      <div>
        <Link to="/fuel-report" className="float-right text-blue-600">
          Fuel Consumption Report
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Fuel Management</h1>
        <p className="text-sm text-gray-500 mt-1">
          Safari fuel entries and calculated fuel averages
        </p>
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
          <div className="bg-white border rounded-xl p-4 space-y-4 print:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Filter safari fuel
                </h2>
                <p className="text-sm text-gray-500">
                  Filter the list by search, vehicle, driver, or date.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm"
                  onClick={exportCsv}
                  title="Export filtered rows as CSV"
                >
                  <Download className="w-4 h-4" /> CSV
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm"
                  onClick={exportExcel}
                  title="Export filtered rows for Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" /> Excel
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 border rounded-lg px-3 py-2 text-sm"
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
                className="border rounded-lg p-2 flex-1"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select
                aria-label="Filter by vehicle"
                className="border rounded-lg p-2"
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
                className="border rounded-lg p-2"
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
                  className="border rounded-lg p-2 text-gray-900"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-600">
                To
                <ReportDateInput
                  aria-label="Filter to date"
                  type="date"
                  className="border rounded-lg p-2 text-gray-900"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </label>
              <button
                type="button"
                className="border rounded-lg px-3 py-2 text-gray-700"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <div key={label} className="bg-white border rounded-xl p-5">
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-semibold mt-2">{value}</p>
              </div>
            ))}
          </div>
          <form
            onSubmit={save}
            className="bg-white border rounded-xl p-5 space-y-4 print:hidden"
          >
            <h2 className="font-semibold text-lg">
              {existing ? "Edit safari fuel entry" : "Record safari fuel"}
            </h2>
            <div className="text-sm">
              <label htmlFor="fuel-safari" className="block mb-1">
                Safari
              </label>
              <Select
                inputId="fuel-safari"
                name="safari_allocation_id"
                options={safariOptions}
                value={
                  safariOptions.find((option) => option.value === selected) ||
                  null
                }
                onChange={(option) => selectSafari(option?.value || "")}
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
                    minHeight: 42,
                    borderRadius: 8,
                  }),
                  menu: (base) => ({ ...base, zIndex: 20 }),
                }}
              />
            </div>
            {allocation && (
              <>
                <div className="grid md:grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg text-sm">
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
                <div className="grid md:grid-cols-3 gap-4">
                  {fields.map(([key, label, type]) => (
                    <label key={key} className="text-sm">
                      {label}
                      {type === "date" ? <ReportDateInput
                        required className="block w-full border rounded-lg p-2 mt-1"
                        value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      /> : <input
                        type={type}
                        disabled={saving}
                        required={!["end_km", "litres_filled_end"].includes(key)}
                        min={key === "end_km" ? form.start_km : "0"}
                        step={key.endsWith("_km") ? "1" : "0.01"}
                        className="block w-full border rounded-lg p-2 mt-1"
                        value={form[key]}
                        onChange={(e) =>
                          setForm({ ...form, [key]: e.target.value })
                        }
                      />}
                    </label>
                  ))}
                </div>
                <p className="text-sm text-gray-600">
                  KM done:{" "}
                  <strong>
                    {isTripComplete(form) && form.start_km !== ""
                      ? fmt(Number(form.end_km) - Number(form.start_km))
                      : "—"}
                  </strong>
                  . You can save beginning readings now. Average is calculated only after end KM and end litres are entered.
                </p>
                <button
                  disabled={
                    saving ||
                    !hasPermission(
                      existing
                        ? "odometer-logs.update"
                        : "odometer-logs.create",
                    )
                  }
                  className="bg-blue-600 text-white rounded-lg px-5 py-2 disabled:opacity-50"
                >
                  {saving
                    ? "Saving…"
                    : existing
                      ? "Update entry"
                      : "Save entry"}
                </button>
              </>
            )}
          </form>
          <div className="bg-white border rounded-xl overflow-hidden print:border-0">
            <div className="p-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">Safari fuel and averages</h2>
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
                        {e.lease_allocation_id
                          ? e.lease_allocation?.group_name ||
                            e.lease_allocation?.lease_contract?.group_name ||
                            e.lease_allocation?.lease_contract?.client_name ||
                            "Long-term lease"
                          : e.safari_allocation?.lead?.group_name || "Safari"}
                        <div className="text-xs text-gray-500">
                          {e.lease_allocation_id
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
