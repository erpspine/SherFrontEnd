import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Car,
  Edit,
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
  X,
} from "lucide-react";
import { apiFetch } from "../utils/api";

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
        color: "text-slate-400 bg-slate-500/10 border-slate-500/30",
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
  const navigate = useNavigate();

  const [vehicle, setVehicle] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState({ url: "", title: "" });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError("");
      try {
        const vehicleRes = await apiFetch(`/vehicles/${id}`);
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
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const loadHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const res = await apiFetch(`/vehicles/${id}/history`);
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
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm">Loading vehicle details...</div>
      </div>
    );
  }

  if (error || !vehicle) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
        <div className="text-red-400 text-sm">
          {error || "Vehicle not found."}
        </div>
        <button
          onClick={() => navigate("/vehicles")}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vehicles
        </button>
      </div>
    );
  }

  const statusCfg = getStatusConfig(vehicle.status);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800/60 bg-slate-900/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/vehicles")}
              className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="w-px h-5 bg-slate-700" />
            <div>
              <h1 className="text-lg font-bold text-white">
                {vehicle.vehicleNo || `Vehicle #${vehicle.id}`}
              </h1>
              <p className="text-sm text-slate-400">
                {vehicle.make} {vehicle.model} · {vehicle.year}
              </p>
            </div>
          </div>
          <div
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border ${statusCfg.color}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {vehicle.status}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Top section: photo + core info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Photo */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900">
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
              <div className="p-4 text-center border-t border-slate-800">
                <p className="text-white font-semibold text-lg">
                  {vehicle.make} {vehicle.model}
                </p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {vehicle.plateNo || "No plate"}
                </p>
              </div>
            </div>
          </div>

          {/* Core Details */}
          <div className="lg:col-span-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 h-full">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-5">
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
            icon={<Gauge className="w-5 h-5 text-slate-400" />}
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
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-slate-400" />
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
                Specifications
              </h2>
            </div>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">
              {vehicle.specs}
            </p>
          </div>
        )}

        {/* Vehicle History */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-slate-800">
            <History className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              Vehicle History
            </h2>
            {historyItems.length > 0 && (
              <span className="ml-auto text-xs bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full">
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
                  <tr className="border-b border-slate-800/60">
                    {["Event", "Title", "Date", "Details"].map((h) => (
                      <th
                        key={h}
                        className="text-left py-3 px-6 text-xs font-semibold text-slate-400 uppercase tracking-wider"
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
                      className="border-b border-slate-800/40 hover:bg-slate-800/20 transition-colors"
                    >
                      <td className="py-3 px-6">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 capitalize">
                          {ev.eventType.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3 px-6 text-white font-medium">
                        {ev.title}
                      </td>
                      <td className="py-3 px-6 text-slate-400 whitespace-nowrap">
                        {formatDateTime(ev.eventAt || ev.eventDate)}
                      </td>
                      <td className="py-3 px-6 text-slate-400 text-xs max-w-xs">
                        {formatHistoryDetails(ev.details)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
              className="absolute right-3 top-3 z-10 rounded-full bg-slate-900/80 p-2 text-slate-200 transition-colors hover:bg-slate-800 hover:text-white"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title || "Vehicle photo"}
                className="max-h-[85vh] w-full object-contain"
              />
              {previewPhoto.title && (
                <div className="border-t border-slate-800 px-4 py-3 text-sm font-medium text-slate-200">
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

function DetailItem({ icon, label, value, mono = false }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-slate-500 flex-shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 mb-0.5">{label}</p>
        {typeof value === "string" || typeof value === "number" ? (
          <p
            className={`text-white text-sm font-medium ${mono ? "font-mono" : ""}`}
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
  const border = color === "amber" ? "border-amber-500/20" : "border-slate-700";
  const bg = color === "amber" ? "bg-amber-500/5" : "bg-slate-900";

  return (
    <div
      className={`rounded-2xl border ${border} ${bg} p-6 flex items-center gap-4`}
    >
      <div className="p-3 rounded-xl bg-slate-800">{icon}</div>
      <div>
        <p className="text-xs text-slate-500 mb-1">{label}</p>
        <p className="text-2xl font-bold text-white">
          {Number(value || 0).toLocaleString()}
          <span className="text-sm font-normal text-slate-400 ml-1">km</span>
        </p>
      </div>
    </div>
  );
}
