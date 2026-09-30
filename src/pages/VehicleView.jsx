import { useEffect, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Car,
  Gauge,
  Calendar,
  Users,
  Hash,
  Settings,
  CheckCircle,
  Clock,
  Wrench,
  AlertTriangle,
  FileText,
  History,
  Eye,
  X,
} from "lucide-react";
import { apiFetch } from "../utils/api";

const serviceStatuses = ["In Service", "Returned", "Cancelled"];

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
    createdAt: item.created_at || item.createdAt || "",
    updatedAt: item.updated_at || item.updatedAt || "",
    assignedDriverId:
      item.assigned_driver_id ||
      item.assignedDriverId ||
      item.assigned_driver?.id ||
      item.assignedDriver?.id ||
      "",
    assignedDriver: item.assigned_driver || item.assignedDriver || null,
  };
};

const getStatusConfig = (status) => {
  switch (status) {
    case "Available":
      return {
        color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
        dot: "bg-emerald-400",
        Icon: CheckCircle,
      };
    case "On Lease":
      return {
        color: "text-blue-400 bg-blue-500/10 border-blue-500/30",
        dot: "bg-blue-400",
        Icon: Clock,
      };
    case "Maintenance":
      return {
        color: "text-amber-400 bg-amber-500/10 border-amber-500/30",
        dot: "bg-amber-400",
        Icon: Wrench,
      };
    case "Retired":
      return {
        color: "text-red-400 bg-red-500/10 border-red-500/30",
        dot: "bg-red-400",
        Icon: AlertTriangle,
      };
    default:
      return {
        color: "text-slate-500 bg-slate-500/10 border-slate-500/30",
        dot: "bg-slate-400",
        Icon: Car,
      };
  }
};

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

