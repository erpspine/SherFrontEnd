import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Search, Route, Car, User, Calendar } from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const normalizeAllocation = (raw) => ({
  id: Number(raw.id || 0),
  assignmentType: raw.assignmentType || raw.assignment_type || "safari",
  startDate: raw.startDate || raw.start_date || "",
  endDate: raw.endDate || raw.end_date || "",
  status: raw.status || "-",
  safari: raw.safari || null,
  lead: raw.lead || null,
  contract: raw.contract || raw.leaseContract || raw.lease_contract || null,
  groupName: raw.groupName || raw.group_name || "",
  itinerary: raw.itinerary || "",
  odometerLogCount: Number(
    raw.odometerLogCount ??
      raw.odometer_log_count ??
      raw.odometer_logs_count ??
      0,
  ),
  latestOdometerLogAt:
    raw.latestOdometerLogAt || raw.latest_odometer_log_at || "",
  vehicle: raw.vehicle || null,
  driver: raw.driver || null,
});

const toDateKey = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const buildTripLabel = (allocation) => {
  const safari = allocation.safari || allocation.lead || {};
  const contract = allocation.contract || {};
  const isLease = allocation.assignmentType === "long_term_lease";
  return {
    bookingRef: isLease
      ? contract.leaseType || contract.lease_type || "Long Term Lease"
      : safari.bookingRef || safari.booking_ref || "-",
    groupName: isLease
      ? allocation.groupName || contract.groupName || contract.group_name || "-"
      : safari.groupName || safari.group_name || "-",
    clientCompany: isLease
      ? contract.clientName || contract.client_name || "-"
      : safari.clientCompany || safari.client_company || "-",
    routeParks: isLease
      ? allocation.itinerary || "-"
      : safari.routeParks || safari.route_parks || "-",
    vehicle:
      [
        allocation.vehicle?.vehicleNo || allocation.vehicle?.vehicle_no,
        allocation.vehicle?.plateNo || allocation.vehicle?.plate_no,
      ]
        .filter(Boolean)
        .join(" / ") || "-",
    driver: allocation.driver?.name || "-",
  };
};

const isLeaseAllocation = (allocation) =>
  allocation.assignmentType === "long_term_lease";

const buildReportPath = (allocation, suffix) =>
  isLeaseAllocation(allocation)
    ? `/lease-trips/${allocation.id}/odometer-logs/${suffix}`
    : `/trips/${allocation.id}/odometer-logs/${suffix}`;

const buildViewPath = (allocation) =>
  `/odometer-reports/view?tripId=${allocation.id}&type=${
    isLeaseAllocation(allocation) ? "lease" : "safari"
  }`;

