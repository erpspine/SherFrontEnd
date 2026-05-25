import { useEffect, useMemo, useState } from "react";
import {
  Car,
  Search,
  Receipt,
  Building2,
  Eye,
  Download,
  X,
  FileText,
  Clock,
  Send,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const statusConfig = {
  Draft: {
    color: "bg-slate-100 text-slate-600 border-slate-200",
    icon: Clock,
  },
  Sent: {
    color: "bg-blue-50 text-blue-700 border-blue-200",
    icon: Send,
  },
  Paid: {
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  Overdue: {
    color: "bg-rose-50 text-rose-700 border-rose-200",
    icon: AlertTriangle,
  },
  Converted: {
    color: "bg-purple-50 text-purple-700 border-purple-200",
    icon: Receipt,
  },
  Confirmed: {
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle,
  },
  "Partially Allocated": {
    color: "bg-amber-50 text-amber-700 border-amber-200",
    icon: CheckCircle,
  },
  Allocated: {
    color: "bg-teal-50 text-teal-700 border-teal-200",
    icon: CheckCircle,
  },
};

const formatCurrency = (n) => `USD ${Number(n || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return "-";
  const isoDate = normalizeIsoDateOnly(value);
  const parsed = new Date(isoDate || value);
  if (Number.isNaN(parsed.getTime())) return value;

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
};

const normalizeIsoDateOnly = (value) => {
  const raw = String(value || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const fromDmy = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (fromDmy) return `${fromDmy[3]}-${fromDmy[2]}-${fromDmy[1]}`;
  const fromDateTime = raw.match(/^(\d{4}-\d{2}-\d{2})T/);
  return fromDateTime ? fromDateTime[1] : "";
};

const formatPiNumberFromId = (id, dateValue) => {
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) return "";

  const isoDate = normalizeIsoDateOnly(dateValue);
  const yearMonth = isoDate
    ? isoDate.slice(0, 7)
    : `${String(new Date().getFullYear())}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;

  return `PI-${yearMonth}-${String(Math.trunc(numericId)).padStart(3, "0")}`;
};

const getPIItineraryDatesLabel = (daySections = []) => {
  const dates = daySections
    .map((section) =>
      normalizeIsoDateOnly(
        section?.dayDate ||
          section?.day_date ||
          section?.dayTitle ||
          section?.day_title ||
          "",
      ),
    )
    .filter(Boolean)
    .filter((date, index, arr) => arr.indexOf(date) === index)
    .sort();

  if (!dates.length) return "";
  if (dates.length === 1) return formatDate(dates[0]);
  return `${formatDate(dates[0])} to ${formatDate(dates[dates.length - 1])}`;
};

const getPIDestinationsLabel = (pi) => {
  const summary = String(pi?.serviceSummary || "").trim();
  if (summary && summary !== "-") {
    return summary;
  }

  const fromDayDescriptions = (pi?.daySections || [])
    .map((section) =>
      String(section?.dayDescription || section?.day_description || "").trim(),
    )
    .filter(Boolean);

  if (fromDayDescriptions.length) {
    return [...new Set(fromDayDescriptions)].join(" | ");
  }

  return summary;
};

const addDays = (value, days) => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setDate(parsed.getDate() + days);
  return parsed.toISOString().split("T")[0];
};

const createPIAllocationRange = (startDate = "", endDate = "") => ({
  startDate,
  endDate,
  vehicleIds: [],
});

const normalizeAvailabilityVehicle = (vehicle) => ({
  id: Number(vehicle?.id || 0),
  vehicleNo:
    vehicle?.vehicle_no ||
    vehicle?.vehicleNo ||
    vehicle?.car_no ||
    vehicle?.carNo ||
    `Vehicle ${vehicle?.id || "-"}`,
  plateNo: vehicle?.plate_no || vehicle?.plateNo || "No Plate",
  status: vehicle?.status || "Available",
});

const extractList = (payload, preferredKey) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (preferredKey && Array.isArray(payload?.[preferredKey])) {
    return payload[preferredKey];
  }
  if (Array.isArray(payload?.proformaInvoices)) return payload.proformaInvoices;
  if (Array.isArray(payload?.proforma_invoices))
    return payload.proforma_invoices;
  if (Array.isArray(payload?.invoices)) return payload.invoices;
  return [];
};

