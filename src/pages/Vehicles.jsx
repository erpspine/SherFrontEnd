import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  Car,
  CheckCircle,
  Clock,
  Wrench,
  AlertTriangle,
  MoreVertical,
  Edit,
  Trash2,
  X,
  Users,
  History,
  Calendar,
} from "lucide-react";

import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const createVehicleForm = () => ({
  vehicleNo: "",
  plateNo: "",
  make: "",
  model: "",
  year: new Date().getFullYear(),
  seats: "",
  initialMileage: "",
  status: "Available",
  chassis: "",
  specs: "",
});

const normalizeVehicle = (vehicle) => {
  const item = vehicle?.attributes
    ? { ...vehicle.attributes, id: vehicle.id }
    : vehicle;

  return {
    id: item.id,
    vehicleNo:
      item.vehicle_no ||
      item.vehicleNo ||
      item.vehicle_number ||
      item.vehicleNumber ||
      item.car_no ||
      item.carNo ||
      "",
    plateNo:
      item.plate_no ||
      item.plateNo ||
      item.registration_no ||
      item.registrationNo ||
      "",
    make: item.make || "",
    model: item.model || "",
    year: Number(item.year || new Date().getFullYear()),
    seats: Number(item.seats || 0),
    initialMileage: Number(
      item.initial_mileage ?? item.initialMileage ?? item.mileage ?? 0,
    ),
    currentMileage: Number(
      item.current_mileage ??
        item.currentMileage ??
        item.initialMileage ??
        item.mileage ??
        0,
    ),
    status: item.status || "Available",
    chassis: item.chassis || item.chassis_no || item.chassisNo || "",
    specs:
      item.specs ||
      item.specifications ||
      item.specification ||
      item.vehicle_specs ||
      item.vehicleSpecs ||
      "",
    photoUrl:
      item.photo_url ||
      item.photoUrl ||
      item.image_url ||
      item.imageUrl ||
      item.photo ||
      item.image ||
      "",
  };
};

const extractJobCardsList = (payload) => {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.jobCards)) return payload.jobCards;
  if (Array.isArray(payload?.job_cards)) return payload.job_cards;
  return [];
};

const toNumberOrNull = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

const pickLatestMileageByVehicle = (rawJobCards) => {
  const latestByVehicle = new Map();
  rawJobCards.forEach((card) => {
    const vehicleId = Number(card?.vehicle_id ?? card?.vehicleId ?? 0);
    if (!vehicleId) return;

    const odometerIn = toNumberOrNull(card?.odometer_in ?? card?.odometerIn);
    const odometerOut = toNumberOrNull(card?.odometer_out ?? card?.odometerOut);
    const mileageValue = odometerIn ?? odometerOut;
    if (mileageValue === null) return;

    const updatedAt = card?.updated_at || card?.updatedAt || "";
    const createdAt = card?.created_at || card?.createdAt || "";
    const timestamp =
      Date.parse(updatedAt || createdAt || "") || Number(card?.id || 0);

    const previous = latestByVehicle.get(vehicleId);
    if (!previous || timestamp >= previous.timestamp) {
      latestByVehicle.set(vehicleId, {
        timestamp,
        mileage: mileageValue,
      });
    }
  });

  return latestByVehicle;
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.vehicles)) return payload.vehicles;
  return [];
};

const extractSingle = (payload) => payload?.data || payload?.vehicle || payload;

const normalizeHistoryEvent = (event) => ({
  eventType: event?.eventType || event?.event_type || "event",
  eventDate: event?.eventDate || event?.event_date || "",
  eventAt: event?.eventAt || event?.event_at || "",
  title: event?.title || "Vehicle event",
  details: event?.details || "",
});

