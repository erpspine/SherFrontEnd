import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Fuel,
  Map,
  RefreshCw,
  User,
  XCircle,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { getAuthUser } from "../utils/auth";

const statusStyles = {
  Pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  Approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  Rejected: "border-rose-500/40 bg-rose-500/10 text-rose-300",
  Amend: "border-sky-500/40 bg-sky-500/10 text-sky-300",
};

const statusIcons = {
  Pending: Clock3,
  Approved: CheckCircle2,
  Rejected: XCircle,
  Amend: RefreshCw,
};

const normalizeStatus = (value) => {
  const normalized = String(value || "")
    .trim()
    .toLowerCase();
  if (normalized === "approved" || normalized === "approve") return "Approved";
  if (normalized === "rejected" || normalized === "reject") return "Rejected";
  if (normalized === "amend" || normalized === "amended") return "Amend";
  return "Pending";
};

const isAdminUser = (user) => {
  const role = String(user?.role || "")
    .trim()
    .toLowerCase();
  const roles = Array.isArray(user?.roles)
    ? user.roles.map((item) =>
        String(item || "")
          .trim()
          .toLowerCase(),
      )
    : [];

  return role.includes("admin") || roles.some((item) => item.includes("admin"));
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.fuelRequisitions)) return payload.fuelRequisitions;
  return [];
};

const parseTransportItinerary = (entry) => {
  const raw =
    entry?.transportItinerary ||
    entry?.transport_itinerary ||
    entry?.itinerary ||
    entry?.transportPlan ||
    [];

  const parsedRaw = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
  const days = Array.isArray(parsedRaw) ? parsedRaw : [];

  return days.map((day, index) => {
    const destinationsRaw =
      day?.destinations || day?.routes || day?.items || day?.legs || [];
    const destinations = Array.isArray(destinationsRaw)
      ? destinationsRaw.map((item) => ({
          destinationFrom:
            item?.destinationFrom || item?.destination_from || item?.from || "",
          destinationTo:
            item?.destinationTo || item?.destination_to || item?.to || "",
          distanceKm: Number(
            item?.distanceKm ?? item?.distance_km ?? item?.distance ?? 0,
          ),
        }))
      : [];

    return {
      day: Number(day?.day || index + 1),
      date: day?.date || "",
      distanceKm: Number(day?.distanceKm ?? day?.distance_km ?? 0),
      destinations,
    };
  });
};

