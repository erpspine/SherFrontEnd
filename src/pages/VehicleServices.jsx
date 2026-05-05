import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Wrench,
  Edit,
  Trash2,
  X,
  Car,
  Clock,
  CheckCircle,
  AlertTriangle,
  Gauge,
  Fuel,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const serviceStatuses = ["In Service", "Returned", "Cancelled"];

const statusConfig = {
  "In Service": {
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  Returned: {
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  Cancelled: {
    color: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertTriangle,
  },
};

const createServiceForm = () => ({
  vehicleId: "",
  serviceCenter: "",
  serviceType: "",
  serviceDateOut: "",
  serviceDateIn: "",
  odometerOut: "",
  odometerIn: "",
  fuelOut: "",
  fuelIn: "",
  cost: "",
  notes: "",
  status: "In Service",
});

const normalizeVehicle = (vehicle) => ({
  id: Number(vehicle.id || 0),
  vehicleNo: vehicle.vehicle_no || vehicle.vehicleNo || "",
  plateNo: vehicle.plate_no || vehicle.plateNo || "",
  make: vehicle.make || "",
  model: vehicle.model || "",
});

const normalizeService = (entry) => ({
  id: entry.id,
  vehicleId: Number(entry.vehicle_id || entry.vehicleId || 0),
  serviceCenter: entry.service_center || entry.serviceCenter || "",
  serviceType: entry.service_type || entry.serviceType || "",
  serviceDateOut: entry.service_date_out || entry.serviceDateOut || "",
  serviceDateIn: entry.service_date_in || entry.serviceDateIn || "",
  odometerOut: Number(entry.odometer_out ?? entry.odometerOut ?? 0),
  odometerIn:
    entry.odometer_in === null || entry.odometerIn === null
      ? ""
      : Number(entry.odometer_in ?? entry.odometerIn ?? ""),
  fuelOut: Number(entry.fuel_out ?? entry.fuelOut ?? 0),
  fuelIn:
    entry.fuel_in === null || entry.fuelIn === null
      ? ""
      : Number(entry.fuel_in ?? entry.fuelIn ?? ""),
  cost:
    entry.cost === null || entry.cost === undefined ? "" : Number(entry.cost),
  notes: entry.notes || "",
  status: serviceStatuses.includes(entry.status) ? entry.status : "In Service",
  vehicle: entry.vehicle ? normalizeVehicle(entry.vehicle) : null,
  createdAt: entry.created_at || entry.createdAt || "",
});

const extractList = (payload, keys = []) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const toDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString();
};

const formatCurrency = (value) => `USD ${Number(value || 0).toLocaleString()}`;

export default function VehicleServices() {
  const [services, setServices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(createServiceForm());

  const vehiclesById = useMemo(
    () => new Map(vehicles.map((vehicle) => [Number(vehicle.id), vehicle])),
    [vehicles],
  );

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [servicesRes, vehiclesRes] = await Promise.all([
        apiFetch("/vehicle-services"),
        apiFetch("/vehicles"),
      ]);

      const [servicesPayload, vehiclesPayload] = await Promise.all([
        servicesRes.json().catch(() => ({})),
        vehiclesRes.json().catch(() => ({})),
      ]);

      if (!servicesRes.ok) {
        throw new Error(
          servicesPayload?.message || "Unable to load vehicle services.",
        );
      }

      const vehicleList = vehiclesRes.ok
        ? extractList(vehiclesPayload, ["vehicles"]).map(normalizeVehicle)
        : [];

      setVehicles(vehicleList);
      setServices(
        extractList(servicesPayload, ["vehicleServices", "services"]).map(
          normalizeService,
        ),
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to load vehicle services.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openNew = () => {
    setEditingServiceId(null);
    setForm(createServiceForm());
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const openEdit = async (service) => {
    setErrorMessage("");

    try {
      const response = await apiFetch(`/vehicle-services/${service.id}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch service record.");
      }

      const entry = normalizeService(
        payload?.data || payload?.service || payload,
      );
      setEditingServiceId(entry.id);
      setForm({
        vehicleId: String(entry.vehicleId || ""),
        serviceCenter: entry.serviceCenter,
        serviceType: entry.serviceType,
        serviceDateOut: toDateInput(entry.serviceDateOut),
        serviceDateIn: toDateInput(entry.serviceDateIn),
        odometerOut: String(entry.odometerOut || ""),
        odometerIn: entry.odometerIn === "" ? "" : String(entry.odometerIn),
        fuelOut: String(entry.fuelOut || ""),
        fuelIn: entry.fuelIn === "" ? "" : String(entry.fuelIn),
        cost: entry.cost === "" ? "" : String(entry.cost),
        notes: entry.notes,
        status: entry.status,
      });
      setIsModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Unable to open service details.");
      await Swal.fire({
        title: "Load Failed",
        text: error.message || "Unable to open service details.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleDelete = async (id) => {
    const confirmation = await Swal.fire({
      title: "Delete service record?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    try {
      const response = await apiFetch(`/vehicle-services/${id}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to delete service record.");
      }

      setServices((current) => current.filter((item) => item.id !== id));
      await Swal.fire({
        title: "Deleted",
        text: "Service record deleted successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete service record.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete service record.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleSave = async () => {
    if (!form.vehicleId || !form.serviceDateOut) {
      setErrorMessage("Vehicle and Date Out are required.");
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please select vehicle and date out.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (form.odometerOut === "" || form.fuelOut === "") {
      setErrorMessage("Odometer Out and Fuel Out are required.");
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please fill odometer out and fuel out when vehicle goes for service.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (form.status === "Returned") {
      if (!form.serviceDateIn || form.odometerIn === "" || form.fuelIn === "") {
        setErrorMessage(
          "Date In, Odometer In and Fuel In are required when status is Returned.",
        );
        await Swal.fire({
          title: "Missing Return Details",
          text: "Please fill return date, odometer in and fuel in.",
          icon: "warning",
          background: "#0f172a",
          color: "#e2e8f0",
        });
        return;
      }
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        vehicleId: Number(form.vehicleId),
        serviceCenter: form.serviceCenter || null,
        serviceType: form.serviceType || null,
        serviceDateOut: form.serviceDateOut,
        serviceDateIn: form.serviceDateIn || null,
        odometerOut: Number(form.odometerOut || 0),
        odometerIn: form.odometerIn === "" ? null : Number(form.odometerIn),
        fuelOut: Number(form.fuelOut || 0),
        fuelIn: form.fuelIn === "" ? null : Number(form.fuelIn),
        cost: form.cost === "" ? null : Number(form.cost),
        notes: form.notes || null,
        status: form.status,
      };

      const response = editingServiceId
        ? await apiFetch(`/vehicle-services/${editingServiceId}`, {
            method: "PUT",
            body: payload,
          })
        : await apiFetch("/vehicle-services", {
            method: "POST",
            body: payload,
          });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to save service record.");
      }

      setIsModalOpen(false);
      setEditingServiceId(null);
      setForm(createServiceForm());
      await loadData();

      await Swal.fire({
        title: editingServiceId ? "Updated" : "Created",
        text: editingServiceId
          ? "Service record updated successfully."
          : "Service record created successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to save service record.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save service record.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const stats = useMemo(
    () => ({
      total: services.length,
      inService: services.filter((item) => item.status === "In Service").length,
      returned: services.filter((item) => item.status === "Returned").length,
      cancelled: services.filter((item) => item.status === "Cancelled").length,
    }),
    [services],
  );

  const filtered = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    return services.filter((service) => {
      const vehicle =
        service.vehicle || vehiclesById.get(Number(service.vehicleId));
      const searchableVehicle =
        `${vehicle?.vehicleNo || ""} ${vehicle?.plateNo || ""} ${vehicle?.make || ""} ${vehicle?.model || ""}`.toLowerCase();

      const matchSearch =
        !query ||
        searchableVehicle.includes(query) ||
        (service.serviceCenter || "").toLowerCase().includes(query) ||
        (service.serviceType || "").toLowerCase().includes(query) ||
        (service.notes || "").toLowerCase().includes(query);

      const matchStatus =
        statusFilter === "All" || service.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [searchTerm, services, statusFilter, vehiclesById]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicle Service</h1>
          <p className="text-slate-500 mt-1">
            Record when vehicles go for service and when they return with
            odometer and fuel levels.
          </p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          New Service Record
        </button>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-slate-500 text-sm">Total</p>
          <p className="text-2xl font-bold mt-1 text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-slate-500 text-sm">In Service</p>
          <p className="text-2xl font-bold mt-1 text-amber-600">
            {stats.inService}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-slate-500 text-sm">Returned</p>
          <p className="text-2xl font-bold mt-1 text-emerald-600">
            {stats.returned}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-center">
          <p className="text-slate-500 text-sm">Cancelled</p>
          <p className="text-2xl font-bold mt-1 text-rose-600">
            {stats.cancelled}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-amber-500 transition-colors">
            <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by vehicle, service center, type, notes..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-900 placeholder-slate-400 w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {["All", ...serviceStatuses].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1460px]">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200">
                {[
                  "Vehicle",
                  "Service Center",
                  "Type",
                  "Date Out",
                  "Date In",
                  "Odometer Out",
                  "Odometer In",
                  "Fuel Out",
                  "Fuel In",
                  "Cost",
                  "Status",
                  "Notes",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    className="py-14 px-4 text-center text-slate-500"
                    colSpan={13}
                  >
                    Loading service records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    className="py-14 px-4 text-center text-slate-500"
                    colSpan={13}
                  >
                    No service records found.
                  </td>
                </tr>
              ) : (
                filtered.map((service) => {
                  const vehicle =
                    service.vehicle ||
                    vehiclesById.get(Number(service.vehicleId));
                  const cfg =
                    statusConfig[service.status] || statusConfig["In Service"];

                  return (
                    <tr
                      key={service.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-cyan-50 flex items-center justify-center flex-shrink-0">
                            <Car className="w-3.5 h-3.5 text-cyan-600" />
                          </div>
                          <div>
                            <p className="text-sm text-slate-900 font-medium whitespace-nowrap">
                              {vehicle?.vehicleNo || "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500 whitespace-nowrap">
                              {vehicle?.plateNo || "-"} · {vehicle?.make || ""}{" "}
                              {vehicle?.model || ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {service.serviceCenter || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {service.serviceType || "-"}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {formatDate(service.serviceDateOut)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {formatDate(service.serviceDateIn)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {service.odometerOut}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {service.odometerIn === "" ? "-" : service.odometerIn}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {service.fuelOut}%
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {service.fuelIn === "" ? "-" : `${service.fuelIn}%`}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {service.cost === ""
                          ? "-"
                          : formatCurrency(service.cost)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${cfg.color}`}
                        >
                          <cfg.icon className="w-3 h-3" />
                          {service.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-500 max-w-[220px]">
                        <span className="block truncate" title={service.notes}>
                          {service.notes || "-"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEdit(service)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingServiceId
                    ? "Edit Service Record"
                    : "New Service Record"}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Track vehicle departure and return service readings.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {errorMessage}
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  Service Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Vehicle <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.vehicleId}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          vehicleId: event.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Select vehicle...</option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.vehicleNo} ({vehicle.plateNo})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          status: event.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      {serviceStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Service Center
                    </label>
                    <input
                      type="text"
                      value={form.serviceCenter}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          serviceCenter: event.target.value,
                        }))
                      }
                      placeholder="e.g. Toyota Service Center"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Service Type
                    </label>
                    <input
                      type="text"
                      value={form.serviceType}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          serviceType: event.target.value,
                        }))
                      }
                      placeholder="e.g. Major service"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Date Out <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.serviceDateOut}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          serviceDateOut: event.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Date In (when returned)
                    </label>
                    <input
                      type="date"
                      value={form.serviceDateIn}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          serviceDateIn: event.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  Odometer Readings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Odometer Out <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.odometerOut}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          odometerOut: event.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Odometer In (on return)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.odometerIn}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          odometerIn: event.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Fuel className="w-4 h-4 text-emerald-400" />
                  Fuel Levels (%)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Fuel Out <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.fuelOut}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          fuelOut: event.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Fuel In (on return)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={form.fuelIn}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          fuelIn: event.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Service Cost
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.cost}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          cost: event.target.value,
                        }))
                      }
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="What was serviced, replaced, observations..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-sm font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving
                    ? "Saving..."
                    : editingServiceId
                      ? "Save Changes"
                      : "Create Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