const normalizePI = (pi) => {
  const quotationId = pi.quotation_id || pi.quotationId || null;
  const quoteRef =
    pi.quote_ref ||
    pi.quoteRef ||
    pi.quotation_no ||
    pi.quotationNo ||
    (quotationId ? `QT-${quotationId}` : "-");
  const quoteDate =
    pi.quoteDate ||
    pi.quote_date ||
    pi.date ||
    pi.invoice_date ||
    pi.invoiceDate ||
    pi.createdAt ||
    pi.created_at ||
    "";
  const dueDate =
    pi.due_date || pi.dueDate || (quoteDate ? addDays(quoteDate, 14) : "");

  return {
    id: pi.id,
    quotationId,
    leadId: pi.lead_id || pi.leadId || null,
    piNo:
      pi.pi_no ||
      pi.piNo ||
      pi.proforma_number ||
      pi.proformaNumber ||
      pi.invoice_no ||
      pi.invoiceNo ||
      formatPiNumberFromId(pi.id, quoteDate),
    quoteRef,
    date: quoteDate,
    dueDate,
    client: pi.client || pi.client_name || pi.clientName || "",
    groupName: pi.group_name || pi.groupName || "",
    attention: pi.attention || "",
    notes: pi.notes || "",
    serviceSummary:
      pi.service_summary ||
      pi.serviceSummary ||
      pi.description ||
      pi.notes ||
      "Service",
    daySections: Array.isArray(pi.day_sections)
      ? pi.day_sections
      : Array.isArray(pi.daySections)
        ? pi.daySections
        : [],
    lineItems: Array.isArray(pi.line_items)
      ? pi.line_items.map((item) => ({
          ...item,
          qty: Number(item.qty || 0),
          rate: Number(item.rate || 0),
          total: Number(item.total || 0),
        }))
      : Array.isArray(pi.lineItems)
        ? pi.lineItems.map((item) => ({
            ...item,
            qty: Number(item.qty || 0),
            rate: Number(item.rate || 0),
            total: Number(item.total || 0),
          }))
        : [],
    subtotal: Number(pi.subtotal || 0),
    tax: Number(pi.tax || 0),
    total: Number(pi.total || 0),
    status: pi.status || "Converted",
    leadStartDate: pi.lead_start_date || pi.leadStartDate || "",
    leadEndDate: pi.lead_end_date || pi.leadEndDate || "",
    leadRouteParks: pi.lead_route_parks || pi.leadRouteParks || "",
  };
};

const extractSingle = (payload) =>
  payload?.data ||
  payload?.proformaInvoice ||
  payload?.proforma_invoice ||
  payload;