const normalizeRequisition = (entry) => {
  const status = normalizeStatus(
    entry.status ||
      entry.requisitionStatus ||
      entry.approvalStatus ||
      "Pending",
  );

  return {
    id: entry.id,
    leadId: entry.lead?.id || entry.leadId || null,
    bookingRef: entry.lead?.bookingRef || entry.bookingRef || "",
    clientCompany: entry.lead?.clientCompany || entry.clientCompany || "",
    routeParks:
      entry.lead?.routeParks ||
      entry.lead?.route_parks ||
      entry.routeParks ||
      entry.route_parks ||
      "",
    startDate:
      entry.lead?.startDate ||
      entry.lead?.start_date ||
      entry.startDate ||
      entry.start_date ||
      "",
    endDate:
      entry.lead?.endDate ||
      entry.lead?.end_date ||
      entry.endDate ||
      entry.end_date ||
      "",
    baseRatePerKm: Number(
      entry.baseRatePerKm ?? entry.base_rate_per_km ?? entry.baseRate ?? 0,
    ),
    totalFuelLitres: Number(
      entry.totalFuelLitres ?? entry.total_fuel_litres ?? entry.litres ?? 0,
    ),
    totalDistanceKm: Number(
      entry.totalDistanceKm ?? entry.total_distance_km ?? entry.distanceKm ?? 0,
    ),
    reason: entry.reason || "",
    note:
      entry.note ||
      entry.notes ||
      entry.approvalNote ||
      entry.approval_note ||
      entry.responseNote ||
      "",
    approvedByName:
      entry.approvedBy?.name ||
      entry.approvedByName ||
      entry.approved_by_name ||
      "",
    rejectedByName:
      entry.rejectedBy?.name ||
      entry.rejectedByName ||
      entry.rejected_by_name ||
      "",
    amendedByName:
      entry.amendedBy?.name ||
      entry.amendedByName ||
      entry.amended_by_name ||
      "",
    respondedByName:
      entry.respondedBy?.name ||
      entry.respondedByName ||
      entry.responded_by_name ||
      "",
    respondedAt: entry.respondedAt || entry.responded_at || "",
    status,
    requestedByName:
      entry.requestedBy?.name || entry.requestedByName || "Unknown",
    requestedByEmail: entry.requestedBy?.email || entry.requestedByEmail || "",
    createdAt: entry.createdAt || entry.created_at || "",
    itinerary: parseTransportItinerary(entry),
  };
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function FuelRequisitionApproval() {
  const { id } = useParams();
  const authUser = getAuthUser();
  const canApprove = isAdminUser(authUser);

  const [item, setItem] = useState(null);
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAction, setActiveAction] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      setSuccessMessage("");

      try {
        let found = null;

        const byIdRes = await apiFetch(`/fuel-requisitions/${id}`);
        if (byIdRes.ok) {
          const byIdPayload = await byIdRes.json().catch(() => ({}));
          const rawById =
            byIdPayload?.data ?? byIdPayload?.fuelRequisition ?? byIdPayload;
          if (rawById?.id) {
            found = normalizeRequisition(rawById);
          }
        }

        if (!found) {
          const listRes = await apiFetch("/fuel-requisitions");
          const listPayload = await listRes.json().catch(() => ({}));
          if (!listRes.ok) {
            throw new Error(
              listPayload?.message || "Unable to load fuel requisition.",
            );
          }
          const rawItem = extractList(listPayload).find(
            (entry) => String(entry.id) === String(id),
          );
          if (!rawItem) {
            throw new Error("Fuel requisition not found.");
          }
          found = normalizeRequisition(rawItem);
        }

        setItem(found);
        setNote(found.note || "");
      } catch (error) {
        setErrorMessage(error.message || "Failed to load fuel requisition.");
      } finally {
        setIsLoading(false);
      }
    };

    if (id) load();
  }, [id]);

  const updateApproval = async (nextStatus) => {
    if (!canApprove || !item) return;

    if (item.status === "Approved" || item.status === "Rejected") {
      return;
    }

    const trimmedNote = String(note || "").trim();
    setIsSaving(true);
    setActiveAction(nextStatus);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const body = {
        status: nextStatus,
        note: trimmedNote,
      };

      let response = await apiFetch(`/fuel-requisitions/${item.id}`, {
        method: "PATCH",
        body,
      });

      if (!response.ok) {
        response = await apiFetch(`/fuel-requisitions/${item.id}`, {
          method: "PUT",
          body,
        });
      }

      if (!response.ok && nextStatus === "Approved") {
        response = await apiFetch(`/fuel-requisitions/${item.id}/approve`, {
          method: "POST",
          body: trimmedNote ? { note: trimmedNote } : undefined,
        });
      }

      if (!response.ok && nextStatus === "Rejected") {
        response = await apiFetch(`/fuel-requisitions/${item.id}/reject`, {
          method: "POST",
          body,
        });
      }

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to update requisition approval status.",
        );
      }

      setItem((prev) =>
        prev ? { ...prev, status: nextStatus, note: trimmedNote } : prev,
      );
      setSuccessMessage(`Requisition #${item.id} updated to ${nextStatus}.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to update approval status.");
    } finally {
      setIsSaving(false);
      setActiveAction("");
    }
  };

  const itineraryTotalDistance = useMemo(
    () =>
      (item?.itinerary || []).reduce(
        (sum, day) => sum + Number(day.distanceKm || 0),
        0,
      ),
    [item],
  );

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-6 py-10 text-center text-slate-400">
        Loading requisition details...
      </div>
    );
  }

  if (!item) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-6 py-4 text-rose-300">
          {errorMessage || "Fuel requisition not found."}
        </div>
        <Link
          to="/fuel-requisitions"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 shadow-sm hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Link>
      </div>
    );
  }

  const StatusIcon = statusIcons[item.status] || Clock3;
  const isCompleted = item.status === "Approved" || item.status === "Rejected";

  const actionByLabel =
    item.status === "Approved"
      ? item.approvedByName || item.respondedByName
      : item.status === "Rejected"
        ? item.rejectedByName || item.respondedByName
        : item.status === "Amend"
          ? item.amendedByName || item.respondedByName
          : item.respondedByName;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Fuel Requisition Review
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Review full itinerary details before approving this request.
          </p>
        </div>

        <Link
          to="/fuel-requisitions"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-300 shadow-sm hover:bg-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Link>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          {successMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-2">
            <div className="text-lg font-semibold text-white">
              {item.bookingRef || `Lead #${item.leadId || "-"}`}
            </div>
            <div className="text-slate-300">{item.clientCompany || "-"}</div>
            <div className="text-sm text-slate-400">
              Reason: {item.reason || "-"}
            </div>
            <div className="text-sm text-slate-400">
              Route/Parks: {item.routeParks || "-"}
            </div>
            <div className="text-sm text-slate-400">
              Safari Dates: {item.startDate || "-"} to {item.endDate || "-"}
            </div>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-800/50 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Status
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                  statusStyles[item.status] || statusStyles.Pending
                }`}
              >
                <StatusIcon className="h-3.5 w-3.5" />
                {item.status}
              </span>
            </div>
            <div className="text-sm text-slate-300">
              Base Rate: {item.baseRatePerKm.toFixed(2)} / KM
            </div>
            <div className="text-sm text-slate-300">
              Total Fuel: {item.totalFuelLitres.toFixed(2)} L
            </div>
            <div className="text-sm text-slate-300">
              Total Distance:{" "}
              {(item.totalDistanceKm || itineraryTotalDistance).toFixed(2)} KM
            </div>
            <div className="text-sm text-slate-300">
              Requested By: {item.requestedByName}
            </div>
            <div className="text-xs text-slate-400">
              {item.requestedByEmail || "-"}
            </div>
            <div className="text-xs text-slate-400">
              Created: {formatDateTime(item.createdAt)}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 border-b border-slate-800 bg-slate-800/50 px-4 py-3">
          <Map className="h-4 w-4 text-sher-teal" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Transport Itinerary
          </h2>
        </div>

        {item.itinerary.length === 0 ? (
          <div className="p-4 text-sm text-slate-400">
            No day-by-day itinerary was attached to this requisition.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
              <thead className="bg-slate-800/50 text-left text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Destinations</th>
                  <th className="px-4 py-3">Distance (KM)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {item.itinerary.map((day) => (
                  <tr
                    key={`${day.day}-${day.date || "na"}`}
                    className="align-top"
                  >
                    <td className="px-4 py-3 font-semibold text-white">
                      Day {day.day}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {day.date || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {day.destinations.length === 0 ? (
                        "-"
                      ) : (
                        <div className="space-y-1">
                          {day.destinations.map((destination, index) => (
                            <div
                              key={`${day.day}-dest-${index}`}
                              className="rounded-md border border-slate-700 bg-slate-800/50 px-2.5 py-1.5"
                            >
                              <div className="font-medium text-white">
                                {destination.destinationFrom || "-"}
                                {destination.destinationTo
                                  ? ` -> ${destination.destinationTo}`
                                  : ""}
                              </div>
                              <div className="text-xs text-slate-400">
                                {Number(destination.distanceKm || 0).toFixed(2)}{" "}
                                KM
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-white">
                      {Number(day.distanceKm || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 shadow-sm p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Fuel className="h-4 w-4 text-sher-teal" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Approval
          </h2>
        </div>

        <div className="text-sm text-slate-300">
          Current Note:{" "}
          <span className="font-medium text-white">{item.note || "-"}</span>
        </div>

        {actionByLabel && (
          <div className="text-xs text-slate-400">
            Last action by {actionByLabel}
            {item.respondedAt ? ` at ${formatDateTime(item.respondedAt)}` : ""}
          </div>
        )}

        {!canApprove ? (
          <div className="rounded-lg border border-sky-500/40 bg-sky-500/10 px-3 py-2 text-sm text-sky-300">
            Approval actions are available to admin users only.
          </div>
        ) : isCompleted ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm font-semibold text-slate-400">
            Process complete. This requisition can no longer be changed.
          </div>
        ) : (
          <>
            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-300">
                Approval Note
              </span>
              <textarea
                rows={4}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                disabled={isSaving}
                placeholder="Type approval note"
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20 disabled:cursor-not-allowed disabled:bg-slate-900"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => updateApproval("Amend")}
                className="rounded-md border border-sky-500/50 bg-sky-500/20 px-3 py-1.5 text-sm font-semibold text-sky-300 hover:bg-sky-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && activeAction === "Amend" ? "Saving..." : "Amend"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => updateApproval("Rejected")}
                className="rounded-md border border-rose-500/50 bg-rose-500/20 px-3 py-1.5 text-sm font-semibold text-rose-300 hover:bg-rose-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && activeAction === "Rejected"
                  ? "Saving..."
                  : "Reject"}
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={() => updateApproval("Approved")}
                className="rounded-md border border-emerald-500/50 bg-emerald-500/20 px-3 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving && activeAction === "Approved"
                  ? "Saving..."
                  : "Approve"}
              </button>
            </div>

            {isSaving && (
              <div className="text-xs font-medium text-slate-400">
                Updating approval status...
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
