import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Download, Search, Route, Car, User, Calendar } from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const normalizeAllocation = (raw) => ({
  id: Number(raw.id || 0),
  startDate: raw.startDate || raw.start_date || "",
  endDate: raw.endDate || raw.end_date || "",
  status: raw.status || "-",
  safari: raw.safari || null,
  lead: raw.lead || null,
  vehicle: raw.vehicle || null,
  driver: raw.driver || null,
});

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
};

const buildTripLabel = (allocation) => {
  const safari = allocation.safari || allocation.lead || {};
  return {
    bookingRef: safari.bookingRef || safari.booking_ref || "-",
    groupName: safari.groupName || safari.group_name || "-",
    clientCompany: safari.clientCompany || safari.client_company || "-",
    routeParks: safari.routeParks || safari.route_parks || "-",
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

export default function OdometerReports() {
  const [allocations, setAllocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloadingId, setIsDownloadingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadAllocations = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await apiFetch("/safari-allocations");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load safari trips.");
        }

        const list = Array.isArray(payload?.allocations)
          ? payload.allocations
          : Array.isArray(payload)
            ? payload
            : [];

        setAllocations(list.map(normalizeAllocation));
      } catch (error) {
        setErrorMessage(error.message || "Failed to load safari trips.");
      } finally {
        setIsLoading(false);
      }
    };

    loadAllocations();
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allocations;

    return allocations.filter((item) => {
      const x = buildTripLabel(item);
      return (
        String(item.id).includes(q) ||
        String(x.bookingRef).toLowerCase().includes(q) ||
        String(x.groupName).toLowerCase().includes(q) ||
        String(x.clientCompany).toLowerCase().includes(q) ||
        String(x.vehicle).toLowerCase().includes(q) ||
        String(x.driver).toLowerCase().includes(q)
      );
    });
  }, [allocations, searchTerm]);

  const handleDownload = async (allocation) => {
    setIsDownloadingId(allocation.id);
    try {
      const response = await apiFetch(
        `/trips/${allocation.id}/odometer-logs/pdf`,
        {
          headers: {
            Accept: "application/pdf",
          },
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Failed to download report.");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `odometer-log-report-trip-${allocation.id}.pdf`;
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
            Download per-trip odometer and fuel PDF reports.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-4">
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
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
                    Loading trips...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400">
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
                          Trip #{allocation.id}
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
                        <span className="inline-flex items-center rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                          {allocation.status || "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Link
                            to={`/odometer-reports/view?tripId=${allocation.id}`}
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
