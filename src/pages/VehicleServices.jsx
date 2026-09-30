import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Select from "react-select";
import {
  Search,
  Plus,
  Wrench,
  Eye,
  Download,
  Edit,
  Trash2,
  X,
  Car,
  Clock,
  CheckCircle,
  AlertTriangle,
  Gauge,
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

const createServiceItem = () => ({
  service: "",
  details: "",
  cost: "",
});

const parsePartsReplacedItems = (value) => {
  const trimmed = (value || "").trim();

  if (!trimmed) {
    return [createServiceItem()];
  }

  return trimmed
    .split(/\r?\n|,|;/)
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => ({
      service: part,
      details: "",
      cost: "",
    }));
};

const syncPartsReplacedIntoServiceItems = (
  partsReplaced,
  serviceItems = [],
) => {
  const trimmed = (partsReplaced || "").trim();
  const hasExistingContent = (serviceItems || []).some(
    (item) =>
      (item?.service || "").trim() !== "" ||
      (item?.details || "").trim() !== "" ||
      (item?.cost || "") !== "",
  );

  if (!trimmed) {
    return serviceItems && serviceItems.length > 0
      ? serviceItems
      : [createServiceItem()];
  }

  if (hasExistingContent) {
    return serviceItems;
  }

  return parsePartsReplacedItems(trimmed);
};