export default function OdometerReports() {
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingId, setIsDownloadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadAllocations = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const [safariResponse, leaseResponse] = await Promise.all([
          apiFetch("/safari-allocations"),
          apiFetch("/lease-allocations"),
        ]);
        const [safariPayload, leasePayload] = await Promise.all([
          safariResponse.json().catch(() => ({})),
          leaseResponse.json().catch(() => ({})),
        ]);

        if (!safariResponse.ok) {
          throw new Error(
            safariPayload?.message || "Failed to load safari trips.",
          );
        }

        const safariList = Array.isArray(safariPayload?.allocations)
          ? safariPayload.allocations
          : Array.isArray(safariPayload)
            ? safariPayload
            : [];
        const leaseList = leaseResponse.ok
          ? Array.isArray(leasePayload?.allocations)
            ? leasePayload.allocations
            : Array.isArray(leasePayload)
              ? leasePayload
              : []
          : [];

        setAllocations(
          [
            ...safariList.map((item) => ({
              ...item,
              assignmentType: "safari",
            })),
            ...leaseList.map((item) => ({
              ...item,
              assignmentType: "long_term_lease",
            })),
          ].map(normalizeAllocation),
        );
      } catch (error) {
        setErrorMessage(
          error.message || "Failed to load odometer report trips.",
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadAllocations();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allocations
      .filter((item) => {
        const x = buildTripLabel(item);
        const transactionDate = toDateKey(item.latestOdometerLogAt);
        const matchesSearch =
          !q ||
          String(item.id).includes(q) ||
          String(x.bookingRef).toLowerCase().includes(q) ||
          String(x.groupName).toLowerCase().includes(q) ||
          String(x.clientCompany).toLowerCase().includes(q) ||
          String(x.vehicle).toLowerCase().includes(q) ||
          String(x.driver).toLowerCase().includes(q);
        const matchesFrom = !dateFrom || transactionDate >= dateFrom;
        const matchesTo = !dateTo || transactionDate <= dateTo;

        return matchesSearch && matchesFrom && matchesTo;
      })
      .sort((a, b) => {
        const aDate = a.latestOdometerLogAt
          ? new Date(a.latestOdometerLogAt).getTime()
          : 0;
        const bDate = b.latestOdometerLogAt
          ? new Date(b.latestOdometerLogAt).getTime()
          : 0;
        if (aDate !== bDate) return bDate - aDate;
        return Number(b.id || 0) - Number(a.id || 0);
      });
  }, [allocations, searchTerm, dateFrom, dateTo]);

  const handleDownload = async (allocation) => {
    setIsDownloadingId(allocation.id);
    try {
      const response = await apiFetch(buildReportPath(allocation, "pdf"), {
        headers: {
          Accept: "application/pdf",
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to download report.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `odometer-log-report-${
        isLeaseAllocation(allocation) ? "lease" : "trip"
      }-${allocation.id}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      await Swal.fire({
        title: "Error",
        text: error.message || "Failed to download report.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Odometer Reports
          </h1>
          <p className="text-slate-500 mt-1">
            Download safari and long term lease odometer and fuel PDF reports.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 focus-within:border-amber-400 focus-within:ring-4 focus-within:ring-amber-400/20 transition-all lg:w-96">
              <Search className="w-4 h-4 text-slate-400 shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by booking, group, client, vehicle, or driver"
                className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                Transaction From
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400"
                />
              </label>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
                To
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400"
                />
              </label>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="m-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="table-head-gradient text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Trip</th>
                <th className="px-4 py-3">Client / Group</th>
                <th className="px-4 py-3">Vehicle / Driver</th>
                <th className="px-4 py-3">Dates</th>
                <th className="px-4 py-3">Transaction Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    Loading trips...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No trips found.
                  </td>
                </tr>
              ) : (
                filtered.map((allocation) => {
                  const x = buildTripLabel(allocation);
                  return (
                    <tr
                      key={allocation.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="inline-flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-amber-700 font-semibold">
                          <Route className="w-3.5 h-3.5" />
                          {isLeaseAllocation(allocation) ? "Lease" : "Trip"} #
                          {allocation.id}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {x.bookingRef}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-slate-700">
                          {x.clientCompany}
                        </div>
                        <div className="text-xs text-slate-500">
                          {x.groupName}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Car className="w-4 h-4 text-slate-400" />
                          {x.vehicle}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          <User className="w-3.5 h-3.5" />
                          {x.driver}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-slate-700">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          {formatDate(allocation.startDate)} to{" "}
                          {formatDate(allocation.endDate)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-slate-700">
                          {formatDate(allocation.latestOdometerLogAt)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {allocation.odometerLogCount > 0
                            ? `${allocation.odometerLogCount} entr${allocation.odometerLogCount === 1 ? "y" : "ies"}`
                            : "No entries"}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {allocation.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={buildViewPath(allocation)}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => handleDownload(allocation)}
                            disabled={isDownloadingId === allocation.id}
                            className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Download className="w-4 h-4" />
                            {isDownloadingId === allocation.id
                              ? "Downloading..."
                              : "Download"}
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
    </div>
  );
}
