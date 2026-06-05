import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  ClipboardList,
  Download,
  Eye,
  Edit,
  Globe,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import Swal from "sweetalert2";

const parseDateValue = (value) => {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  const stringValue = String(value).trim();

  const isoMatch = stringValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const dmyMatch = stringValue.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmyMatch) {
    const day = Number(dmyMatch[1]);
    const month = Number(dmyMatch[2]);
    const year = Number(dmyMatch[3]);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(stringValue);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return value || "-";

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
};

const formatDateTime = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return value || "-";

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  const hours = String(parsed.getHours()).padStart(2, "0");
  const minutes = String(parsed.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

const toInputDate = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeLead = (lead) => ({
  id: lead.id,
  bookingRef: lead.booking_ref || lead.bookingRef || "-",
  groupName: lead.group_name || lead.groupName || "-",
  clientCompany: lead.client_company || lead.clientCompany || "-",
  agentContact: lead.agent_contact || lead.agentContact || "-",
  clientCountry: lead.client_country || lead.clientCountry || "-",
  startDate: lead.start_date || lead.startDate || "",
  endDate: lead.end_date || lead.endDate || "",
  routeParks: lead.route_parks || lead.routeParks || "-",
  paxAdults: Number(lead.pax_adults ?? lead.paxAdults ?? 0),
  paxChildren: Number(lead.pax_children ?? lead.paxChildren ?? 0),
  noOfVehicles: Number(lead.no_of_vehicles ?? lead.noOfVehicles ?? 0),
  bookingStatus: lead.booking_status || lead.bookingStatus || "Pending",
  sentBy: lead.sent_by || lead.sentBy || "",
  quotationSentAt: lead.quotation_sent_at || lead.quotationSentAt || "",
  piSentAt: lead.pi_sent_at || lead.piSentAt || "",
  specialRequirements:
    lead.special_requirements || lead.specialRequirements || "",
  agentPhone: lead.agent_phone || lead.agentPhone || "",
  agentEmail: lead.agent_email || lead.agentEmail || "",
});

const normalizeVehicle = (vehicle) => ({
  id: Number(vehicle.id || 0),
  status: vehicle.status || "Available",
  assignedDriverId:
    vehicle.assigned_driver_id ||
    vehicle.assignedDriverId ||
    vehicle.assigned_driver?.id ||
    vehicle.assignedDriver?.id ||
    "",
  assignedDriverName:
    vehicle.assigned_driver?.name || vehicle.assignedDriver?.name || "",
  label: `${
    vehicle.vehicle_no ||
    vehicle.vehicleNo ||
    vehicle.car_no ||
    vehicle.carNo ||
    vehicle.name ||
    `Vehicle ${vehicle.id}`
  } (${vehicle.plate_no || vehicle.plateNo || "No Plate"})`,
});

const normalizeUser = (user) => ({
  id: Number(user.id || 0),
  name: user.name || "",
  role: user.role || "",
  status:
    typeof user.status === "string"
      ? user.status
      : user.status === 1 || user.status === true
        ? "Active"
        : "Inactive",
});

const normalizeQuotation = (quotation) => ({
  id: Number(quotation.id || 0),
  leadId: Number(quotation.lead_id || quotation.leadId || 0),
  groupName: quotation.group_name || quotation.groupName || "",
  quoteDate:
    quotation.quoteDate ||
    quotation.quote_date ||
    quotation.created_at ||
    quotation.createdAt ||
    "",
  daySections: Array.isArray(quotation.day_sections)
    ? quotation.day_sections
    : Array.isArray(quotation.daySections)
      ? quotation.daySections
      : [],
});

const createItineraryLine = (
  date = "",
  dayDescription = "",
  allowancePerDay = "",
) => ({
  date,
  dayDescription,
  allowancePerDay,
});

const normalizeItineraryLines = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return [createItineraryLine()];
  }

  const mapped = items
    .map((item) => {
      if (typeof item === "string") {
        return createItineraryLine("", item.trim());
      }

      if (!item || typeof item !== "object") return null;

      const rawDate = String(
        item.date || item.dayDate || item.dayTitle || "",
      ).trim();
      const date = rawDate ? formatDate(rawDate) : "";
      const dayDescription = String(
        item.dayDescription || item.dateDescription || item.description || "",
      ).trim();
      const allowanceRaw = item.allowancePerDay ?? item.allowance_per_day ?? "";
      const allowancePerDay =
        allowanceRaw === null || allowanceRaw === undefined
          ? ""
          : String(allowanceRaw).trim();

      if (!date && !dayDescription && !allowancePerDay) return null;
      return createItineraryLine(date, dayDescription, allowancePerDay);
    })
    .filter(Boolean);

  return mapped.length > 0 ? mapped : [createItineraryLine()];
};

const itineraryLinesToPayload = (lines) => {
  if (!Array.isArray(lines)) return [];

  return lines
    .map((line) => {
      const date = String(line?.date || "").trim();
      const dayDescription = String(line?.dayDescription || "").trim();
      const allowanceStr = String(line?.allowancePerDay ?? "").trim();
      const allowance = allowanceStr === "" ? null : Number(allowanceStr);
      return {
        date,
        dayDescription,
        allowancePerDay: Number.isFinite(allowance) ? allowance : null,
      };
    })
    .filter(
      (line) =>
        line.date || line.dayDescription || line.allowancePerDay !== null,
    );
};

const extractList = (payload, preferredKey) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (preferredKey && Array.isArray(payload?.[preferredKey])) {
    return payload[preferredKey];
  }
  if (Array.isArray(payload?.leads)) return payload.leads;
  if (Array.isArray(payload?.quotations)) return payload.quotations;
  if (Array.isArray(payload?.users)) return payload.users;
  if (Array.isArray(payload?.jobCards)) return payload.jobCards;
  if (Array.isArray(payload?.job_cards)) return payload.job_cards;
  if (Array.isArray(payload?.safariAllocations))
    return payload.safariAllocations;
  if (Array.isArray(payload?.allocations)) return payload.allocations;
  return [];
};

const extractSingle = (payload, preferredKey) =>
  payload?.data ||
  (preferredKey ? payload?.[preferredKey] : undefined) ||
  payload?.jobCard ||
  payload?.job_card ||
  payload;

const JOB_CARD_TYPES = [
  "Safari",
  "Long Term Lease",
  "Test Drive",
  "Service",
  "Client Viewing",
  "Others",
];

const isSafariJobType = (type) =>
  String(type || "")
    .toLowerCase()
    .startsWith("safari");

const isLeaseJobType = (type) =>
  String(type || "")
    .toLowerCase()
    .trim() === "long term lease";

const calculateMileage = (odometerOut, odometerIn) => {
  if (
    odometerOut === "" ||
    odometerOut === null ||
    odometerOut === undefined ||
    odometerIn === "" ||
    odometerIn === null ||
    odometerIn === undefined
  ) {
    return "";
  }

  const out = Number(odometerOut);
  const inn = Number(odometerIn);
  if (!Number.isFinite(out) || !Number.isFinite(inn)) return "";
  return Math.max(0, inn - out);
};

const calculateApproxFuelUsed = (fuelGaugeOut, fuelGaugeIn) => {
  if (
    fuelGaugeOut === "" ||
    fuelGaugeOut === null ||
    fuelGaugeOut === undefined ||
    fuelGaugeIn === "" ||
    fuelGaugeIn === null ||
    fuelGaugeIn === undefined
  ) {
    return "";
  }

  const out = Number(fuelGaugeOut);
  const inn = Number(fuelGaugeIn);
  if (!Number.isFinite(out) || !Number.isFinite(inn)) return "";
  return Math.max(0, out - inn);
};

const getNumberOfDaysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 1;

  const start = parseDateValue(startDate);
  const end = parseDateValue(endDate);
  if (!start || !end) return 1;

  const diffInMs = end.getTime() - start.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffInDays);
};

const hasCapturedSafariDateRange = (values) =>
  Boolean(values?.safariStartDate && values?.safariEndDate);

const normalizeStatusValue = (status) => {
  if (status === "Close") return "Closed";
  if (status === "Open" || status === "Closed") return status;
  return "Open";
};

const hasReturnDetails = (values) => {
  if (!values) return false;

  return Boolean(
    hasCapturedSafariDateRange(values) ||
    values.timeIn ||
    String(values.odometerIn ?? "").trim() !== "",
  );
};

const deriveJobCardStatus = (values) =>
  hasReturnDetails(values) ? "Closed" : "Open";