export default function ProformaInvoices() {
  const [allPIs, setAllPIs] = useState([]);
  const [quotationMap, setQuotationMap] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilterStart, setDateFilterStart] = useState("");
  const [dateFilterEnd, setDateFilterEnd] = useState("");
  const [viewPI, setViewPI] = useState(null);
  const [isViewLoading, setIsViewLoading] = useState(false);
  const [downloadingPiId, setDownloadingPiId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [allocationPI, setAllocationPI] = useState(null);
  const [allocationVehicles, setAllocationVehicles] = useState([]);
  const [allocationRanges, setAllocationRanges] = useState([
    createPIAllocationRange(),
  ]);
  const [allocationError, setAllocationError] = useState("");
  const [isAllocationModalOpen, setIsAllocationModalOpen] = useState(false);
  const [isLoadingAllocationVehicles, setIsLoadingAllocationVehicles] =
    useState(false);
  const [isSavingAllocation, setIsSavingAllocation] = useState(false);
  const [confirmOnAllocate, setConfirmOnAllocate] = useState(false);
  const navigate = useNavigate();

  const loadPIs = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const [piResponse, quotationsResponse] = await Promise.all([
        apiFetch("/proforma-invoices"),
        apiFetch("/quotations"),
      ]);
      const [piPayload, quotationsPayload] = await Promise.all([
        piResponse.json(),
        quotationsResponse.json().catch(() => ({})),
      ]);

      if (!piResponse.ok) {
        throw new Error(
          piPayload?.message || "Unable to fetch proforma invoices.",
        );
      }

      const quotations = extractList(quotationsPayload, "quotations");
      const nextQuotationMap = quotations.reduce((acc, quotation) => {
        const id = Number(quotation?.id || 0);
        if (!id) return acc;

        const quotationNumber =
          quotation?.quotation_number ||
          quotation?.quotationNumber ||
          quotation?.quote_no ||
          quotation?.quoteNo ||
          quotation?.quotation_no ||
          quotation?.quotationNo ||
          "";

        acc[id] = {
          quotationNumber: String(quotationNumber || ""),
          groupName: String(
            quotation?.group_name || quotation?.groupName || "",
          ),
        };

        return acc;
      }, {});

      setQuotationMap(nextQuotationMap);
      setAllPIs(extractList(piPayload, "proformaInvoices").map(normalizePI));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load proforma invoices.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPIs();
  }, []);

  const stats = useMemo(
    () => ({
      total: allPIs.length,
      totalAmount: allPIs.reduce((sum, pi) => sum + Number(pi.total || 0), 0),
    }),
    [allPIs],
  );

  const statusOptions = useMemo(
    () => [
      "All",
      ...Array.from(new Set(allPIs.map((pi) => pi.status).filter(Boolean))),
    ],
    [allPIs],
  );

  const filtered = useMemo(
    () =>
      allPIs.filter((pi) => {
        const linkedQuotation = quotationMap[Number(pi.quotationId)] || {};
        const quoteNumber =
          linkedQuotation.quotationNumber || pi.quoteRef || "";
        const groupName = linkedQuotation.groupName || pi.groupName || "";
        const query = searchTerm.toLowerCase();
        const matchSearch =
          pi.piNo.toLowerCase().includes(query) ||
          pi.client.toLowerCase().includes(query) ||
          quoteNumber.toLowerCase().includes(query) ||
          groupName.toLowerCase().includes(query);
        const matchStatus =
          statusFilter === "All" || pi.status === statusFilter;

        const piDate = normalizeIsoDateOnly(pi.date);
        const matchDateStart =
          !dateFilterStart || (piDate && piDate >= dateFilterStart);
        const matchDateEnd =
          !dateFilterEnd || (piDate && piDate <= dateFilterEnd);

        return matchSearch && matchStatus && matchDateStart && matchDateEnd;
      }),
    [
      allPIs,
      quotationMap,
      searchTerm,
      statusFilter,
      dateFilterStart,
      dateFilterEnd,
    ],
  );

  const dateFilteredStats = useMemo(
    () => ({
      count: filtered.length,
      totalAmount: filtered.reduce((sum, pi) => sum + Number(pi.total || 0), 0),
    }),
    [filtered],
  );

  const selectedAllocationVehiclesCount = allocationRanges.reduce(
    (sum, range) =>
      sum + (Array.isArray(range.vehicleIds) ? range.vehicleIds.length : 0),
    0,
  );

  const closeAllocationModal = () => {
    if (isSavingAllocation) return;
    setIsAllocationModalOpen(false);
    setAllocationPI(null);
    setAllocationVehicles([]);
    setAllocationRanges([createPIAllocationRange()]);
    setAllocationError("");
    setConfirmOnAllocate(false);
  };

  const getVehiclesAvailableForRange = (startDate, endDate) =>
    allocationVehicles.filter((vehicle) => {
      const isStatusAvailable = vehicle.status === "Available";
      if (!isStatusAvailable || !startDate || !endDate) return false;
      return true;
    });

  const openAllocationModal = async (pi, options = {}) => {
    const defaultStart = normalizeIsoDateOnly(pi?.leadStartDate || "");
    const defaultEnd = normalizeIsoDateOnly(pi?.leadEndDate || "");

    setConfirmOnAllocate(Boolean(options.confirmOnAllocate));
    setAllocationPI(pi);
    setAllocationRanges([createPIAllocationRange(defaultStart, defaultEnd)]);
    setAllocationError("");
    setAllocationVehicles([]);
    setIsAllocationModalOpen(true);
    setIsLoadingAllocationVehicles(true);

    try {
      const vehiclesResponse = await apiFetch("/vehicles");
      const vehiclesPayload = await vehiclesResponse.json().catch(() => ({}));

      if (!vehiclesResponse.ok) {
        throw new Error(
          vehiclesPayload?.message || "Unable to load vehicles for allocation.",
        );
      }

      setAllocationVehicles(
        extractList(vehiclesPayload, "vehicles").map(
          normalizeAvailabilityVehicle,
        ),
      );
    } catch (error) {
      setAllocationError(
        error.message || "Failed to load vehicle availability for allocation.",
      );
    } finally {
      setIsLoadingAllocationVehicles(false);
    }
  };

  const addAllocationRange = () => {
    setAllocationRanges((current) => {
      const fallbackStart = normalizeIsoDateOnly(
        allocationPI?.leadStartDate || "",
      );
      const fallbackEnd = normalizeIsoDateOnly(allocationPI?.leadEndDate || "");
      return [...current, createPIAllocationRange(fallbackStart, fallbackEnd)];
    });
  };

  const removeAllocationRange = (rangeIndex) => {
    setAllocationRanges((current) =>
      current.length <= 1
        ? [createPIAllocationRange()]
        : current.filter((_, index) => index !== rangeIndex),
    );
  };

  const setAllocationRangeField = (rangeIndex, field, value) => {
    setAllocationError("");
    setAllocationRanges((current) =>
      current.map((range, index) =>
        index === rangeIndex ? { ...range, [field]: value } : range,
      ),
    );
  };

  const toggleAllocationVehicleSelection = (rangeIndex, vehicleId) => {
    const id = Number(vehicleId);
    setAllocationError("");
    setAllocationRanges((current) =>
      current.map((range, index) => {
        if (index !== rangeIndex) return range;
        const selected = range.vehicleIds.includes(id);
        return {
          ...range,
          vehicleIds: selected
            ? range.vehicleIds.filter((item) => item !== id)
            : [...range.vehicleIds, id],
        };
      }),
    );
  };

  const handleConfirmPI = async (pi) => {
    // Just open the decision dialog — nothing is changed on the PI at this point.
    const decision = await Swal.fire({
      title: `Confirm PI: ${pi.piNo}`,
      html: `<p class="text-slate-600 text-sm">Choose how you want to proceed with this proforma invoice.</p>`,
      icon: "question",
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonText: "Confirm Now & Allocate Later",
      denyButtonText: "Confirm and Allocate",
      cancelButtonText: "Exit",
      confirmButtonColor: "#10b981",
      denyButtonColor: "#f59e0b",
      cancelButtonColor: "#6b7280",
      background: "#ffffff",
      color: "#111827",
      reverseButtons: false,
    });

    if (decision.isDismissed) {
      // "Exit" clicked — do nothing.
      return;
    }

    if (decision.isConfirmed) {
      // "Confirm Now & Allocate Later" — confirm PI only, no allocation.
      try {
        const response = await apiFetch(`/proforma-invoices/${pi.id}/confirm`, {
          method: "POST",
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to confirm PI.");
        }

        const normalized = normalizePI(extractSingle(payload));
        setAllPIs((current) =>
          current.map((item) =>
            item.id === pi.id ? { ...item, ...normalized } : item,
          ),
        );

        await Swal.fire({
          title: "PI Confirmed",
          text: "PI confirmed. You can allocate vehicles from the Allocate button at any time.",
          icon: "success",
          timer: 2000,
          showConfirmButton: false,
          background: "#ffffff",
          color: "#111827",
        });
      } catch (error) {
        await Swal.fire({
          title: "Confirm Failed",
          text: error.message || "Failed to confirm PI.",
          icon: "error",
          background: "#ffffff",
          color: "#111827",
        });
      }
      return;
    }

    if (decision.isDenied) {
      // "Confirm and Allocate" — open allocation screen.
      // PI will be confirmed atomically when the user submits the allocation.
      await openAllocationModal(pi, { confirmOnAllocate: true });
    }
  };

  const submitPIAllocation = async () => {
    if (!allocationPI) return;

    if (allocationRanges.length === 0) {
      setAllocationError("Add at least one allocation range.");
      return;
    }

    const invalidRange = allocationRanges.find(
      (range) =>
        !range.startDate ||
        !range.endDate ||
        range.startDate > range.endDate ||
        !Array.isArray(range.vehicleIds) ||
        range.vehicleIds.length === 0,
    );

    if (invalidRange) {
      setAllocationError(
        "Each range must have valid start/end dates and at least one selected vehicle.",
      );
      return;
    }

    setIsSavingAllocation(true);
    setAllocationError("");

    try {
      const response = await apiFetch(
        `/proforma-invoices/${allocationPI.id}/allocate-vehicles`,
        {
          method: "POST",
          body: {
            allocationRanges: allocationRanges.map((range) => ({
              startDate: range.startDate,
              endDate: range.endDate,
              vehicleIds: range.vehicleIds,
            })),
          },
        },
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const fieldError = payload?.errors
          ? Object.values(payload.errors).flat().find(Boolean)
          : null;
        throw new Error(
          fieldError ||
            payload?.message ||
            "Unable to allocate vehicles for PI.",
        );
      }

      const normalized = normalizePI(extractSingle(payload));
      setAllPIs((current) =>
        current.map((item) =>
          item.id === allocationPI.id ? { ...item, ...normalized } : item,
        ),
      );

      const summary = payload?.allocationSummary || {};
      await Swal.fire({
        title: "Allocation Saved",
        text: `${summary.allocationsCreated || 0} safari allocation(s) and ${summary.jobCardsCreated || 0} job card(s) created.${confirmOnAllocate ? " PI is now confirmed and allocation status updated." : ""}`,
        icon: "success",
        background: "#ffffff",
        color: "#111827",
      });

      closeAllocationModal();
    } catch (error) {
      setAllocationError(error.message || "Failed to allocate vehicles.");
    } finally {
      setIsSavingAllocation(false);
    }
  };

  const handleDownloadPdf = async (pi) => {
    setDownloadingPiId(pi.id);

    try {
      const response = await apiFetch(`/proforma-invoices/${pi.id}/pdf`);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to generate PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${pi.piNo}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      await Swal.fire({
        title: "PDF Failed",
        text: error.message || "Failed to download PDF.",
        icon: "error",
        background: "#ffffff",
        color: "#111827",
      });
    } finally {
      setDownloadingPiId(null);
    }
  };

  const handleViewPI = async (pi) => {
    setIsViewLoading(true);
    try {
      const response = await apiFetch(`/proforma-invoices/${pi.id}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch PI details.");
      }

      setViewPI(normalizePI(extractSingle(payload)));
    } catch (error) {
      await Swal.fire({
        title: "Load Failed",
        text: error.message || "Unable to fetch PI details.",
        icon: "error",
        background: "#ffffff",
        color: "#111827",
      });
    } finally {
      setIsViewLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Proforma Invoices
          </h1>
          <p className="text-slate-500 mt-1">
            Manage and track proforma invoices.
          </p>
        </div>
        <button
          onClick={() => navigate("/quotations")}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <FileText className="w-4 h-4" />
          Go To Quotations
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Total PI Value</p>
          <p className="text-xl font-bold text-slate-900 mt-1">
            {formatCurrency(stats.totalAmount)}
          </p>
          <p className="text-xs text-slate-500 mt-1">{stats.total} invoices</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-slate-500 text-sm">Date Filter</p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="date"
              value={dateFilterStart}
              onChange={(event) => setDateFilterStart(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400"
            />
            <input
              type="date"
              value={dateFilterEnd}
              onChange={(event) => setDateFilterEnd(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400"
            />
          </div>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {dateFilteredStats.count} invoice(s) |{" "}
              {formatCurrency(dateFilteredStats.totalAmount)}
            </p>
            <button
              type="button"
              onClick={() => {
                setDateFilterStart("");
                setDateFilterEnd("");
              }}
              className="text-xs font-medium text-amber-700 hover:text-amber-800"
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-200 focus-within:border-amber-500 transition-colors">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by PI #, quotation #, client, group name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-transparent outline-none text-sm text-slate-900 placeholder-slate-400"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === status
                    ? "bg-amber-500 text-white"
                    : "bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="table-head-gradient">
              <tr className="border-b border-slate-200">
                {[
                  "Actions",
                  "PI #",
                  "Quotation #",
                  "Date",
                  "Due Date",
                  "Client",
                  "Group Name",
                  "Service Summary",
                  "Total",
                  "Status",
                ].map((h) => (
                  <th
                    key={h}
                    className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((pi) => {
                const linkedQuotation =
                  quotationMap[Number(pi.quotationId)] || {};
                const quotationNumber =
                  linkedQuotation.quotationNumber || pi.quoteRef;
                const groupName =
                  linkedQuotation.groupName || pi.groupName || "-";
                const sc = statusConfig[pi.status] || statusConfig.Converted;
                return (
                  <tr
                    key={pi.id}
                    className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleViewPI(pi)}
                          disabled={isViewLoading}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(pi)}
                          disabled={downloadingPiId === pi.id}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title={
                            downloadingPiId === pi.id
                              ? "Downloading..."
                              : "Download PDF"
                          }
                        >
                          {downloadingPiId === pi.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        {["Converted", "Sent"].includes(pi.status) && (
                          <button
                            onClick={() => handleConfirmPI(pi)}
                            className="px-2 py-1 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Confirm PI"
                          >
                            Confirm
                          </button>
                        )}
                        {[
                          "Confirmed",
                          "Partially Allocated",
                          "Allocated",
                        ].includes(pi.status) && (
                          <button
                            onClick={() =>
                              openAllocationModal(pi, {
                                confirmOnAllocate: false,
                              })
                            }
                            className="px-2 py-1 text-xs font-medium text-amber-700 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
                            title="Allocate Vehicles"
                          >
                            Allocate
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4 min-w-[180px]">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <Receipt className="w-4 h-4 text-indigo-500" />
                        </div>
                        <span className="text-slate-900 font-medium text-sm">
                          {pi.piNo}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-amber-600 font-medium whitespace-nowrap">
                      {quotationNumber || "-"}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {formatDate(pi.date)}
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {formatDate(pi.dueDate)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-sm text-slate-700 whitespace-nowrap">
                          {pi.client}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-slate-700 whitespace-nowrap">
                      {groupName}
                    </td>
                    <td className="py-4 px-4 text-sm max-w-sm">
                      <div className="space-y-1">
                        <p
                          className="text-slate-700 truncate"
                          title={getPIDestinationsLabel(pi)}
                        >
                          {getPIDestinationsLabel(pi) || "-"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {getPIItineraryDatesLabel(pi.daySections)
                            ? `Itinerary: ${getPIItineraryDatesLabel(pi.daySections)}`
                            : "Itinerary: -"}
                        </p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-slate-900 font-semibold text-sm whitespace-nowrap">
                        {formatCurrency(pi.total)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border whitespace-nowrap ${sc.color}`}
                      >
                        <sc.icon className="w-3 h-3" />
                        {pi.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              No proforma invoices found. Convert approved quotations to PI.
            </div>
          )}
          {isLoading && (
            <div className="py-16 text-center text-slate-500">
              Loading proforma invoices...
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing {filtered.length} of {allPIs.length} invoices
          </p>
          <p className="text-sm font-semibold text-slate-900">
            Total:{" "}
            {formatCurrency(
              filtered.reduce((s, pi) => s + Number(pi.total || 0), 0),
            )}
          </p>
        </div>
      </section>

      {viewPI && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-xl">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white">{viewPI.piNo}</h2>
                <p className="text-sm text-slate-400">Ref: {viewPI.quoteRef}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownloadPdf(viewPI)}
                  disabled={downloadingPiId === viewPI.id}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
                >
                  {downloadingPiId === viewPI.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {downloadingPiId === viewPI.id ? "Downloading..." : "PDF"}
                </button>
                <button
                  onClick={() => setViewPI(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Client</span>
                <span className="text-white font-medium">{viewPI.client}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Invoice Date</span>
                <span className="text-slate-300">
                  {formatDate(viewPI.date)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Due Date</span>
                <span className="text-slate-300">
                  {formatDate(viewPI.dueDate)}
                </span>
              </div>
              <div className="border-t border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Subtotal</span>
                  <span className="text-slate-300">
                    {formatCurrency(viewPI.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">VAT (18%)</span>
                  <span className="text-slate-300">
                    {formatCurrency(viewPI.tax)}
                  </span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-slate-800 pt-2">
                  <span className="text-white">Total</span>
                  <span className="text-white">
                    {formatCurrency(viewPI.total)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Status</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium border ${statusConfig[viewPI.status]?.color || statusConfig.Converted.color}`}
                >
                  {viewPI.status}
                </span>
              </div>
            </div>
            <div className="p-6 pt-0 flex justify-end gap-3">
              <button
                onClick={() => navigate("/quotations")}
                className="px-6 py-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700"
              >
                Open Quotations
              </button>
              <button
                onClick={() => setViewPI(null)}
                className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {isAllocationModalOpen && allocationPI && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl shadow-xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Allocate Vehicles for {allocationPI.piNo}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {confirmOnAllocate
                    ? "Complete allocation to confirm this PI and allocate vehicles in one step."
                    : "Save allocations now, or close and return later from this PI."}
                </p>
              </div>
              <button
                onClick={closeAllocationModal}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
                disabled={isSavingAllocation}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    PI Number
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {allocationPI.piNo}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Lead Dates
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {allocationPI.leadStartDate && allocationPI.leadEndDate
                      ? `${formatDate(allocationPI.leadStartDate)} - ${formatDate(allocationPI.leadEndDate)}`
                      : "Not available"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Selected Vehicles
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {selectedAllocationVehiclesCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-700">
                    {allocationPI.status}
                  </p>
                </div>
              </div>

              {allocationPI.leadRouteParks && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Route: {allocationPI.leadRouteParks}
                </div>
              )}

              {allocationError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {allocationError}
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-slate-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Allocation Ranges
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={addAllocationRange}
                    disabled={isSavingAllocation}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                  >
                    Add Range
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {allocationRanges.map((range, rangeIndex) => {
                    const rangeVehicles = getVehiclesAvailableForRange(
                      range.startDate,
                      range.endDate,
                    );

                    return (
                      <div
                        key={`pi-range-${rangeIndex}`}
                        className="rounded-xl border border-slate-200 bg-white"
                      >
                        <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Range {rangeIndex + 1}
                          </span>
                          {allocationRanges.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAllocationRange(rangeIndex)}
                              disabled={isSavingAllocation}
                              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-50"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <div className="px-4 py-3 grid grid-cols-1 md:grid-cols-2 gap-3 border-b border-slate-200">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">
                              From Date
                            </label>
                            <input
                              type="date"
                              value={range.startDate}
                              onChange={(event) =>
                                setAllocationRangeField(
                                  rangeIndex,
                                  "startDate",
                                  event.target.value,
                                )
                              }
                              min={allocationPI?.leadStartDate || undefined}
                              max={allocationPI?.leadEndDate || undefined}
                              disabled={isSavingAllocation}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">
                              To Date
                            </label>
                            <input
                              type="date"
                              value={range.endDate}
                              onChange={(event) =>
                                setAllocationRangeField(
                                  rangeIndex,
                                  "endDate",
                                  event.target.value,
                                )
                              }
                              min={allocationPI?.leadStartDate || undefined}
                              max={allocationPI?.leadEndDate || undefined}
                              disabled={isSavingAllocation}
                              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-amber-500 focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {!range.startDate || !range.endDate ? (
                            <div className="px-4 py-3 text-xs text-slate-500">
                              Select From and To dates first.
                            </div>
                          ) : isLoadingAllocationVehicles ? (
                            <div className="px-4 py-3 text-xs text-slate-500">
                              Loading vehicles...
                            </div>
                          ) : rangeVehicles.length === 0 ? (
                            <div className="px-4 py-3 text-xs text-slate-500">
                              No vehicles are available on this range.
                            </div>
                          ) : (
                            rangeVehicles.map((vehicle) => {
                              const checked = range.vehicleIds.includes(
                                vehicle.id,
                              );
                              return (
                                <label
                                  key={`pi-range-${rangeIndex}-${vehicle.id}`}
                                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isSavingAllocation}
                                    onChange={() =>
                                      toggleAllocationVehicleSelection(
                                        rangeIndex,
                                        vehicle.id,
                                      )
                                    }
                                    className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                                  />
                                  <span>
                                    {vehicle.vehicleNo} ({vehicle.plateNo})
                                  </span>
                                </label>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
              <p className="text-sm text-slate-500">
                {confirmOnAllocate
                  ? 'Complete the allocation below and click "Confirm & Allocate" to confirm this PI and create the allocation. Closing without saving will not change anything.'
                  : "Save allocations now, or close and return later."}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={closeAllocationModal}
                  disabled={isSavingAllocation}
                  className="px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={submitPIAllocation}
                  disabled={
                    isSavingAllocation ||
                    isLoadingAllocationVehicles ||
                    selectedAllocationVehiclesCount === 0
                  }
                  className="px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-amber-400 to-amber-600 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSavingAllocation
                    ? "Saving..."
                    : confirmOnAllocate
                      ? "Confirm & Allocate"
                      : "Save Allocation"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