const parsePartsReplacedItems = (value) => {
  const trimmed = (value || "").trim();
  if (!trimmed) return [];

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
    : parsePartsReplacedItems(
        entry.parts_replaced || entry.partsReplaced || "",
      ),
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
  cost:
    entry.cost === null || entry.cost === undefined ? "" : Number(entry.cost),
  notes: entry.notes || "",
  status: serviceStatuses.includes(entry.status) ? entry.status : "In Service",
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

const getServiceStatusConfig = (status) => {
  switch (status) {
    case "Returned":
      return "bg-emerald-500/10 text-emerald-300 border-emerald-500/30";
    case "Cancelled":
      return "bg-rose-500/10 text-rose-300 border-rose-500/30";
    default:
      return "bg-amber-500/10 text-amber-300 border-amber-500/30";
  }
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

export default function VehicleView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const vehicleId = id || searchParams.get("id") || "";

  const [vehicle, setVehicle] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [serviceItems, setServiceItems] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [error, setError] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState({ url: "", title: "" });
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const load = async () => {
      if (!vehicleId) {
        setError("Vehicle not found.");
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      setError("");
      try {
        const vehicleRes = await apiFetch(`/vehicles/${vehicleId}`);
        const vehiclePayload = await vehicleRes.json().catch(() => ({}));
        if (!vehicleRes.ok) {
          throw new Error(vehiclePayload?.message || "Vehicle not found.");
        }
        const raw =
          vehiclePayload?.data ?? vehiclePayload?.vehicle ?? vehiclePayload;
        setVehicle(normalizeVehicle(raw));
      } catch (err) {
        setError(err.message || "Failed to load vehicle.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await apiFetch(`/vehicles/${vehicleId}/history`);
        if (!res.ok) return;
        const payload = await res.json().catch(() => ({}));
        const data = payload?.data || payload;
        const rawHistory = Array.isArray(data?.history) ? data.history : [];
        setHistoryItems(rawHistory.map(normalizeHistoryEvent));
      } catch {
        // history is non-critical; silently ignore
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, [vehicleId]);

  useEffect(() => {
    if (!vehicleId) return;

    const loadServices = async () => {
      setIsLoadingServices(true);
      try {
        const res = await apiFetch("/vehicle-services");
        if (!res.ok) {
          setServiceItems([]);
          return;
        }
        const payload = await res.json().catch(() => ({}));
        const allServices = extractList(payload, [
          "vehicleServices",
          "services",
        ]).map(normalizeService);
        const currentVehicleServices = allServices.filter(
          (service) => String(service.vehicleId) === String(vehicleId),
        );
        setServiceItems(currentVehicleServices);
      } catch {
        setServiceItems([]);
      } finally {
        setIsLoadingServices(false);
      }
    };

    loadServices();
  }, [vehicleId]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading vehicle details...</div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-[60vh] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-sm">
          {error || "Vehicle not found."}
        </div>
        <button
          onClick={() => navigate("/vehicles")}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vehicles
        </button>
      </div>
    );
  }

  const statusCfg = getStatusConfig(vehicle.status);
  const serviceStats = {
    total: serviceItems.length,
    inService: serviceItems.filter((item) => item.status === "In Service")
      .length,
    returned: serviceItems.filter((item) => item.status === "Returned").length,
    cancelled: serviceItems.filter((item) => item.status === "Cancelled")
      .length,
    totalCost: serviceItems.reduce(
      (sum, item) => sum + Number(item.cost || 0),
      0,
    ),
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white text-slate-900 overflow-hidden">
      {/* Header */}
      <div className="border-b border-slate-200/60 bg-white/90 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/vehicles")}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="w-px h-5 bg-slate-700" />
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                {vehicle.vehicleNo || `Vehicle #${vehicle.id}`}
              </h1>
              <p className="text-sm text-slate-500">
                {vehicle.make} {vehicle.model} · {vehicle.year}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() =>
                navigate(`/vehicle-services?vehicleId=${vehicle.id}`)
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100"
            >
              <Wrench className="h-3.5 w-3.5" />
              Service Records
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(`/performance-dashboard?vehicleId=${vehicle.id}`)
              }
              className="inline-flex items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100"
            >
              <FileText className="h-3.5 w-3.5" />
              Performance
            </button>
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${statusCfg.color}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
              {vehicle.status}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-2 inline-flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-amber-500 text-slate-900"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("service")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "service"
                ? "bg-amber-500 text-slate-900"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Service
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              activeTab === "history"
                ? "bg-amber-500 text-slate-900"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            History
          </button>
        </div>

        {activeTab === "overview" && (
          <>
            {/* Top section: photo + core info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Photo */}
              <div className="lg:col-span-1">
                <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white">
                  {vehicle.photoUrl ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewPhoto({
                          url: vehicle.photoUrl,
                          title: `${vehicle.make} ${vehicle.model}`.trim(),
                        })
                      }
                      className="block w-full cursor-zoom-in"
                      title="View full photo"
                    >
                      <img
                        src={vehicle.photoUrl}
                        alt={`${vehicle.make} ${vehicle.model}`}
                        className="w-full h-56 object-cover hover:opacity-90 transition-opacity"
                      />
                    </button>
                  ) : (
                    <div className="w-full h-56 bg-gradient-to-br from-amber-500/20 to-amber-700/10 flex items-center justify-center">
                      <Car className="w-20 h-20 text-amber-500/40" />
                    </div>
                  )}
                  <div className="p-4 text-center border-t border-slate-200">
                    <p className="text-slate-900 font-semibold text-lg">
                      {vehicle.make} {vehicle.model}
                    </p>
                    <p className="text-slate-500 text-sm mt-0.5">
                      {vehicle.plateNo || "No plate"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Core Details */}
              <div className="lg:col-span-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 h-full">
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-5">
                    Vehicle Details
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <DetailItem
                      icon={<Hash className="w-4 h-4" />}
                      label="Vehicle No."
                      value={vehicle.vehicleNo}
                    />
                    <DetailItem
                      icon={<Car className="w-4 h-4" />}
                      label="Plate No."
                      value={vehicle.plateNo}
                    />
                    <DetailItem
                      icon={<Car className="w-4 h-4" />}
                      label="Make"
                      value={vehicle.make}
                    />
                    <DetailItem
                      icon={<Car className="w-4 h-4" />}
                      label="Model"
                      value={vehicle.model}
                    />
                    <DetailItem
                      icon={<Calendar className="w-4 h-4" />}
                      label="Year"
                      value={vehicle.year}
                    />
                    <DetailItem
                      icon={<Users className="w-4 h-4" />}
                      label="Seats"
                      value={vehicle.seats ? `${vehicle.seats} seats` : "-"}
                    />
                    <DetailItem
                      icon={<Users className="w-4 h-4" />}
                      label="Assigned Driver"
                      value={
                        vehicle.assignedDriver ? (
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/performance-dashboard?driverId=${vehicle.assignedDriver.id}`,
                              )
                            }
                            className="text-sm font-medium text-amber-300 hover:text-amber-200 hover:underline"
                          >
                            {vehicle.assignedDriver.name}
                          </button>
                        ) : (
                          "-"
                        )
                      }
                    />
                    <DetailItem
                      icon={<Hash className="w-4 h-4" />}
                      label="Chassis No."
                      value={vehicle.chassis || "-"}
                      mono
                    />
                    <DetailItem
                      icon={<statusCfg.Icon className="w-4 h-4" />}
                      label="Status"
                      value={
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${statusCfg.color}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`}
                          />
                          {vehicle.status}
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mileage cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <MileageCard
                label="Initial Mileage"
                value={vehicle.initialMileage}
                icon={<Gauge className="w-5 h-5 text-slate-500" />}
                color="slate"
              />
              <MileageCard
                label="Current Mileage"
                value={vehicle.currentMileage}
                icon={<Gauge className="w-5 h-5 text-amber-400" />}
                color="amber"
              />
            </div>

            {/* Specs */}
            {vehicle.specs && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Settings className="w-4 h-4 text-slate-500" />
                  <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                    Specifications
                  </h2>
                </div>
                <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">
                  {vehicle.specs}
                </p>
              </div>
            )}
          </>
        )}

        {activeTab === "service" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <MetricCard label="Total Records" value={serviceStats.total} />
              <MetricCard label="In Service" value={serviceStats.inService} />
              <MetricCard label="Returned" value={serviceStats.returned} />
              <MetricCard label="Cancelled" value={serviceStats.cancelled} />
              <MetricCard
                label="Total Cost"
                value={formatCurrency(serviceStats.totalCost)}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200">
                <Wrench className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Service Report
                </h2>
                <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full">
                  {serviceItems.length} records
                </span>
              </div>

              {isLoadingServices ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  Loading service report...
                </div>
              ) : serviceItems.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No service records found for this vehicle.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1320px] table-auto">
                    <colgroup>
                      <col className="w-[120px]" />
                      <col className="w-[180px]" />
                      <col className="w-[140px]" />
                      <col className="w-[120px]" />
                      <col className="w-[120px]" />
                      <col className="w-[320px]" />
                      <col className="w-[130px]" />
                      <col className="w-[120px]" />
                      <col className="w-[220px]" />
                      <col className="w-[90px]" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-slate-200/60">
                        {[
                          "Date",
                          "Service Center",
                          "Type",
                          "Odometer Out",
                          "Odometer In",
                          "Line Items",
                          "Cost",
                          "Status",
                          "Notes",
                          "Actions",
                        ].map((h) => (
                          <th
                            key={h}
                            className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {serviceItems.map((item) => (
                        <tr
                          key={item.id}
                          className="border-b border-slate-200/40 hover:bg-slate-100/80 transition-colors"
                        >
                          <td className="py-3 px-6 text-slate-700 whitespace-nowrap">
                            {formatDate(item.serviceDate)}
                          </td>
                          <td className="py-3 px-6 text-slate-900 font-medium">
                            {item.serviceCenter || "-"}
                          </td>
                          <td className="py-3 px-6 text-slate-700">
                            {item.serviceType || "-"}
                          </td>
                          <td className="py-3 px-6 text-slate-700">
                            {item.odometerOut === ""
                              ? "-"
                              : Number(item.odometerOut).toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-slate-700">
                            {item.odometerIn === ""
                              ? "-"
                              : Number(item.odometerIn).toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-slate-700 align-top">
                            {formatServiceItemsDisplay(item.serviceItems)}
                          </td>
                          <td className="py-3 px-6 text-slate-700 whitespace-nowrap">
                            {item.cost === "" ? "-" : formatCurrency(item.cost)}
                          </td>
                          <td className="py-3 px-6">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${getServiceStatusConfig(item.status)}`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-slate-500 text-xs whitespace-normal break-words align-top">
                            {item.notes || "-"}
                          </td>
                          <td className="py-3 px-6">
                            <Link
                              to={`/vehicle-services/view?id=${item.id}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-xs font-medium text-cyan-700 hover:bg-cyan-100"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "history" && (
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-200">
              <History className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">
                Vehicle History
              </h2>
              {historyItems.length > 0 && (
                <span className="ml-auto text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full">
                  {historyItems.length} records
                </span>
              )}
            </div>
            {isLoadingHistory ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Loading history...
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No history found for this vehicle.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/60">
                      {["Event", "Title", "Date", "Details"].map((h) => (
                        <th
                          key={h}
                          className="text-left py-3 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyItems.map((ev, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-slate-200/40 hover:bg-slate-100/80 transition-colors"
                      >
                        <td className="py-3 px-6">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 capitalize">
                            {ev.eventType.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-slate-900 font-medium">
                          {ev.title}
                        </td>
                        <td className="py-3 px-6 text-slate-500 whitespace-nowrap">
                          {formatDateTime(ev.eventAt || ev.eventDate)}
                        </td>
                        <td className="py-3 px-6 text-slate-500 text-xs max-w-xs">
                          {formatHistoryDetails(ev.details)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Photo Lightbox */}
      {previewPhoto.url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setPreviewPhoto({ url: "", title: "" })}
        >
          <div
            className="relative w-full max-w-5xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewPhoto({ url: "", title: "" })}
              className="absolute right-3 top-3 z-10 rounded-full bg-white/80 p-2 text-slate-200 transition-colors hover:bg-slate-100 hover:text-slate-900"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title || "Vehicle photo"}
                className="max-h-[85vh] w-full object-contain"
              />
              {previewPhoto.title && (
                <div className="border-t border-slate-200 px-4 py-3 text-sm font-medium text-slate-200">
                  {previewPhoto.title}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-slate-500 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}

function DetailItem({ icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-500 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        {typeof value === "string" || typeof value === "number" ? (
          <p
            className={`text-slate-900 text-sm font-medium ${mono ? "font-mono" : ""}`}
          >
            {value || "-"}
          </p>
        ) : (
          value
        )}
      </div>
    </div>
  );
}

function MileageCard({ label, value, icon, color }) {
  const border = color === "amber" ? "border-amber-500/20" : "border-slate-200";
  const bg = color === "amber" ? "bg-amber-500/5" : "bg-white";

  return (
    <div
      className={`rounded-2xl border ${border} ${bg} p-6 flex items-center gap-4`}
    >
      <div className="p-3 rounded-xl bg-slate-100">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-900">
          {Number(value || 0).toLocaleString()}
          <span className="text-sm font-normal text-slate-500 ml-1">km</span>
        </p>
      </div>
    </div>
  );
}