const normalizeJobCard = (jobCard) => {
  const adultsFromCounts = Number(jobCard?.numberOfClients?.adults ?? 0);
  const childrenFromCounts = Number(jobCard?.numberOfClients?.children ?? 0);
  const odometerOutRaw =
    jobCard.odometer_out ??
    jobCard.odometerOut ??
    jobCard?.vehicle?.odometerOut;
  const odometerInRaw =
    jobCard.odometer_in ?? jobCard.odometerIn ?? jobCard?.vehicle?.odometerIn;
  const fuelGaugeOutRaw =
    jobCard.fuel_gauge_out ?? jobCard.fuelGaugeOut ?? jobCard.fuel_out;
  const fuelGaugeInRaw =
    jobCard.fuel_gauge_in ?? jobCard.fuelGaugeIn ?? jobCard.fuel_in;
  const fallbackStatus = hasReturnDetails({
    safariEndDate: jobCard.safari_end_date ?? jobCard.safariEndDate,
    timeIn: jobCard.time_in ?? jobCard.timeIn,
    odometerIn: odometerInRaw,
    fuelGaugeIn: fuelGaugeInRaw,
  })
    ? "Closed"
    : "Open";

  return {
    id: jobCard.id,
    leadId: Number(jobCard.lead_id ?? jobCard.leadId ?? 0),
    vehicleId: Number(jobCard.vehicle_id ?? jobCard.vehicleId ?? 0),
    leaseContractId: Number(
      jobCard.lease_contract_id ?? jobCard.leaseContractId ?? 0,
    ),
    leaseContract: jobCard.leaseContract || jobCard.lease_contract || null,
    leaseAllocationId: Number(
      jobCard.lease_allocation_id ?? jobCard.leaseAllocationId ?? 0,
    ),
    leaseAllocation:
      jobCard.leaseAllocation || jobCard.lease_allocation || null,
    type: jobCard.type || jobCard.job_type || jobCard.jobType || "Safari",
    jobCardNo: jobCard.job_card_no || jobCard.jobCardNo || "-",
    bookingReferenceNo:
      jobCard.booking_reference_no ||
      jobCard.bookingReferenceNo ||
      jobCard.booking_ref ||
      "-",
    tourOperatorClientName:
      jobCard.tour_operator_client_name ||
      jobCard.tourOperatorClientName ||
      jobCard.client_company ||
      "-",
    contactPerson: jobCard.contact_person || jobCard.contactPerson || "-",
    contactNumber: jobCard.contact_number || jobCard.contactNumber || "",
    contactEmail: jobCard.contact_email || jobCard.contactEmail || "",
    adults: Number(jobCard.adults ?? adultsFromCounts),
    children: Number(jobCard.children ?? childrenFromCounts),
    nationality: jobCard.nationality || "",
    safariStartDate: jobCard.safari_start_date || jobCard.safariStartDate || "",
    safariEndDate: jobCard.safari_end_date || jobCard.safariEndDate || "",
    timeOut: jobCard.time_out || jobCard.timeOut || "",
    timeIn: jobCard.time_in || jobCard.timeIn || "",
    numberOfDays: Number(jobCard.number_of_days || jobCard.numberOfDays || 1),
    routeSummary: jobCard.route_summary || jobCard.routeSummary || "",
    routeItinerary: jobCard.route_itinerary || jobCard.routeItinerary || [],
    pickupLocation: jobCard.pickup_location || jobCard.pickupLocation || "",
    dropoffLocation: jobCard.dropoff_location || jobCard.dropoffLocation || "",
    reason: jobCard.reason || "",
    clientDetails:
      jobCard.client_details ||
      jobCard.clientDetails ||
      jobCard.client_info ||
      "",
    location: jobCard.location || "",
    kms: Number(jobCard.kms || jobCard.kilometers || jobCard.kilometres || 0),
    odometerOut: Number(odometerOutRaw ?? 0),
    odometerIn: Number(odometerInRaw ?? 0),
    mileage: Number(
      jobCard.mileage ||
        jobCard.mileage_km ||
        jobCard.mileageKm ||
        calculateMileage(odometerOutRaw, odometerInRaw) ||
        0,
    ),
    fuelGaugeOut: Number(fuelGaugeOutRaw ?? 0),
    fuelGaugeIn: Number(fuelGaugeInRaw ?? 0),
    approximateFuelUsed: Number(
      jobCard.approximate_fuel_used ||
        jobCard.approximateFuelUsed ||
        jobCard.fuel_used ||
        calculateApproxFuelUsed(fuelGaugeOutRaw, fuelGaugeInRaw) ||
        0,
    ),
    driverDetails:
      jobCard.driver_details || jobCard.driverDetails || jobCard.driver || "",
    driverAllowance:
      jobCard.driver_allowance ?? jobCard.driverAllowance ?? null,
    additionalDetails:
      jobCard.additional_details || jobCard.additionalDetails || "",
    status: normalizeStatusValue(
      jobCard.status ||
        jobCard.job_status ||
        jobCard.jobStatus ||
        fallbackStatus,
    ),
    guideLanguage: jobCard.guide_language || jobCard.guideLanguage || "",
    vehicleNo:
      jobCard.vehicle_no ||
      jobCard.vehicleNo ||
      jobCard?.vehicle?.vehicle_no ||
      jobCard?.vehicle?.vehicleNo ||
      "",
    vehiclePlateNo:
      jobCard.plate_no ||
      jobCard.plateNo ||
      jobCard?.vehicle?.plate_no ||
      jobCard?.vehicle?.plateNo ||
      "",
    updatedAt: jobCard.updated_at || jobCard.updatedAt || "",
    createdAt: jobCard.created_at || jobCard.createdAt || "",
  };
};

const createEmptyForm = () => ({
  leadId: "",
  vehicleId: "",
  leaseContractId: "",
  leaseAllocationId: "",
  status: "Open",
  type: "Safari",
  safariStartDate: "",
  safariEndDate: "",
  timeIn: "",
  numberOfDays: 1,
  pickupLocation: "",
  dropoffLocation: "",
  routeSummary: "",
  routeItineraryLines: [createItineraryLine()],
  additionalDetails: "",
  bookingReferenceNo: "",
  tourOperatorClientName: "",
  adults: 0,
  children: 0,
  reason: "",
  clientDetails: "",
  location: "",
  kms: "",
  odometerOut: "",
  odometerIn: "",
  mileage: "",
  fuelGaugeOut: "",
  fuelGaugeIn: "",
  approximateFuelUsed: "",
  driverDetails: "",
  driverAllowance: "",
});

