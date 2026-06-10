import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Calendar, Car, Download, Route, User } from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const formatDate = (value, withTime = false) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const pad = (n) => String(n).padStart(2, "0");
  const base = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  if (!withTime) return base;
  return `${base} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

export default function OdometerReportView() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const effectiveTripId = tripId || searchParams.get("tripId") || "";
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState(null);
  const [logs, setLogs] = useState([]);
  const [fuelRefills, setFuelRefills] = useState([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");
      try {
        const response = await apiFetch(
          `/trips/${effectiveTripId}/odometer-logs/report`,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Failed to load report.");
        }
        setReport(payload?.report || null);
        setLogs(Array.isArray(payload?.logs) ? payload.logs : []);
        setFuelRefills(
          Array.isArray(payload?.fuelRefills) ? payload.fuelRefills : [],
        );
      } catch (error) {
        setErrorMessage(error.message || "Failed to load report.");
      } finally {
        setIsLoading(false);
      }
    };

    if (effectiveTripId) {
      load();
    }
  }, [effectiveTripId]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const response = await apiFetch(
        `/trips/${effectiveTripId}/odometer-logs/pdf`,
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
      anchor.download = `odometer-log-report-trip-${effectiveTripId}.pdf`;
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
      setIsDownloading(false);
    }
  };

  const orderedLogs = useMemo(() => logs, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            to="/odometer-reports"
            className="mb-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Odometer Reports
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            Odometer Report View
          </h1>
          <p className="mt-1 text-slate-500">Trip #{effectiveTripId || "-"}</p>
        </div>

        <button
          onClick={handleDownload}
          disabled={isDownloading || isLoading}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {isDownloading ? "Downloading..." : "Download PDF"}
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading report...
        </div>
      ) : report ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Trip Summary
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Booking Ref</div>
                <div className="font-semibold text-slate-800">
                  {report.leadBookingRef || "-"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Client</div>
                <div className="font-semibold text-slate-800">
                  {report.clientCompany || "-"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Group</div>
                <div className="font-semibold text-slate-800">
                  {report.groupName || "-"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Route</div>
                <div className="font-semibold text-slate-800">
                  {report.routeParks || "-"}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Calendar className="h-4 w-4" /> Trip Dates
                </div>
                <div className="font-semibold text-slate-800">
                  {formatDate(report.tripStartDate)} -{" "}
                  {formatDate(report.tripEndDate)}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Car className="h-4 w-4" /> Vehicle
                </div>
                <div className="font-semibold text-slate-800">
                  {report.vehicleLabel || "-"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <User className="h-4 w-4" /> Driver
                </div>
                <div className="font-semibold text-slate-800">
                  {report.driverName || "-"}
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Route className="h-4 w-4" /> Overall Driver Avg
                </div>
                <div className="font-semibold text-slate-800">
                  {report.overallDriverAverage !== null &&
                  report.overallDriverAverage !== undefined
                    ? `${Number(report.overallDriverAverage).toFixed(2)} km/L`
                    : "-"}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Fuel Refill Averages (Tank: {report.tankCapacityLiters || 180}L)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="table-head-gradient text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Refill</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3 text-right">Odometer</th>
                    <th className="px-4 py-3 text-right">Fuel Added</th>
                    <th className="px-4 py-3 text-right">Fuel Consumed</th>
                    <th className="px-4 py-3 text-right">Distance</th>
                    <th className="px-4 py-3 text-right">Driver Average</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fuelRefills.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No fuel refill data.
                      </td>
                    </tr>
                  ) : (
                    fuelRefills.map((refill) => (
                      <tr key={refill.refillNo}>
                        <td className="px-4 py-3">#{refill.refillNo}</td>
                        <td className="px-4 py-3">
                          {formatDate(refill.date, true)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {refill.odometer ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {refill.fuelAdded !== null &&
                          refill.fuelAdded !== undefined
                            ? Number(refill.fuelAdded).toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {refill.fuelConsumed !== null &&
                          refill.fuelConsumed !== undefined
                            ? Number(refill.fuelConsumed).toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {refill.distanceCovered ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-700">
                          {refill.driverAverage !== null &&
                          refill.driverAverage !== undefined
                            ? `${Number(refill.driverAverage).toFixed(2)} km/L`
                            : "-"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Odometer Logs
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="table-head-gradient text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3 text-right">Odometer</th>
                    <th className="px-4 py-3 text-right">Liters</th>
                    <th className="px-4 py-3">Station</th>
                    <th className="px-4 py-3">Image</th>
                    <th className="px-4 py-3">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orderedLogs.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-8 text-center text-slate-400"
                      >
                        No odometer logs for this trip.
                      </td>
                    </tr>
                  ) : (
                    orderedLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="px-4 py-3">
                          {formatDate(log.recorded_at, true)}
                        </td>
                        <td className="px-4 py-3">{log.entry_type || "-"}</td>
                        <td className="px-4 py-3">{log.location || "-"}</td>
                        <td className="px-4 py-3 text-right">
                          {log.odometer_reading ?? "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {log.liters !== null && log.liters !== undefined
                            ? Number(log.liters).toFixed(2)
                            : "-"}
                        </td>
                        <td className="px-4 py-3">{log.station || "-"}</td>
                        <td className="px-4 py-3">
                          {log.photo_url ? (
                            <a
                              href={log.photo_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <img
                                src={log.photo_url}
                                alt="odometer"
                                className="h-12 w-16 rounded border border-slate-200 object-cover"
                              />
                            </a>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3">{log.notes || "-"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
