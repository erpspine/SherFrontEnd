import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Search,
  Fuel,
  Clock3,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { getAuthUser } from "../utils/auth";

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected", "Amend"];

const statusStyles = {
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-rose-200 bg-rose-50 text-rose-700",
  Amend: "border-sky-200 bg-sky-50 text-sky-700",
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
  if (normalized === "approved" || normalized === "approve") {
    return "Approved";
  }
  if (normalized === "rejected" || normalized === "reject") {
    return "Rejected";
  }
  if (normalized === "amend" || normalized === "amended") {
    return "Amend";
  }
  return "Pending";
};

const normalizeRequisition = (entry) => {
  const statusRaw =
    entry.status ||
    entry.requisitionStatus ||
    entry.approvalStatus ||
    "Pending";
  const status = normalizeStatus(statusRaw);

  return {
    id: entry.id,
    leadId: entry.lead?.id || entry.leadId || null,
    bookingRef: entry.lead?.bookingRef || entry.bookingRef || "",
    clientCompany: entry.lead?.clientCompany || entry.clientCompany || "",
    litres: Number(entry.litres || 0),
    baseRatePerKm: Number(
      entry.baseRatePerKm ?? entry.base_rate_per_km ?? entry.baseRate ?? 0,
    ),
    totalFuelLitres: Number(
      entry.totalFuelLitres ?? entry.total_fuel_litres ?? entry.litres ?? 0,
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
  };
};

const extractList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.fuelRequisitions)) return payload.fuelRequisitions;
  return [];
};

const extractAllocations = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.safariAllocations))
    return payload.safariAllocations;
  if (Array.isArray(payload?.safari_allocations))
    return payload.safari_allocations;
  if (Array.isArray(payload?.allocations)) return payload.allocations;
  return [];
};

const normalizeAllocation = (allocation) => {
  const leadId =
    allocation.lead?.id || allocation.leadId || allocation.lead_id || null;

  const vehicleNo =
    allocation.vehicle?.vehicleNo ||
    allocation.vehicle?.vehicle_no ||
    allocation.vehicleNo ||
    allocation.vehicle_no ||
    "";
  const plateNo =
    allocation.vehicle?.plateNo ||
    allocation.vehicle?.plate_no ||
    allocation.plateNo ||
    allocation.plate_no ||
    "";
  const vehicleLabel = [vehicleNo, plateNo ? `(${plateNo})` : ""]
    .filter(Boolean)
    .join(" ")
    .trim();

  const driverName =
    allocation.driver?.name ||
    allocation.driverName ||
    allocation.driver_name ||
    "";

  return {
    leadId: leadId ? String(leadId) : "",
    vehicleLabel,
    driverName: String(driverName || "").trim(),
    updatedAt:
      allocation.updatedAt ||
      allocation.updated_at ||
      allocation.createdAt ||
      allocation.created_at ||
      "",
  };
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
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

  if (role.includes("admin")) return true;
  if (roles.some((item) => item.includes("admin"))) return true;
  return false;
};

