import { useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  ClipboardList,
  Globe,
  Loader2,
  MapPin,
  MoreHorizontal,
  Plus,
  Search,
  Download,
  Edit,
  Eye,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { apiFetch } from "../utils/api";
import { canDelete, canManageJobCardStatus } from "../utils/auth";
import Swal from "sweetalert2";
import Select from "react-select";
import JobCardRouteMap from "../components/JobCardRouteMap";

const allocationSelectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
    borderRadius: 8,
    minHeight: 42,
  }),
  singleValue: (base) => ({ ...base, color: "#0f172a" }),
  input: (base) => ({ ...base, color: "#0f172a" }),
  placeholder: (base) => ({ ...base, color: "#64748b" }),
  menu: (base) => ({
    ...base,
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
  }),
  option: (base, state) => ({
    ...base,
    color: "#0f172a",
    backgroundColor: state.isSelected
      ? "#fde68a"
      : state.isFocused
        ? "#fef3c7"
        : "#ffffff",
    overflowWrap: "anywhere",
  }),
  menuPortal: (base) => ({ ...base, zIndex: 9999 }),
};

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
  contractType: user.contract_type || user.contractType || "",
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

const FUEL_DISTANCE_PER_LITRE = 6.5;

const calculateEstimatedDistance = (routeDistanceKm, additionalDistanceKm) => {
  const route = Number(routeDistanceKm);
  const additional = Number(additionalDistanceKm);
  const total =
    (Number.isFinite(route) ? route : 0) +
    (Number.isFinite(additional) ? additional : 0);
  return total > 0 ? total : null;
};

const calculateFuelAllowance = (routeDistanceKm, additionalDistanceKm) => {
  const total = calculateEstimatedDistance(
    routeDistanceKm,
    additionalDistanceKm,
  );
  return total == null ? null : total / FUEL_DISTANCE_PER_LITRE;
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
    perDiemCount: Number(
      jobCard.per_diem_vouchers_count ?? jobCard.perDiemCount ?? 0,
    ),
    paidPerDiemCount: Number(
      jobCard.paid_per_diem_vouchers_count ?? jobCard.paidPerDiemCount ?? 0,
    ),
    assignedDriverCount: Number(
      jobCard.assigned_driver_count ?? jobCard.assignedDriverCount ?? 0,
    ),
    perDiemUpdatedAt:
      jobCard.per_diem_vouchers_max_updated_at ||
      jobCard.perDiemUpdatedAt ||
      "",
    driverProfiles: Array.isArray(jobCard.driverProfiles)
      ? jobCard.driverProfiles
      : [],
    leadId: Number(jobCard.lead_id ?? jobCard.leadId ?? 0),
    groupName:
      jobCard.group_name ||
      jobCard.groupName ||
      jobCard?.leaseAllocation?.groupName ||
      jobCard?.leaseAllocation?.group_name ||
      jobCard?.leaseAllocation?.contract?.groupName ||
      jobCard?.leaseAllocation?.contract?.group_name ||
      "-",
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
    routePoints: jobCard.route_points || jobCard.routePoints || [],
    routeDistanceKm:
      jobCard.route_distance_km ?? jobCard.routeDistanceKm ?? null,
    additionalDistanceKm:
      jobCard.additional_distance_km ?? jobCard.additionalDistanceKm ?? null,
    additionalDistanceNote:
      jobCard.additional_distance_note ?? jobCard.additionalDistanceNote ?? "",
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
    driverAllowances:
      jobCard.driver_allowances || jobCard.driverAllowances || {},
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
      jobCard?.leaseAllocation?.vehicle?.vehicleNo ||
      jobCard?.leaseAllocation?.vehicle?.vehicle_no ||
      "",
    vehiclePlateNo:
      jobCard.plate_no ||
      jobCard.plateNo ||
      jobCard?.vehicle?.plate_no ||
      jobCard?.vehicle?.plateNo ||
      jobCard?.leaseAllocation?.vehicle?.plateNo ||
      jobCard?.leaseAllocation?.vehicle?.plate_no ||
      "",
    updatedAt: jobCard.updated_at || jobCard.updatedAt || "",
    createdAt: jobCard.created_at || jobCard.createdAt || "",
  };
};

const hasAllowanceRequest = (jobCard) =>
  Number(jobCard?.driverAllowance || 0) > 0 ||
  (Array.isArray(jobCard?.routeItinerary) &&
    jobCard.routeItinerary.some(
      (item) =>
        Number(item?.allowancePerDay ?? item?.allowance_per_day ?? 0) > 0,
    ));