const createServiceForm = () => ({
  vehicleId: "",
  serviceCenter: "",
  serviceType: "",
  serviceDate: "",
  odometerOut: "",
  odometerIn: "",
  cost: "",
  notes: "",
  status: "In Service",
  serviceItems: [createServiceItem()],
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
  serviceItems: Array.isArray(entry.service_items || entry.serviceItems)
    ? (entry.service_items || entry.serviceItems)
        .map((item) => ({
          service: item?.service || "",
          details: item?.details || "",
          cost:
            item?.cost === null || item?.cost === undefined
              ? ""
              : String(item.cost),
        }))
        .filter((item) => item.service || item.details || item.cost !== "")
    : [],
  serviceDate:
    entry.service_date ||
    entry.serviceDate ||
    entry.service_date_out ||
    entry.serviceDateOut ||
    "",
  serviceDateOut: entry.service_date_out || entry.serviceDateOut || "",
  serviceDateIn: entry.service_date_in || entry.serviceDateIn || "",
  partsReplaced: entry.parts_replaced || entry.partsReplaced || "",
  odometerOut:
    entry.odometer_out === null || entry.odometerOut === null
      ? ""
      : Number(entry.odometer_out ?? entry.odometerOut ?? ""),
  odometerIn:
    entry.odometer_in === null || entry.odometerIn === null
      ? ""
      : Number(entry.odometer_in ?? entry.odometerIn ?? ""),
  fuelOut:
    entry.fuel_out === null || entry.fuelOut === null
      ? ""
      : Number(entry.fuel_out ?? entry.fuelOut ?? ""),
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
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatServiceItemsDisplay = (items = []) => {
  const entries = (items || [])
    .map((item) => {
      const serviceName = item?.service?.trim();
      const details = item?.details?.trim();
      const formattedCost =
        item?.cost !== undefined && item?.cost !== null && item?.cost !== ""
          ? ` (${formatCurrency(item.cost)})`
          : "";

      if (!serviceName && !details && !formattedCost) return "";

      const label = [serviceName, details].filter(Boolean).join(" — ");
      return `${label}${formattedCost}`.trim();
    })
    .filter(Boolean);

  return entries.length ? entries.join(" • ") : "-";
};

const formatCurrency = (value) =>
  `TZS ${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

const parseFilenameFromHeader = (contentDisposition, fallback) => {
  if (!contentDisposition) return fallback;
  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }
  const basicMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return basicMatch?.[1] || fallback;
};

const vehicleSelectStyles = {
  control: (base) => ({
    ...base,
    borderRadius: 12,
    borderColor: "#cbd5e1",
    minHeight: 42,
    boxShadow: "none",
    ":hover": { borderColor: "#94a3b8" },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 60,
  }),
};

const modalVehicleSelectStyles = {
  ...vehicleSelectStyles,
  control: (base) => ({
    ...base,
    borderRadius: 12,
    borderColor: "#334155",
    minHeight: 42,
    boxShadow: "none",
    backgroundColor: "#1e293b",
    ":hover": { borderColor: "#f59e0b" },
  }),
  singleValue: (base) => ({
    ...base,
    color: "#ffffff",
  }),
  input: (base) => ({
    ...base,
    color: "#ffffff",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#94a3b8",
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#0f172a",
    zIndex: 60,
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? "#1e293b" : "#0f172a",
    color: "#e2e8f0",
  }),
};

export default function VehicleServices() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [services, setServices] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [vehicleFilter, setVehicleFilter] = useState(
    searchParams.get("vehicleId") || "All",
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingService, setViewingService] = useState(null);
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(createServiceForm());

  const lineItemsTotalCost = useMemo(
    () =>
      (form.serviceItems || []).reduce((sum, item) => {
        const numericCost = Number(item?.cost || 0);
        return sum + (Number.isFinite(numericCost) ? numericCost : 0);
      }, 0),
    [form.serviceItems],
  );

  const vehiclesById = useMemo(
    () => new Map(vehicles.map((vehicle) => [Number(vehicle.id), vehicle])),
    [vehicles],
  );

  const vehicleOptions = useMemo(() => {
    return vehicles.map((vehicle) => ({
      value: String(vehicle.id),
      label:
        `${vehicle.vehicleNo || "Unknown"} (${vehicle.plateNo || "-"}) ${vehicle.make || ""} ${vehicle.model || ""}`.trim(),
    }));
  }, [vehicles]);

  const vehicleFilterOptions = useMemo(
    () => [{ value: "All", label: "All Vehicles" }, ...vehicleOptions],
    [vehicleOptions],
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

  useEffect(() => {
    setVehicleFilter(searchParams.get("vehicleId") || "All");
  }, [searchParams]);

  const openNew = () => {
    setEditingServiceId(null);
    setForm({
      ...createServiceForm(),
      vehicleId: vehicleFilter !== "All" ? vehicleFilter : "",
    });
    setErrorMessage("");
    setIsModalOpen(true);
  };

  const handleExport = async (type) => {
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.set("search", searchTerm.trim());
      if (statusFilter !== "All") params.set("status", statusFilter);
      if (vehicleFilter !== "All") params.set("vehicleId", vehicleFilter);

      const query = params.toString();
      const response = await apiFetch(
        `/vehicle-services/export/${type}${query ? `?${query}` : ""}`,
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || `Failed to export ${type}.`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      const fallbackName = `vehicle-services.${type === "excel" ? "csv" : "pdf"}`;
      link.download = parseFilenameFromHeader(
        response.headers.get("content-disposition"),
        fallbackName,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setErrorMessage(error.message || "Failed to export service records.");
      await Swal.fire({
        title: "Export Failed",
        text: error.message || "Failed to export service records.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const openEdit = async (service) => {
    setErrorMessage("");

    try {
      const response = await apiFetch(`/vehicle-services/${service.id}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch service record.");
      }

      const serviceRecord =
        payload?.vehicleService || payload?.data || payload?.service || payload;
      const entry = normalizeService(serviceRecord);
      setEditingServiceId(entry.id);
      const nextServiceItems =
        entry.serviceItems && entry.serviceItems.length > 0
          ? entry.serviceItems.map((item) => ({
              service: item.service || "",
              details: item.details || "",
              cost:
                item.cost === "" || item.cost === null ? "" : String(item.cost),
            }))
          : [];

      setForm({
        vehicleId: String(entry.vehicleId || ""),
        serviceCenter: entry.serviceCenter || "",
        serviceType: entry.serviceType || "",
        serviceDate: toDateInput(
          entry.serviceDate || entry.serviceDateOut || "",
        ),
        odometerOut: entry.odometerOut === "" ? "" : String(entry.odometerOut),
        odometerIn: entry.odometerIn === "" ? "" : String(entry.odometerIn),
        cost:
          entry.cost === "" || entry.cost === null ? "" : String(entry.cost),
        notes: entry.notes || "",
        status: entry.status || "In Service",
        serviceItems: nextServiceItems,
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
    if (!form.vehicleId || !form.serviceDate) {
      setErrorMessage("Vehicle and Date are required.");
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please select vehicle and date.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const fallbackServiceItems = form.serviceItems || [];

      const serviceItems = (fallbackServiceItems || [])
        .map((item) => ({
          service: (item.service || "").trim(),
          details: (item.details || "").trim(),
          cost:
            item.cost === "" || item.cost === null || item.cost === undefined
              ? null
              : Number(item.cost),
        }))
        .filter(
          (item) =>
            item.service !== "" || item.details !== "" || item.cost !== null,
        );

      const totalFromItems = serviceItems.reduce(
        (sum, item) => sum + Number(item.cost || 0),
        0,
      );

      const payload = {
        vehicleId: Number(form.vehicleId),
        serviceCenter: form.serviceCenter || null,
        serviceType: form.serviceType || null,
        serviceItems,
        serviceDate: form.serviceDate,
        odometerOut: form.odometerOut === "" ? null : Number(form.odometerOut),
        odometerIn: form.odometerIn === "" ? null : Number(form.odometerIn),
        cost:
          form.cost === ""
            ? totalFromItems > 0
              ? totalFromItems
              : null
            : Number(form.cost),
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

      const matchVehicle =
        vehicleFilter === "All" || String(service.vehicleId) === vehicleFilter;

      return matchSearch && matchStatus && matchVehicle;
    });
  }, [searchTerm, services, statusFilter, vehicleFilter, vehiclesById]);

  const handleVehicleFilterChange = (value) => {
    setVehicleFilter(value);
    const next = new URLSearchParams(searchParams);
    if (value === "All") {
      next.delete("vehicleId");
    } else {
      next.set("vehicleId", value);
    }
    setSearchParams(next, { replace: true });
  };

  const selectedVehicleFilterOption =
    vehicleFilterOptions.find((option) => option.value === vehicleFilter) ||
    vehicleFilterOptions[0];

  const selectedVehicleFormOption =
    vehicleOptions.find((option) => option.value === String(form.vehicleId)) ||
    null;

  const updateServiceItem = (index, key, value) => {
    setForm((current) => ({
      ...current,
      serviceItems: (current.serviceItems || []).map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
  };

  const addServiceItem = () => {
    setForm((current) => ({
      ...current,
      serviceItems: [...(current.serviceItems || []), createServiceItem()],
    }));
  };

  const removeServiceItem = (index) => {
    setForm((current) => {
      const next = (current.serviceItems || []).filter(
        (_, itemIndex) => itemIndex !== index,
      );

      return {
        ...current,
        serviceItems: next.length > 0 ? next : [createServiceItem()],
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicle Service</h1>
          <p className="text-slate-500 mt-1">
            Record vehicle service dates, odometer readings, cost and status.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport("excel")}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export Excel
          </button>
          <button
            onClick={() => handleExport("pdf")}
            className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
          >
            <Plus className="w-4 h-4" />
            New Service Record
          </button>
        </div>
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
            <div className="min-w-[280px]">
              <Select
                options={vehicleFilterOptions}
                value={selectedVehicleFilterOption}
                onChange={(option) =>
                  handleVehicleFilterChange(option?.value || "All")
                }
                isClearable={false}
                isSearchable
                placeholder="Search vehicle..."
                styles={vehicleSelectStyles}
              />
            </div>
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
          <table className="w-full min-w-[1120px]">
            <thead className="table-head-gradient">
              <tr className="border-b border-slate-200">
                {[
                  "Vehicle",
                  "Service Center",
                  "Type",
                  "Line Items",
                  "Date",
                  "Odometer",
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
                    colSpan={11}
                  >
                    Loading service records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    className="py-14 px-4 text-center text-slate-500"
                    colSpan={11}
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
                            <Link
                              to={`/vehicles/view?id=${vehicle?.id || service.vehicleId}`}
                              className="text-sm text-slate-900 font-medium whitespace-nowrap hover:text-cyan-700 hover:underline"
                            >
                              {vehicle?.vehicleNo || "Unknown"}
                            </Link>
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
                      <td className="py-3 px-4 text-sm text-slate-600 max-w-[340px] align-top">
                        <span
                          className="block leading-relaxed whitespace-normal break-words"
                          title={formatServiceItemsDisplay(
                            service.serviceItems,
                          )}
                        >
                          {formatServiceItemsDisplay(service.serviceItems)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {formatDate(service.serviceDate)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700 whitespace-nowrap">
                        {service.odometerIn === "" ? "-" : service.odometerIn}
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
                            type="button"
                            onClick={() => setViewingService(service)}
                            className="p-1.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
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
                  Track vehicle service details and line items.
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
                    <Select
                      options={vehicleOptions}
                      value={selectedVehicleFormOption}
                      onChange={(option) =>
                        setForm((current) => ({
                          ...current,
                          vehicleId: option?.value || "",
                        }))
                      }
                      isClearable
                      isSearchable
                      placeholder="Select vehicle..."
                      styles={modalVehicleSelectStyles}
                    />
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
                      Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.serviceDate}
                      onChange={(event) =>
                        setForm((current) => ({
                          ...current,
                          serviceDate: event.target.value,
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
                    <p className="mt-1 text-[11px] text-slate-500">
                      Line items total: {formatCurrency(lineItemsTotalCost)}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-400" />
                    Service Line Items
                  </h3>
                  <button
                    type="button"
                    onClick={addServiceItem}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow-sm hover:bg-amber-400"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {(form.serviceItems || []).map((item, index) => (
                    <div
                      key={`service-item-${index}`}
                      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                        <div className="md:col-span-4">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Service <span className="text-red-400">*</span>
                          </label>
                          <input
                            type="text"
                            value={item.service}
                            onChange={(event) =>
                              updateServiceItem(
                                index,
                                "service",
                                event.target.value,
                              )
                            }
                            placeholder="e.g. Change Tyres"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="md:col-span-5">
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Details
                          </label>
                          <input
                            type="text"
                            value={item.details}
                            onChange={(event) =>
                              updateServiceItem(
                                index,
                                "details",
                                event.target.value,
                              )
                            }
                            placeholder="e.g. Front axle pair"
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-xs font-medium text-slate-400 mb-1.5">
                            Cost
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.cost}
                            onChange={(event) =>
                              updateServiceItem(
                                index,
                                "cost",
                                event.target.value,
                              )
                            }
                            className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                        <div className="md:col-span-1 flex items-end">
                          <button
                            type="button"
                            onClick={() => removeServiceItem(index)}
                            className="w-full inline-flex items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 py-2 text-rose-300 hover:bg-rose-500/20"
                            title="Remove item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-cyan-400" />
                  Odometer Reading
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1.5">
                      Odometer Out
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
                      Odometer In
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
                  placeholder="Service notes and observations..."
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

      {viewingService && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Service Details
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {viewingService.serviceCenter || "Service record"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingService(null)}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vehicle
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {viewingService.vehicle?.vehicleNo || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Date
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDate(viewingService.serviceDate)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Service Center
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {viewingService.serviceCenter || "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {viewingService.status}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Service Line Items
                  </h3>
                </div>
                {(viewingService.serviceItems || []).length === 0 ? (
                  <div className="px-4 py-6 text-sm text-slate-500">
                    No line items on this service record.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200">
                    {(viewingService.serviceItems || []).map((item, index) => (
                      <div
                        key={`${item.service}-${index}`}
                        className="px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">
                              {item.service || "-"}
                            </p>
                            {item.details && (
                              <p className="text-sm text-slate-500 mt-1">
                                {item.details}
                              </p>
                            )}
                          </div>
                          <div className="text-sm font-medium text-slate-700">
                            {item.cost === "" ||
                            item.cost === null ||
                            item.cost === undefined
                              ? "-"
                              : formatCurrency(item.cost)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {viewingService.notes && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Notes
                  </p>
                  <p className="mt-2 text-sm text-slate-700 whitespace-pre-line">
                    {viewingService.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
