import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Calendar,
  Car,
  ClipboardList,
  FileText,
  Loader,
  ShieldAlert,
  User,
} from "lucide-react";
import { apiFetch } from "../utils/api";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeVehicle = (vehicle) => ({
  id: String(vehicle.id || ""),
  vehicleNo: vehicle.vehicle_no || vehicle.vehicleNo || "",
  plateNo: vehicle.plate_no || vehicle.plateNo || "",
  make: vehicle.make || "",
  model: vehicle.model || "",
  assignedDriver:
    vehicle.assigned_driver || vehicle.assignedDriver || vehicle.driver || null,
});

const normalizeReport = (report) => ({
  id: String(report.id || ""),
  date: report.date || report.incident_date || "",
  reportType: report.reportType || report.report_type || "Routine",
  status: report.status || "Open",
  description: report.description || "",
  actionTaken: report.actionTaken || report.action_taken || "",
  closingRemarks: report.closingRemarks || report.closing_remarks || "",
  vehicleId: String(report.vehicleId || report.vehicle_id || ""),
  driverName:
    report.driver?.name || report.driverName || report.driver_name || "-",
  bookingType:
    report.leaseAllocationId ||
    report.lease_allocation_id ||
    report.leaseAllocation
      ? "Long Term"
      : "Short Term",
  bookingLabel: report.leaseAllocation
    ? `Lease #${report.leaseAllocation.id || "-"}`
    : report.safari?.bookingRef || report.lead?.booking_ref || "-",
  photos: Array.isArray(report.photos) ? report.photos : [],
  vehicle: report.vehicle || null,
});

const findReportInPayload = (payload, reportId) => {
  const list = Array.isArray(payload)
    ? payload
    : payload?.incidentReports ||
      payload?.incident_reports ||
      payload?.reports ||
      payload?.data ||
      [];

  if (!Array.isArray(list)) return null;
  return list.find((item) => String(item.id) === String(reportId)) || null;
};

export default function PerformanceReportView() {
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("id") || "";
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [report, setReport] = useState(null);
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const [reportsResponse, vehiclesResponse] = await Promise.all([
          apiFetch("/incident-reports"),
          apiFetch("/vehicles"),
        ]);

        const reportsPayload = await reportsResponse.json().catch(() => ({}));
        const vehiclesPayload = await vehiclesResponse.json().catch(() => ({}));

        if (!reportsResponse.ok) {
          throw new Error(
            reportsPayload?.message || "Failed to load performance report.",
          );
        }

        if (!vehiclesResponse.ok) {
          throw new Error(
            vehiclesPayload?.message || "Failed to load vehicles.",
          );
        }

        const foundReport = findReportInPayload(reportsPayload, reportId);
        if (!foundReport) {
          setReport(null);
          setVehicles([]);
          setErrorMessage("Performance report not found.");
          return;
        }

        const normalizedVehicles = (
          Array.isArray(vehiclesPayload)
            ? vehiclesPayload
            : vehiclesPayload?.vehicles || vehiclesPayload?.data || []
        ).map(normalizeVehicle);

        setVehicles(normalizedVehicles);
        setReport(normalizeReport(foundReport));
      } catch (error) {
        setErrorMessage(error.message || "Failed to load performance report.");
      } finally {
        setIsLoading(false);
      }
    };

    if (reportId) {
      load();
    } else {
      setIsLoading(false);
      setErrorMessage("Missing performance report ID.");
    }
  }, [reportId]);

  const resolvedVehicle = useMemo(() => {
    if (!report) return null;
    return (
      report.vehicle ||
      vehicles.find(
        (vehicle) => String(vehicle.id) === String(report.vehicleId),
      ) ||
      null
    );
  }, [report, vehicles]);

  const vehicleLabel = resolvedVehicle
    ? `${resolvedVehicle.vehicleNo || "Vehicle"} (${resolvedVehicle.plateNo || "N/A"})`
    : "-";

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/performance-dashboard"
          className="mb-2 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Performance Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">
          Performance Record View
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Record ID: {reportId || "-"}
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          <Loader className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Loading performance record...
        </div>
      ) : report ? (
        <>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Date
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                <Calendar className="h-4 w-4 text-slate-400" />{" "}
                {formatDate(report.date)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Vehicle
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                <Car className="h-4 w-4 text-slate-400" /> {vehicleLabel}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Driver
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                <User className="h-4 w-4 text-slate-400" />{" "}
                {report.driverName || "-"}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Type / Status
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium text-slate-800">
                <ShieldAlert className="h-4 w-4 text-slate-400" />{" "}
                {report.reportType} / {report.status}
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Booking Details
            </h2>
            <p className="text-sm text-slate-700">
              <span className="font-medium">Booking Type:</span>{" "}
              {report.bookingType}
            </p>
            <p className="mt-1 text-sm text-slate-700">
              <span className="font-medium">Booking Ref:</span>{" "}
              {report.bookingLabel}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <ClipboardList className="h-4 w-4" /> Description
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {report.description || "-"}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              <FileText className="h-4 w-4" /> Action Taken
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {report.actionTaken || "-"}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Closing Remarks
            </h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
              {report.closingRemarks || "-"}
            </p>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Photos ({report.photos.length})
            </h2>
            {report.photos.length === 0 ? (
              <p className="text-sm text-slate-500">No photos attached.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {report.photos.map((photo) => (
                  <a
                    key={photo.path || photo.url}
                    href={photo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                    title="Open photo"
                  >
                    <img
                      src={photo.url}
                      alt="Performance record"
                      className="h-32 w-full object-cover transition group-hover:scale-105"
                    />
                  </a>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
