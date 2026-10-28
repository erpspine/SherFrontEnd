import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CarFront,
  ClipboardList,
  Fuel,
  MapPin,
} from "lucide-react";
import { apiFetch } from "../utils/api";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const Detail = ({ label, value }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
      {label}
    </p>
    <p className="mt-1 break-words text-sm font-medium text-slate-900">
      {value || "—"}
    </p>
  </div>
);

export default function LeaseAllocationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [allocation, setAllocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const loadAllocation = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await apiFetch(`/lease-allocations/${id}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load lease allocation.",
          );
        }
        if (active) setAllocation(payload?.allocation || payload?.data || null);
      } catch (loadError) {
        if (active)
          setError(loadError.message || "Unable to load lease allocation.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadAllocation();
    return () => {
      active = false;
    };
  }, [id]);

  const itineraryItems = Array.isArray(allocation?.itineraryItems)
    ? allocation.itineraryItems
    : [];

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-slate-500">
        Loading lease allocation…
      </div>
    );
  }

  if (error || !allocation) {
    return (
      <div className="space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6">
        <p className="text-sm text-rose-700">
          {error || "Lease allocation not found."}
        </p>
        <button
          type="button"
          onClick={() => navigate("/lease-allocations")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Lease Allocations
        </button>
      </div>
    );
  }

  const statusClass =
    allocation.status === "Completed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : allocation.status === "In Progress"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : allocation.status === "Cancelled"
          ? "border-slate-300 bg-slate-100 text-slate-600"
          : "border-blue-200 bg-blue-50 text-blue-700";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate("/lease-allocations")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Lease Allocations
          </button>
          <h1 className="text-2xl font-bold text-slate-900">
            Lease Allocation #{allocation.id}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Trip allocation and itinerary details
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${statusClass}`}
        >
          {allocation.status || "Scheduled"}
        </span>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <ClipboardList className="h-5 w-5 text-amber-600" /> Allocation
          Overview
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Client" value={allocation.contract?.clientName} />
          <Detail label="Group Name" value={allocation.groupName} />
          <Detail label="Lease Type" value={allocation.contract?.leaseType} />
          <Detail
            label="Contract"
            value={allocation.contract?.id ? `#${allocation.contract.id}` : "—"}
          />
          <Detail
            label="Allocation Period"
            value={`${formatDate(allocation.startDate)} – ${formatDate(allocation.endDate)}`}
          />
          <Detail
            label="Created"
            value={
              allocation.createdAt
                ? new Date(allocation.createdAt).toLocaleString()
                : "—"
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <CarFront className="h-5 w-5 text-amber-600" /> Vehicle and Driver
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label="Vehicle No." value={allocation.vehicle?.vehicleNo} />
          <Detail label="Plate No." value={allocation.vehicle?.plateNo} />
          <Detail
            label="Make / Model"
            value={[allocation.vehicle?.make, allocation.vehicle?.model]
              .filter(Boolean)
              .join(" ")}
          />
          <Detail
            label="Driver"
            value={allocation.driver?.name || "Unassigned"}
          />
          <Detail label="Driver Email" value={allocation.driver?.email} />
          <Detail
            label="Odometer Logs"
            value={
              allocation.odometerLogCount ?? allocation.odometer_log_count ?? 0
            }
          />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
          <CalendarDays className="h-5 w-5 text-amber-600" /> Itinerary
        </h2>
        {itineraryItems.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itineraryItems.map((item, index) => (
                  <tr key={`${item.date || "day"}-${index}`}>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-800">
                      {formatDate(item.date)}
                    </td>
                    <td className="whitespace-pre-wrap px-4 py-3 text-slate-700">
                      {item.details || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-slate-700">
            {allocation.itinerary || "No itinerary details recorded."}
          </p>
        )}
      </section>

      {(allocation.fuelNotes || allocation.notes) && (
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {allocation.fuelNotes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                <Fuel className="h-5 w-5 text-amber-600" /> Fuel Notes
              </h2>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {allocation.fuelNotes}
              </p>
            </div>
          )}
          {allocation.notes && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-slate-900">
                <MapPin className="h-5 w-5 text-amber-600" /> Notes
              </h2>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {allocation.notes}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
