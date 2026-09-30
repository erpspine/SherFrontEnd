import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  Car,
  Calendar,
  Wrench,
  Gauge,
  FileText,
} from "lucide-react";
import { apiFetch } from "../utils/api";

const normalizeService = (entry) => ({
  id: entry.id,
  vehicleId: Number(entry.vehicle_id || entry.vehicleId || 0),
  vehicleNo: entry.vehicle_no || entry.vehicleNo || "",
  plateNo: entry.plate_no || entry.plateNo || "",
  serviceCenter: entry.service_center || entry.serviceCenter || "",
  serviceType: entry.service_type || entry.serviceType || "",
  serviceDate:
    entry.service_date ||
    entry.serviceDate ||
    entry.service_date_out ||
    entry.serviceDateOut ||
    "",
  serviceDateOut: entry.service_date_out || entry.serviceDateOut || "",
  serviceDateIn: entry.service_date_in || entry.serviceDateIn || "",
  serviceItems: Array.isArray(entry.service_items || entry.serviceItems)
    ? (entry.service_items || entry.serviceItems)
        .map((item) => ({
          service: item?.service || "",
          details: item?.details || "",
          cost:
            item?.cost === null || item?.cost === undefined
              ? null
              : Number(item.cost),
        }))
        .filter((item) => item.service || item.details || item.cost !== null)
    : [],
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
    entry.cost === null || entry.cost === undefined ? null : Number(entry.cost),
  notes: entry.notes || "",
  status: entry.status || "In Service",
  createdAt: entry.created_at || entry.createdAt || "",
  updatedAt: entry.updated_at || entry.updatedAt || "",
});

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

const formatCurrency = (value) =>
  `TZS ${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

export default function VehicleServiceView() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const serviceId = id || searchParams.get("id") || "";

  const [service, setService] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!serviceId) {
        setError("Service record not found.");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const res = await apiFetch(`/vehicle-services/${serviceId}`);
        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(payload?.message || "Failed to load service record.");
        }

        const raw =
          payload?.vehicleService ||
          payload?.data ||
          payload?.service ||
          payload;
        setService(normalizeService(raw));
      } catch (err) {
        setError(err.message || "Failed to load service record.");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [serviceId]);

  const lineItemsTotal = useMemo(
    () =>
      (service?.serviceItems || []).reduce(
        (sum, item) => sum + Number(item.cost || 0),
        0,
      ),
    [service],
  );

  if (isLoading) {
    return (
      <div className="min-h-[60vh] rounded-2xl border border-slate-200 bg-white flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading service details...</div>
      </div>
    );
  }

  if (error || !service) {
    return (
      <div className="min-h-[60vh] rounded-2xl border border-slate-200 bg-white flex flex-col items-center justify-center gap-4">
        <div className="text-red-500 text-sm">
          {error || "Record not found."}
        </div>
        <button
          onClick={() => navigate("/vehicle-services")}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vehicle Services
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <button
            onClick={() => navigate("/vehicle-services")}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-2xl font-bold text-slate-900 mt-2">
            Vehicle Service #{service.id}
          </h1>
          <p className="text-slate-500 mt-1">
            {service.vehicleNo || "Unknown Vehicle"} ({service.plateNo || "-"})
          </p>
        </div>
        <span
          className={`inline-flex items-center rounded-xl border px-3 py-1.5 text-xs font-medium ${
            service.status === "Returned"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : service.status === "Cancelled"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {service.status}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Calendar className="w-4 h-4" />}
          label="Date"
          value={formatDate(service.serviceDate)}
        />
        <SummaryCard
          icon={<Wrench className="w-4 h-4" />}
          label="Service Center"
          value={service.serviceCenter || "-"}
        />
        <SummaryCard
          icon={<Gauge className="w-4 h-4" />}
          label="Odometer In"
          value={
            service.odometerIn === ""
              ? "-"
              : Number(service.odometerIn).toLocaleString()
          }
        />
        <SummaryCard
          icon={<FileText className="w-4 h-4" />}
          label="Total Cost"
          value={service.cost !== null ? formatCurrency(service.cost) : "-"}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Vehicle
        </h2>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-cyan-50 flex items-center justify-center">
            <Car className="h-4 w-4 text-cyan-700" />
          </div>
          <div>
            <Link
              to={`/vehicles/view?id=${service.vehicleId}`}
              className="text-sm font-medium text-slate-900 hover:text-cyan-700 hover:underline"
            >
              {service.vehicleNo || `Vehicle #${service.vehicleId}`}
            </Link>
            <p className="text-xs text-slate-500">{service.plateNo || "-"}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
            Service Line Items
          </h2>
          <span className="text-xs text-slate-500">
            {(service.serviceItems || []).length} items ·{" "}
            {formatCurrency(lineItemsTotal)}
          </span>
        </div>

        {(service.serviceItems || []).length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">
            No line items on this service record.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Service
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Details
                  </th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody>
                {service.serviceItems.map((item, index) => (
                  <tr
                    key={`line-item-${index}`}
                    className="border-b border-slate-100"
                  >
                    <td className="px-5 py-3 text-slate-900 font-medium">
                      {item.service || "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-600">
                      {item.details || "-"}
                    </td>
                    <td className="px-5 py-3 text-slate-700 text-right whitespace-nowrap">
                      {item.cost === null ? "-" : formatCurrency(item.cost)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <InfoRow label="Service Type" value={service.serviceType || "-"} />
        <InfoRow label="Parts Replaced" value={service.partsReplaced || "-"} />
        <InfoRow
          label="Odometer Out"
          value={
            service.odometerOut === ""
              ? "-"
              : Number(service.odometerOut).toLocaleString()
          }
        />
        <InfoRow
          label="Fuel (Out/In)"
          value={`${service.fuelOut === "" ? "-" : service.fuelOut}% / ${service.fuelIn === "" ? "-" : service.fuelIn}%`}
        />
        <InfoRow
          label="Service Date Out"
          value={formatDate(service.serviceDateOut)}
        />
        <InfoRow
          label="Service Date In"
          value={formatDate(service.serviceDateIn)}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-2">
          Notes
        </h2>
        <p className="text-sm text-slate-700 whitespace-pre-line">
          {service.notes || "-"}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 flex items-center gap-2 text-slate-900 font-semibold text-sm">
        <span className="text-slate-500">{icon}</span>
        <span>{value}</span>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}
