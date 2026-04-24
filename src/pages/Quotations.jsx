import { useEffect, useRef, useState } from "react";
import {
  Search,
  Plus,
  FileText,
  Building2,
  Edit,
  Trash2,
  X,
  Receipt,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  FileDown,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import Datepicker from "react-tailwindcss-datepicker";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";
import Select from "react-select";

const statusConfig = {
  Draft: {
    color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    icon: Clock,
  },
  Sent: {
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    icon: Send,
  },
  Approved: {
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    icon: CheckCircle,
  },
  Rejected: {
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    icon: XCircle,
  },
  Converted: {
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    icon: Receipt,
  },
};

const createDayItem = () => ({
  item: "",
  description: "",
  unit: "Per person",
  qty: "",
  rate: "",
});

const formatDateToIso = (dateValue) => {
  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, "0");
  const day = String(dateValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const toIsoDate = (value) => {
  if (!value) return "";
  const asString = String(value).trim();
  const directMatch = asString.match(/^(\d{4}-\d{2}-\d{2})/);
  if (directMatch) return directMatch[1];
  const parsed = new Date(asString);
  if (Number.isNaN(parsed.getTime())) return "";
  return formatDateToIso(parsed);
};

const addDaysToIsoDate = (isoDate, daysToAdd) => {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  parsed.setDate(parsed.getDate() + daysToAdd);
  return formatDateToIso(parsed);
};

const getTripDates = (startDate, endDate) => {
  const start = toIsoDate(startDate);
  const end = toIsoDate(endDate);
  if (!start || !end) return [];
  const startObj = new Date(`${start}T00:00:00`);
  const endObj = new Date(`${end}T00:00:00`);
  if (Number.isNaN(startObj.getTime()) || Number.isNaN(endObj.getTime())) {
    return [];
  }
  if (startObj > endObj) return [start];

  const dates = [];
  const cursor = new Date(startObj);
  while (cursor <= endObj) {
    dates.push(formatDateToIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
};

const createDaySection = (index = 1, dayDate = "") => ({
  dayDate,
  dayTitle: dayDate || `Day ${index}`,
  dayDescription: "",
  items: [createDayItem()],
});

const createFormState = () => {
  const today = new Date().toISOString().split("T")[0];
  return {
    leadId: "",
    client: "",
    attention: "",
    quoteDate: today,
    notes: "",
    daySections: [createDaySection(1, today)],
  };
};

const formatCurrency = (value) => `USD ${Number(value || 0).toLocaleString()}`;
const toNumber = (value) => Number(value || 0);

const toPickerValue = (value) => ({
  startDate: value || null,
  endDate: value || null,
});

const calculateItemTotal = (item) => toNumber(item.qty) * toNumber(item.rate);

const normalizeLead = (lead) => ({
  id: lead.id,
  bookingRef: lead.booking_ref || lead.bookingRef || "",
  clientCompany: lead.client_company || lead.clientCompany || "",
  agentContact: lead.agent_contact || lead.agentContact || "",
  routeParks: lead.route_parks || lead.routeParks || "",
  startDate: lead.start_date || lead.startDate || "",
  endDate: lead.end_date || lead.endDate || "",
  noOfVehicles: lead.no_of_vehicles ?? lead.noOfVehicles ?? "",
  paxAdults: lead.pax_adults ?? lead.paxAdults ?? "",
  paxChildren: lead.pax_children ?? lead.paxChildren ?? "",
  bookingStatus: lead.booking_status || lead.bookingStatus || "Pending",
  sentBy: lead.sent_by || lead.sentBy || "",
  sentById: lead.sent_by_id ?? lead.sentById ?? null,
  quotationSentAt: lead.quotation_sent_at || lead.quotationSentAt || "",
  piSentAt: lead.pi_sent_at || lead.piSentAt || "",
  specialRequirements:
    lead.special_requirements || lead.specialRequirements || "",
});

const normalizeDayItem = (item) => {
  if (item.item || item.description || item.unit || item.qty || item.rate) {
    return {
      item: item.item || "",
      description: item.description || "",
      unit: item.unit || "Per person",
      qty: String(item.qty ?? ""),
      rate: String(item.rate ?? ""),
    };
  }

  return {
    item: item.item || "Service",
    description: item.service_description || item.serviceDescription || "",
    unit: "Vehicle",
    qty: String(
      item.number_of_vehicles ??
        item.numberOfVehicles ??
        item.number_of_adults ??
        item.numberOfAdults ??
        item.number_of_children ??
        item.numberOfChildren ??
        "",
    ),
    rate: String(
      item.cost_per_vehicle ??
        item.costPerVehicle ??
        item.cost_per_adult_concession ??
        item.costPerAdultConcession ??
        item.cost_per_park_fee ??
        item.costPerParkFee ??
        item.cost_per_child_concession ??
        item.costPerChildConcession ??
        item.cost_per_child_park_fee ??
        item.costPerChildParkFee ??
        "",
    ),
  };
};

const normalizeDaySection = (section, index) => {
  const rawItems = Array.isArray(section?.items)
    ? section.items
    : Array.isArray(section?.line_items)
      ? section.line_items
      : [];

  const dayDate =
    section?.day_date ||
    section?.dayDate ||
    toIsoDate(section?.day_title || section?.dayTitle || "");

  return {
    dayDate,
    dayTitle:
      dayDate || section?.day_title || section?.dayTitle || `Day ${index + 1}`,
    dayDescription: section?.day_description || section?.dayDescription || "",
    items: rawItems.length ? rawItems.map(normalizeDayItem) : [createDayItem()],
  };
};

const normalizeQuotation = (quotation) => {
  const rawDaySections = Array.isArray(quotation.day_sections)
    ? quotation.day_sections
    : Array.isArray(quotation.daySections)
      ? quotation.daySections
      : [];

  const rawLineItems = Array.isArray(quotation.line_items)
    ? quotation.line_items
    : Array.isArray(quotation.lineItems)
      ? quotation.lineItems
      : [];

  const daySections = rawDaySections.length
    ? rawDaySections.map(normalizeDaySection)
    : [
        {
          dayDate: "",
          dayTitle: "Day 1",
          dayDescription: "",
          items: rawLineItems.length
            ? rawLineItems.map(normalizeDayItem)
            : [createDayItem()],
        },
      ];

  const lineItems = daySections.flatMap((section) => section.items);

  return {
    id: quotation.id,
    quoteNo: quotation.quote_no || quotation.quoteNo || "",
    leadId: String(quotation.lead_id || quotation.leadId || ""),
    date: quotation.quote_date || quotation.quoteDate || quotation.date || "",
    quoteDate:
      quotation.quote_date || quotation.quoteDate || quotation.date || "",
    client: quotation.client || "",
    attention: quotation.attention || "",
    notes: quotation.notes || "",
    serviceSummary:
      quotation.service_summary ||
      quotation.serviceSummary ||
      lineItems[0]?.description ||
      "",
    lineItems,
    daySections,
    subtotal: Number(quotation.subtotal || 0),
    tax: Number(quotation.tax || 0),
    total: Number(quotation.total || 0),
    status: quotation.status || "Draft",
  };
};

const extractList = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};

const extractSingle = (payload, key) =>
  payload?.data || payload?.[key] || payload;

export default function Quotations() {
  const [quotations, setQuotations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(createFormState());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [convertingId, setConvertingId] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [pickerCategory, setPickerCategory] = useState("Transport");
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerTarget, setPickerTarget] = useState({
    sectionIndex: 0,
    itemIndex: 0,
  });
  const navigate = useNavigate();
  const [ratesCache, setRatesCache] = useState({
    transport: [],
    parkFees: [],
    concessionFees: [],
  });
  const loadedRateTypes = useRef(new Set());

  const clients = Array.from(
    new Set(
      [
        ...quotations.map((quotation) => quotation.client),
        ...leads.map((lead) => lead.clientCompany),
      ].filter(Boolean),
    ),
  );

  const selectableLeads = leads.filter(
    (lead) =>
      !["Quotation Sent", "PI Sent"].includes(lead.bookingStatus) ||
      String(lead.id) === String(form.leadId),
  );

  const loadQuotations = async () => {
    setErrorMessage("");
    setIsLoading(true);

    try {
      const response = await apiFetch("/quotations");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch quotations.");
      }

      setQuotations(extractList(payload, "quotations").map(normalizeQuotation));
    } catch (error) {
      setErrorMessage(error.message || "Failed to load quotations.");
    } finally {
      setIsLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const response = await apiFetch("/leads");
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch leads.");
      }

      setLeads(extractList(payload, "leads").map(normalizeLead));
    } catch {
      setLeads([]);
    }
  };

  const loadRatesForType = async (itemType) => {
    const typeMap = {
      Transport: "transport",
      "Park Fees": "parkFees",
      "Concession Fees": "concessionFees",
    };
    const rateType = typeMap[itemType];
    if (!rateType || loadedRateTypes.current.has(rateType)) return;
    loadedRateTypes.current.add(rateType);

    const endpointMap = {
      transport: "/transport-rates",
      parkFees: "/park-rates",
      concessionFees: "/concession-rates",
    };
    const listKeyMap = {
      transport: "transportRates",
      parkFees: "parkRates",
      concessionFees: "concessionRates",
    };

    try {
      const response = await apiFetch(endpointMap[rateType]);
      const payload = await response.json();
      if (!response.ok) return;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.[listKeyMap[rateType]])
            ? payload[listKeyMap[rateType]]
            : [];
      setRatesCache((prev) => ({ ...prev, [rateType]: list }));
    } catch {
      // Silently fail; manual rate entry remains available.
    }
  };

  useEffect(() => {
    loadQuotations();
    loadLeads();
  }, []);

  const stats = {
    total: quotations.length,
    draft: quotations.filter((quotation) => quotation.status === "Draft")
      .length,
    sent: quotations.filter((quotation) => quotation.status === "Sent").length,
    approved: quotations.filter((quotation) => quotation.status === "Approved")
      .length,
    converted: quotations.filter(
      (quotation) => quotation.status === "Converted",
    ).length,
  };

  const filtered = quotations.filter((quotation) => {
    const query = searchTerm.toLowerCase();
    const matchSearch =
      quotation.quoteNo.toLowerCase().includes(query) ||
      quotation.client.toLowerCase().includes(query) ||
      quotation.serviceSummary.toLowerCase().includes(query);
    const matchStatus =
      statusFilter === "All" || quotation.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalValue = filtered.reduce(
    (sum, quotation) => sum + quotation.total,
    0,
  );
  const allItems = form.daySections.flatMap((section) => section.items);
  const subtotal = allItems.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0,
  );
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  const updateDaySection = (sectionIndex, field, value) => {
    setForm((current) => ({
      ...current,
      daySections: current.daySections.map((section, index) =>
        index === sectionIndex ? { ...section, [field]: value } : section,
      ),
    }));
  };

  const addDaySection = () => {
    setForm((current) => ({
      ...current,
      daySections: (() => {
        const currentCount = current.daySections.length;
        const lastSection = current.daySections[currentCount - 1];
        const lastDate = toIsoDate(lastSection?.dayDate || "");
        const nextDate = lastDate
          ? addDaysToIsoDate(lastDate, 1)
          : current.quoteDate
            ? addDaysToIsoDate(current.quoteDate, currentCount)
            : "";
        return [
          ...current.daySections,
          createDaySection(currentCount + 1, nextDate),
        ];
      })(),
    }));
  };

  const removeDaySection = (sectionIndex) => {
    setForm((current) => ({
      ...current,
      daySections:
        current.daySections.length === 1
          ? [createDaySection(1, current.quoteDate || "")]
          : current.daySections.filter((_, index) => index !== sectionIndex),
    }));
  };

  const updateDayItem = (sectionIndex, itemIndex, field, value) => {
    setForm((current) => ({
      ...current,
      daySections: current.daySections.map((section, sectionPos) => {
        if (sectionPos !== sectionIndex) return section;
        return {
          ...section,
          items: section.items.map((item, itemPos) =>
            itemPos === itemIndex ? { ...item, [field]: value } : item,
          ),
        };
      }),
    }));
  };

  const addDayItem = (sectionIndex) => {
    setForm((current) => ({
      ...current,
      daySections: current.daySections.map((section, index) =>
        index === sectionIndex
          ? { ...section, items: [...section.items, createDayItem()] }
          : section,
      ),
    }));
  };

  const removeDayItem = (sectionIndex, itemIndex) => {
    setForm((current) => ({
      ...current,
      daySections: current.daySections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          items:
            section.items.length === 1
              ? [createDayItem()]
              : section.items.filter((_, i) => i !== itemIndex),
        };
      }),
    }));
  };

  const openNewQuotation = () => {
    setErrorMessage("");
    setEditingId(null);
    setForm(createFormState());
    setIsModalOpen(true);
  };

  const openEditQuotation = async (quotation) => {
    setErrorMessage("");

    try {
      const response = await apiFetch(`/quotations/${quotation.id}`);
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch quotation.");
      }

      const selectedQuotation = normalizeQuotation(
        extractSingle(payload, "quotation"),
      );

      const itemTypesToLoad = Array.from(
        new Set(
          (selectedQuotation.daySections || [])
            .flatMap((section) => section.items || [])
            .map((item) => item.item)
            .filter((type) =>
              ["Transport", "Park Fees", "Concession Fees"].includes(type),
            ),
        ),
      );

      await Promise.all(itemTypesToLoad.map((type) => loadRatesForType(type)));

      setEditingId(selectedQuotation.id);
      setForm({
        leadId: selectedQuotation.leadId,
        client: selectedQuotation.client,
        attention: selectedQuotation.attention,
        quoteDate: selectedQuotation.quoteDate,
        notes: selectedQuotation.notes,
        daySections:
          selectedQuotation.daySections && selectedQuotation.daySections.length
            ? selectedQuotation.daySections
            : [createDaySection(1)],
      });
      setIsModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Unable to open quotation details.");
      await Swal.fire({
        title: "Load Failed",
        text: error.message || "Unable to open quotation details.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleDeleteQuotation = async (id) => {
    setErrorMessage("");
    const confirmation = await Swal.fire({
      title: "Delete quotation?",
      text: "This action cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#dc2626",
    });

    if (!confirmation.isConfirmed) return;

    try {
      const response = await apiFetch(`/quotations/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload?.message || "Unable to delete quotation.");
      }

      setQuotations((current) =>
        current.filter((quotation) => quotation.id !== id),
      );

      await Swal.fire({
        title: "Deleted",
        text: "Quotation deleted successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete quotation.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete quotation.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleSaveQuotation = async (status) => {
    if (!form.client || !form.quoteDate) {
      setErrorMessage("Please fill client and quotation date before saving.");
      await Swal.fire({
        title: "Missing Required Fields",
        text: "Please provide Client and Quotation Date.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    const missingDayDateIndex = form.daySections.findIndex(
      (section) => !toIsoDate(section.dayDate || section.dayTitle),
    );

    if (missingDayDateIndex !== -1) {
      setErrorMessage("Each day must have a valid date before saving.");
      await Swal.fire({
        title: "Missing Day Date",
        text: `Please set a valid date for day ${missingDayDateIndex + 1}.`,
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    let firstInvalidLine = null;

    form.daySections.some((section, sectionIndex) =>
      section.items.some((item, itemIndex) => {
        const hasAnyValue =
          item.item || item.description || item.unit || item.qty || item.rate;

        if (!hasAnyValue) return false;

        const qty = Number(item.qty);
        const rate = Number(item.rate);
        const isMissingCustomName =
          item.item === "Others" && !String(item.customItem || "").trim();

        const isInvalid =
          !String(item.item || "").trim() ||
          !String(item.description || "").trim() ||
          !String(item.unit || "").trim() ||
          !Number.isFinite(qty) ||
          qty <= 0 ||
          !Number.isFinite(rate) ||
          rate < 0 ||
          isMissingCustomName;

        if (isInvalid) {
          firstInvalidLine = {
            day: sectionIndex + 1,
            line: itemIndex + 1,
          };
          return true;
        }

        return false;
      }),
    );

    if (firstInvalidLine) {
      setErrorMessage(
        `Please complete all required fields for day ${firstInvalidLine.day}, line ${firstInvalidLine.line}.`,
      );
      await Swal.fire({
        title: "Incomplete Line Item",
        text: `Day ${firstInvalidLine.day}, line ${firstInvalidLine.line} is incomplete. Fill item, description, unit, qty and rate.`,
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    const preparedDaySections = form.daySections
      .map((section) => ({
        dayDate: toIsoDate(section.dayDate),
        dayTitle: toIsoDate(section.dayDate) || section.dayTitle,
        dayDescription: section.dayDescription,
        items: section.items.filter(
          (item) => item.item || item.description || item.qty || item.rate,
        ),
      }))
      .filter(
        (section) =>
          section.dayTitle || section.dayDescription || section.items.length,
      );

    const preparedLineItems = preparedDaySections.flatMap((section) =>
      section.items.map((item) => ({
        dayTitle: section.dayTitle,
        dayDescription: section.dayDescription,
        item: item.item,
        description: item.description,
        unit: item.unit,
        qty: Number(item.qty || 0),
        rate: Number(item.rate || 0),
        total: calculateItemTotal(item),
      })),
    );

    if (preparedDaySections.length === 0 || preparedLineItems.length === 0) {
      setErrorMessage("Please add at least one line item before saving.");
      await Swal.fire({
        title: "Missing Line Items",
        text: "Please add at least one line item before saving.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage("");

    try {
      const payload = {
        leadId: form.leadId || null,
        client: form.client,
        attention: form.attention,
        quoteDate: form.quoteDate,
        notes: form.notes,
        daySections: preparedDaySections,
        lineItems: preparedLineItems,
        subtotal,
        tax,
        total: grandTotal,
        status,
      };

      const response = editingId
        ? await apiFetch(`/quotations/${editingId}`, {
            method: "PUT",
            body: payload,
          })
        : await apiFetch("/quotations", {
            method: "POST",
            body: payload,
          });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to save quotation.");
      }

      setIsModalOpen(false);
      setEditingId(null);
      setForm(createFormState());
      await loadQuotations();

      await Swal.fire({
        title: editingId ? "Updated" : "Created",
        text: editingId
          ? "Quotation updated successfully."
          : "Quotation created successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to save quotation.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save quotation.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async (quotation) => {
    setDownloadingId(quotation.id);
    try {
      const response = await apiFetch(`/quotations/${quotation.id}/pdf`);

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        throw new Error(errorPayload?.message || "Unable to generate PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${quotation.quoteNo || `quotation-${quotation.id}`}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      await Swal.fire({
        title: "PDF Failed",
        text: error.message || "Failed to download PDF.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConvertToPI = async (quotation) => {
    const confirmation = await Swal.fire({
      title: "Convert to PI?",
      text: "This quotation will be marked as Converted and appear in Proforma Invoices.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Convert",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#d97706",
    });

    if (!confirmation.isConfirmed) return;

    setConvertingId(quotation.id);
    setErrorMessage("");

    try {
      const response = await apiFetch(
        `/quotations/${quotation.id}/convert-to-pi`,
        {
          method: "POST",
        },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to convert quotation to PI.");
      }

      setQuotations((current) =>
        current.map((q) =>
          q.id === quotation.id ? { ...q, status: "Converted" } : q,
        ),
      );

      await Swal.fire({
        title: "Converted",
        text: "Quotation converted to PI successfully.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });

      navigate("/proforma-invoices");
    } catch (error) {
      setErrorMessage(error.message || "Failed to convert quotation to PI.");
      await Swal.fire({
        title: "Conversion Failed",
        text: error.message || "Failed to convert quotation to PI.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setConvertingId(null);
    }
  };

  const handleRegeneratePI = async (quotation) => {
    const confirmation = await Swal.fire({
      title: "Regenerate PI?",
      text: "This will update the existing Proforma Invoice with the latest quotation data.",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Regenerate",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#d97706",
    });

    if (!confirmation.isConfirmed) return;

    setConvertingId(quotation.id);
    setErrorMessage("");

    try {
      const response = await apiFetch(
        `/quotations/${quotation.id}/convert-to-pi`,
        { method: "POST" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || "Unable to regenerate PI.");
      }

      await Swal.fire({
        title: "PI Regenerated",
        text: "Proforma Invoice updated with the latest quotation data.",
        icon: "success",
        timer: 1800,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });

      navigate("/proforma-invoices");
    } catch (error) {
      setErrorMessage(error.message || "Failed to regenerate PI.");
      await Swal.fire({
        title: "Regeneration Failed",
        text: error.message || "Failed to regenerate PI.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setConvertingId(null);
    }
  };

  const handleLeadSelect = (value) => {
    if (!value) {
      setForm((current) => ({ ...current, leadId: "" }));
      return;
    }

    const selectedLead = leads.find((lead) => String(lead.id) === value);
    if (!selectedLead) return;

    if (["Quotation Sent", "PI Sent"].includes(selectedLead.bookingStatus)) {
      Swal.fire({
        title: "Already Processed",
        text: "This lead is already marked as Quotation Sent / PI Sent.",
        icon: "info",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setForm((current) => {
      const tripDates = getTripDates(
        selectedLead.startDate,
        selectedLead.endDate,
      );
      const daySectionsFromLead = tripDates.length
        ? tripDates.map((tripDate, index) =>
            createDaySection(index + 1, tripDate),
          )
        : current.daySections.map((section, index) => {
            const fallbackDate =
              index === 0 && toIsoDate(selectedLead.startDate)
                ? toIsoDate(selectedLead.startDate)
                : toIsoDate(section.dayDate || "");
            return {
              ...section,
              dayDate: fallbackDate,
              dayTitle: fallbackDate || section.dayTitle,
            };
          });

      const alignedSections = daySectionsFromLead.map((section, index) =>
        index === 0
          ? {
              ...section,
              dayDescription:
                selectedLead.routeParks || section.dayDescription || "",
              items: section.items.map((item, itemIndex) =>
                itemIndex === 0
                  ? {
                      ...item,
                      item: item.item || "Transport",
                      description:
                        selectedLead.routeParks || item.description || "",
                      unit: item.unit || "Vehicle",
                      qty: item.qty || String(selectedLead.noOfVehicles || "1"),
                    }
                  : item,
              ),
            }
          : section,
      );

      return {
        ...current,
        leadId: value,
        client: selectedLead.clientCompany,
        attention: selectedLead.agentContact || "",
        notes: `Lead ${selectedLead.bookingRef} | ${selectedLead.routeParks} | ${selectedLead.startDate} to ${selectedLead.endDate}${selectedLead.specialRequirements ? ` | ${selectedLead.specialRequirements}` : ""}`,
        daySections: alignedSections,
      };
    });
  };

  const getRatesForItem = (itemType) => {
    if (itemType === "Transport") return ratesCache.transport;
    if (itemType === "Park Fees") return ratesCache.parkFees;
    if (itemType === "Concession Fees") return ratesCache.concessionFees;
    return [];
  };

  const normalizeRateToken = (value) =>
    String(value || "")
      .replace(/_/g, " ")
      .trim();

  const buildRateName = (rate) =>
    [rate.park_name || rate.parkName || "", rate.type, rate.category]
      .map(normalizeRateToken)
      .filter(Boolean)
      .join(" - ");

  const getRateOptionLabel = (itemType, r) => {
    if (itemType === "Transport")
      return `${r.particular || r.name || "Unnamed"} - USD ${r.rate}`;
    return `${buildRateName(r)} - USD ${r.rate}`;
  };

  const getRateDescription = (itemType, r) => {
    if (itemType === "Transport") return r.particular || r.name || "";
    return buildRateName(r);
  };

  const getAutoQtyFromLead = (category, product) => {
    const selectedLead = leads.find(
      (lead) => String(lead.id) === String(form.leadId),
    );
    if (!selectedLead) return "";

    if (category === "Transport") {
      return String(selectedLead.noOfVehicles || "");
    }

    if (!["Park Fees", "Concession Fees"].includes(category)) return "";

    const productHint = [
      product?.category,
      product?.type,
      product?.particular,
      product?.name,
      product?.park_name,
      product?.parkName,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const hasAdultHint = /adult/.test(productHint);
    const hasChildHint = /child|children|kid/.test(productHint);

    if (hasChildHint) return String(selectedLead.paxChildren || "");
    if (hasAdultHint) return String(selectedLead.paxAdults || "");

    return String(selectedLead.paxAdults || "");
  };

  const openProductPicker = async (sectionIndex, itemIndex) => {
    setPickerTarget({ sectionIndex, itemIndex });
    setPickerCategory("Transport");
    setPickerSearch("");
    setIsProductModalOpen(true);
    await Promise.all(
      ["Transport", "Park Fees", "Concession Fees"].map(loadRatesForType),
    );
  };

  const applyProductToLine = (product, category) => {
    const description =
      category === "Transport"
        ? product?.particular || product?.name || ""
        : getRateDescription(category, product);
    const autoQty = getAutoQtyFromLead(category, product);

    setForm((current) => ({
      ...current,
      daySections: current.daySections.map((section, sectionIndex) => {
        if (sectionIndex !== pickerTarget.sectionIndex) return section;
        return {
          ...section,
          items: section.items.map((item, itemIndex) => {
            if (itemIndex !== pickerTarget.itemIndex) return item;
            if (category === "Others") {
              return {
                ...item,
                item: "Others",
              };
            }

            return {
              ...item,
              item: category,
              description: description || item.description,
              unit: category === "Transport" ? "Vehicle" : "Per person",
              qty: autoQty !== "" ? autoQty : item.qty,
              rate: String(product?.rate ?? item.rate ?? ""),
            };
          }),
        };
      }),
    }));

    setIsProductModalOpen(false);
  };

  const categories = ["Transport", "Park Fees", "Concession Fees", "Others"];
  const productsForCategory = getRatesForItem(pickerCategory);
  const filteredProducts = productsForCategory.filter((product) => {
    if (!pickerSearch) return true;
    const query = pickerSearch.toLowerCase();
    return getRateDescription(pickerCategory, product)
      .toLowerCase()
      .includes(query);
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Quotations</h1>
          <p className="text-slate-400 mt-1">
            Create and manage dynamic quotation templates for transport
            services.
          </p>
        </div>
        <button
          onClick={openNewQuotation}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          New Quotation
        </button>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Total", value: stats.total, color: "text-white" },
          { label: "Draft", value: stats.draft, color: "text-slate-400" },
          { label: "Sent", value: stats.sent, color: "text-blue-400" },
          { label: "Approved", value: stats.approved, color: "text-green-400" },
          {
            label: "Converted",
            value: stats.converted,
            color: "text-purple-400",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-xl p-4 text-center"
          >
            <p className="text-slate-400 text-sm">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.color}`}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 border border-slate-700/50 focus-within:border-amber-500/50 transition-colors">
            <Search className="w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by quote #, client, or service summary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {["All", "Draft", "Sent", "Approved", "Rejected", "Converted"].map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    statusFilter === status
                      ? "bg-amber-500 text-white"
                      : "bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {status}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900/50 backdrop-blur border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800">
                {[
                  "Quote #",
                  "Date",
                  "Client",
                  "Service Summary",
                  "Line Items",
                  "Total Amount",
                  "Status",
                  "Actions",
                ].map((header) => (
                  <th
                    key={header}
                    className="text-left py-4 px-6 text-sm font-semibold text-slate-400"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((quotation) => {
                const config =
                  statusConfig[quotation.status] || statusConfig.Draft;
                return (
                  <tr
                    key={quotation.id}
                    className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-white font-medium text-sm">
                          {quotation.quoteNo || "Pending #"}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-400">
                      {quotation.date}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
                        <span className="text-sm text-slate-300">
                          {quotation.client}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-300 max-w-xs">
                      {quotation.serviceSummary}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-300">
                      {quotation.lineItems.length}
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-white font-semibold text-sm">
                        {formatCurrency(quotation.total)}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${config.color}`}
                      >
                        <config.icon className="w-3 h-3" />
                        {quotation.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditQuotation(quotation)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(quotation)}
                          disabled={downloadingId === quotation.id}
                          className="p-1.5 text-slate-400 hover:text-green-400 hover:bg-green-500/10 rounded-lg transition-colors"
                          title={
                            downloadingId === quotation.id
                              ? "Downloading..."
                              : "Download PDF"
                          }
                        >
                          {downloadingId === quotation.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </button>
                        {["Sent", "Approved"].includes(quotation.status) && (
                          <button
                            onClick={() => handleConvertToPI(quotation)}
                            disabled={convertingId === quotation.id}
                            className="px-2 py-1 text-xs font-medium text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors"
                            title="Convert to PI"
                          >
                            {convertingId === quotation.id
                              ? "Converting..."
                              : "→ PI"}
                          </button>
                        )}
                        {quotation.status === "Converted" && (
                          <button
                            onClick={() => handleRegeneratePI(quotation)}
                            disabled={convertingId === quotation.id}
                            className="px-2 py-1 text-xs font-medium text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 rounded-lg transition-colors"
                            title="Regenerate PI"
                          >
                            {convertingId === quotation.id
                              ? "Regenerating..."
                              : "↺ PI"}
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuotation(quotation.id)}
                          className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!isLoading && filtered.length === 0 && (
            <div className="py-16 text-center text-slate-500">
              No quotations found.
            </div>
          )}
          {isLoading && (
            <div className="py-16 text-center text-slate-500">
              Loading quotations...
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-slate-800/50 flex items-center justify-between">
          <p className="text-sm text-slate-400">
            Showing {filtered.length} of {quotations.length} quotations
          </p>
          <p className="text-sm font-semibold text-white">
            Total Value: {formatCurrency(totalValue)}
          </p>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div
            className="rounded-2xl w-full max-w-7xl flex flex-col"
            style={{
              background: "linear-gradient(135deg,#fffdf5,#fffbef)",
              border: "1px solid rgba(201,162,54,0.3)",
              maxHeight: "92vh",
            }}
          >
            {/* Sticky header */}
            <div
              className="flex items-center justify-between p-6 flex-shrink-0"
              style={{ borderBottom: "1px solid rgba(201,162,54,0.25)" }}
            >
              <div>
                <h2 className="text-xl font-bold" style={{ color: "#1e293b" }}>
                  {editingId ? "Edit Quotation" : "New Quotation"}
                </h2>
                <p className="text-sm mt-1" style={{ color: "#64748b" }}>
                  Build quotation line items dynamically and totals will update
                  automatically.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
                style={{ color: "#64748b" }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-6">
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Lead
                  </label>
                  <select
                    value={form.leadId}
                    onChange={(e) => handleLeadSelect(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select lead...</option>
                    {selectableLeads.map((lead) => (
                      <option key={lead.id} value={String(lead.id)}>
                        {lead.bookingRef} - {lead.clientCompany} (
                        {lead.bookingStatus})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Client
                  </label>
                  <select
                    value={form.client}
                    onChange={(e) =>
                      setForm({ ...form, client: e.target.value })
                    }
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select client...</option>
                    {clients.map((client) => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Quotation Date
                  </label>
                  <Datepicker
                    useRange={false}
                    asSingle
                    primaryColor="blue"
                    value={toPickerValue(form.quoteDate)}
                    onChange={(newValue) =>
                      setForm({
                        ...form,
                        quoteDate: newValue?.startDate || "",
                      })
                    }
                    displayFormat="YYYY-MM-DD"
                    inputClassName="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-amber-500"
                    toggleClassName="absolute right-0 h-full px-3 text-slate-400"
                    containerClassName="relative"
                    popoverDirection="down"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Attention
                  </label>
                  <input
                    type="text"
                    value={form.attention}
                    onChange={(e) =>
                      setForm({ ...form, attention: e.target.value })
                    }
                    placeholder="Contact person"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="lg:col-span-3">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Notes
                  </label>
                  <input
                    type="text"
                    value={form.notes}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                    placeholder="Optional quotation notes"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl overflow-visible p-4 sm:p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      Itinerary & Costs
                    </h3>
                    <p className="text-sm text-slate-400">
                      Add each day with description and cost lines in the
                      format: Item, Description, Unit, Qty, Rate, Total.
                    </p>
                  </div>
                  <button
                    onClick={addDaySection}
                    className="flex items-center gap-2 px-3 py-2 bg-amber-500 text-white rounded-xl text-sm font-medium hover:bg-amber-400 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Day
                  </button>
                </div>

                <div className="space-y-4">
                  {form.daySections.map((section, sectionIndex) => (
                    <div
                      key={sectionIndex}
                      className="border border-slate-800 rounded-xl overflow-hidden"
                    >
                      <div className="bg-slate-900/60 p-4 space-y-3 border-b border-slate-800">
                        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
                          <input
                            type="date"
                            value={toIsoDate(
                              section.dayDate || section.dayTitle,
                            )}
                            onChange={(event) => {
                              const selectedDate = event.target.value;
                              updateDaySection(
                                sectionIndex,
                                "dayDate",
                                selectedDate,
                              );
                              updateDaySection(
                                sectionIndex,
                                "dayTitle",
                                selectedDate,
                              );
                            }}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                          />
                          <button
                            onClick={() => removeDaySection(sectionIndex)}
                            className="px-3 py-2 text-sm text-slate-300 bg-slate-800 hover:bg-red-600/30 hover:text-red-300 rounded-lg transition-colors"
                            title="Remove day"
                          >
                            Remove Day
                          </button>
                        </div>

                        <textarea
                          rows={2}
                          value={section.dayDescription}
                          onChange={(event) =>
                            updateDaySection(
                              sectionIndex,
                              "dayDescription",
                              event.target.value,
                            )
                          }
                          placeholder="Description: Pick up from Arusha, transfer to Serengeti, game drive..."
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 resize-none"
                        />
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[980px]">
                          <thead>
                            <tr className="border-b border-slate-800">
                              {[
                                "Item",
                                "Description",
                                "Unit",
                                "Qty",
                                "Rate",
                                "Total",
                                "",
                              ].map((header) => (
                                <th
                                  key={header}
                                  className="text-left py-4 px-6 text-sm font-semibold text-slate-400 whitespace-nowrap"
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {section.items.map((item, itemIndex) => (
                              <tr
                                key={itemIndex}
                                className="border-b border-slate-800/50 align-middle"
                              >
                                <td className="px-3 py-3">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      openProductPicker(sectionIndex, itemIndex)
                                    }
                                    className={`w-full rounded-lg px-3 py-2 text-sm focus:outline-none text-left transition-all flex items-center justify-between gap-2 ${
                                      item.item
                                        ? "bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100"
                                        : "bg-amber-50 border-2 border-amber-400 text-amber-800 hover:bg-amber-100 shadow-sm"
                                    }`}
                                  >
                                    <span className="inline-flex items-center gap-2 font-medium">
                                      <Plus className="w-3.5 h-3.5" />
                                      {item.item || "Select item"}
                                    </span>
                                    <ChevronRight className="w-4 h-4 opacity-80" />
                                  </button>
                                  {item.item === "Others" && (
                                    <input
                                      type="text"
                                      value={item.customItem || ""}
                                      onChange={(e) =>
                                        updateDayItem(
                                          sectionIndex,
                                          itemIndex,
                                          "customItem",
                                          e.target.value,
                                        )
                                      }
                                      placeholder="Specify item..."
                                      className="mt-1.5 w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                                      style={{
                                        background: "#ffffff",
                                        color: "#1f2937",
                                      }}
                                    />
                                  )}
                                </td>
                                <td className="px-3 py-3 min-w-[260px]">
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(event) =>
                                      updateDayItem(
                                        sectionIndex,
                                        itemIndex,
                                        "description",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Adult Non-Resident"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="text"
                                    value={item.unit}
                                    onChange={(event) =>
                                      updateDayItem(
                                        sectionIndex,
                                        itemIndex,
                                        "unit",
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Per person"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                  />
                                </td>
                                <td className="px-3 py-3">
                                  <input
                                    type="number"
                                    min="0"
                                    value={item.qty}
                                    onChange={(event) =>
                                      updateDayItem(
                                        sectionIndex,
                                        itemIndex,
                                        "qty",
                                        event.target.value,
                                      )
                                    }
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                  />
                                </td>
                                <td className="px-3 py-3 min-w-[260px]">
                                  {getRatesForItem(item.item).length > 0 ? (
                                    (() => {
                                      const rateOptions = getRatesForItem(
                                        item.item,
                                      ).map((r) => ({
                                        value: r.id,
                                        label: getRateOptionLabel(item.item, r),
                                        rate: r.rate,
                                        desc: getRateDescription(item.item, r),
                                      }));

                                      const currentRate = Number(
                                        item.rate || 0,
                                      );
                                      const exactMatch = rateOptions.find(
                                        (opt) =>
                                          Number(opt.rate || 0) ===
                                            currentRate &&
                                          (!item.description ||
                                            opt.desc === item.description),
                                      );
                                      const rateOnlyMatch = rateOptions.find(
                                        (opt) =>
                                          Number(opt.rate || 0) === currentRate,
                                      );

                                      const fallbackSelected =
                                        item.rate !== "" &&
                                        !Number.isNaN(currentRate)
                                          ? {
                                              value: `saved-${sectionIndex}-${itemIndex}`,
                                              label: `${
                                                item.description || "Saved rate"
                                              } - USD ${currentRate.toLocaleString()}`,
                                              rate: String(item.rate),
                                              desc: item.description || "",
                                            }
                                          : null;

                                      const selectedOption =
                                        exactMatch ||
                                        rateOnlyMatch ||
                                        fallbackSelected;

                                      const optionsWithFallback =
                                        selectedOption &&
                                        !rateOptions.some(
                                          (opt) =>
                                            String(opt.value) ===
                                            String(selectedOption.value),
                                        )
                                          ? [selectedOption, ...rateOptions]
                                          : rateOptions;

                                      return (
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1">
                                            <Select
                                              placeholder="Search rate..."
                                              isClearable
                                              menuPortalTarget={
                                                typeof document !== "undefined"
                                                  ? document.body
                                                  : null
                                              }
                                              menuPosition="fixed"
                                              menuPlacement="auto"
                                              maxMenuHeight={280}
                                              options={optionsWithFallback}
                                              value={selectedOption || null}
                                              onChange={(selected) => {
                                                if (!selected) {
                                                  updateDayItem(
                                                    sectionIndex,
                                                    itemIndex,
                                                    "rate",
                                                    "",
                                                  );
                                                  return;
                                                }
                                                updateDayItem(
                                                  sectionIndex,
                                                  itemIndex,
                                                  "rate",
                                                  String(selected.rate),
                                                );
                                                if (!item.description)
                                                  updateDayItem(
                                                    sectionIndex,
                                                    itemIndex,
                                                    "description",
                                                    selected.desc,
                                                  );
                                              }}
                                              styles={{
                                                control: (base) => ({
                                                  ...base,
                                                  background: "#fff",
                                                  borderColor: "#cbd5e1",
                                                  minHeight: "36px",
                                                  fontSize: "0.875rem",
                                                }),
                                                menu: (base) => ({
                                                  ...base,
                                                  background: "#fff",
                                                  zIndex: 9999,
                                                }),
                                                menuPortal: (base) => ({
                                                  ...base,
                                                  zIndex: 9999,
                                                }),
                                                option: (base, state) => ({
                                                  ...base,
                                                  background: state.isFocused
                                                    ? "#fef9ec"
                                                    : "#fff",
                                                  color: "#1f2937",
                                                  fontSize: "0.875rem",
                                                }),
                                                singleValue: (base) => ({
                                                  ...base,
                                                  color: "#1f2937",
                                                }),
                                              }}
                                              className=""
                                            />
                                          </div>
                                          <input
                                            type="number"
                                            min="0"
                                            value={item.rate}
                                            onChange={(event) =>
                                              updateDayItem(
                                                sectionIndex,
                                                itemIndex,
                                                "rate",
                                                event.target.value,
                                              )
                                            }
                                            className="w-24 bg-slate-800 border border-slate-700 rounded-lg px-2 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                          />
                                        </div>
                                      );
                                    })()
                                  ) : (
                                    <input
                                      type="number"
                                      min="0"
                                      value={item.rate}
                                      onChange={(event) =>
                                        updateDayItem(
                                          sectionIndex,
                                          itemIndex,
                                          "rate",
                                          event.target.value,
                                        )
                                      }
                                      placeholder="Enter rate"
                                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                                    />
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  <div
                                    className="min-w-[120px] rounded-lg px-3 py-2 text-sm font-semibold"
                                    style={{
                                      background:
                                        "linear-gradient(135deg, rgba(201,162,54,0.22), rgba(201,162,54,0.35))",
                                      border: "1px solid rgba(139,105,20,0.35)",
                                      color: "#1e293b",
                                    }}
                                  >
                                    {formatCurrency(calculateItemTotal(item))}
                                  </div>
                                </td>
                                <td className="px-3 py-3">
                                  <button
                                    onClick={() =>
                                      removeDayItem(sectionIndex, itemIndex)
                                    }
                                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    title="Remove line"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div
                        className="p-3 border-t border-slate-200"
                        style={{ background: "rgba(255,251,239,0.9)" }}
                      >
                        <button
                          onClick={() => addDayItem(sectionIndex)}
                          className="px-3 py-2 text-sm rounded-lg hover:opacity-90 transition-opacity font-medium"
                          style={{
                            background:
                              "linear-gradient(to right,#3BAA6E,#267A4F)",
                            color: "#ffffff",
                          }}
                        >
                          + Add Cost Line
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6 items-start">
                <div
                  className="rounded-2xl p-4"
                  style={{
                    background: "rgba(255,251,239,0.7)",
                    border: "1px solid rgba(201,162,54,0.2)",
                  }}
                >
                  <h4
                    className="font-semibold mb-2"
                    style={{ color: "#1e293b" }}
                  >
                    Calculation Logic
                  </h4>
                  <p className="text-sm" style={{ color: "#64748b" }}>
                    Each row total is calculated as Qty x Rate. Subtotal is the
                    sum of all rows across all days.
                  </p>
                </div>
              </div>
            </div>

            {/* Sticky footer: totals + action buttons always visible */}
            <div
              className="flex-shrink-0 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4"
              style={{
                borderTop: "2px solid rgba(201,162,54,0.3)",
                background: "linear-gradient(135deg,#fffbef,#fff7e0)",
              }}
            >
              {/* Totals */}
              <div className="flex items-center gap-6 text-sm flex-wrap">
                <div className="flex items-center gap-2">
                  <span style={{ color: "#64748b" }}>Subtotal:</span>
                  <span className="font-semibold" style={{ color: "#1e293b" }}>
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span style={{ color: "#64748b" }}>Tax (18%):</span>
                  <span className="font-semibold" style={{ color: "#1e293b" }}>
                    {formatCurrency(tax)}
                  </span>
                </div>
                <div
                  className="flex items-center gap-2 px-4 py-2 rounded-xl"
                  style={{
                    background: "linear-gradient(to right,#C9A236,#8B6914)",
                  }}
                >
                  <span className="font-semibold text-white text-sm">
                    Grand Total:
                  </span>
                  <span className="text-lg font-bold text-white">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
              {/* Action buttons */}
              <div className="flex gap-3 flex-shrink-0">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 rounded-xl font-medium border border-slate-300 hover:bg-slate-100 transition-colors"
                  style={{ background: "#f1f5f9", color: "#334155" }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveQuotation("Draft")}
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                  style={{
                    background: "linear-gradient(to right,#E31B24,#B01218)",
                    color: "#ffffff",
                  }}
                >
                  {isSaving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={() => handleSaveQuotation("Sent")}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Saving..." : "Create & Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div
            className="w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            style={{ maxHeight: "84vh" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Add Item</h3>
                <p className="text-sm text-slate-500">
                  Select category on the right, then choose a product on the
                  left.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProductModalOpen(false)}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_240px]">
              <div className="min-h-[420px]">
                <div className="px-4 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                    <Search className="w-4 h-4 text-slate-500" />
                    <input
                      value={pickerSearch}
                      onChange={(event) => setPickerSearch(event.target.value)}
                      placeholder="Search products..."
                      disabled={pickerCategory === "Others"}
                      className="w-full bg-transparent text-sm text-slate-700 outline-none disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="max-h-[500px] overflow-auto">
                  {pickerCategory === "Others" ? (
                    <div className="p-8 text-center">
                      <p className="text-slate-700 font-medium">Custom Item</p>
                      <p className="text-sm text-slate-500 mt-1">
                        Use this to manually type your own product name.
                      </p>
                      <button
                        type="button"
                        onClick={() => applyProductToLine(null, "Others")}
                        className="mt-4 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-400"
                      >
                        Use Custom Item
                      </button>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="text-left px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
                            Product
                          </th>
                          <th className="text-right px-4 py-3 text-xs uppercase tracking-wide text-slate-500">
                            Rate
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredProducts.length === 0 ? (
                          <tr>
                            <td
                              colSpan={2}
                              className="px-4 py-10 text-center text-sm text-slate-500"
                            >
                              No products found.
                            </td>
                          </tr>
                        ) : (
                          filteredProducts.map((product, index) => (
                            <tr
                              key={product.id || index}
                              onClick={() =>
                                applyProductToLine(product, pickerCategory)
                              }
                              className="border-b border-slate-100 hover:bg-amber-50 cursor-pointer"
                            >
                              <td className="px-4 py-3 text-sm text-slate-700">
                                {getRateDescription(pickerCategory, product)}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-right text-slate-700">
                                USD {Number(product.rate || 0).toLocaleString()}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              <div className="border-l border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500 px-2 py-1">
                  Categories
                </p>
                <div className="space-y-1 mt-1">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setPickerCategory(category);
                        setPickerSearch("");
                      }}
                      className={`w-full px-3 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
                        pickerCategory === category
                          ? "bg-amber-500 text-white"
                          : "text-slate-600 hover:bg-white"
                      }`}
                    >
                      <span>{category}</span>
                      {pickerCategory === category ? (
                        <ChevronRight className="w-4 h-4" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