export default function FuelRequisitions() {
  const authUser = getAuthUser();
  const canApprove = isAdminUser(authUser);
  const [items, setItems] = useState([]);
  const [allocationByLead, setAllocationByLead] = useState({});
  const [noteDrafts, setNoteDrafts] = useState({});
  const [savingById, setSavingById] = useState({});
  const [activeActionById, setActiveActionById] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadItems = async () => {
    setIsLoading(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const [requisitionsRes, allocationsRes] = await Promise.all([
        apiFetch("/fuel-requisitions"),
        apiFetch("/safari-allocations"),
      ]);
      const payload = await requisitionsRes.json().catch(() => ({}));
      const allocationsPayload = await allocationsRes.json().catch(() => ({}));

      if (!requisitionsRes.ok) {
        throw new Error(
          payload?.message || "Unable to load fuel requisitions.",
        );
      }

      const normalizedItems = extractList(payload).map(normalizeRequisition);
      setItems(normalizedItems);
      setNoteDrafts(
        normalizedItems.reduce((acc, item) => {
          acc[item.id] = item.note || "";
          return acc;
        }, {}),
      );

      if (allocationsRes.ok) {
        const normalized = extractAllocations(allocationsPayload)
          .map(normalizeAllocation)
          .filter((allocation) => allocation.leadId);

        const byLead = normalized.reduce((acc, allocation) => {
          const existing = acc[allocation.leadId];
          if (!existing) {
            acc[allocation.leadId] = allocation;
            return acc;
          }

          const existingTime = Date.parse(existing.updatedAt || "") || 0;
          const currentTime = Date.parse(allocation.updatedAt || "") || 0;
          if (currentTime >= existingTime) {
            acc[allocation.leadId] = allocation;
          }
          return acc;
        }, {});

        setAllocationByLead(byLead);
      } else {
        setAllocationByLead({});
      }
    } catch (error) {
      setErrorMessage(error.message || "Failed to load fuel requisitions.");
      setAllocationByLead({});
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const updateApproval = async (itemId, nextStatus) => {
    if (!canApprove) return;

    const currentItem = items.find(
      (item) => String(item.id) === String(itemId),
    );
    if (
      currentItem?.status === "Approved" ||
      currentItem?.status === "Rejected"
    ) {
      return;
    }

    const note = String(noteDrafts[itemId] || "").trim();
    setSavingById((prev) => ({ ...prev, [itemId]: true }));
    setActiveActionById((prev) => ({ ...prev, [itemId]: nextStatus }));
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const body = {
        status: nextStatus,
        note,
      };

      let response = await apiFetch(`/fuel-requisitions/${itemId}`, {
        method: "PATCH",
        body,
      });

      if (!response.ok) {
        response = await apiFetch(`/fuel-requisitions/${itemId}`, {
          method: "PUT",
          body,
        });
      }

      // Backward-compatible fallback for existing action endpoints.
      if (!response.ok && nextStatus === "Approved") {
        response = await apiFetch(`/fuel-requisitions/${itemId}/approve`, {
          method: "POST",
          body: note ? { note } : undefined,
        });
      }

      if (!response.ok && nextStatus === "Rejected") {
        response = await apiFetch(`/fuel-requisitions/${itemId}/reject`, {
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

      setItems((current) =>
        current.map((item) =>
          String(item.id) === String(itemId)
            ? {
                ...item,
                status: nextStatus,
                note,
              }
            : item,
        ),
      );
      setSuccessMessage(`Requisition #${itemId} updated to ${nextStatus}.`);
    } catch (error) {
      setErrorMessage(error.message || "Failed to update approval status.");
    } finally {
      setSavingById((prev) => ({ ...prev, [itemId]: false }));
      setActiveActionById((prev) => ({ ...prev, [itemId]: "" }));
    }
  };

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const searchMatch =
        !query ||
        (item.bookingRef || "").toLowerCase().includes(query) ||
        (item.clientCompany || "").toLowerCase().includes(query) ||
        (item.reason || "").toLowerCase().includes(query) ||
        (item.note || "").toLowerCase().includes(query) ||
        (item.requestedByName || "").toLowerCase().includes(query);

      const statusMatch =
        statusFilter === "All" || item.status === statusFilter;

      return searchMatch && statusMatch;
    });
  }, [items, search, statusFilter]);

  const stats = useMemo(() => {
    const pending = items.filter((item) => item.status === "Pending").length;
    const approved = items.filter((item) => item.status === "Approved").length;
    const rejected = items.filter((item) => item.status === "Rejected").length;

    return {
      total: items.length,
      pending,
      approved,
      rejected,
      litresTotal: items.reduce((sum, item) => sum + item.totalFuelLitres, 0),
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Fuel Requisitions
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Track fuel requests by lead with status-ready filtering for
            approvals.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadItems}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>

          <Link
            to="/fuel-requisitions/new"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sher-gold to-sher-gold-dark px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            New Requisition
          </Link>
        </div>
      </div>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Requests
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {stats.total}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Pending
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-800">
            {stats.pending}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Approved
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-800">
            {stats.approved}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">
            Rejected
          </p>
          <p className="mt-1 text-2xl font-bold text-rose-800">
            {stats.rejected}
          </p>
        </div>
        <div className="rounded-2xl border border-sher-teal/20 bg-sher-teal/5 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-sher-teal">
            Total Litres
          </p>
          <p className="mt-1 text-2xl font-bold text-sher-teal">
            {stats.litresTotal.toFixed(2)} L
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by lead, company, reason, requester"
              className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
            />
          </div>

          <div className="flex items-center gap-2">
            {canApprove && (
              <span className="inline-flex items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-sky-700">
                Admin only
              </span>
            )}
            <Filter className="h-4 w-4 text-slate-500" />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        {errorMessage && (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="mx-4 mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Base Rate / Total Fuel</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Created</th>
                {canApprove && <th className="px-4 py-3">Approval</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={canApprove ? 8 : 7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading fuel requisitions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={canApprove ? 8 : 7}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No fuel requisitions found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const StatusIcon = statusIcons[item.status] || Clock3;
                  const allocation = item.leadId
                    ? allocationByLead[String(item.leadId)]
                    : null;
                  const isCompleted =
                    item.status === "Approved" || item.status === "Rejected";

                  const actionByLabel =
                    item.status === "Approved"
                      ? item.approvedByName || item.respondedByName
                      : item.status === "Rejected"
                        ? item.rejectedByName || item.respondedByName
                        : item.status === "Amend"
                          ? item.amendedByName || item.respondedByName
                          : item.respondedByName;

                  const actionByBadgeClass =
                    item.status === "Approved"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : item.status === "Rejected"
                        ? "border-rose-200 bg-rose-50 text-rose-700"
                        : item.status === "Amend"
                          ? "border-sky-200 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-slate-50 text-slate-600";

                  const actionByText =
                    item.status === "Approved"
                      ? `Approved by ${actionByLabel}`
                      : item.status === "Rejected"
                        ? `Rejected by ${actionByLabel}`
                        : item.status === "Amend"
                          ? `Amended by ${actionByLabel}`
                          : `${item.status} by ${actionByLabel}`;

                  return (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {item.bookingRef || `Lead #${item.leadId || "-"}`}
                        </div>
                        <div className="text-slate-500">
                          {item.clientCompany || "-"}
                        </div>
                        {allocation?.vehicleLabel && (
                          <div className="mt-1 text-xs font-medium text-slate-700">
                            Vehicle: {allocation.vehicleLabel}
                          </div>
                        )}
                        {allocation?.driverName && (
                          <div className="text-xs font-medium text-slate-700">
                            Driver: {allocation.driverName}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-800">
                          {item.baseRatePerKm.toFixed(2)} / KM
                        </div>
                        <div className="text-xs font-medium text-slate-600">
                          {item.totalFuelLitres.toFixed(2)} L
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[360px]">
                        <div className="line-clamp-2">{item.reason || "-"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                            statusStyles[item.status] || statusStyles.Pending
                          }`}
                        >
                          <StatusIcon className="h-3.5 w-3.5" />
                          {item.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-700 max-w-[320px]">
                        <div className="line-clamp-3">{item.note || "-"}</div>
                        {actionByLabel && (
                          <span
                            className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${actionByBadgeClass}`}
                          >
                            {actionByText}
                          </span>
                        )}
                        {item.respondedAt && (
                          <div className="text-xs text-slate-500">
                            {formatDateTime(item.respondedAt)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">
                          {item.requestedByName}
                        </div>
                        <div className="text-slate-500">
                          {item.requestedByEmail || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {formatDateTime(item.createdAt)}
                      </td>
                      {canApprove && (
                        <td className="px-4 py-3 min-w-[260px]">
                          {!isCompleted ? (
                            <>
                              <textarea
                                rows={2}
                                value={noteDrafts[item.id] ?? item.note ?? ""}
                                onChange={(event) =>
                                  setNoteDrafts((prev) => ({
                                    ...prev,
                                    [item.id]: event.target.value,
                                  }))
                                }
                                disabled={Boolean(savingById[item.id])}
                                placeholder="Type approval note"
                                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                              />
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  disabled={Boolean(savingById[item.id])}
                                  onClick={() =>
                                    updateApproval(item.id, "Amend")
                                  }
                                  className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700 hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {Boolean(savingById[item.id]) &&
                                  activeActionById[item.id] === "Amend"
                                    ? "Saving..."
                                    : "Amend"}
                                </button>
                                <button
                                  type="button"
                                  disabled={Boolean(savingById[item.id])}
                                  onClick={() =>
                                    updateApproval(item.id, "Rejected")
                                  }
                                  className="rounded-md border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {Boolean(savingById[item.id]) &&
                                  activeActionById[item.id] === "Rejected"
                                    ? "Saving..."
                                    : "Reject"}
                                </button>
                                <button
                                  type="button"
                                  disabled={Boolean(savingById[item.id])}
                                  onClick={() =>
                                    updateApproval(item.id, "Approved")
                                  }
                                  className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {Boolean(savingById[item.id]) &&
                                  activeActionById[item.id] === "Approved"
                                    ? "Saving..."
                                    : "Approve"}
                                </button>
                              </div>
                              {Boolean(savingById[item.id]) && (
                                <div className="mt-1 text-xs font-medium text-slate-500">
                                  Updating approval status...
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-xs font-semibold text-slate-500">
                              Process complete
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sher-teal/10 to-sher-gold/10 p-4 text-sm text-slate-700">
        <div className="flex items-center gap-2 font-semibold text-slate-900">
          <Fuel className="h-4 w-4 text-sher-teal" />
          Status-ready layout note
        </div>
        <p className="mt-1">
          Backend currently returns new requisitions without an explicit status,
          so they appear as Pending by default. Once status fields are added in
          API, this page will automatically display and filter them.
        </p>
      </section>
    </div>
  );
}