const formatDateTime = (value) => {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const formatHistoryDetails = (details) => {
  if (!details) return "-";
  if (typeof details === "string") return details;
  if (Array.isArray(details)) return details.join(", ");
  if (typeof details === "object") {
    return Object.entries(details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | ");
  }
  return String(details);
};

const getStatusConfig = (status) => {
  switch (status) {
    case "Available":
      return {
        color: "bg-green-500/20 text-green-400 border-green-500/30",
        icon: CheckCircle,
        dot: "bg-green-400",
      };
    case "On Lease":
      return {
        color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        icon: Clock,
        dot: "bg-blue-400",
      };
    case "Maintenance":
      return {
        color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        icon: Wrench,
        dot: "bg-amber-400",
      };
    case "Retired":
      return {
        color: "bg-red-500/20 text-red-400 border-red-500/30",
        icon: AlertTriangle,
        dot: "bg-red-400",
      };
    default:
      return {
        color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        icon: Car,
        dot: "bg-slate-400",
      };
  }
};

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState(null);
  const [form, setForm] = useState(createVehicleForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyVehicle, setHistoryVehicle] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyFilters, setHistoryFilters] = useState({
    eventType: "",
    from: "",
    to: "",
    sort: "desc",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState("");
  const photoPreviewObjectUrlRef = useRef("");

  const updatePhotoPreviewFromFile = (file) => {
    if (photoPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(photoPreviewObjectUrlRef.current);
      photoPreviewObjectUrlRef.current = "";
    }

    if (!file) {
      setPhotoPreview("");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    photoPreviewObjectUrlRef.current = objectUrl;
    setPhotoPreview(objectUrl);
  };

  const loadVehicles = async () => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      const [vehiclesResponse, jobCardsResponse] = await Promise.all([
        apiFetch("/vehicles"),
        apiFetch("/job-cards"),
      ]);

      const [vehiclesPayload, jobCardsPayload] = await Promise.all([
        vehiclesResponse.json().catch(() => ({})),
        jobCardsResponse.json().catch(() => ({})),
      ]);

      if (!vehiclesResponse.ok) {
        throw new Error(
          vehiclesPayload?.message || "Unable to fetch vehicles.",
        );
      }

      const normalizedVehicles =
        extractList(vehiclesPayload).map(normalizeVehicle);
      const latestMileageByVehicle = jobCardsResponse.ok
        ? pickLatestMileageByVehicle(extractJobCardsList(jobCardsPayload))
        : new Map();

      const mergedVehicles = normalizedVehicles.map((vehicle) => {
        const mileageFromJobCard = latestMileageByVehicle.get(
          vehicle.id,
        )?.mileage;
        return {
          ...vehicle,
          currentMileage:
            mileageFromJobCard ??
            vehicle.currentMileage ??
            vehicle.initialMileage,
        };
      });

      setVehicles(mergedVehicles);
    } catch (error) {
      setErrorMessage(error.message || "Failed to load vehicles.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    return () => {
      if (photoPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(photoPreviewObjectUrlRef.current);
      }
    };
  }, []);

  const stats = {
    total: vehicles.length,
    available: vehicles.filter((v) => v.status === "Available").length,
    onLease: vehicles.filter((v) => v.status === "On Lease").length,
    maintenance: vehicles.filter((v) => v.status === "Maintenance").length,
  };

  const filtered = vehicles.filter((v) => {
    const matchSearch =
      v.vehicleNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.plateNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = selectedStatus === "All" || v.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const openAdd = () => {
    setEditVehicle(null);
    setForm(createVehicleForm());
    setPhotoFile(null);
    setPhotoPreview("");
    setIsModalOpen(true);
  };

  const loadVehicleHistory = async (
    vehicleId,
    filterValues = historyFilters,
  ) => {
    setIsLoadingHistory(true);
    setHistoryError("");

    try {
      const params = new URLSearchParams();
      if (filterValues.eventType)
        params.set("eventType", filterValues.eventType);
      if (filterValues.from) params.set("from", filterValues.from);
      if (filterValues.to) params.set("to", filterValues.to);
      if (filterValues.sort) params.set("sort", filterValues.sort);

      const query = params.toString();
      const response = await apiFetch(
        `/vehicles/${vehicleId}/history${query ? `?${query}` : ""}`,
      );
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to load vehicle history.");
      }

      const data = payload?.data || payload;
      const rawVehicle = data?.vehicle || null;
      const rawHistory = Array.isArray(data?.history) ? data.history : [];

      setHistoryVehicle(rawVehicle ? normalizeVehicle(rawVehicle) : null);
      setHistoryItems(rawHistory.map(normalizeHistoryEvent));
    } catch (error) {
      setHistoryError(error.message || "Failed to load vehicle history.");
      setHistoryItems([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openHistory = async (vehicle) => {
    const defaultFilters = {
      eventType: "",
      from: "",
      to: "",
      sort: "desc",
    };

    setHistoryVehicle(vehicle);
    setHistoryFilters(defaultFilters);
    setHistoryItems([]);
    setHistoryError("");
    setIsHistoryModalOpen(true);
    await loadVehicleHistory(vehicle.id, defaultFilters);
  };

  const handleApplyHistoryFilters = async () => {
    if (!historyVehicle?.id) return;
    await loadVehicleHistory(historyVehicle.id, historyFilters);
  };

  const handleResetHistoryFilters = async () => {
    if (!historyVehicle?.id) return;
    const defaultFilters = {
      eventType: "",
      from: "",
      to: "",
      sort: "desc",
    };
    setHistoryFilters(defaultFilters);
    await loadVehicleHistory(historyVehicle.id, defaultFilters);
  };

  const openEdit = async (v) => {
    setErrorMessage("");
    try {
      const response = await apiFetch(`/vehicles/${v.id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch vehicle.");
      }
      const selectedVehicle = normalizeVehicle(extractSingle(payload));
      setEditVehicle(selectedVehicle);
      setForm({ ...selectedVehicle });
      setPhotoFile(null);
      setPhotoPreview(selectedVehicle.photoUrl || "");
      setIsModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Unable to open vehicle details.");
      await Swal.fire({
        title: "Load Failed",
        text: error.message || "Unable to open vehicle details.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleDeleteVehicle = async (id) => {
    const confirmation = await Swal.fire({
      title: "Delete vehicle?",
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
      const response = await apiFetch(`/vehicles/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Unable to delete vehicle.");
      }

      setVehicles((current) => current.filter((vehicle) => vehicle.id !== id));
      await Swal.fire({
        title: "Deleted",
        text: "Vehicle deleted successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete vehicle.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete vehicle.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleSaveVehicle = async () => {
    const yearValue = Number(form.year);
    const seatsValue = Number(form.seats);
    const initialMileageValue = Number(form.initialMileage);

    if (
      !form.vehicleNo ||
      !form.plateNo ||
      !form.make ||
      !form.model ||
      !form.chassis ||
      Number.isNaN(yearValue) ||
      yearValue < 1900 ||
      yearValue > 2100 ||
      Number.isNaN(seatsValue) ||
      seatsValue < 1 ||
      Number.isNaN(initialMileageValue) ||
      initialMileageValue < 0
    ) {
      setErrorMessage(
        "Please fill Vehicle No, Plate No, Make, Model, Year (1900-2100), Seats (min 1), Initial Mileage (min 0), and Chassis.",
      );
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please fill Vehicle No, Plate No, Make, Model, Year (1900-2100), Seats (min 1), Initial Mileage (min 0), and Chassis.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload = new FormData();
      payload.append("vehicleNo", form.vehicleNo);
      payload.append("plateNo", form.plateNo);
      payload.append("make", form.make);
      payload.append("model", form.model);
      payload.append("year", String(yearValue));
      payload.append("seats", String(seatsValue));
      payload.append("initialMileage", String(initialMileageValue));
      payload.append("mileage", String(initialMileageValue));
      payload.append("status", form.status || "Available");
      payload.append("chassis", form.chassis || "");
      payload.append("specs", form.specs || "");
      if (photoFile) {
        payload.append("photo", photoFile);
      }

      // PHP does not parse multipart/form-data for PUT requests.
      // Use POST with _method spoofing so Laravel receives all FormData fields.
      if (editVehicle) {
        payload.append("_method", "PUT");
      }

      const response = editVehicle
        ? await apiFetch(`/vehicles/${editVehicle.id}`, {
            method: "POST",
            body: payload,
          })
        : await apiFetch("/vehicles", {
            method: "POST",
            body: payload,
          });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Unable to save vehicle.");
      }

      setIsModalOpen(false);
      setEditVehicle(null);
      setForm(createVehicleForm());
      setPhotoFile(null);
      setPhotoPreview("");
      await loadVehicles();

      await Swal.fire({
        title: editVehicle ? "Updated" : "Created",
        text: editVehicle
          ? "Vehicle updated successfully."
          : "Vehicle created successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to save vehicle.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save vehicle.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Fleet Management</h1>
          <p className="text-slate-400 mt-1">
            Manage your vehicle fleet and availability
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          Add Vehicle
        </button>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Fleet",
            value: stats.total,
            color: "text-white",
            bg: "bg-blue-500/10",
            icon: Car,
            iconColor: "text-blue-400",
          },
          {
            label: "Available",
            value: stats.available,
            color: "text-green-400",
            bg: "bg-green-500/10",
            icon: CheckCircle,
            iconColor: "text-green-400",
          },
          {
            label: "On Lease",
            value: stats.onLease,
            color: "text-blue-400",
            bg: "bg-blue-500/10",
            icon: Clock,
            iconColor: "text-blue-400",
          },
          {
            label: "Maintenance",
            value: stats.maintenance,
            color: "text-amber-400",
            bg: "bg-amber-500/10",
            icon: Wrench,
            iconColor: "text-amber-400",
          },
        ].map((s) => (
          <div
            key={s.label}
            className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.color}`}>
                  {s.value}
                </p>
              </div>
              <div className={`p-3 ${s.bg} rounded-xl`}>
                <s.icon className={`w-6 h-6 ${s.iconColor}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-amber-500/50 transition-colors">
            <Search className="w-5 h-5 text-slate-500 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by car no, plate, make, model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", "Available", "On Lease", "Maintenance"].map((s) => (
              <button
                key={s}
                onClick={() => setSelectedStatus(s)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${selectedStatus === s ? "bg-amber-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Vehicles Table */}
      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {[
                  "Car No",
                  "Vehicle",
                  "Seats",
                  "Initial Mileage",
                  "Current Mileage",
                  "Status",
                  "Actions",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-4 px-6 text-sm font-semibold text-slate-400"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => {
                const statusCfg = getStatusConfig(v.status);
                return (
                  <tr
                    key={v.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-4 px-6 text-slate-300 text-sm font-medium whitespace-nowrap">
                      {v.vehicleNo || "-"}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
                          {v.photoUrl ? (
                            <img
                              src={v.photoUrl}
                              alt={`${v.make} ${v.model}`}
                              className="w-10 h-10 rounded-xl object-cover"
                            />
                          ) : (
                            <Car className="w-5 h-5 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {v.make} {v.model}
                          </p>
                          <p className="text-slate-400 text-sm">
                            {v.plateNo} · {v.year} · Chassis: {v.chassis}
                          </p>
                          {v.specs && (
                            <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">
                              {v.specs}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1 text-slate-300 text-sm">
                        <Users className="w-4 h-4 text-slate-500" />
                        {v.seats}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-slate-300 text-sm whitespace-nowrap">
                      {Number(v.initialMileage || 0).toLocaleString()} km
                    </td>
                    <td className="py-4 px-6 text-slate-300 text-sm whitespace-nowrap">
                      {Number(v.currentMileage || 0).toLocaleString()} km
                    </td>
                    <td className="py-4 px-6">
                      <div
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusCfg.color}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                        />
                        {v.status}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openHistory(v)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                          title="View History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(v)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteVehicle(v.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              No vehicles found matching your search.
            </div>
          )}
          {isLoading && (
            <div className="py-16 text-center text-slate-500">
              Loading vehicles...
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {filtered.length} of {vehicles.length} vehicles
          </p>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                {editVehicle ? "Edit Vehicle" : "Add New Vehicle"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {errorMessage && (
                <div className="sm:col-span-2 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {errorMessage}
                </div>
              )}
              {[
                {
                  label: "Vehicle No",
                  key: "vehicleNo",
                  placeholder: "CAR-001",
                },
                {
                  label: "Plate No",
                  key: "plateNo",
                  placeholder: "T 123 ABC",
                },
                { label: "Make", key: "make", placeholder: "Toyota" },
                {
                  label: "Model",
                  key: "model",
                  placeholder: "Land Cruiser 200",
                },
                {
                  label: "Year",
                  key: "year",
                  placeholder: "2022",
                  type: "number",
                },
                {
                  label: "Chassis No.",
                  key: "chassis",
                  placeholder: "JTMHX05J...",
                },
                {
                  label: "Seats",
                  key: "seats",
                  placeholder: "7",
                  type: "number",
                },
                {
                  label: "Initial Mileage",
                  key: "initialMileage",
                  placeholder: "45200",
                  type: "number",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {f.label}
                  </label>
                  <input
                    type={f.type || "text"}
                    value={form[f.key]}
                    onChange={(e) =>
                      setForm({ ...form, [f.key]: e.target.value })
                    }
                    placeholder={f.placeholder}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Specs
                </label>
                <textarea
                  rows={3}
                  value={form.specs}
                  onChange={(e) => setForm({ ...form, specs: e.target.value })}
                  placeholder="e.g. 4x4, diesel, automatic, pop-up roof"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Photo Attachment
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setPhotoFile(file);
                    updatePhotoPreviewFromFile(file);
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-200 file:mr-4 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-amber-500 file:text-white hover:file:bg-amber-600"
                />
                <p className="mt-2 text-xs text-slate-400">
                  Upload vehicle image (JPG, PNG, WEBP).{" "}
                  {photoFile
                    ? `Selected: ${photoFile.name}`
                    : "No file selected yet."}
                </p>
                {!photoFile && editVehicle?.photoUrl && (
                  <p className="mt-1 text-xs text-cyan-300">
                    Existing photo is attached. Choose another file to replace
                    it.
                  </p>
                )}
                {photoPreview && (
                  <div className="mt-3">
                    <img
                      src={photoPreview}
                      alt="Vehicle preview"
                      className="w-36 h-24 rounded-lg object-cover border border-slate-700"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Status
                </label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500 transition-colors"
                >
                  {["Available", "On Lease", "Maintenance", "Retired"].map(
                    (status) => (
                      <option key={status}>{status}</option>
                    ),
                  )}
                </select>
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveVehicle}
                disabled={isSaving}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSaving
                  ? "Saving..."
                  : editVehicle
                    ? "Update Vehicle"
                    : "Add Vehicle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Vehicle History Modal */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Vehicle History
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  {historyVehicle
                    ? `${historyVehicle.vehicleNo || "-"} · ${historyVehicle.plateNo || "-"}`
                    : "Timeline"}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Event Type
                  </label>
                  <input
                    type="text"
                    value={historyFilters.eventType}
                    onChange={(event) =>
                      setHistoryFilters((current) => ({
                        ...current,
                        eventType: event.target.value,
                      }))
                    }
                    placeholder="e.g. service_out"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    From
                  </label>
                  <input
                    type="date"
                    value={historyFilters.from}
                    onChange={(event) =>
                      setHistoryFilters((current) => ({
                        ...current,
                        from: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    To
                  </label>
                  <input
                    type="date"
                    value={historyFilters.to}
                    onChange={(event) =>
                      setHistoryFilters((current) => ({
                        ...current,
                        to: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    Sort
                  </label>
                  <select
                    value={historyFilters.sort}
                    onChange={(event) =>
                      setHistoryFilters((current) => ({
                        ...current,
                        sort: event.target.value,
                      }))
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="desc">Latest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleApplyHistoryFilters}
                  disabled={isLoadingHistory}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleResetHistoryFilters}
                  disabled={isLoadingHistory}
                  className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  Reset
                </button>
              </div>

              {historyError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {historyError}
                </div>
              )}

              {isLoadingHistory ? (
                <div className="py-12 text-center text-slate-500">
                  Loading history...
                </div>
              ) : historyItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  No history events found for this vehicle.
                </div>
              ) : (
                <div className="space-y-3">
                  {historyItems.map((item, index) => (
                    <div
                      key={`${item.eventAt || item.eventDate || item.title}-${index}`}
                      className="rounded-xl border border-slate-800 bg-slate-800/40 p-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-white font-medium">{item.title}</p>
                          <p className="text-xs text-cyan-300 mt-0.5 uppercase tracking-wide">
                            {item.eventType}
                          </p>
                        </div>
                        <div className="text-right text-xs text-slate-400">
                          <div className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{item.eventDate || "-"}</span>
                          </div>
                          <p className="mt-1">{formatDateTime(item.eventAt)}</p>
                        </div>
                      </div>
                      <p className="text-sm text-slate-300 mt-3">
                        {formatHistoryDetails(item.details)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