function JobCardActionsMenu({ card, onAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const isClosed = (card.status || "Open") === "Closed";
  const isManagedType = isSafariJobType(card.type) || isLeaseJobType(card.type);
  const actionClass =
    "flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50";

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleOutsideClick = (event) => {
      if (!menuRef.current?.contains(event.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const runAction = (action) => {
    setIsOpen(false);
    onAction(action);
  };

  return (
    <div ref={menuRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`Actions for ${card.jobCardNo}`}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
      >
        <MoreHorizontal className="h-4 w-4" />
        Actions
      </button>
      {isOpen && (
        <div role="menu" className="absolute left-0 top-full z-30 mt-1 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          <button type="button" role="menuitem" onClick={() => runAction("view")} className={actionClass}>
            <Eye className="h-4 w-4 text-cyan-600" /> View jobcard
          </button>
          {!((isManagedType) && isClosed) && <button type="button" role="menuitem" onClick={() => runAction("edit")} className={actionClass}>
            <Edit className="h-4 w-4 text-amber-500" /> Edit jobcard
          </button>}
          <button type="button" role="menuitem" onClick={() => runAction("download")} className={actionClass}>
            <Download className="h-4 w-4 text-blue-600" /> Download PDF
          </button>
          {hasAllowanceRequest(card) && <button type="button" role="menuitem" onClick={() => runAction("schedule")} className={actionClass}>
            <Calendar className="h-4 w-4 text-amber-600" /> Schedule allowance
          </button>}
          {canManageJobCardStatus() && isManagedType && <>
            <div className="my-1 border-t border-slate-100" />
            <button type="button" role="menuitem" onClick={() => runAction(isClosed ? "reopen" : "close")} className={actionClass}>
              <ClipboardList className={`h-4 w-4 ${isClosed ? "text-amber-600" : "text-emerald-600"}`} />
              {isClosed ? "Reopen jobcard" : "Close jobcard"}
            </button>
          </>}
          {canDelete() && <button type="button" role="menuitem" onClick={() => runAction("delete")} className={actionClass}>
            <Trash2 className="h-4 w-4 text-red-500" /> Delete jobcard
          </button>}
        </div>
      )}
    </div>
  );
}

const dateKey = (value) => {
  const parsed = parseDateValue(value);
  if (!parsed) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getItineraryDateRange = (card) => {
  const itineraryDates = (Array.isArray(card.routeItinerary)
    ? card.routeItinerary
    : []
  )
    .map((item) => {
      if (typeof item === "string") return dateKey(item);
      return dateKey(item?.date || item?.dayDate || item?.dayTitle);
    })
    .filter(Boolean)
    .sort();

  return {
    start: itineraryDates[0] || dateKey(card.safariStartDate),
    end:
      itineraryDates[itineraryDates.length - 1] || dateKey(card.safariEndDate),
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
  routePoints: [],
  routeDistanceKm: null,
  additionalDistanceKm: "",
  additionalDistanceNote: "",
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
  driverAllowances: {},
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
  routePoints: [],
  routeDistanceKm: null,
  additionalDistanceKm: "",
  additionalDistanceNote: "",
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
  driverAllowances: {},
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
  routePoints: Array.isArray(jobCard.routePoints) ? jobCard.routePoints : [],
  routeDistanceKm: jobCard.routeDistanceKm ?? null,
  additionalDistanceKm:
    jobCard.additionalDistanceKm != null
      ? String(jobCard.additionalDistanceKm)
      : "",
  additionalDistanceNote: jobCard.additionalDistanceNote || "",
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
  driverAllowances:
    jobCard.driverAllowances && typeof jobCard.driverAllowances === "object"
      ? jobCard.driverAllowances
      : {},
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
  const [reportFromDate, setReportFromDate] = useState("");
  const [reportToDate, setReportToDate] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [expandedRouteSummaryByCard, setExpandedRouteSummaryByCard] = useState(
    {},
  );
  const [editingId, setEditingId] = useState(null);
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [selectedJobCardIds, setSelectedJobCardIds] = useState([]);
  const [bulkScheduling, setBulkScheduling] = useState(false);
  const [form, setForm] = useState(createEmptyForm());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const [generatingPerDiemId, setGeneratingPerDiemId] = useState(null);
  const [downloadingJobCardId, setDownloadingJobCardId] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [searchParams] = useSearchParams();
  const jobCardId = searchParams.get("view");
  const embeddedView = searchParams.get("embed") === "1";
  const formModeParam = searchParams.get("form");
  const requestedCloseJobCardId = searchParams.get("id");
  const isJobCardFormPage = ["create", "edit", "close"].includes(formModeParam);

  const loadJobCardDetails = async (id) => {
    setErrorMessage("");
    try {
      const response = await apiFetch(`/job-cards/${id}`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to fetch job card details.",
        );
      }
      setSelectedJobCard(normalizeJobCard(extractSingle(payload, "jobCard")));
      setIsViewModalOpen(true);
    } catch (error) {
      setErrorMessage(error.message || "Unable to open job card details.");
    }
  };

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
          leadId: Number(a.leadId ?? a.lead_id ?? a.lead?.id ?? 0),
          vehicleId: Number(a.vehicleId ?? a.vehicle_id ?? a.vehicle?.id ?? 0),
          driverId: Number(a.driverId ?? a.driver_id ?? a.driver?.id ?? 0),
          driverName: a.driver?.name || a.driver_name || a.driverName || "",
          driverContractType:
            a.driver?.contract_type ||
            a.driver?.contractType ||
            a.driver_contract_type ||
            a.driverContractType ||
            "",
          vehicle: a.vehicle || null,
          vehicleNo:
            a.vehicle?.vehicle_no ||
            a.vehicle?.vehicleNo ||
            a.vehicle_no ||
            a.vehicleNo ||
            "",
          plateNo:
            a.vehicle?.plate_no ||
            a.vehicle?.plateNo ||
            a.plate_no ||
            a.plateNo ||
            "",
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
          groupName: a.groupName || a.group_name || a.contract?.groupName || "",
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

  useEffect(() => {
    if (jobCardId) loadJobCardDetails(jobCardId);
  }, [jobCardId]);

  useEffect(() => {
    if (formModeParam !== "close") return;
    if (!canManageJobCardStatus()) {
      setErrorMessage("You are not authorized to close job cards.");
      navigate("/job-cards/");
      return;
    }
    if (!requestedCloseJobCardId || editingId) return;
    let isCurrent = true;
    const loadJobCardForClosing = async () => {
      try {
        const response = await apiFetch(
          `/job-cards/${requestedCloseJobCardId}`,
        );
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Unable to fetch job card.");
        }
        if (!isCurrent) return;
        const jobCard = normalizeJobCard(extractSingle(payload, "jobCard"));
        setModalMode("close");
        setEditingId(jobCard.id);
        setForm(buildFormFromJobCard(jobCard));
        setIsModalOpen(true);
      } catch (error) {
        if (isCurrent)
          setErrorMessage(error.message || "Unable to open job card.");
      }
    };
    loadJobCardForClosing();
    return () => {
      isCurrent = false;
    };
  }, [formModeParam, requestedCloseJobCardId, editingId, navigate]);

  useEffect(() => {
    if (isJobCardFormPage) {
      setIsModalOpen(true);
      return;
    }

    // The sidebar links back to /job-cards without the form query. Close any
    // open form when that happens instead of leaving the old create modal up.
    if (!jobCardId) {
      setIsModalOpen(false);
      setEditingId(null);
    }
  }, [isJobCardFormPage, jobCardId]);

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

  const allocatedLeaseAllocationIds = useMemo(
    () =>
      new Set(
        jobCards
          .filter(
            (card) =>
              isLeaseJobType(card.type) &&
              Number(card.leaseAllocationId || 0) > 0,
          )
          .map((card) => String(card.leaseAllocationId)),
      ),
    [jobCards],
  );

  const availableLeaseAllocations = useMemo(
    () =>
      leaseAllocations.filter(
        (allocation) =>
          !allocatedLeaseAllocationIds.has(String(allocation.id)) ||
          String(allocation.id) === String(form.leaseAllocationId),
      ),
    [leaseAllocations, allocatedLeaseAllocationIds, form.leaseAllocationId],
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

    const allocations = safariAllocations
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
          allocation.vehicle?.vehicle_no ||
          allocation.vehicle?.vehicleNo ||
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
          driverContractType:
            allocation.driverContractType || driverFromUser?.contractType || "",
        };
      });

    return Array.from(
      new Map(
        allocations.map((allocation) => [
          `${allocation.vehicleName}|${allocation.driverName}`.toLowerCase(),
          allocation,
        ]),
      ).values(),
    );
  }, [form.leadId, safariAllocations, vehicles, users]);

  const allowanceContractTypes = useMemo(() => {
    if (!isSafariJobType(form.type)) return [];
    return Array.from(
      new Set(
        selectedLeadAllocations.map(
          (item) => item.driverContractType || "Unspecified",
        ),
      ),
    );
  }, [form.type, selectedLeadAllocations]);

  const setContractAllowance = (contractType, value) => {
    setForm((current) => {
      const driverAllowances = {
        ...(current.driverAllowances || {}),
        [contractType]: value,
      };
      const total = Object.values(driverAllowances).reduce((sum, amount) => {
        const number = Number(amount);
        return Number.isFinite(number) ? sum + number : sum;
      }, 0);
      return {
        ...current,
        driverAllowances,
        driverAllowance: total > 0 ? String(total) : "",
      };
    });
  };

  const getJobCardVehicleCount = (card) => {
    if (!card) return 0;

    if (!isSafariJobType(card.type)) {
      return 1;
    }

    const allocations = safariAllocations.filter(
      (allocation) => String(allocation.leadId) === String(card.leadId),
    );

    // A safari can have more than one allocation row for the same vehicle
    // (for example, duplicate rows created during allocation updates). The
    // allowance is per vehicle, so count distinct vehicles rather than rows.
    const vehicleKeys = new Set(
      allocations
        .map((allocation) => {
          const vehicleId = Number(allocation.vehicleId || 0);
          if (vehicleId > 0) return `id:${vehicleId}`;

          const plateNo = String(allocation.plateNo || "").trim().toLowerCase();
          const vehicleNo = String(allocation.vehicleNo || "").trim().toLowerCase();
          return plateNo || vehicleNo ? `label:${plateNo}|${vehicleNo}` : null;
        })
        .filter(Boolean),
    );

    return vehicleKeys.size > 0 ? vehicleKeys.size : 1;
  };

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
        String(card.tourOperatorClientName || "")
          .toLowerCase()
          .includes(query) ||
        String(card.type || "")
          .toLowerCase()
          .includes(query) ||
        String(card.vehiclePlateNo || "")
          .toLowerCase()
          .includes(query) ||
        String(card.vehicleNo || "")
          .toLowerCase()
          .includes(query) ||
        String(card.groupName || "")
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

  const statusCards = filteredCards;

  const stats = useMemo(() => {
    const safariCards = filteredCards.filter((card) =>
      isSafariJobType(card.type),
    );
    const operationsCards = filteredCards.length - safariCards.length;
    const allowanceTotal = filteredCards.reduce((total, card) => {
      const value = Number(card.driverAllowance);
      return Number.isFinite(value)
        ? total + value * getJobCardVehicleCount(card)
        : total;
    }, 0);

    return {
      totalCards: filteredCards.length,
      safariCards: safariCards.length,
      operationsCards,
      allowanceTotal,
    };
  }, [filteredCards, safariAllocations]);

  const departureArrivalReport = useMemo(() => {
    const eventsByDate = new Map();
    const safariCards = jobCards.filter((card) => isSafariJobType(card.type));

    safariCards.forEach((card) => {
      const { start, end } = getItineraryDateRange(card);
      if (!start && !end) return;

      const vehicleCount = getJobCardVehicleCount(card);
      if (start) {
        const event = eventsByDate.get(start) || {
          date: start,
          departures: 0,
          arrivals: 0,
        };
        event.departures += vehicleCount;
        eventsByDate.set(start, event);
      }
      if (end) {
        const event = eventsByDate.get(end) || {
          date: end,
          departures: 0,
          arrivals: 0,
        };
        event.arrivals += vehicleCount;
        eventsByDate.set(end, event);
      }
    });

    const eventRows = Array.from(eventsByDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    if (eventRows.length === 0 && (!reportFromDate || !reportToDate)) return [];

    const start = parseDateValue(reportFromDate || eventRows[0]?.date);
    const end = parseDateValue(
      reportToDate || eventRows[eventRows.length - 1]?.date,
    );
    if (!start || !end || start > end) return [];

    const rows = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endTime = new Date(end);
    endTime.setHours(0, 0, 0, 0);
    while (cursor <= endTime) {
      const key = dateKey(cursor);
      const event = eventsByDate.get(key);
      rows.push({
        date: key,
        departures: event?.departures || 0,
        arrivals: event?.arrivals || 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return rows;
  }, [jobCards, safariAllocations, reportFromDate, reportToDate]);

  const departureArrivalTotals = useMemo(
    () =>
      departureArrivalReport.reduce(
        (totals, row) => ({
          departures: totals.departures + row.departures,
          arrivals: totals.arrivals + row.arrivals,
        }),
        { departures: 0, arrivals: 0 },
      ),
    [departureArrivalReport],
  );

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
    navigate("/job-cards/?form=create");
  };

  const openClose = (jobCard) => {
    setModalMode("close");
    setEditingId(jobCard.id);
    setForm(buildFormFromJobCard(jobCard));
    setIsModalOpen(true);
    navigate(`/job-cards/?form=close&id=${encodeURIComponent(jobCard.id)}`);
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
      navigate(`/job-cards/?form=edit&id=${encodeURIComponent(selected.id)}`);
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
    navigate(`/job-cards/?view=${encodeURIComponent(jobCard.id)}`);
  };

  const detailValue = (value) => {
    if (value === null || value === undefined) return "-";
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed ? trimmed : "-";
    }
    return String(value);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setSelectedJobCard(null);
    if (jobCardId) navigate("/job-cards");
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
            const allowanceRaw =
              item.allowancePerDay ?? item.allowance_per_day ?? "";
            const allowancePerDay =
              allowanceRaw === null || allowanceRaw === undefined
                ? ""
                : String(allowanceRaw).trim();
            if (!date && !dayDescription && !allowancePerDay) return null;
            return {
              date: date ? formatDate(date) : "",
              dayDescription,
              allowancePerDay,
            };
          }
          return {
            date: "",
            dayDescription: String(item),
            allowancePerDay: "",
          };
        })
        .filter(Boolean);
    }

    return [];
  }, [selectedJobCard]);

  const selectedJobCardGroupName = useMemo(() => {
    const directGroupName = String(selectedJobCard?.groupName || "").trim();
    if (directGroupName) return directGroupName;

    const leaseAllocationGroupName = String(
      selectedJobCard?.leaseAllocation?.groupName ||
        selectedJobCard?.leaseAllocation?.group_name ||
        selectedJobCard?.leaseAllocation?.contract?.groupName ||
        selectedJobCard?.leaseAllocation?.contract?.group_name ||
        "",
    ).trim();
    if (leaseAllocationGroupName) return leaseAllocationGroupName;

    const leadId = Number(selectedJobCard?.leadId || 0);
    if (!leadId) return "-";

    const leadGroupName = leadById.get(String(leadId))?.groupName;
    if (leadGroupName && String(leadGroupName).trim() !== "") {
      return leadGroupName;
    }

    const quotationGroupName = latestQuotationByLead.get(
      String(leadId),
    )?.groupName;
    return quotationGroupName && String(quotationGroupName).trim() !== ""
      ? quotationGroupName
      : "-";
  }, [selectedJobCard, leadById, latestQuotationByLead]);

  const itineraryAllowanceTotal = useMemo(
    () =>
      routeItineraryLines.reduce((total, line) => {
        const value = Number(line?.allowancePerDay);
        return Number.isFinite(value) ? total + value : total;
      }, 0),
    [routeItineraryLines],
  );

  const selectedJobCardVehicleCount = useMemo(() => {
    if (!selectedJobCard) return 0;
    if (
      Array.isArray(selectedJobCard.allocatedVehicles) &&
      selectedJobCard.allocatedVehicles.length > 0
    ) {
      return selectedJobCard.allocatedVehicles.length;
    }
    return getJobCardVehicleCount(selectedJobCard);
  }, [selectedJobCard, safariAllocations]);

  const selectedJobCardAllowanceTotal = useMemo(() => {
    const allowance = Number(selectedJobCard?.driverAllowance);
    if (
      !Number.isFinite(allowance) ||
      selectedJobCard?.driverAllowance == null ||
      selectedJobCard?.driverAllowance === "" ||
      selectedJobCardVehicleCount <= 0
    ) {
      return null;
    }

    return allowance * selectedJobCardVehicleCount;
  }, [selectedJobCard, selectedJobCardVehicleCount]);

  const selectedJobCardAllowanceBreakdown = useMemo(() => {
    if (!selectedJobCard) return [];
    const allowances = selectedJobCard.driverAllowances || {};
    const drivers = Array.isArray(selectedJobCard.driverProfiles)
      ? selectedJobCard.driverProfiles
      : [];
    const counts = drivers.reduce((result, driver) => {
      const type = driver.contractType || "Unspecified";
      result[type] = (result[type] || 0) + 1;
      return result;
    }, {});

    return Object.entries(allowances).map(([contractType, amount]) => ({
      contractType,
      amount: Number(amount),
      driverCount: counts[contractType] || 0,
    }));
  }, [selectedJobCard]);

  const getRouteSummaryPreview = (value, limit = 90) => {
    const normalized = String(value || "").trim();
    if (!normalized) return "-";
    if (normalized.length <= limit) return normalized;
    return `${normalized.slice(0, limit).trimEnd()}...`;
  };

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

  const handleGeneratePerDiem = async (jobCard) => {
    setGeneratingPerDiemId(jobCard.id);
    try {
      const existingResponse = await apiFetch(
        `/per-diems?jobCardId=${jobCard.id}`,
      );
      const existing = await existingResponse.json();
      if (!existingResponse.ok)
        throw new Error(
          existing.message || "Unable to check existing per diem.",
        );
      const details = await apiFetch(`/job-cards/${jobCard.id}`);
      const payload = await details.json();
      if (!details.ok)
        throw new Error(payload.message || "Unable to load job card.");
      const drivers = (payload.jobCard?.driverProfiles || []).filter((driver) =>
        driver.name?.trim(),
      );
      if (!drivers.length)
        throw new Error("Assign a driver to this job card first.");

      const existingKeys = new Set(
        (existing.perDiems || []).map((voucher) => String(voucher.driverKey)),
      );
      const missingDrivers = drivers.filter(
        (driver) => !existingKeys.has(String(driver.key)),
      );
      // Existing vouchers can be pushed again. The API updates the existing
      // voucher and resets its approval only when the allowance snapshot has
      // actually changed, so do not block the user based on list timestamps.
      const canUpdateExisting = jobCard.perDiemCount > 0;
      const selectableDrivers = missingDrivers.length
        ? missingDrivers
        : canUpdateExisting
          ? drivers
          : [];
      if (!selectableDrivers.length) return;

      const selection = await Swal.fire({
        title: missingDrivers.length ? "Schedule Allowance" : "Update Allowance",
        input: "select",
        inputOptions: Object.fromEntries(
          selectableDrivers.map((driver) => [driver.key, driver.name]),
        ),
        inputPlaceholder: "Select driver",
        showCancelButton: true,
        confirmButtonText: missingDrivers.length
          ? "Push for approval"
          : "Update request",
        inputValidator: (value) =>
          !value ? "Please select a driver." : undefined,
      });
      if (!selection.isConfirmed) return;

      const response = await apiFetch(`/job-cards/${jobCard.id}/per-diem`, {
        method: "POST",
        body: { driverKey: selection.value, pushForApproval: true },
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.message ||
            "Unable to schedule the allowance request.",
        );
      }

      const nextCount = new Set([...existingKeys, String(selection.value)])
        .size;
      setJobCards((current) =>
        current.map((card) =>
          card.id === jobCard.id
            ? {
                ...card,
                perDiemCount: nextCount,
                perDiemUpdatedAt:
                  missingDrivers.length && nextCount >= drivers.length
                    ? new Date().toISOString()
                    : card.perDiemUpdatedAt,
              }
            : card,
        ),
      );
      navigate(`/per-diems?jobCardId=${jobCard.id}`);
    } catch (error) {
      await Swal.fire({
        title: "Per Diem Failed",
        text: error.message,
        icon: "error",
      });
    } finally {
      setGeneratingPerDiemId(null);
    }
  };

  const handleBulkScheduleAllowances = async (viewedCard = null) => {
    const selectedCards = viewedCard
      ? (hasAllowanceRequest(viewedCard) ? [viewedCard] : [])
      : statusCards.filter(
          (card) => selectedJobCardIds.includes(card.id) && hasAllowanceRequest(card),
        );
    if (!selectedCards.length) return;

    const confirmation = await Swal.fire({
      title: "Push allowances for approval?",
      text: `This will push allowance requests for ${selectedCards.length} job card${selectedCards.length === 1 ? "" : "s"}. Existing requests will be updated when allowance details have changed.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, push for approval",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#d97706",
      background: "#0f172a",
      color: "#e2e8f0",
    });
    if (!confirmation.isConfirmed) return;

    setBulkScheduling(true);
    setErrorMessage("");
    let scheduled = 0;
    const failures = [];
    try {
      for (const card of selectedCards) {
        try {
          const detailsResponse = await apiFetch(`/job-cards/${card.id}`);
          const detailsPayload = await detailsResponse.json().catch(() => ({}));
          if (!detailsResponse.ok) {
            throw new Error(detailsPayload?.message || "Unable to load job card.");
          }
          const drivers = (detailsPayload.jobCard?.driverProfiles || []).filter(
            (driver) => driver.name?.trim(),
          );
          if (!drivers.length) throw new Error("No assigned driver");

          for (const driver of drivers) {
            const driverKey = driver.key || (driver.id ? String(driver.id) : "");
            if (!driverKey) continue;
            const response = await apiFetch(`/job-cards/${card.id}/per-diem`, {
              method: "POST",
              body: { driverKey, pushForApproval: true },
            });
            if (!response.ok) {
              const payload = await response.json().catch(() => ({}));
              throw new Error(payload?.message || "Unable to schedule allowance");
            }
            scheduled += 1;
          }
        } catch (error) {
          failures.push(`${card.jobCardNo}: ${error.message}`);
        }
      }
      if (!viewedCard) setSelectedJobCardIds([]);
      await loadData();
      await Swal.fire({
        title: "Allowance scheduling complete",
        text: `${scheduled} allowance request${scheduled === 1 ? "" : "s"} pushed for approval${failures.length ? `. ${failures.length} jobcard${failures.length === 1 ? "" : "s"} skipped.` : "."}`,
        icon: failures.length ? "warning" : "success",
        background: "#0f172a",
        color: "#e2e8f0",
      });
      if (failures.length) setErrorMessage(failures.join("; "));
    } catch (error) {
      setErrorMessage(error.message || "Unable to schedule allowances.");
    } finally {
      setBulkScheduling(false);
    }
  };

  const handleJobCardAction = (action, card) => {
    if (action === "view") return openView(card);
    if (action === "edit") return openEdit(card);
    if (action === "download") return handleDownloadPdf(card);
    if (action === "schedule") return handleGeneratePerDiem(card);
    if (action === "close") return openClose(card);
    if (action === "reopen") return handleReopen(card);
    if (action === "delete") return handleDelete(card.id);
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

  const handleReopen = async (jobCard) => {
    const confirmation = await Swal.fire({
      title: "Reopen job card?",
      text: `Reopen ${jobCard.jobCardNo || "this job card"}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes, reopen",
      cancelButtonText: "Cancel",
      background: "#0f172a",
      color: "#e2e8f0",
      confirmButtonColor: "#059669",
    });
    if (!confirmation.isConfirmed) return;

    try {
      const response = await apiFetch(`/job-cards/${jobCard.id}/status`, {
        method: "PATCH",
        body: { status: "Open" },
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Unable to reopen job card.");
      }
      const reopened = normalizeJobCard(extractSingle(payload, "jobCard"));
      setJobCards((current) =>
        current.map((card) =>
          card.id === jobCard.id ? { ...card, ...reopened } : card,
        ),
      );
      await Swal.fire({
        title: "Reopened",
        text: "Job card reopened successfully.",
        icon: "success",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      await Swal.fire({
        title: "Unable to Reopen",
        text: error.message || "Unable to reopen job card.",
        icon: "error",
      });
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

    if (isSafariType && form.leadId) {
      const duplicateSafariCard = jobCards.find(
        (card) =>
          isSafariJobType(card.type) &&
          String(card.leadId || "") === String(form.leadId) &&
          String(card.id) !== String(editingId || ""),
      );

      if (duplicateSafariCard) {
        const duplicateNumber =
          duplicateSafariCard.jobCardNo || `#${duplicateSafariCard.id}`;
        setErrorMessage(
          `A Safari job card already exists for this lead (${duplicateNumber}). Update the existing job card instead.`,
        );
        await Swal.fire({
          title: "Duplicate Safari Job Card",
          text: `This lead already has job card ${duplicateNumber}.`,
          icon: "warning",
          background: "#0f172a",
          color: "#e2e8f0",
        });
        return;
      }
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

    if (isLeaseType && form.leaseAllocationId) {
      const duplicateLeaseCard = jobCards.find(
        (card) =>
          isLeaseJobType(card.type) &&
          String(card.leaseAllocationId || "") ===
            String(form.leaseAllocationId) &&
          String(card.id) !== String(editingId || ""),
      );

      if (duplicateLeaseCard) {
        setErrorMessage("A job card already exists for this lease allocation.");
        await Swal.fire({
          title: "Duplicate Lease Allocation",
          text: `Lease allocation already has job card ${duplicateLeaseCard.jobCardNo || `#${duplicateLeaseCard.id}`}.`,
          icon: "warning",
          background: "#0f172a",
          color: "#e2e8f0",
        });
        return;
      }
    }

    const selectedStatus = isCreateMode
      ? "Open"
      : isCloseMode
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
            ...(isSafariType || isLeaseType ? {} : { status: selectedStatus }),
            type: form.type || "Safari",
            safariStartDate: form.safariStartDate || null,
            safari_start_date: form.safariStartDate || null,
            timeOut: null,
            numberOfDays: isSafariType ? calculatedNumberOfDays : null,
            pickupLocation: isSafariType ? form.pickupLocation || null : null,
            dropoffLocation: isSafariType ? form.dropoffLocation || null : null,
            routeSummary: form.routeSummary || null,
            routePoints: Array.isArray(form.routePoints)
              ? form.routePoints
              : [],
            routeDistanceKm:
              form.routeDistanceKm == null || form.routeDistanceKm === ""
                ? null
                : Number(form.routeDistanceKm),
            additionalDistanceKm:
              form.additionalDistanceKm == null ||
              form.additionalDistanceKm === ""
                ? null
                : Number(form.additionalDistanceKm),
            additionalDistanceNote: form.additionalDistanceNote || null,
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
            driverAllowances:
              isSafariType &&
              Object.keys(form.driverAllowances || {}).length > 0
                ? form.driverAllowances
                : null,
          };

      const response = isCloseMode
        ? await apiFetch(`/job-cards/${editingId}/status`, {
            method: "PATCH",
            body: {
              status: "Closed",
              safariEndDate: form.safariEndDate,
              timeIn: form.timeIn,
            },
          })
        : editingId
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
              // PUT responses do not include the aggregate per-diem fields.
              // Keep them so an edit can immediately enable regeneration.
              perDiemCount: saved.perDiemCount || item.perDiemCount,
              assignedDriverCount:
                saved.assignedDriverCount || item.assignedDriverCount,
              perDiemUpdatedAt: saved.perDiemUpdatedAt || item.perDiemUpdatedAt,
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
      if (isJobCardFormPage) navigate("/job-cards/");

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
      <div
        className={
          jobCardId || isJobCardFormPage ? "hidden" : "flex flex-col"
        }
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Job Cards</h1>
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              Filtered Allowance Total
            </p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">
              {stats.allowanceTotal.toLocaleString(undefined, {
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-xs text-emerald-700/80 mt-1">
              Updates automatically with search and filters
            </p>
          </div>
        </div>

        <section>
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Daily Departures &amp; Arrivals
                </h2>
                <p className="text-xs text-slate-500">
                  Safari vehicles are counted on the first and last day of their itinerary.
                </p>
              </div>
              <div className="flex gap-4 text-sm font-semibold">
                <span className="text-amber-700">
                  Departures: {departureArrivalTotals.departures}
                </span>
                <span className="text-emerald-700">
                  Arrivals: {departureArrivalTotals.arrivals}
                </span>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Report From
                </label>
                <input
                  type="date"
                  value={reportFromDate}
                  onChange={(event) => setReportFromDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none [color-scheme:light] focus:border-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Report To
                </label>
                <input
                  type="date"
                  value={reportToDate}
                  min={reportFromDate || undefined}
                  onChange={(event) => setReportToDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none [color-scheme:light] focus:border-amber-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setReportFromDate("");
                    setReportToDate("");
                  }}
                  className="w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                >
                  Clear Report Filter
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Date
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Departures
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Arrivals
                  </th>
                </tr>
              </thead>
              <tbody>
                {departureArrivalReport.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-5 text-center text-sm text-slate-400">
                      No dated safari itineraries found for this period.
                    </td>
                  </tr>
                ) : (
                  departureArrivalReport.map((row) => (
                    <tr key={row.date} className="border-b border-slate-100 last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-slate-700">
                        {formatDate(row.date)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-amber-700">
                        {row.departures}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-emerald-700">
                        {row.arrivals}
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
                placeholder="Search by group name, company, type, route, reg no"
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

            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-200 pt-3">
              <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  className="h-5 w-5 cursor-pointer rounded-md border-2 border-slate-300 bg-white text-amber-600 shadow-sm accent-amber-600 transition hover:border-amber-400 focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Select all visible jobcards with allowance"
                  checked={
                    statusCards.filter((card) => hasAllowanceRequest(card)).length > 0 &&
                    statusCards.filter((card) => hasAllowanceRequest(card)).every((card) =>
                      selectedJobCardIds.includes(card.id),
                    )
                  }
                  onChange={(event) =>
                    setSelectedJobCardIds(
                      event.target.checked
                        ? statusCards.filter((card) => hasAllowanceRequest(card)).map((card) => card.id)
                        : [],
                    )
                  }
                />
                Select allowance jobcards
              </label>
              <button
                type="button"
                onClick={() => handleBulkScheduleAllowances()}
                disabled={bulkScheduling || selectedJobCardIds.length === 0}
                className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-semibold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkScheduling ? "Pushing..." : "Schedule / Push for Approval"}
              </button>
              {selectedJobCardIds.length > 0 && (
                <span className="text-xs text-slate-500">
                  {selectedJobCardIds.length} selected
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-4 pt-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">All job cards</p>
              <p className="mt-1 text-xs text-slate-500">Open and closed job cards are shown together</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="py-3 px-3 text-xs font-semibold text-slate-600 uppercase">
                    <span className="sr-only">Select</span>
                    <input
                      type="checkbox"
                      className="h-5 w-5 cursor-pointer rounded-md border-2 border-slate-300 bg-white text-amber-600 shadow-sm accent-amber-600 transition hover:border-amber-400 focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Select all visible jobcards with allowance"
                      checked={
                    statusCards.filter((card) => hasAllowanceRequest(card)).length > 0 &&
                    statusCards.filter((card) => hasAllowanceRequest(card)).every((card) =>
                          selectedJobCardIds.includes(card.id),
                        )
                      }
                      onChange={(event) =>
                        setSelectedJobCardIds(
                          event.target.checked
                          ? statusCards.filter((card) => hasAllowanceRequest(card)).map((card) => card.id)
                            : [],
                        )
                      }
                    />
                  </th>
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
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                    Allowance Push
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
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-600 uppercase whitespace-nowrap">
                    Total Allowance
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
                      colSpan={12}
                      className="py-8 text-center text-slate-400 text-sm"
                    >
                      Loading job cards...
                    </td>
                  </tr>
                ) : statusCards.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="py-8 text-center text-slate-400 text-sm"
                    >
                      No job cards found for the current filters.
                    </td>
                  </tr>
                ) : (
                  statusCards.map((card) => (
                    <tr
                      key={card.id}
                      className="border-b border-slate-200 hover:bg-amber-50/70 transition-colors"
                    >
                      <td className="py-3 px-3">
                        <input
                          type="checkbox"
                          className="h-5 w-5 cursor-pointer rounded-md border-2 border-slate-300 bg-white text-amber-600 shadow-sm accent-amber-600 transition hover:border-amber-400 focus:ring-2 focus:ring-amber-400 focus:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Select ${card.jobCardNo}`}
                          disabled={!hasAllowanceRequest(card)}
                          checked={selectedJobCardIds.includes(card.id)}
                          onChange={(event) =>
                            setSelectedJobCardIds((current) =>
                              event.target.checked
                                ? [...new Set([...current, card.id])]
                                : current.filter((id) => id !== card.id),
                            )
                          }
                        />
                      </td>
                      <td className="py-3 px-3">
                        <JobCardActionsMenu
                          card={card}
                          onAction={(action) => handleJobCardAction(action, card)}
                        />
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
                      <td className="py-3 px-3 text-sm whitespace-nowrap">
                        {card.perDiemCount > 0 ? <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${card.paidPerDiemCount === card.perDiemCount ? "border-emerald-200 bg-emerald-50 text-emerald-800" : card.paidPerDiemCount > 0 ? "border-blue-200 bg-blue-50 text-blue-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>{card.paidPerDiemCount === card.perDiemCount ? "Per diem paid" : card.paidPerDiemCount > 0 ? "Partially paid" : "Pushed for approval"}</span> : hasAllowanceRequest(card) ? <span className="text-xs text-amber-700">Not pushed</span> : "—"}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-700 font-medium">
                        {card.groupName ||
                          leadById.get(String(card.leadId || ""))?.groupName ||
                          "-"}
                      </td>
                      <td className="py-3 px-3 min-w-[220px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-900 text-sm font-semibold">
                            <User className="w-4 h-4 text-amber-500" />
                            {card.tourOperatorClientName}
                          </div>
                          {(String(card.vehiclePlateNo || "").trim() !== "" ||
                            String(card.vehicleNo || "").trim() !== "") && (
                            <div className="text-xs text-slate-600">
                              Reg No: {card.vehiclePlateNo || card.vehicleNo}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-800 min-w-[170px]">
                        <div className="flex items-start gap-2">
                          <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                          <div>
                            <div className="font-medium">
                              Itinerary Start:{" "}
                              {formatDate(card.safariStartDate)}
                            </div>
                            <div className="text-xs text-slate-600">
                              Itinerary End: {formatDate(card.safariEndDate)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-sm text-right text-slate-800 whitespace-nowrap">
                        {(isSafariJobType(card.type) ||
                          isLeaseJobType(card.type)) &&
                        card.driverAllowance != null &&
                        card.driverAllowance !== ""
                          ? (
                              Number(card.driverAllowance) *
                              getJobCardVehicleCount(card)
                            ).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })
                          : "-"}
                      </td>
                      <td className="py-3 px-3 text-sm text-slate-700">
                        {formatDateTime(card.createdAt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50">
                  <td
                    colSpan={9}
                    className="py-3 px-3 text-sm font-semibold text-slate-700 text-right"
                  >
                    Filtered Allowance Total
                  </td>
                  <td className="py-3 px-3 text-sm font-bold text-right text-emerald-700 whitespace-nowrap">
                    {stats.allowanceTotal.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="py-3 px-3" />
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>

      {isModalOpen && (
        <div
          className={
            isJobCardFormPage
              ? "min-h-screen rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-3 md:p-6"
              : "fixed inset-0 z-50 flex items-center justify-center p-4"
          }
        >
          {!isJobCardFormPage && (
            <div
              className="absolute inset-0 bg-black/60"
              onClick={() => {
                if (isSaving) return;
                setIsModalOpen(false);
              }}
            />
          )}

          <div
            className={
              isJobCardFormPage
                ? "relative w-full max-w-7xl mx-auto overflow-hidden bg-white border border-slate-200 rounded-3xl shadow-2xl shadow-slate-900/15"
                : "relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl"
            }
          >
            {isJobCardFormPage && (
              <div className="h-1.5 bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400" />
            )}
            <div
              className={
                isJobCardFormPage
                  ? "flex flex-col gap-4 md:flex-row md:items-center md:justify-between px-5 py-6 md:px-8 border-b border-slate-200 bg-white"
                  : "flex items-center justify-between px-6 py-4 border-b border-slate-800"
              }
            >
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-300">
                  {isCloseMode ? "Finalise Trip" : "Job Card Workspace"}
                </p>
                <h2
                  className={
                    isJobCardFormPage
                      ? "text-2xl md:text-3xl font-bold text-slate-900 mt-1"
                      : "text-lg font-semibold text-white"
                  }
                >
                  {isCloseMode
                    ? "Close Job Card"
                    : editingId
                      ? "Edit Job Card"
                      : "Create Job Card"}
                </h2>
                {isJobCardFormPage && (
                  <p className="text-sm text-slate-600 mt-2">
                    Capture the booking, movement, driver, and allowance details
                    in one clear flow.
                  </p>
                )}
              </div>
              <button
                onClick={() => {
                  if (isSaving) return;
                  setIsModalOpen(false);
                  if (isJobCardFormPage) navigate("/job-cards/");
                }}
                className={
                  isJobCardFormPage
                    ? "inline-flex items-center justify-center gap-2 self-start md:self-auto px-3 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 border border-slate-300 rounded-xl"
                    : "p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                }
              >
                {isJobCardFormPage ? (
                  <ArrowLeft className="w-4 h-4" />
                ) : (
                  <X className="w-4 h-4" />
                )}
                {isJobCardFormPage && "Back to Job Cards"}
              </button>
            </div>

            <div
              className={
                isJobCardFormPage ? "p-5 md:p-8 space-y-6" : "p-6 space-y-5"
              }
            >
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
                        <option
                          className="bg-slate-800 text-white"
                          key={typeOption}
                          value={typeOption}
                        >
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
                    <label
                      htmlFor="job-card-lead"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Lead (PI Sent) *
                    </label>
                    <Select
                      inputId="job-card-lead"
                      options={availableSafariLeads}
                      value={
                        leads.find(
                          (lead) => String(lead.id) === String(form.leadId),
                        ) || null
                      }
                      getOptionValue={(lead) => String(lead.id)}
                      getOptionLabel={(lead) =>
                        `${lead.bookingRef} - ${lead.groupName || lead.clientCompany}`
                      }
                      onChange={(lead) =>
                        onSelectLead(lead ? String(lead.id) : "")
                      }
                      isDisabled={isSaving || Boolean(editingId)}
                      isSearchable
                      placeholder="Select lead"
                      noOptionsMessage={() => "No matching leads"}
                      className="text-sm"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={allocationSelectStyles}
                    />
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
                    <label
                      htmlFor="job-card-lease-allocation"
                      className="block text-xs font-medium text-slate-300 mb-1.5"
                    >
                      Lease Allocation <span className="text-red-400">*</span>
                    </label>
                    <Select
                      inputId="job-card-lease-allocation"
                      options={availableLeaseAllocations}
                      value={
                        availableLeaseAllocations.find(
                          (allocation) =>
                            String(allocation.id) ===
                            String(form.leaseAllocationId),
                        ) || null
                      }
                      getOptionValue={(allocation) => String(allocation.id)}
                      getOptionLabel={(allocation) => {
                        const vehicleLabel = [
                          allocation.vehicleNo,
                          allocation.plateNo,
                        ]
                          .filter(Boolean)
                          .join(" / ");
                        const dateLabel = [
                          allocation.startDate
                            ? formatDate(allocation.startDate)
                            : "",
                          allocation.endDate
                            ? formatDate(allocation.endDate)
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" → ");
                        return `#${allocation.id} - ${allocation.clientName || "Client"}${vehicleLabel ? ` - ${vehicleLabel}` : ""}${dateLabel ? ` (${dateLabel})` : ""}`;
                      }}
                      onChange={(allocation) =>
                        onSelectLeaseAllocation(
                          allocation ? String(allocation.id) : "",
                        )
                      }
                      isDisabled={isSaving || Boolean(editingId)}
                      isSearchable
                      placeholder="Select lease allocation"
                      noOptionsMessage={() => "No matching lease allocations"}
                      className="text-sm"
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      styles={allocationSelectStyles}
                    />
                    {availableLeaseAllocations.length === 0 && (
                      <p className="text-xs text-slate-500 mt-1">
                        No lease allocations available without job cards.
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
                        const driver = users.find(
                          (user) =>
                            Number(user.id) === Number(allocation.driverId),
                        );
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
                                {driver?.contract_type && (
                                  <span className="ml-2 text-xs font-normal text-amber-200">
                                    ({driver.contract_type})
                                  </span>
                                )}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3">
                              <span className="text-xs uppercase tracking-wide text-amber-300">
                                Period
                              </span>
                              <span className="font-semibold text-white">
                                {formatDate(allocation.startDate)} &rarr;{" "}
                                {formatDate(allocation.endDate)}
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
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Vehicles Allocated To This Safari
                    </label>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 space-y-2 shadow-sm">
                      {selectedLeadAllocations.length === 0 ? (
                        <p className="text-xs text-slate-600">
                          No allocations found for this safari lead yet.
                        </p>
                      ) : (
                        selectedLeadAllocations.map((item, index) => (
                          <div
                            key={`${item.vehicleName}-${item.driverName}-${index}`}
                            className="flex items-start justify-between gap-3 border border-slate-200 bg-white rounded-lg px-3 py-2 shadow-sm"
                          >
                            <div className="text-sm text-slate-900">
                              <span className="font-semibold text-slate-900">
                                {item.vehicleName}
                              </span>
                            </div>
                            <div className="text-xs font-medium text-slate-700">
                              Driver:{" "}
                              <span className="text-slate-900">
                                {item.driverName}
                              </span>
                              {item.driverContractType && (
                                <span className="text-amber-700">
                                  {` · Contract: ${item.driverContractType}`}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

                {isSafariType &&
                  !isCloseMode &&
                  allowanceContractTypes.length > 1 && (
                    <div className="md:col-span-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wide text-amber-300">
                          Driver Allowance by Contract Type
                        </label>
                        <p className="text-xs text-amber-200/70 mt-1">
                          Enter the allowance per day for each contract type.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {allowanceContractTypes.map((contractType) => (
                          <div key={contractType}>
                            <label className="block text-xs font-medium text-slate-300 mb-1.5">
                              {contractType}
                            </label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              inputMode="decimal"
                              value={
                                form.driverAllowances?.[contractType] ?? ""
                              }
                              onChange={(event) =>
                                setContractAllowance(
                                  contractType,
                                  event.target.value,
                                )
                              }
                              placeholder="e.g. 50000"
                              className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                            />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-amber-200/80">
                        Combined allowance:{" "}
                        {Number(form.driverAllowance || 0).toLocaleString()}
                      </p>
                    </div>
                  )}

                {(isSafariType || isLeaseType) &&
                  !isCloseMode &&
                  (!isSafariType || allowanceContractTypes.length <= 1) && (
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

                {isSafariType &&
                  !isCloseMode &&
                  selectedLeadAllocations.length > 1 && (
                    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-400 mb-1">
                        Total Allowance (All Cars)
                      </p>
                      <p className="text-lg font-bold text-amber-300">
                        {(() => {
                          const perCar = Number(form.driverAllowance);
                          const nCars = selectedLeadAllocations.length;
                          if (!Number.isFinite(perCar) || perCar <= 0)
                            return "-";
                          return (perCar * nCars).toLocaleString(undefined, {
                            maximumFractionDigits: 2,
                          });
                        })()}
                      </p>
                      <p className="text-xs text-amber-400/70 mt-1">
                        {selectedLeadAllocations.length} car(s) ×{" "}
                        {Number(form.driverAllowance) > 0
                          ? Number(form.driverAllowance).toLocaleString(
                              undefined,
                              { maximumFractionDigits: 2 },
                            )
                          : "0"}{" "}
                        per car
                      </p>
                    </div>
                  )}

                {isSafariType && !isCloseMode && form.leadId && (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-400 mb-1">
                      Total Allowance (All Cars)
                    </p>
                    <p className="text-lg font-bold text-amber-300">
                      {(() => {
                        const perCar = Number(form.driverAllowance);
                        const vehicleCount =
                          selectedLeadAllocations.length > 0
                            ? selectedLeadAllocations.length
                            : 1;

                        if (
                          String(form.driverAllowance || "").trim() === "" ||
                          !Number.isFinite(perCar) ||
                          vehicleCount <= 0
                        ) {
                          return "-";
                        }

                        return (perCar * vehicleCount).toLocaleString(
                          undefined,
                          { maximumFractionDigits: 2 },
                        );
                      })()}
                    </p>
                    <p className="text-xs text-amber-400/70 mt-1">
                      {(selectedLeadAllocations.length > 0
                        ? selectedLeadAllocations.length
                        : 1) + " car(s) × per-car allowance"}
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
                ) : isSafariType || isLeaseType ? (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Status
                    </label>
                    <div className="w-full rounded-lg border border-slate-700 bg-slate-800/40 px-3 py-2.5 text-sm font-medium text-slate-200">
                      {form.status || "Open"}
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Only authorized users can open or close Safari and Lease
                      job cards.
                    </p>
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
                      Vehicle <span className="text-slate-500">(optional)</span>
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
                      Driver <span className="text-slate-500">(optional)</span>
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
                          {activeUsers.find((user) => user.name === driverName)
                            ?.contract_type
                            ? ` (${activeUsers.find((user) => user.name === driverName).contract_type})`
                            : ""}
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
                    {routeSummaryLabel}{" "}
                    <span className="text-slate-500">(optional)</span>
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

              {!isCloseMode && (
                <JobCardRouteMap
                  routePoints={form.routePoints}
                  routeDistanceKm={form.routeDistanceKm}
                  onRouteChange={(routePoints, routeDistanceKm) =>
                    setForm((current) => ({
                      ...current,
                      routePoints,
                      routeDistanceKm,
                    }))
                  }
                />
              )}

              {!isCloseMode && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Additional Distance (KM){" "}
                      <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      inputMode="decimal"
                      value={form.additionalDistanceKm ?? ""}
                      onChange={(event) =>
                        setField("additionalDistanceKm", event.target.value)
                      }
                      placeholder="e.g. 50"
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      Additional Distance Note{" "}
                      <span className="text-slate-500">(optional)</span>
                    </label>
                    <input
                      value={form.additionalDistanceNote ?? ""}
                      onChange={(event) =>
                        setField("additionalDistanceNote", event.target.value)
                      }
                      placeholder="e.g. Game drive"
                      className="w-full bg-slate-800/60 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
                    />
                  </div>
                  <div className="md:col-span-2 rounded-lg border-2 border-amber-300 bg-amber-300 px-3 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-amber-950/30">
                    Total estimated distance:{" "}
                    {calculateEstimatedDistance(
                      form.routeDistanceKm,
                      form.additionalDistanceKm,
                    )?.toLocaleString(undefined, {
                      maximumFractionDigits: 1,
                    }) || "-"}{" "}
                    km
                    <span className="mx-2 text-amber-700">·</span>
                    Fuel allowance:{" "}
                    {calculateFuelAllowance(
                      form.routeDistanceKm,
                      form.additionalDistanceKm,
                    )?.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    }) || "-"}{" "}
                    litres
                    <span className="ml-1 text-slate-700">
                      (total km ÷ 6.5)
                    </span>
                  </div>
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
                  if (isJobCardFormPage) navigate("/job-cards/");
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

      {jobCardId && !selectedJobCard && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading job card details...
        </div>
      )}

      {jobCardId && selectedJobCard && (
        <div className="jobcard-view min-h-screen pb-6">
          <div className="relative w-full bg-white border border-slate-200 rounded-3xl shadow-xl">
            <div className="h-1 bg-gradient-to-r from-amber-400 via-cyan-400 to-emerald-400" />
            <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-slate-200 sticky top-0 bg-white/95 backdrop-blur z-10">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">Jobcard overview</p>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-900">
                  {detailValue(selectedJobCard.jobCardNo)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">{selectedJobCardGroupName} · {detailValue(selectedJobCard.type)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${selectedJobCard.status === "Closed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                  {detailValue(selectedJobCard.status)}
                </span>
                {!embeddedView && hasAllowanceRequest(selectedJobCard) && (
                  <button
                    type="button"
                    onClick={() => handleBulkScheduleAllowances(selectedJobCard)}
                    disabled={bulkScheduling}
                    className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {bulkScheduling ? "Pushing..." : "Push for review"}
                  </button>
                )}
              {!embeddedView && <button
                onClick={closeViewModal}
                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
                aria-label="Close job card details"
              >
                <X className="w-4 h-4" />
              </button>}
              </div>
            </div>

            <div className="p-4 sm:p-6 lg:p-8 space-y-7 text-sm">
              {errorMessage && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</div>}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Type</p>
                  <p className="text-slate-900 mt-1 font-semibold">
                    {detailValue(selectedJobCard.type)}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Status</p>
                  <p className="text-slate-900 mt-1 font-semibold">
                    {detailValue(selectedJobCard.status)}
                  </p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Group Name</p>
                  <p className="text-slate-900 mt-1 font-semibold">{selectedJobCardGroupName}</p>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
                  <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Travel dates</p>
                  <p className="text-slate-900 mt-1 font-semibold">{formatDate(selectedJobCard.safariStartDate)} – {formatDate(selectedJobCard.safariEndDate)}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="text-slate-900 text-base font-bold tracking-tight">
                  Driver/Guide Details
                </h3>
                {selectedJobCard.driverProfiles.map((driver, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"
                  >
                    {[
                      ["Name", driver.name],
                      ["Phone", driver.phone],
                      ["Plate No", driver.plateNo],
                      ["Languages", driver.languages],
                      ["Driver Licence", driver.driverLicense],
                      ["Tour Guide Licence", driver.guideLicense],
                      ["Contract Type", driver.contractType],
                    ].map(([label, value]) => (
                      <p key={label} className="text-slate-300">
                        {label}:{" "}
                        <span className="text-white">{detailValue(value)}</span>
                      </p>
                    ))}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
                  <p className="text-slate-900 font-bold">Schedule</p>
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

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
                  <p className="text-slate-900 font-bold">Client</p>
                  <p className="text-slate-300">
                    Client Name:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.tourOperatorClientName)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
                  <p className="text-slate-900 font-bold">
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
                      <span className="text-white break-words whitespace-pre-wrap">
                        {detailValue(
                          selectedJobCard.location ||
                            selectedJobCard.routeSummary,
                        )}
                      </span>
                    </p>
                  )}
                  <p className="text-slate-300">
                    Route Summary:{" "}
                    <span className="text-white break-words whitespace-pre-wrap">
                      {detailValue(selectedJobCard.routeSummary)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Estimated Route Distance:{" "}
                    <span className="text-white">
                      {selectedJobCard.routeDistanceKm != null
                        ? `${Number(selectedJobCard.routeDistanceKm).toLocaleString()} km`
                        : "-"}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Additional Distance:{" "}
                    <span className="text-white">
                      {selectedJobCard.additionalDistanceKm != null
                        ? `${Number(selectedJobCard.additionalDistanceKm).toLocaleString()} km`
                        : "-"}
                      {selectedJobCard.additionalDistanceNote
                        ? ` (${selectedJobCard.additionalDistanceNote})`
                        : ""}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Total Estimated Distance / Fuel Allowance:{" "}
                    <span className="text-white">
                      {(() => {
                        const total = calculateEstimatedDistance(
                          selectedJobCard.routeDistanceKm,
                          selectedJobCard.additionalDistanceKm,
                        );
                        const fuel = calculateFuelAllowance(
                          selectedJobCard.routeDistanceKm,
                          selectedJobCard.additionalDistanceKm,
                        );
                        return total == null
                          ? "-"
                          : `${total.toLocaleString(undefined, { maximumFractionDigits: 1 })} km / ${fuel.toLocaleString(undefined, { maximumFractionDigits: 2 })} litres`;
                      })()}
                    </span>
                  </p>
                  {Array.isArray(selectedJobCard.routePoints) &&
                    selectedJobCard.routePoints.length > 0 && (
                      <JobCardRouteMap
                        routePoints={selectedJobCard.routePoints}
                        routeDistanceKm={selectedJobCard.routeDistanceKm}
                        readOnly
                      />
                    )}
                  <div className="space-y-2">
                    <p className="text-slate-300">Route Itinerary:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-300">
                          Total Allowance (Itinerary)
                        </p>
                        <p className="text-sm font-semibold text-white mt-1">
                          {itineraryAllowanceTotal > 0
                            ? itineraryAllowanceTotal.toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 2,
                                },
                              )
                            : "-"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-slate-700/60 bg-slate-800/60 px-3 py-2">
                        <p className="text-[11px] uppercase tracking-wide text-slate-300">
                          Driver Allowance (Job Card)
                        </p>
                        <p className="text-sm font-semibold text-white mt-1">
                          {selectedJobCard.driverAllowance != null &&
                          selectedJobCard.driverAllowance !== ""
                            ? Number(
                                selectedJobCard.driverAllowance,
                              ).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })
                            : "-"}
                        </p>
                      </div>
                    </div>
                    {routeItineraryLines.length === 0 ? (
                      <span className="text-slate-600">No itinerary recorded</span>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                        <table className="min-w-full text-sm text-slate-800">
                          <thead className="bg-amber-50 text-slate-800">
                            <tr>
                              <th className="px-3 py-2 text-left font-semibold">
                                Date
                              </th>
                              <th className="px-3 py-2 text-left font-semibold">
                                Description
                              </th>
                              <th className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                                Allowance / day
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {routeItineraryLines.map((line, index) => (
                              <tr
                                key={`view-itinerary-row-${index}`}
                                className="border-t border-slate-200"
                              >
                                <td className="px-3 py-2 text-slate-800 whitespace-nowrap">
                                  {line.date || "-"}
                                </td>
                                <td className="px-3 py-2 text-slate-800 break-words">
                                  {line.dayDescription || "-"}
                                </td>
                                <td className="px-3 py-2 text-slate-800 whitespace-nowrap">
                                  {line.allowancePerDay !== "" &&
                                  line.allowancePerDay !== null &&
                                  line.allowancePerDay !== undefined
                                    ? line.allowancePerDay
                                    : "-"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                  <p className="text-slate-300">
                    Guide Language:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.guideLanguage)}
                    </span>
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
                  <p className="text-slate-900 font-bold">
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
                    <>
                      <p className="text-slate-300">
                        Driver Allowance (Per Car):{" "}
                        <span className="text-white">
                          {selectedJobCard.driverAllowance != null &&
                          selectedJobCard.driverAllowance !== ""
                            ? Number(
                                selectedJobCard.driverAllowance,
                              ).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })
                            : "-"}
                        </span>
                      </p>
                      {selectedJobCardAllowanceBreakdown.length > 0 && (
                        <div className="space-y-1 pt-1">
                          <p className="text-slate-300">
                            Allowance by Contract Type:
                          </p>
                          {selectedJobCardAllowanceBreakdown.map((item) => (
                            <p
                              key={item.contractType}
                              className="pl-3 text-sm text-slate-400"
                            >
                              {item.contractType}:{" "}
                              {Number.isFinite(item.amount)
                                ? item.amount.toLocaleString()
                                : "-"}{" "}
                              per day
                              {item.driverCount > 0
                                ? ` × ${item.driverCount} driver${item.driverCount === 1 ? "" : "s"}`
                                : ""}
                            </p>
                          ))}
                        </div>
                      )}
                      <p className="text-slate-300">
                        Total Allowance (All Cars):{" "}
                        <span className="text-white">
                          {selectedJobCardAllowanceTotal != null
                            ? Number(
                                selectedJobCardAllowanceTotal,
                              ).toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })
                            : "-"}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {selectedJobCardVehicleCount > 0
                          ? `${selectedJobCardVehicleCount} car(s) × per-car allowance`
                          : "No allocated vehicles found"}
                      </p>
                    </>
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
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
                  <p className="text-slate-900 font-bold">
                    Job Card Details
                  </p>
                  <p className="text-slate-300">
                    Type:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.type)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Status:{" "}
                    <span className="text-white">
                      {detailValue(selectedJobCard.status)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Group Name:{" "}
                    <span className="text-white">
                      {selectedJobCardGroupName}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    Start Date:{" "}
                    <span className="text-white">
                      {formatDate(selectedJobCard.safariStartDate)}
                    </span>
                  </p>
                  <p className="text-slate-300">
                    End Date:{" "}
                    <span className="text-white">
                      {formatDate(selectedJobCard.safariEndDate)}
                    </span>
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
                    <span className="text-white break-words whitespace-pre-wrap">
                      {detailValue(selectedJobCard.additionalDetails)}
                    </span>
                  </p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2 shadow-sm">
                  <p className="text-slate-900 font-bold">System Info</p>
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

            <div className="sticky bottom-0 z-20 flex flex-wrap items-center justify-end gap-3 rounded-b-3xl border-t border-slate-200 bg-white px-4 py-4 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] sm:px-6">
              {!embeddedView && hasAllowanceRequest(selectedJobCard) && (
                <button
                  type="button"
                  onClick={() => handleBulkScheduleAllowances(selectedJobCard)}
                  disabled={bulkScheduling}
                  className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bulkScheduling ? "Pushing..." : "Push for review"}
                </button>
              )}
              <button
                type="button"
                onClick={() => embeddedView ? window.parent.postMessage({ type: "close-jobcard-view" }, window.location.origin) : closeViewModal()}
                className="rounded-xl border border-slate-700 bg-slate-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-600"
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
