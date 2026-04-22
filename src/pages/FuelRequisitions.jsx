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

const STATUS_OPTIONS = ["All", "Pending", "Approved", "Rejected"];

const statusStyles = {
  Pending: "border-amber-200 bg-amber-50 text-amber-700",
  Approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Rejected: "border-rose-200 bg-rose-50 text-rose-700",
};

const statusIcons = {
  Pending: Clock3,
  Approved: CheckCircle2,
  Rejected: XCircle,
};

const normalizeRequisition = (entry) => {
  const statusRaw = entry.status || entry.requisitionStatus || "Pending";
  const status = ["Pending", "Approved", "Rejected"].includes(statusRaw)
    ? statusRaw
    : "Pending";

  return {
    id: entry.id,
    leadId: entry.lead?.id || entry.leadId || null,
    bookingRef: entry.lead?.bookingRef || entry.bookingRef || "",
    clientCompany: entry.lead?.clientCompany || entry.clientCompany || "",
    litres: Number(entry.litres || 0),
    reason: entry.reason || "",
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

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

export default function FuelRequisitions() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadItems = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await apiFetch("/fuel-requisitions");
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to load fuel requisitions.",
        );
      }

      setItems(extractList(payload).map(normalizeRequisition));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load fuel requisitions.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return items.filter((item) => {
      const searchMatch =
        !query ||
        (item.bookingRef || "").toLowerCase().includes(query) ||
        (item.clientCompany || "").toLowerCase().includes(query) ||
        (item.reason || "").toLowerCase().includes(query) ||
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
      litresTotal: items.reduce((sum, item) => sum + item.litres, 0),
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

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Litres</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Requested By</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Loading fuel requisitions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No fuel requisitions found.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => {
                  const StatusIcon = statusIcons[item.status] || Clock3;

                  return (
                    <tr key={item.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">
                          {item.bookingRef || `Lead #${item.leadId || "-"}`}
                        </div>
                        <div className="text-slate-500">
                          {item.clientCompany || "-"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {item.litres.toFixed(2)} L
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