const buildFormFromLead = (lead) => ({
  leadId: String(lead.id),
  vehicleId: "",
  status: "Open",
  type: "Safari",
  safariStartDate: toInputDate(lead.startDate),
  safariEndDate: toInputDate(lead.endDate),
  timeIn: "",
  numberOfDays: Math.max(
    1,
    lead.startDate && lead.endDate
      ? Math.floor(
          (new Date(lead.endDate).getTime() -
            new Date(lead.startDate).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1
      : 1,
  ),
  pickupLocation: "",
  dropoffLocation: "",
  routeSummary: lead.routeParks || "",
  routeItineraryLines: [createItineraryLine()],
  additionalDetails: lead.specialRequirements || "",
  bookingReferenceNo: lead.bookingRef || "",
  tourOperatorClientName: lead.clientCompany || "",
  adults: Number(lead.paxAdults || 0),
  children: Number(lead.paxChildren || 0),
  reason: "",
  clientDetails: "",
  location: "",
  kms: "",
  odometerOut: "",
  odometerIn: "",
  mileage: "",
  fuelGaugeOut: "",
  fuelGaugeIn: "",
  approximateFuelUsed: "",
  driverDetails: "",
  driverAllowance: "",
});

const buildFormFromJobCard = (jobCard) => ({
  leadId: String(jobCard.leadId || ""),
  vehicleId: String(jobCard.vehicleId || ""),
  leaseContractId: String(jobCard.leaseContractId || ""),
  leaseAllocationId: String(jobCard.leaseAllocationId || ""),
  status: jobCard.status || deriveJobCardStatus(jobCard),
  type: jobCard.type || "Safari",
  safariStartDate: toInputDate(jobCard.safariStartDate),
  safariEndDate: toInputDate(jobCard.safariEndDate),
  timeIn: jobCard.timeIn || "",
  numberOfDays: Number(jobCard.numberOfDays || 1),
  pickupLocation: jobCard.pickupLocation || "",
  dropoffLocation: jobCard.dropoffLocation || "",
  routeSummary: jobCard.routeSummary || "",
  routeItineraryLines: normalizeItineraryLines(jobCard.routeItinerary),
  additionalDetails: jobCard.additionalDetails || "",
  bookingReferenceNo: jobCard.bookingReferenceNo || "",
  tourOperatorClientName: jobCard.tourOperatorClientName || "",
  adults: Number(jobCard.adults || 0),
  children: Number(jobCard.children || 0),
  reason: jobCard.reason || "",
  clientDetails: jobCard.clientDetails || "",
  location: jobCard.location || "",
  kms: String(jobCard.kms || ""),
  odometerOut: String(jobCard.odometerOut || ""),
  odometerIn: String(jobCard.odometerIn || ""),
  mileage: String(jobCard.mileage || ""),
  fuelGaugeOut: String(jobCard.fuelGaugeOut || ""),
  fuelGaugeIn: String(jobCard.fuelGaugeIn || ""),
  approximateFuelUsed: String(jobCard.approximateFuelUsed || ""),
  driverDetails: jobCard.driverDetails || "",
  driverAllowance:
    jobCard.driverAllowance != null && jobCard.driverAllowance !== ""
      ? String(jobCard.driverAllowance)
      : "",
});

export default function JobCards() {
  const [leads, setLeads] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [jobCards, setJobCards] = useState([]);
  const [safariAllocations, setSafariAllocations] = useState([]);
  const [leaseContracts, setLeaseContracts] = useState([]);
  const [leaseAllocations, setLeaseAllocations] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [form, setForm] = useState(createEmptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [downloadingJobCardId, setDownloadingJobCardId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [
        jobCardsResponse,
        leadsResponse,
        quotationsResponse,
        vehiclesResponse,
        usersResponse,
        safariAllocationsResponse,
        leaseContractsResponse,
        leaseAllocationsResponse,
      ] = await Promise.all([
        apiFetch("/job-cards"),
        apiFetch("/leads"),
        apiFetch("/quotations"),
        apiFetch("/vehicles"),
        apiFetch("/users"),
        apiFetch("/safari-allocations"),
        apiFetch("/lease-contracts").catch(() => ({
          ok: true,
          json: async () => ({ contracts: [] }),
        })),
        apiFetch("/lease-allocations").catch(() => ({
          ok: true,
          json: async () => ({ allocations: [] }),
        })),
      ]);

      const [
        jobCardsPayload,
        leadsPayload,
        quotationsPayload,
        vehiclesPayload,
        usersPayload,
        safariAllocationsPayload,
        leaseContractsPayload,
        leaseAllocationsPayload,
      ] = await Promise.all([
        jobCardsResponse.json().catch(() => ({})),
        leadsResponse.json().catch(() => ({})),
        quotationsResponse.json().catch(() => ({})),
        vehiclesResponse.json().catch(() => ({})),
        usersResponse.json().catch(() => ({})),
        safariAllocationsResponse.json().catch(() => ({})),
        leaseContractsResponse.json().catch(() => ({})),
        leaseAllocationsResponse.json().catch(() => ({})),
      ]);
      if (!jobCardsResponse.ok) {
        throw new Error(
          jobCardsPayload?.message || "Unable to fetch job cards.",
        );
      }

      if (!leadsResponse.ok) {
        throw new Error(leadsPayload?.message || "Unable to fetch leads.");
      }

      if (!vehiclesResponse.ok) {
        throw new Error(
          vehiclesPayload?.message || "Unable to fetch vehicles.",
        );
      }
      if (!quotationsResponse.ok) {
        throw new Error(
          quotationsPayload?.message || "Unable to fetch quotations.",
        );
      }
      if (!usersResponse.ok) {
        throw new Error(usersPayload?.message || "Unable to fetch users.");
      }

      setJobCards(
        extractList(jobCardsPayload, "jobCards").map(normalizeJobCard),
      );
      setLeads(extractList(leadsPayload, "leads").map(normalizeLead));
      setQuotations(
        extractList(quotationsPayload, "quotations").map(normalizeQuotation),
      );
      setVehicles(
        extractList(vehiclesPayload, "vehicles").map(normalizeVehicle),
      );
      setUsers(extractList(usersPayload, "users").map(normalizeUser));
      setSafariAllocations(
        extractList(safariAllocationsPayload, "safariAllocations").map((a) => ({
          leadId: Number(a.leadId ?? a.lead_id ?? 0),
          vehicleId: Number(a.vehicleId ?? a.vehicle_id ?? 0),
          driverId: Number(a.driverId ?? a.driver_id ?? 0),
          driverName: a.driver?.name || a.driverName || "",
          vehicleNo: a.vehicle?.vehicle_no || a.vehicle?.vehicleNo || "",
          plateNo: a.vehicle?.plate_no || a.vehicle?.plateNo || "",
        })),
      );
      setLeaseContracts(
        extractList(leaseContractsPayload, "contracts").map((c) => ({
          id: Number(c.id || 0),
          clientName: c.clientName || c.client_name || "",
          leaseType: c.leaseType || c.lease_type || "",
          status: c.status || "",
          startDate: c.startDate || c.start_date || "",
          endDate: c.endDate || c.end_date || "",
          vehicleIds: Array.isArray(c.vehicleIds)
            ? c.vehicleIds.map(Number)
            : Array.isArray(c.vehicles)
              ? c.vehicles.map((v) => Number(v.id))
              : [],
          vehicles: Array.isArray(c.vehicles) ? c.vehicles : [],
        })),
      );
      setLeaseAllocations(
        extractList(leaseAllocationsPayload, "allocations").map((a) => ({
          id: Number(a.id || 0),
          leaseContractId: Number(
            a.leaseContractId ?? a.lease_contract_id ?? 0,
          ),
          vehicleId: Number(a.vehicleId ?? a.vehicle_id ?? 0),
          vehicleNo: a.vehicle?.vehicleNo || a.vehicle?.vehicle_no || "",
          plateNo: a.vehicle?.plateNo || a.vehicle?.plate_no || "",
          driverId: Number(a.driverId ?? a.driver_id ?? 0),
          driverName: a.driver?.name || "",
          startDate: a.startDate || a.start_date || "",
          endDate: a.endDate || a.end_date || "",
          itinerary: a.itinerary || "",
          itineraryItems: Array.isArray(a.itineraryItems)
            ? a.itineraryItems
            : Array.isArray(a.itinerary_items)
              ? a.itinerary_items
              : [],
          status: a.status || "",
          clientName: a.contract?.clientName || a.contract?.client_name || "",
          leaseType: a.contract?.leaseType || a.contract?.lease_type || "",
        })),
      );
    } catch (error) {
      setErrorMessage(error.message || "Failed to load job cards.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const eligibleLeads = useMemo(
    () =>
      leads.filter(
        (lead) => lead.bookingStatus === "PI Sent" || Boolean(lead.piSentAt),
      ),
    [leads],
  );

  const allocatedSafariLeadIds = useMemo(
    () =>
      new Set(
        jobCards
          .filter(
            (card) =>
              isSafariJobType(card.type) && Number(card.leadId || 0) > 0,
          )
          .map((card) => String(card.leadId)),
      ),
    [jobCards],
  );

  const availableSafariLeads = useMemo(
    () =>
      eligibleLeads.filter(
        (lead) => !allocatedSafariLeadIds.has(String(lead.id)),
      ),
    [eligibleLeads, allocatedSafariLeadIds],
  );

  const leadById = useMemo(
    () => new Map(leads.map((lead) => [String(lead.id), lead])),
    [leads],
  );

  const latestQuotationByLead = useMemo(() => {
    const map = new Map();
    quotations.forEach((quotation) => {
      if (!quotation.leadId) return;
      const key = String(quotation.leadId);
      const existing = map.get(key);
      if (!existing) {
        map.set(key, quotation);
        return;
      }

      const currentTime = new Date(quotation.quoteDate || 0).getTime();
      const existingTime = new Date(existing.quoteDate || 0).getTime();
      if (currentTime >= existingTime) {
        map.set(key, quotation);
      }
    });
    return map;
  }, [quotations]);

  const activeUsers = useMemo(
    () =>
      users.filter(
        (user) =>
          String(user.status || "")
            .toLowerCase()
            .trim() === "active",
      ),
    [users],
  );

  const driverOptions = useMemo(() => {
    const fromUsers = activeUsers.map((user) => user.name).filter(Boolean);
    const fromVehicles = vehicles
      .map((vehicle) => vehicle.assignedDriverName)
      .filter(Boolean);

    return Array.from(new Set([...fromUsers, ...fromVehicles]));
  }, [activeUsers, vehicles]);

  const selectedLeadAllocations = useMemo(() => {
    if (!form.leadId) return [];

    return safariAllocations
      .filter((allocation) => String(allocation.leadId) === String(form.leadId))
      .map((allocation) => {
        const vehicle = vehicles.find(
          (item) => Number(item.id) === Number(allocation.vehicleId),
        );
        const driverFromUser = users.find(
          (item) => Number(item.id) === Number(allocation.driverId),
        );
        const vehicleName =
          allocation.vehicleNo ||
          vehicle?.label ||
          (vehicle
            ? `${vehicle.label}`
            : `Vehicle ${allocation.vehicleId || "-"}`);

        return {
          vehicleName,
          driverName:
            allocation.driverName ||
            driverFromUser?.name ||
            vehicle?.assignedDriverName ||
            "Unassigned",
        };
      });
  }, [form.leadId, safariAllocations, vehicles, users]);

  const filteredCards = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    const fromDate = filterFromDate ? parseDateValue(filterFromDate) : null;
    const toDate = filterToDate ? parseDateValue(filterToDate) : null;

    return jobCards.filter((card) => {
      if (categoryFilter === "safari" && !isSafariJobType(card.type))
        return false;
      if (categoryFilter === "lease" && !isLeaseJobType(card.type))
        return false;
      if (
        categoryFilter === "others" &&
        (isSafariJobType(card.type) || isLeaseJobType(card.type))
      )
        return false;

      const matchesSearch =
        !query ||
        String(card.jobCardNo || "")
          .toLowerCase()
          .includes(query) ||
        String(card.bookingReferenceNo || "")
          .toLowerCase()
          .includes(query) ||
        String(card.tourOperatorClientName || "")
          .toLowerCase()
          .includes(query) ||
        String(card.type || "")
          .toLowerCase()
          .includes(query) ||
        String(leadById.get(String(card.leadId || ""))?.groupName || "")
          .toLowerCase()
          .includes(query) ||
        String(card.routeSummary || "")
          .toLowerCase()
          .includes(query);

      if (!matchesSearch) return false;

      if (!fromDate && !toDate) return true;

      const startDate = parseDateValue(card.safariStartDate);
      if (!startDate) return false;

      if (fromDate) {
        const fromStart = new Date(fromDate);
        fromStart.setHours(0, 0, 0, 0);
        if (startDate < fromStart) return false;
      }

      if (toDate) {
        const toEnd = new Date(toDate);
        toEnd.setHours(23, 59, 59, 999);
        if (startDate > toEnd) return false;
      }

      return true;
    });
  }, [
    jobCards,
    searchTerm,
    leadById,
    filterFromDate,
    filterToDate,
    categoryFilter,
  ]);

  const stats = useMemo(() => {
    const safariCards = filteredCards.filter((card) =>
      isSafariJobType(card.type),
    );
    const operationsCards = filteredCards.length - safariCards.length;

    return {
      totalCards: filteredCards.length,
      safariCards: safariCards.length,
      operationsCards,
    };
  }, [filteredCards]);

  const setField = (field, value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const isSafariType = isSafariJobType(form.type);
  const isLeaseType = isLeaseJobType(form.type);
  const requiresVehicleRunSection = !isSafariType && !isLeaseType;
  const requiresClientVisitSection = !isSafariType && !isLeaseType;
  const requiresReasonSection = form.type === "Others";
  const isCreateMode = modalMode === "create";
  const isCloseMode = modalMode === "close";
  const derivedStatus = deriveJobCardStatus(form);
  const calculatedMileage = calculateMileage(form.odometerOut, form.odometerIn);
  const routeSummaryLabel = isSafariType
    ? "Itinerary / Route Plan"
    : "Destination / Route";
  const routeSummaryPlaceholder = isSafariType
    ? "Example: Arusha -> Tarangire -> Ngorongoro -> Serengeti"
    : "Example: Service center in Arusha / Client site visit";

  const selectableVehicles = useMemo(
    () =>
      vehicles.filter(
        (vehicle) =>
          vehicle.status !== "On Lease" ||
          String(vehicle.id) === String(form.vehicleId),
      ),
    [vehicles, form.vehicleId],
  );

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setForm(createEmptyForm());
    setIsModalOpen(true);
  };

  const openClose = (jobCard) => {
    setModalMode("close");
    setEditingId(jobCard.id);
    setForm(buildFormFromJobCard(jobCard));
    setIsModalOpen(true);
  };

  const onSelectLead = (leadIdValue) => {
    const lead = availableSafariLeads.find(
      (item) => String(item.id) === leadIdValue,
    );
    if (!lead) {
      setField("leadId", leadIdValue);
      return;
    }
    const allocation = safariAllocations.find(
      (a) => String(a.leadId) === String(lead.id),
    );
    const latestQuotation = latestQuotationByLead.get(String(lead.id));
    const itineraryLines = normalizeItineraryLines(
      latestQuotation?.daySections,
    );
    setForm({
      ...buildFormFromLead(lead),
      vehicleId: allocation ? String(allocation.vehicleId) : "",
      routeItineraryLines: itineraryLines,
    });
  };

  const onSelectNonSafariVehicle = (vehicleIdValue) => {
    const selectedVehicle = vehicles.find(
      (vehicle) => String(vehicle.id) === String(vehicleIdValue),
    );
    const defaultDriver = selectedVehicle?.assignedDriverName || "";

    setForm((current) => ({
      ...current,
      vehicleId: vehicleIdValue,
      driverDetails: defaultDriver || current.driverDetails || "",
    }));
  };

  const sumLineAllowances = (lines) => {
    if (!Array.isArray(lines)) return 0;
    return lines.reduce((acc, line) => {
      const value = String(line?.allowancePerDay ?? "").trim();
      if (value === "") return acc;
      const num = Number(value);
      return Number.isFinite(num) ? acc + num : acc;
    }, 0);
  };

  const addItineraryLine = () => {
    setForm((current) => ({
      ...current,
      routeItineraryLines: [
        ...(current.routeItineraryLines || []),
        createItineraryLine(),
      ],
    }));
  };

  const removeItineraryLine = (indexToRemove) => {
    setForm((current) => {
      const nextLines = (current.routeItineraryLines || []).filter(
        (_, index) => index !== indexToRemove,
      );
      const finalLines =
        nextLines.length > 0 ? nextLines : [createItineraryLine()];
      const total = sumLineAllowances(finalLines);

      return {
        ...current,
        routeItineraryLines: finalLines,
        driverAllowance: total > 0 ? String(total) : current.driverAllowance,
      };
    });
  };

  const updateItineraryLine = (indexToUpdate, field, value) => {
    setForm((current) => {
      const nextLines = (current.routeItineraryLines || []).map(
        (line, index) =>
          index === indexToUpdate ? { ...line, [field]: value } : line,
      );
      const next = { ...current, routeItineraryLines: nextLines };
      if (field === "allowancePerDay") {
        const total = sumLineAllowances(nextLines);
        next.driverAllowance = total > 0 ? String(total) : "";
      }
      return next;
    });
  };

  const handleTypeChange = (nextType) => {
    setForm((prev) => {
      if (isSafariJobType(nextType)) {
        return {
          ...prev,
          type: nextType,
          leaseContractId: "",
          leaseAllocationId: "",
        };
      }

      if (isLeaseJobType(nextType)) {
        return {
          ...prev,
          type: nextType,
          leadId: "",
          vehicleId: "",
          leaseContractId: "",
          leaseAllocationId: "",
          bookingReferenceNo: "",
          adults: 0,
          children: 0,
          pickupLocation: "",
          dropoffLocation: "",
          routeItineraryLines: [createItineraryLine()],
        };
      }

      // Non-safari, non-lease job cards do not depend on PI-sent leads.
      return {
        ...prev,
        type: nextType,
        leadId: "",
        leaseContractId: "",
        leaseAllocationId: "",
        vehicleId: prev.vehicleId || "",
        safariStartDate: "",
        safariEndDate: "",
        bookingReferenceNo: "",
        tourOperatorClientName: "",
        adults: 0,
        children: 0,
        numberOfDays: "",
        pickupLocation: "",
        dropoffLocation: "",
        routeItineraryLines: [createItineraryLine()],
      };
    });
  };

  const onSelectLeaseContract = (contractIdValue) => {
    const contract = leaseContracts.find(
      (item) => String(item.id) === String(contractIdValue),
    );
    if (!contract) {
      setField("leaseContractId", contractIdValue);
      return;
    }
    setForm((prev) => ({
      ...prev,
      leaseContractId: String(contract.id),
      tourOperatorClientName:
        contract.clientName || prev.tourOperatorClientName,
      safariStartDate: toInputDate(contract.startDate) || prev.safariStartDate,
      safariEndDate: toInputDate(contract.endDate) || prev.safariEndDate,
      vehicleId: contract.vehicleIds[0]
        ? String(contract.vehicleIds[0])
        : prev.vehicleId,
    }));
  };

  const onSelectLeaseAllocation = (allocationIdValue) => {
    const allocation = leaseAllocations.find(
      (item) => String(item.id) === String(allocationIdValue),
    );
    if (!allocation) {
      setField("leaseAllocationId", allocationIdValue);
      return;
    }
    setForm((prev) => {
      const allocationItineraryLines =
        Array.isArray(allocation.itineraryItems) &&
        allocation.itineraryItems.length > 0
          ? allocation.itineraryItems.map((it) =>
              createItineraryLine(
                it?.date ? formatDate(it.date) : "",
                it?.details || it?.dayDescription || "",
                "",
              ),
            )
          : null;

      const currentLinesEmpty =
        !Array.isArray(prev.routeItineraryLines) ||
        prev.routeItineraryLines.length === 0 ||
        prev.routeItineraryLines.every(
          (l) => !l.date && !l.dayDescription && !l.allowancePerDay,
        );

      return {
        ...prev,
        leaseAllocationId: String(allocation.id),
        leaseContractId: allocation.leaseContractId
          ? String(allocation.leaseContractId)
          : prev.leaseContractId,
        vehicleId: allocation.vehicleId
          ? String(allocation.vehicleId)
          : prev.vehicleId,
        tourOperatorClientName:
          allocation.clientName || prev.tourOperatorClientName,
        safariStartDate:
          toInputDate(allocation.startDate) || prev.safariStartDate,
        safariEndDate: toInputDate(allocation.endDate) || prev.safariEndDate,
        driverDetails: allocation.driverName || prev.driverDetails,
        routeItineraryLines:
          allocationItineraryLines && currentLinesEmpty
            ? allocationItineraryLines
            : prev.routeItineraryLines,
      };
    });
  };

  const openEdit = async (jobCard) => {
    setErrorMessage("");
    try {
      const response = await apiFetch(`/job-cards/${jobCard.id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to fetch job card.");
      }
      const selected = normalizeJobCard(extractSingle(payload, "jobCard"));
      setModalMode("edit");
      setEditingId(selected.id);
      setForm(buildFormFromJobCard(selected));
      setIsModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Unable to open job card details.");
      await Swal.fire({
        title: "Load Failed",
        text: error.message || "Unable to open job card details.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const openView = async (jobCard) => {
    setErrorMessage("");
    try {
      const response = await apiFetch(`/job-cards/${jobCard.id}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to fetch job card details.",
        );
      }

      const selected = normalizeJobCard(extractSingle(payload, "jobCard"));
      setSelectedJobCard(selected);
      setIsViewModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Unable to open job card details.");
      await Swal.fire({
        title: "Load Failed",
        text: error.message || "Unable to open job card details.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const detailValue = (value) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? trimmed : "-";
    }
    return String(value);
  };

  const routeItineraryLines = useMemo(() => {
    const itinerary = selectedJobCard?.routeItinerary;
    if (Array.isArray(itinerary) && itinerary.length > 0) {
      return itinerary
        .map((item) => {
          if (typeof item === "string") {
            const trimmed = item.trim();
            return trimmed ? { date: "", dayDescription: trimmed } : null;
          }
          if (item && typeof item === "object") {
            const date = String(
              item.date || item.dayDate || item.dayTitle || "",
            ).trim();
            const dayDescription = String(
              item.dayDescription ||
                item.dateDescription ||
                item.label ||
                item.name ||
                item.place ||
                item.park ||
                item.location ||
                "",
            ).trim();
            if (!date && !dayDescription) return null;
            return { date: date ? formatDate(date) : "", dayDescription };
          }
          return { date: "", dayDescription: String(item) };
        })
        .filter(Boolean);
    }

    return [];
  }, [selectedJobCard]);

  const handleDelete = async (id) => {
    const confirmation = await Swal.fire({
      title: "Delete job card?",
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
      const response = await apiFetch(`/job-cards/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Unable to delete job card.");
      }

      setJobCards((current) => current.filter((card) => card.id !== id));
      await Swal.fire({
        title: "Deleted",
        text: "Job card deleted successfully.",
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to delete job card.");
      await Swal.fire({
        title: "Delete Failed",
        text: error.message || "Failed to delete job card.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    }
  };

  const handleDownloadPdf = async (jobCard) => {
    setDownloadingJobCardId(jobCard.id);
    try {
      const response = await apiFetch(`/job-cards/${jobCard.id}/pdf`);
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Unable to generate PDF.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${jobCard.jobCardNo || `job-card-${jobCard.id}`}.pdf`;
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
      setDownloadingJobCardId(null);
    }
  };

  const handleSave = async () => {
    if (isSafariType && !form.leadId) {
      setErrorMessage("Please select a PI-issued lead.");
      await Swal.fire({
        title: "Missing Lead",
        text: "Please select a lead with PI Sent before saving.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (isLeaseType && !form.leaseAllocationId) {
      setErrorMessage("Please select a Lease Allocation.");
      await Swal.fire({
        title: "Missing Lease Allocation",
        text: "Please select a Lease Allocation for Long Term Lease job cards.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (!isSafariType && !form.vehicleId) {
      setErrorMessage("Please select a vehicle.");
      await Swal.fire({
        title: "Missing Vehicle",
        text: "Please select a vehicle for this job card type.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (!isSafariType && String(form.driverDetails || "").trim() === "") {
      setErrorMessage("Please select a driver.");
      await Swal.fire({
        title: "Missing Driver",
        text: "Please select a driver for this non-safari movement.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    const shouldAutoCloseOnUpdate =
      Boolean(editingId) && hasCapturedSafariDateRange(form);
    const selectedStatus = isCreateMode
      ? "Open"
      : isCloseMode
        ? "Closed"
        : shouldAutoCloseOnUpdate
          ? "Closed"
          : form.status || derivedStatus;
    const calculatedNumberOfDays =
      isSafariType && hasCapturedSafariDateRange(form)
        ? getNumberOfDaysBetween(form.safariStartDate, form.safariEndDate)
        : Number(form.numberOfDays || 1);
    if (
      requiresVehicleRunSection &&
      String(form.odometerOut || "").trim() === ""
    ) {
      setErrorMessage("Please enter mileage out (odometer out).");
      await Swal.fire({
        title: "Missing Mileage Out",
        text: "Please capture Odometer Out when the vehicle is going out.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (
      requiresVehicleRunSection &&
      String(form.routeSummary || "").trim() === ""
    ) {
      setErrorMessage("Please enter destination / route for this movement.");
      await Swal.fire({
        title: "Missing Destination",
        text: "Please capture where the vehicle is going.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (isCloseMode && String(form.safariEndDate || "").trim() === "") {
      setErrorMessage(
        "Please capture Itinerary End Date when closing the job card.",
      );
      await Swal.fire({
        title: "Missing Itinerary End Date",
        text: "Please capture Itinerary End Date as part of closing the job card.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (isCloseMode && String(form.timeIn || "").trim() === "") {
      setErrorMessage("Please capture Time In when closing the job card.");
      await Swal.fire({
        title: "Missing Time In",
        text: "Please capture Time In as part of closing the job card.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    if (
      requiresVehicleRunSection &&
      selectedStatus === "Closed" &&
      String(form.odometerIn || "").trim() === ""
    ) {
      setErrorMessage("Please enter mileage in (odometer in) before closing.");
      await Swal.fire({
        title: "Missing Mileage In",
        text: "Please capture Odometer In when the vehicle returns.",
        icon: "warning",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      // When closing, only send the return/closing fields so creation data is never overwritten.
      const payload = isCloseMode
        ? {
            status: "Closed",
            safariEndDate: form.safariEndDate || null,
            safari_end_date: form.safariEndDate || null,
            timeIn: form.timeIn || null,
            odometerIn:
              requiresVehicleRunSection &&
              String(form.odometerIn || "").trim() !== ""
                ? Number(form.odometerIn)
                : null,
            mileage:
              requiresVehicleRunSection && calculatedMileage !== ""
                ? Number(calculatedMileage)
                : null,
          }
        : {
            leadId: isSafariType ? Number(form.leadId) : null,
            vehicleId: form.vehicleId ? Number(form.vehicleId) : null,
            leaseContractId: isLeaseType ? Number(form.leaseContractId) : null,
            leaseAllocationId: isLeaseType
              ? Number(form.leaseAllocationId)
              : null,
            status: selectedStatus,
            type: form.type || "Safari",
            safariStartDate: form.safariStartDate || null,
            safari_start_date: form.safariStartDate || null,
            timeOut: null,
            numberOfDays: isSafariType ? calculatedNumberOfDays : null,
            pickupLocation: isSafariType ? form.pickupLocation || null : null,
            dropoffLocation: isSafariType ? form.dropoffLocation || null : null,
            routeSummary: form.routeSummary || null,
            routeItinerary:
              isSafariType || isLeaseType
                ? itineraryLinesToPayload(form.routeItineraryLines)
                : [],
            additionalDetails: form.additionalDetails || null,
            bookingReferenceNo: isSafariType
              ? form.bookingReferenceNo || undefined
              : null,
            tourOperatorClientName: isSafariType
              ? form.tourOperatorClientName || undefined
              : null,
            contactPerson: null,
            contactNumber: null,
            contactEmail: null,
            adults: isSafariType ? Number(form.adults || 0) : null,
            children: isSafariType ? Number(form.children || 0) : null,
            nationality: null,
            reason: requiresReasonSection ? form.reason || null : null,
            clientDetails: requiresClientVisitSection
              ? form.clientDetails || null
              : null,
            location: requiresClientVisitSection ? form.location || null : null,
            kms: requiresClientVisitSection ? Number(form.kms || 0) : null,
            odometerOut: requiresVehicleRunSection
              ? String(form.odometerOut || "").trim() === ""
                ? null
                : Number(form.odometerOut)
              : null,
            driverDetails: requiresVehicleRunSection
              ? form.driverDetails || null
              : null,
            driverAllowance:
              isSafariType || isLeaseType
                ? String(form.driverAllowance || "").trim() === ""
                  ? null
                  : Number(form.driverAllowance)
                : null,
          };

      const response = editingId
        ? await apiFetch(`/job-cards/${editingId}`, {
            method: "PUT",
            body: payload,
          })
        : await apiFetch("/job-cards", {
            method: "POST",
            body: payload,
          });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.message || "Unable to save job card.");
      }

      const saved = normalizeJobCard(extractSingle(data, "jobCard"));
      setJobCards((current) => {
        if (editingId) {
          return current.map((item) => {
            if (item.id !== editingId) return item;

            return {
              ...item,
              ...saved,
              // Some update responses are partial; keep existing dates when not returned.
              safariStartDate: saved.safariStartDate || item.safariStartDate,
              safariEndDate: saved.safariEndDate || item.safariEndDate,
            };
          });
        }
        return [saved, ...current];
      });

      setIsModalOpen(false);
      setEditingId(null);
      setForm(createEmptyForm());

      await Swal.fire({
        title: isCloseMode ? "Closed" : editingId ? "Updated" : "Created",
        text: isCloseMode
          ? "Job card closed successfully."
          : editingId
            ? "Job card updated successfully."
            : "Job card created successfully.",
        icon: "success",
        timer: 1700,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } catch (error) {
      setErrorMessage(error.message || "Failed to save job card.");
      await Swal.fire({
        title: "Save Failed",
        text: error.message || "Failed to save job card.",
        icon: "error",
        background: "#0f172a",
        color: "#e2e8f0",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Job Cards</h1>
          <p className="text-slate-500 mt-1">
            Two flows: Safari job cards for itinerary movement, and Operations
            job cards for test drive/service/viewing with odometer tracking.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-xl font-medium text-sm hover:opacity-90 transition-opacity shadow-lg shadow-amber-500/25"
        >
          <Plus className="w-4 h-4" />
          New Job Card
        </button>
      </div>

      {errorMessage && !isModalOpen && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Job Cards
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {stats.totalCards}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Safari / Operations
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1 flex items-baseline gap-2">
            <span>{stats.safariCards}</span>
            <span className="text-sm font-medium text-amber-600">/</span>
            <span>{stats.operationsCards}</span>
          </p>
          <p className="text-xs text-amber-700/80 mt-1">
            Safari cards / Operations cards
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            {[
              { key: "all", label: "All" },
              { key: "safari", label: "Safari" },
              { key: "lease", label: "Long Term Lease" },
              { key: "others", label: "Others" },
            ].map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCategoryFilter(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  categoryFilter === tab.key
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 focus-within:border-amber-400 transition-colors">
            <Search className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by booking ref, group name, company, type, route"
              className="w-full bg-transparent text-sm text-slate-900 placeholder-slate-400 outline-none"
            />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                From Date
              </label>
              <input
                type="date"
                value={filterFromDate}
                onChange={(event) => setFilterFromDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none [color-scheme:light] focus:border-amber-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                To Date
              </label>
              <input
                type="date"
                value={filterToDate}
                min={filterFromDate || undefined}
                onChange={(event) => setFilterToDate(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none [color-scheme:light] focus:border-amber-500"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => {
                  setFilterFromDate("");
                  setFilterToDate("");
                }}
                className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
              >
                Clear Date Filter
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Actions
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Type
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Job Card No
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Status
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Booking Ref
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Group Name
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Client / Contact
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Dates
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Itinerary / Destination
                </th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                  Driver Allowance
                </th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                  Created At
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    Loading job cards...
                  </td>
                </tr>
              ) : filteredCards.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-8 text-center text-slate-400 text-sm"
                  >
                    No job cards found. Create one from a PI-issued lead.
                  </td>
                </tr>
              ) : (
                filteredCards.map((card) => (
                  <tr
                    key={card.id}
                    className="border-b border-slate-200 hover:bg-amber-50/70 transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadPdf(card)}
                          disabled={downloadingJobCardId === card.id}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title={
                            downloadingJobCardId === card.id
                              ? "Downloading..."
                              : "Download PDF"
                          }
                        >
                          {downloadingJobCardId === card.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openView(card)}
                          className="p-2 text-slate-500 hover:text-cyan-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openEdit(card)}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        {(card.status || "Open") !== "Closed" && (
                          <button
                            onClick={() => openClose(card)}
                            className="px-2.5 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors"
                            title="Close Job Card"
                          >
                            Close
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(card.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-700 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          isSafariJobType(card.type)
                            ? "text-cyan-700 border-cyan-200 bg-cyan-50"
                            : isLeaseJobType(card.type)
                              ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                              : "text-violet-700 border-violet-200 bg-violet-50"
                        }`}
                      >
                        {isSafariJobType(card.type)
                          ? "Safari Job Card"
                          : isLeaseJobType(card.type)
                            ? "Long Term Lease"
                            : card.type || "Operations"}
                      </span>
                    </td>
                    <td className="py-3 px-3 min-w-[160px]">
                      <div className="flex items-center gap-2 text-slate-900 text-sm font-semibold">
                        <ClipboardList className="w-4 h-4 text-amber-500" />
                        {card.jobCardNo}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                          (card.status || "Open") === "Closed"
                            ? "text-emerald-700 border-emerald-200 bg-emerald-50"
                            : "text-amber-700 border-amber-200 bg-amber-50"
                        }`}
                      >
                        {card.status || "Open"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-700 font-medium">
                      {card.bookingReferenceNo}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-700 font-medium">
                      {leadById.get(String(card.leadId || ""))?.groupName ||
                        "-"}
                    </td>
                    <td className="py-3 px-3 min-w-[220px]">
                      <div className="flex items-center gap-2 text-slate-900 text-sm font-semibold">
                        <User className="w-4 h-4 text-amber-500" />
                        {card.tourOperatorClientName}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-800 min-w-[170px]">
                      <div className="flex items-start gap-2">
                        <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <div className="font-medium">
                            Itinerary Start: {formatDate(card.safariStartDate)}
                          </div>
                          <div className="text-xs text-slate-600">
                            Itinerary End: {formatDate(card.safariEndDate)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-700">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                        <span>{card.routeSummary || "-"}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-right text-slate-800 whitespace-nowrap">
                      {(isSafariJobType(card.type) ||
                        isLeaseJobType(card.type)) &&
                      card.driverAllowance != null &&
                      card.driverAllowance !== ""
                        ? Number(card.driverAllowance).toLocaleString(
                            undefined,
                            { maximumFractionDigits: 2 },
                          )
                        : "-"}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-700">
                      {formatDateTime(card.createdAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (isSaving) return;
              setIsModalOpen(false);
            }}
          />

          <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">
                {isCloseMode
                  ? "Close Job Card"
                  : editingId
                    ? "Edit Job Card"
                    : "Create Job Card"}
              </h2>
              <button
                onClick={() => {
                  if (isSaving) return;
                  setIsModalOpen(false);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm">
                  {errorMessage}
                </div>
              )}

              {isCloseMode && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide mb-2">
                    Job Card Details (Read-Only)
                  </p>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                    <div>
                      <span className="text-slate-400">Type:</span>{" "}
                      <span className="text-slate-200">{form.type}</span>
                    </div>
                    {isSafariType && form.tourOperatorClientName && (
                      <div>
                        <span className="text-slate-400">Client:</span>{" "}
                        <span className="text-slate-200">
                          {form.tourOperatorClientName}
                        </span>
                      </div>
                    )}
                    {isSafariType && form.bookingReferenceNo && (
                      <div>
                        <span className="text-slate-400">Booking Ref:</span>{" "}
                        <span className="text-slate-200">
                          {form.bookingReferenceNo}
                        </span>
                      </div>
                    )}
                    {form.safariStartDate && (
                      <div>
                        <span className="text-slate-400">
                          Itinerary Start Date:
                        </span>{" "}
                        <span className="text-slate-200">
                          {formatDate(form.safariStartDate)}
                        </span>
                      </div>
                    )}
                    {form.safariEndDate && (
                      <div>
                        <span className="text-slate-400">
                          Itinerary End Date:
                        </span>{" "}
                        <span className="text-slate-200">
                          {formatDate(form.safariEndDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Type
                    </label>
                    <select
                      value={form.type}
                      onChange={(event) => handleTypeChange(event.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    >
                      {JOB_CARD_TYPES.map((typeOption) => (
                        <option key={typeOption} value={typeOption}>
                          {typeOption}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!isCloseMode && (
                  <div className="md:col-span-2 rounded-xl border border-slate-700 bg-slate-800/40 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300">
                      {isSafariType
                        ? "Safari Mode"
                        : isLeaseType
                          ? "Long Term Lease Mode"
                          : "Operations Mode"}
                    </p>
                    <p className="text-xs text-slate-300 mt-1">
                      {isSafariType
                        ? "Focus on itinerary and schedule. Odometer and fuel are not required."
                        : isLeaseType
                          ? "Linked to a Lease Allocation. Vehicle, dates and itinerary are inherited from the allocation."
                          : "Focus on vehicle movement tracking with destination and odometer out/in."}
                    </p>
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Lead (PI Sent) *
                    </label>
                    <select
                      value={form.leadId}
                      onChange={(event) => onSelectLead(event.target.value)}
                      disabled={isSaving || Boolean(editingId)}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    >
                      <option value="">Select lead</option>
                      {availableSafariLeads.map((lead) => (
                        <option key={lead.id} value={lead.id}>
                          {lead.bookingRef} -{" "}
                          {lead.groupName || lead.clientCompany}
                        </option>
                      ))}
                    </select>
                    {!editingId && availableSafariLeads.length === 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        All PI-sent safari leads already have job cards.
                      </p>
                    )}
                    {editingId && (
                      <p className="text-xs text-slate-500 mt-1">
                        Lead cannot be changed while editing.
                      </p>
                    )}
                  </div>
                )}

                {isLeaseType && !isCloseMode && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Lease Allocation <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.leaseAllocationId}
                      onChange={(event) =>
                        onSelectLeaseAllocation(event.target.value)
                      }
                      disabled={isSaving || Boolean(editingId)}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    >
                      <option value="">Select lease allocation</option>
                      {leaseAllocations.map((allocation) => {
                        const vehicleLabel = [
                          allocation.vehicleNo,
                          allocation.plateNo,
                        ]
                          .filter(Boolean)
                          .join(" / ");
                        const dateLabel = [
                          allocation.startDate,
                          allocation.endDate,
                        ]
                          .filter(Boolean)
                          .join(" → ");
                        return (
                          <option key={allocation.id} value={allocation.id}>
                            #{allocation.id} -{" "}
                            {allocation.clientName || "Client"}
                            {vehicleLabel ? ` - ${vehicleLabel}` : ""}
                            {dateLabel ? ` (${dateLabel})` : ""}
                          </option>
                        );
                      })}
                    </select>
                    {leaseAllocations.length === 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        No lease allocations available. Create one from the
                        Lease Allocations page first.
                      </p>
                    )}
                    {editingId && (
                      <p className="text-xs text-slate-500 mt-1">
                        Lease allocation cannot be changed while editing.
                      </p>
                    )}
                  </div>
                )}

                {isLeaseType && !isCloseMode && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Allocation Details
                    </label>
                    <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-3 space-y-2">
                      {(() => {
                        if (!form.leaseAllocationId) {
                          return (
                            <p className="text-xs text-slate-400">
                              Select a Lease Allocation above to view its
                              details.
                            </p>
                          );
                        }
                        const allocation = leaseAllocations.find(
                          (item) =>
                            String(item.id) === String(form.leaseAllocationId),
                        );
                        if (!allocation) {
                          return (
                            <p className="text-xs text-slate-400">
                              Allocation not found.
                            </p>
                          );
                        }
                        const vehicleLabel = [
                          allocation.vehicleNo,
                          allocation.plateNo,
                        ]
                          .filter(Boolean)
                          .join(" / ");
                        return (
                          <div className="space-y-2 text-sm text-white">
                            <div className="flex flex-wrap items-center gap-x-3">
                              <span className="text-xs uppercase tracking-wide text-amber-300">
                                Vehicle
                              </span>
                              <span className="font-semibold text-white">
                                {vehicleLabel || "-"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3">
                              <span className="text-xs uppercase tracking-wide text-amber-300">
                                Driver
                              </span>
                              <span className="font-semibold text-white">
                                {allocation.driverName || "-"}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3">
                              <span className="text-xs uppercase tracking-wide text-amber-300">
                                Period
                              </span>
                              <span className="font-semibold text-white">
                                {allocation.startDate || "-"} &rarr;{" "}
                                {allocation.endDate || "-"}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Vehicles Allocated To This Safari
                    </label>
                    <div className="rounded-xl border border-slate-700 bg-slate-800/40 px-3 py-3 space-y-2">
                      {selectedLeadAllocations.length === 0 ? (
                        <p className="text-xs text-slate-400">
                          No allocations found for this safari lead yet.
                        </p>
                      ) : (
                        selectedLeadAllocations.map((item, index) => (
                          <div
                            key={`${item.vehicleName}-${item.driverName}-${index}`}
                            className="flex items-start justify-between gap-3 border border-slate-700/60 bg-slate-900/40 rounded-lg px-3 py-2"
                          >
                            <div className="text-sm text-slate-200">
                              <span className="font-semibold">
                                {item.vehicleName}
                              </span>
                            </div>
                            <div className="text-xs text-slate-300">
                              Driver: {item.driverName}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {(isSafariType || isLeaseType) && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Driver Allowance{" "}
                      <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      value={form.driverAllowance ?? ""}
                      onChange={(event) =>
                        setField("driverAllowance", event.target.value)
                      }
                      placeholder="e.g. 50000"
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Auto-calculated as the sum of Allowance/day across all
                      itinerary line items. You may override this value.
                    </p>
                  </div>
                )}

                {isCreateMode ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Status
                    </label>
                    <div className="w-full rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2.5 text-sm font-medium text-emerald-300">
                      Open
                    </div>
                  </div>
                ) : isCloseMode ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Status
                    </label>
                    <div className="w-full rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2.5 text-sm font-medium text-red-300">
                      Closed
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Status
                    </label>
                    <select
                      value={form.status || derivedStatus}
                      onChange={(event) =>
                        setField("status", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </div>
                )}

                {!isSafariType && !isLeaseType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Vehicle <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.vehicleId}
                      onChange={(event) =>
                        onSelectNonSafariVehicle(event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    >
                      <option value="">Select vehicle</option>
                      {selectableVehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {!isSafariType && !isLeaseType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Driver <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={form.driverDetails}
                      onChange={(event) =>
                        setField("driverDetails", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    >
                      <option value="">Select driver</option>
                      {form.driverDetails &&
                        !driverOptions.includes(form.driverDetails) && (
                          <option value={form.driverDetails}>
                            {form.driverDetails}
                          </option>
                        )}
                      {driverOptions.map((driverName) => (
                        <option key={driverName} value={driverName}>
                          {driverName}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Assigned driver is prefilled when a vehicle has one, but
                      you can change it.
                    </p>
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Itinerary Start Date
                    </label>
                    <input
                      type="date"
                      value={form.safariStartDate}
                      onChange={(event) =>
                        setField("safariStartDate", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Itinerary End Date
                    </label>
                    <input
                      type="date"
                      value={form.safariEndDate}
                      onChange={(event) =>
                        setField("safariEndDate", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Itinerary End Date
                    </label>
                    <input
                      type="date"
                      value={form.safariEndDate}
                      onChange={(event) =>
                        setField("safariEndDate", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Time In
                    </label>
                    <input
                      type="time"
                      value={form.timeIn}
                      onChange={(event) =>
                        setField("timeIn", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Number of Days
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={form.numberOfDays}
                      onChange={(event) =>
                        setField("numberOfDays", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Booking Reference
                    </label>
                    <input
                      value={form.bookingReferenceNo}
                      onChange={(event) =>
                        setField("bookingReferenceNo", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Client Name
                    </label>
                    <input
                      value={form.tourOperatorClientName}
                      onChange={(event) =>
                        setField("tourOperatorClientName", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Adults
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.adults}
                      onChange={(event) =>
                        setField("adults", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Children
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.children}
                      onChange={(event) =>
                        setField("children", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Pickup Location
                    </label>
                    <input
                      value={form.pickupLocation}
                      onChange={(event) =>
                        setField("pickupLocation", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}

                {isSafariType && !isCloseMode && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Dropoff Location
                    </label>
                    <input
                      value={form.dropoffLocation}
                      onChange={(event) =>
                        setField("dropoffLocation", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                )}
              </div>

              {requiresReasonSection && !isCloseMode && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    Reason
                  </label>
                  <textarea
                    rows={2}
                    value={form.reason}
                    onChange={(event) => setField("reason", event.target.value)}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>
              )}

              {requiresClientVisitSection && !isCloseMode && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Client Details
                    </label>
                    <input
                      value={form.clientDetails}
                      onChange={(event) =>
                        setField("clientDetails", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Destination / Where Vehicle Is Going
                    </label>
                    <input
                      value={form.location}
                      onChange={(event) =>
                        setField("location", event.target.value)
                      }
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      KMs
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={form.kms}
                      onChange={(event) => setField("kms", event.target.value)}
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                </div>
              )}

              {requiresVehicleRunSection && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {!isCloseMode && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Mileage Out (Odometer Out)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.odometerOut}
                        onChange={(event) =>
                          setField("odometerOut", event.target.value)
                        }
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                      />
                    </div>
                  )}
                  {!isCreateMode && (
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        Mileage In (Odometer In)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={form.odometerIn}
                        onChange={(event) =>
                          setField("odometerIn", event.target.value)
                        }
                        className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Mileage (Auto)
                    </label>
                    <input
                      readOnly
                      value={calculatedMileage === "" ? "" : calculatedMileage}
                      className="w-full bg-slate-800/40 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-300 outline-none"
                    />
                  </div>
                </div>
              )}

              {!isCloseMode && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {routeSummaryLabel}
                  </label>
                  <textarea
                    rows={2}
                    value={form.routeSummary}
                    onChange={(event) =>
                      setField("routeSummary", event.target.value)
                    }
                    placeholder={routeSummaryPlaceholder}
                    className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                  />
                </div>
              )}

              {(isSafariType || isLeaseType) && !isCloseMode && (
                <div>
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Itinerary (Line Items)
                    </label>
                    <button
                      type="button"
                      onClick={addItineraryLine}
                      className="inline-flex items-center justify-center min-w-[88px] px-3 py-1.5 text-xs font-semibold text-white border border-amber-400/80 bg-amber-600 rounded-lg hover:bg-amber-500 shadow-sm shadow-amber-900/30"
                    >
                      Add Line
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(form.routeItineraryLines || []).map((line, index) => (
                      <div
                        key={`itinerary-line-${index}`}
                        className="grid grid-cols-1 md:grid-cols-[150px_1fr_140px_auto] gap-2"
                      >
                        <input
                          value={line.date}
                          onChange={(event) =>
                            updateItineraryLine(
                              index,
                              "date",
                              event.target.value,
                            )
                          }
                          placeholder="dd/mm/yyyy"
                          className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                        />
                        <input
                          value={line.dayDescription}
                          onChange={(event) =>
                            updateItineraryLine(
                              index,
                              "dayDescription",
                              event.target.value,
                            )
                          }
                          placeholder="Day description"
                          className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                        />
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          inputMode="decimal"
                          value={line.allowancePerDay ?? ""}
                          onChange={(event) =>
                            updateItineraryLine(
                              index,
                              "allowancePerDay",
                              event.target.value,
                            )
                          }
                          placeholder="Allowance/day"
                          className="bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                        />
                        <button
                          type="button"
                          onClick={() => removeItineraryLine(index)}
                          className="inline-flex items-center justify-center min-w-[88px] px-3 py-2 text-xs font-semibold text-white border border-rose-400/80 bg-rose-600 rounded-lg hover:bg-rose-500 shadow-sm shadow-rose-900/30"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Enter date as dd/mm/yyyy and description for each line item.
                    Allowance per day is summed automatically into Driver
                    Allowance.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Additional Details
                </label>
                <textarea
                  rows={3}
                  value={form.additionalDetails}
                  onChange={(event) =>
                    setField("additionalDetails", event.target.value)
                  }
                  className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
              <button
                onClick={() => {
                  if (isSaving) return;
                  setIsModalOpen(false);
                }}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2.5 bg-gradient-to-r from-amber-400 to-amber-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-70"
              >
                {isSaving
                  ? "Saving..."
                  : isCloseMode
                    ? "Close Job Card"
                    : editingId
                      ? "Update Job Card"
                      : "Create Job Card"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isViewModalOpen && selectedJobCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              setIsViewModalOpen(false);
              setSelectedJobCard(null);
            }}
          />

          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900">
              <h2 className="text-lg font-semibold text-white">
                Job Card Details - {detailValue(selectedJobCard.jobCardNo)}
              </h2>
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedJobCard(null);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6 text-sm">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase">Type</p>
                  <p className="text-white mt-1">
                    {detailValue(selectedJobCard.type)}
                  </p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase">Status</p>
                  <p className="text-white mt-1">
                    {detailValue(selectedJobCard.status)}
                  </p>
                </div>
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs uppercase">
                    Booking Ref
                  </p>
                  <p className="text-white mt-1">
                    {detailValue(selectedJobCard.bookingReferenceNo)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-2">
                  <p className="text-slate-300 font-semibold">Schedule</p>
                  <p className="text-slate-300">
                    Itinerary Start Date:{" "}
                    <span className="text-white">
                      {formatDate(selectedJobCard.safariStartDate)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Itinerary End Date:{" "}
                    <span className="text-white">
                      {formatDate(selectedJobCard.safariEndDate)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Time In:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.timeIn)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Number of Days:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.numberOfDays)}
                    </span>
                  </p>
                </div>

                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-2">
                  <p className="text-slate-300 font-semibold">Client</p>
                  <p className="text-slate-300">
                    Client Name:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.tourOperatorClientName)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-2">
                  <p className="text-slate-300 font-semibold">
                    Travel and Route
                  </p>
                  {isSafariJobType(selectedJobCard.type) && (
                    <>
                      <p className="text-slate-300">
                        Pickup Location:{" "}
                        <span className="text-white">
                          {detailValue(selectedJobCard.pickupLocation)}
                        </span>
                      </p>
                      <p className="text-slate-300">
                        Dropoff Location:{" "}
                        <span className="text-white">
                          {detailValue(selectedJobCard.dropoffLocation)}
                        </span>
                      </p>
                    </>
                  )}
                  {!isSafariJobType(selectedJobCard.type) && (
                    <p className="text-slate-300">
                      Destination:{" "}
                      <span className="text-white">
                        {detailValue(
                          selectedJobCard.location ||
                            selectedJobCard.routeSummary,
                        )}
                      </span>
                    </p>
                  )}
                  <p className="text-slate-300">
                    Route Summary:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.routeSummary)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Route Itinerary:{" "}
                    {routeItineraryLines.length === 0 ? (
                      <span className="text-white">-</span>
                    ) : (
                      <span className="text-white">
                        {routeItineraryLines
                          .map((line) => {
                            const base = line.date
                              ? `${line.date} - ${line.dayDescription}`
                              : line.dayDescription;
                            const allowance =
                              line.allowancePerDay !== "" &&
                              line.allowancePerDay !== null &&
                              line.allowancePerDay !== undefined
                                ? ` (Allowance/day: ${line.allowancePerDay})`
                                : "";
                            return base + allowance;
                          })
                          .join(", ")}
                      </span>
                    )}
                  </p>
                  <p className="text-slate-300">
                    Guide Language:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.guideLanguage)}
                    </span>
                  </p>
                </div>

                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-2">
                  <p className="text-slate-300 font-semibold">
                    Vehicle and Usage
                  </p>
                  <p className="text-slate-300">
                    Vehicle Number:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.vehicleNo)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Plate Number:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.vehiclePlateNo)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Driver Details:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.driverDetails)}
                    </span>
                  </p>
                  {(isSafariJobType(selectedJobCard.type) ||
                    isLeaseJobType(selectedJobCard.type)) && (
                    <p className="text-slate-300">
                      Driver Allowance:{" "}
                      <span className="text-white">
                        {selectedJobCard.driverAllowance != null &&
                        selectedJobCard.driverAllowance !== ""
                          ? Number(
                              selectedJobCard.driverAllowance,
                            ).toLocaleString()
                          : "-"}
                      </span>
                    </p>
                  )}
                  {!isSafariJobType(selectedJobCard.type) && (
                    <>
                      <p className="text-slate-300">
                        Odometer Out:{" "}
                        <span className="text-white">
                          {detailValue(selectedJobCard.odometerOut)}
                        </span>
                      </p>
                      <p className="text-slate-300">
                        Odometer In:{" "}
                        <span className="text-white">
                          {detailValue(selectedJobCard.odometerIn)}
                        </span>
                      </p>
                      <p className="text-slate-300">
                        Mileage:{" "}
                        <span className="text-white">
                          {detailValue(selectedJobCard.mileage)}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-2">
                  <p className="text-slate-300 font-semibold">
                    Counts and Other Details
                  </p>
                  <p className="text-slate-300">
                    Adults:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.adults)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Children:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.children)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Client Details:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.clientDetails)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Location:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.location)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    KMs:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.kms)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Reason:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.reason)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Additional Details:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.additionalDetails)}
                    </span>
                  </p>
                </div>

                <div className="bg-slate-800/30 border border-slate-700/50 rounded-xl p-4 space-y-2">
                  <p className="text-slate-300 font-semibold">System Info</p>
                  <p className="text-slate-300">
                    Lead ID:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.leadId)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Vehicle ID:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.vehicleId)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Created At:{" "}
                    <span className="text-white">
                      {formatDateTime(selectedJobCard.createdAt)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Updated At:{" "}
                    <span className="text-white">
                      {formatDateTime(selectedJobCard.updatedAt)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedJobCard(null);
                }}
                className="px-4 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
