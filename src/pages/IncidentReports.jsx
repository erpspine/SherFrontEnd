import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Camera,
  ClipboardList,
  Loader,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const REPORT_TYPES = ["Accident", "Review", "Routine"];
const STATUSES = ["Open", "Closed"];

const emptyForm = () => ({
  id: null,
  date: new Date().toISOString().slice(0, 10),
  vehicleId: "",
  safariId: "",
  reportType: "Routine",
  description: "",
  actionTaken: "",
  photos: [],
  existingPhotos: [],
  removePhotos: [],
  status: "Open",
  closingRemarks: "",
});

const apiJson = async (path, options = {}) => {
  const response = await apiFetch(path, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.message ||
      (payload?.errors
        ? Object.values(payload.errors).flat().join("\n")
        : null) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
};

const extractList = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeVehicle = (vehicle) => ({
  id: Number(vehicle.id || 0),
  vehicleNo: vehicle.vehicle_no || vehicle.vehicleNo || "",
  plateNo: vehicle.plate_no || vehicle.plateNo || "",
  make: vehicle.make || "",
  model: vehicle.model || "",
  assignedDriverId:
    vehicle.assigned_driver_id ||
    vehicle.assignedDriverId ||
    vehicle.assigned_driver?.id ||
    vehicle.assignedDriver?.id ||
    "",
  assignedDriver: vehicle.assigned_driver || vehicle.assignedDriver || null,
});

const normalizeSafari = (lead) => ({
  id: Number(lead.id || 0),
  bookingRef: lead.booking_ref || lead.bookingRef || "-",
  clientCompany: lead.client_company || lead.clientCompany || "-",
  groupName: lead.group_name || lead.groupName || "",
  startDate: lead.start_date || lead.startDate || "",
  endDate: lead.end_date || lead.endDate || "",
  bookingStatus: lead.booking_status || lead.bookingStatus || "",
});

const normalizeReport = (report) => ({
  id: Number(report.id || 0),
  date: report.date || report.incident_date || "",
  vehicleId: String(report.vehicleId || report.vehicle_id || ""),
  safariId: String(report.safariId || report.lead_id || ""),
  reportType: report.reportType || report.report_type || "Routine",
  description: report.description || "",
  actionTaken: report.actionTaken || report.action_taken || "",
  photos: Array.isArray(report.photos) ? report.photos : [],
  status: report.status || "Open",
  closingRemarks: report.closingRemarks || report.closing_remarks || "",
  vehicle: report.vehicle || null,
  safari: report.safari || report.lead || null,
});

const statusClass = (status) =>
  status === "Closed"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-700 border-amber-200";

export default function IncidentReports() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reports, setReports] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [safaris, setSafaris] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [typeFilter, setTypeFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState(
    searchParams.get("vehicleId") || "All",
  );
  const [driverFilter, setDriverFilter] = useState(
    searchParams.get("driverId") || "All",
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const loadAll = async () => {
    setLoading(true);
    setError("");

    try {
      const [reportsPayload, vehiclesPayload, safarisPayload] =
        await Promise.all([
          apiJson("/incident-reports"),
          apiJson("/vehicles"),
          apiJson("/leads"),
        ]);

      setReports(
        extractList(reportsPayload, [
          "incidentReports",
          "incident_reports",
          "reports",
        ]).map(normalizeReport),
      );
      setVehicles(
        extractList(vehiclesPayload, ["vehicles"]).map(normalizeVehicle),
      );
      setSafaris(
        extractList(safarisPayload, ["leads", "bookings"]).map(normalizeSafari),
      );
    } catch (err) {
      setError(err.message || "Failed to load performance dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    setVehicleFilter(searchParams.get("vehicleId") || "All");
    setDriverFilter(searchParams.get("driverId") || "All");
  }, [searchParams]);

  const drivers = useMemo(() => {
    const unique = new Map();
    vehicles.forEach((vehicle) => {
      const driver = vehicle.assignedDriver;
      const driverId = vehicle.assignedDriverId || driver?.id;
      if (!driverId) return;
      unique.set(String(driverId), {
        id: String(driverId),
        name: driver?.name || "Assigned Driver",
      });
    });
    return Array.from(unique.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [vehicles]);

  const updateLinkedFilter = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value === "All") {
      next.delete(key);
    } else {
      next.set(key, value);
    }
    setSearchParams(next, { replace: true });
  };

  const filteredReports = useMemo(() => {
    const term = search.trim().toLowerCase();

    return reports.filter((report) => {
      if (statusFilter !== "All" && report.status !== statusFilter)
        return false;
      if (typeFilter !== "All" && report.reportType !== typeFilter)
        return false;
      if (vehicleFilter !== "All" && String(report.vehicleId) !== vehicleFilter)
        return false;

      const reportVehicle =
        report.vehicle ||
        vehicles.find(
          (vehicle) => String(vehicle.id) === String(report.vehicleId),
        );
      const assignedDriverId =
        reportVehicle?.assignedDriverId || reportVehicle?.assignedDriver?.id;
      if (
        driverFilter !== "All" &&
        String(assignedDriverId || "") !== driverFilter
      )
        return false;

      if (!term) return true;

      const haystack = [
        report.date,
        report.reportType,
        report.status,
        report.description,
        report.actionTaken,
        report.closingRemarks,
        report.vehicle?.vehicleNo,
        report.vehicle?.plateNo,
        reportVehicle?.assignedDriver?.name,
        report.safari?.bookingRef,
        report.safari?.clientCompany,
        report.safari?.groupName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [
    reports,
    search,
    statusFilter,
    typeFilter,
    vehicleFilter,
    driverFilter,
    vehicles,
  ]);

  const stats = useMemo(
    () => ({
      total: reports.length,
      open: reports.filter((report) => report.status === "Open").length,
      closed: reports.filter((report) => report.status === "Closed").length,
      accidents: reports.filter((report) => report.reportType === "Accident")
        .length,
    }),
    [reports],
  );

  const openCreate = () => {
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (report) => {
    setForm({
      id: report.id,
      date: report.date || "",
      vehicleId: String(report.vehicleId || ""),
      safariId: String(report.safariId || ""),
      reportType: report.reportType || "Routine",
      description: report.description || "",
      actionTaken: report.actionTaken || "",
      photos: [],
      existingPhotos: report.photos || [],
      removePhotos: [],
      status: report.status || "Open",
      closingRemarks: report.closingRemarks || "",
    });
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setForm(emptyForm());
  };

  const toggleExistingPhotoRemoval = (photoPath) => {
    setForm((current) => {
      const isMarked = current.removePhotos.includes(photoPath);
      return {
        ...current,
        removePhotos: isMarked
          ? current.removePhotos.filter((path) => path !== photoPath)
          : [...current.removePhotos, photoPath],
      };
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.status === "Closed" && !form.closingRemarks.trim()) {
      await Swal.fire(
        "Missing",
        "Closing remarks are required when status is Closed.",
        "warning",
      );
      return;
    }

    const payload = new FormData();
    payload.append("date", form.date);
    payload.append("vehicleId", form.vehicleId);
    if (form.safariId) payload.append("safariId", form.safariId);
    payload.append("reportType", form.reportType);
    payload.append("description", form.description);
    payload.append("actionTaken", form.actionTaken || "");
    payload.append("status", form.status);
    payload.append("closingRemarks", form.closingRemarks || "");
    form.photos.forEach((photo) => payload.append("photos[]", photo));
    form.removePhotos.forEach((photo) =>
      payload.append("removePhotos[]", photo),
    );

    setSaving(true);
    try {
      const endpoint = form.id
        ? `/incident-reports/${form.id}`
        : "/incident-reports";
      await apiJson(endpoint, {
        method: "POST",
        body: payload,
      });
      await loadAll();
      setShowModal(false);
      setForm(emptyForm());
      await Swal.fire({
        icon: "success",
        title: form.id
          ? "Performance record updated"
          : "Performance record saved",
        timer: 1400,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire(
        "Error",
        err.message || "Failed to save performance record.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (report) => {
    const result = await Swal.fire({
      icon: "warning",
      title: "Delete performance record?",
      text: "This will also remove uploaded photos.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      confirmButtonColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    try {
      await apiJson(`/incident-reports/${report.id}`, { method: "DELETE" });
      await loadAll();
      await Swal.fire({
        icon: "success",
        title: "Deleted",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err) {
      await Swal.fire(
        "Error",
        err.message || "Failed to delete performance record.",
        "error",
      );
    }
  };

  const getVehicleLabel = (vehicle) => {
    if (!vehicle) return "-";
    const vehicleNo = vehicle.vehicleNo || vehicle.vehicle_no || "Vehicle";
    const plateNo = vehicle.plateNo || vehicle.plate_no || "N/A";
    return `${vehicleNo} (${plateNo})`;
  };

  const getReportVehicle = (report) =>
    report.vehicle ||
    vehicles.find((vehicle) => String(vehicle.id) === String(report.vehicleId));

  const getDriver = (vehicle) => vehicle?.assignedDriver || null;

  const getSafariLabel = (safari) => {
    if (!safari) return "-";
    return [
      safari.bookingRef || safari.booking_ref || "Booking",
      safari.groupName ||
        safari.group_name ||
        safari.clientCompany ||
        safari.client_company,
    ]
      .filter(Boolean)
      .join(" - ");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Performance Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Track vehicle performance reports, actions taken, supporting photos,
            and closure remarks.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" /> New Record
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Open
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-700">{stats.open}</p>
        </div>
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Closed
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {stats.closed}
          </p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-700">
            Accidents
          </p>
          <p className="mt-1 text-2xl font-bold text-red-700">
            {stats.accidents}
          </p>
        </div>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search vehicle, booking, description, remarks..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="All">All Types</option>
            {REPORT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="All">All Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={vehicleFilter}
            onChange={(event) => {
              setVehicleFilter(event.target.value);
              updateLinkedFilter("vehicleId", event.target.value);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="All">All Vehicles</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.vehicleNo || "Vehicle"} ({vehicle.plateNo || "N/A"})
              </option>
            ))}
          </select>
          <select
            value={driverFilter}
            onChange={(event) => {
              setDriverFilter(event.target.value);
              updateLinkedFilter("driverId", event.target.value);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="All">All Drivers</option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Vehicle</th>
                <th className="px-4 py-3">Driver</th>
                <th className="px-4 py-3">Safari</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description / Action</th>
                <th className="px-4 py-3">Photos</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Closing Remarks</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    <Loader className="mx-auto mb-2 h-5 w-5 animate-spin" />{" "}
                    Loading performance records...
                  </td>
                </tr>
              ) : filteredReports.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No performance records found.
                  </td>
                </tr>
              ) : (
                filteredReports.map((report) => {
                  const vehicle = getReportVehicle(report);
                  const driver = getDriver(vehicle);

                  return (
                    <tr
                      key={report.id}
                      className="align-top hover:bg-slate-50/70"
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                        {formatDate(report.date)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {vehicle ? (
                          <Link
                            to={`/vehicle-services?vehicleId=${vehicle.id}`}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {getVehicleLabel(vehicle)}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {driver ? (
                          <Link
                            to={`/performance-dashboard?driverId=${driver.id}`}
                            className="font-medium text-blue-700 hover:underline"
                          >
                            {driver.name}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {getSafariLabel(report.safari)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {report.reportType}
                      </td>
                      <td className="max-w-sm px-4 py-3 text-slate-700">
                        <p className="font-medium text-slate-900">
                          {report.description}
                        </p>
                        {report.actionTaken && (
                          <p className="mt-1 text-xs text-slate-500">
                            Action: {report.actionTaken}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {report.photos.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {report.photos.slice(0, 3).map((photo) => (
                              <a
                                key={photo.path || photo.url}
                                href={photo.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded border border-slate-200 bg-slate-50"
                                title="Open photo"
                              >
                                <img
                                  src={photo.url}
                                  alt="Performance record"
                                  className="h-full w-full object-cover"
                                />
                              </a>
                            ))}
                            {report.photos.length > 3 && (
                              <span className="text-xs text-slate-500">
                                +{report.photos.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(report.status)}`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-700">
                        {report.closingRemarks || "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(report)}
                            className="rounded p-1.5 text-slate-600 hover:bg-blue-50 hover:text-blue-600"
                            title="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(report)}
                            className="rounded p-1.5 text-slate-600 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-900">
                {form.id ? "Edit Performance Record" : "New Performance Record"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="p-1 text-slate-500 hover:text-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        date: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Report Type *
                  </label>
                  <select
                    required
                    value={form.reportType}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        reportType: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {REPORT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Vehicle *
                  </label>
                  <select
                    required
                    value={form.vehicleId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        vehicleId: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select vehicle...</option>
                    {vehicles.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.vehicleNo || "Vehicle"} -{" "}
                        {vehicle.plateNo || "N/A"}{" "}
                        {vehicle.make
                          ? `(${vehicle.make} ${vehicle.model || ""})`
                          : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Safari / Booking
                  </label>
                  <select
                    value={form.safariId}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        safariId: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="">Select booking...</option>
                    {safaris.map((safari) => (
                      <option key={safari.id} value={safari.id}>
                        {safari.bookingRef} -{" "}
                        {safari.groupName || safari.clientCompany} (
                        {formatDate(safari.startDate)} to{" "}
                        {formatDate(safari.endDate)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Description *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Describe what happened"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Action Taken
                  </label>
                  <textarea
                    rows={2}
                    value={form.actionTaken}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        actionTaken: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Immediate action, escalation, repairs, communication"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Status *
                  </label>
                  <select
                    required
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Photos
                  </label>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600">
                    <Camera className="h-4 w-4" />
                    {form.photos.length > 0
                      ? `${form.photos.length} new file(s) selected`
                      : "Choose photos"}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          photos: Array.from(event.target.files || []),
                        }))
                      }
                    />
                  </label>
                </div>

                {form.existingPhotos.length > 0 && (
                  <div className="md:col-span-2">
                    <p className="mb-2 text-sm font-medium text-slate-700">
                      Existing Photos
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {form.existingPhotos.map((photo) => {
                        const isMarked = form.removePhotos.includes(photo.path);
                        return (
                          <button
                            key={photo.path || photo.url}
                            type="button"
                            onClick={() =>
                              toggleExistingPhotoRemoval(photo.path)
                            }
                            className={`relative h-20 w-20 overflow-hidden rounded-lg border ${isMarked ? "border-red-500 opacity-50" : "border-slate-200"}`}
                            title={
                              isMarked
                                ? "Photo marked for removal"
                                : "Click to remove photo"
                            }
                          >
                            <img
                              src={photo.url}
                              alt="Performance record"
                              className="h-full w-full object-cover"
                            />
                            {isMarked && (
                              <span className="absolute inset-x-0 bottom-0 bg-red-600 px-1 py-0.5 text-xs text-white">
                                Remove
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Remarks When Closing {form.status === "Closed" ? "*" : ""}
                  </label>
                  <textarea
                    rows={2}
                    required={form.status === "Closed"}
                    value={form.closingRemarks}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        closingRemarks: event.target.value,
                      }))
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Resolution notes, final status, approvals"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {saving && <Loader className="h-4 w-4 animate-spin" />}
                  {form.id ? "Update Record" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
