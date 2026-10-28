import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CarFront,
  Loader2,
  Phone,
  UserRound,
  Users,
} from "lucide-react";
import { apiFetch } from "../utils/api";

const parseDate = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  const dmy = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const parsed = iso
    ? new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]))
    : dmy
      ? new Date(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]))
      : new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const dateKey = (value) => {
  const parsed = parseDate(value);
  if (!parsed) return "";
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
};

const today = dateKey(new Date());

const formatDate = (value) => {
  const parsed = parseDate(value);
  return parsed
    ? `${String(parsed.getDate()).padStart(2, "0")}/${String(parsed.getMonth() + 1).padStart(2, "0")}/${parsed.getFullYear()}`
    : value || "-";
};

const listFrom = (payload, key) =>
  Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.data)
      ? payload.data
      : Array.isArray(payload?.[key])
        ? payload[key]
          : Array.isArray(payload?.jobCards)
            ? payload.jobCards
            : Array.isArray(payload?.job_cards)
              ? payload.job_cards
              : Array.isArray(payload?.allocations)
                ? payload.allocations
        : [];

const isSafari = (type) => String(type || "").toLowerCase().startsWith("safari");

const getAllocationDetails = (card, allocations) => {
  const leadId = card.lead_id ?? card.leadId;
  const groupName =
    card.group_name ||
    card.groupName ||
    card.lead?.group_name ||
    card.lead?.groupName ||
    "Group unavailable";
  const clientName =
    card.tour_operator_client_name ||
    card.tourOperatorClientName ||
    card.client_company ||
    card.clientCompany ||
    card.lead?.client_company ||
    card.lead?.clientCompany ||
    "Client unavailable";
  const matching = allocations.filter(
    (allocation) =>
      String(allocation.lead_id ?? allocation.leadId) === String(leadId),
  );

  if (matching.length === 0) {
    return [
      {
        vehicle:
          card.vehicle_no || card.vehicleNo || card.plate_no || card.plateNo || "Vehicle details unavailable",
        driver: card.driver_details || card.driverDetails || "Driver details unavailable",
        contact: card.driver_phone || card.driverPhone || card.driver_contact || card.driverContact || "",
        group: groupName,
        client: clientName,
      },
    ];
  }

  return matching.map((allocation) => {
    const vehicle = allocation.vehicle || {};
    const driver = allocation.driver || {};
    const vehicleNo =
      vehicle.vehicle_no ||
      vehicle.vehicleNo ||
      allocation.vehicle_no ||
      allocation.vehicleNo ||
      "Vehicle";
    const plateNo =
      vehicle.plate_no ||
      vehicle.plateNo ||
      allocation.plate_no ||
      allocation.plateNo ||
      "";
    return {
      vehicle: plateNo ? `${vehicleNo} (${plateNo})` : vehicleNo,
      driver:
        driver.name ||
        allocation.driver_name ||
        allocation.driverName ||
        "Driver details unavailable",
      contact:
        driver.phone ||
        driver.phone_number ||
        driver.phoneNumber ||
        driver.mobile ||
        driver.mobile_number ||
        driver.mobileNumber ||
        driver.phone_no ||
        driver.phoneNo ||
        driver.contact ||
        driver.contact_number ||
        driver.contactNumber ||
        driver.contact_no ||
        driver.contactNo ||
        driver.telephone ||
        allocation.driver_phone ||
        allocation.driverPhone ||
        allocation.driver_contact ||
        allocation.driverContact ||
        "",
      group:
        allocation.group_name ||
        allocation.groupName ||
        allocation.lead?.group_name ||
        allocation.lead?.groupName ||
        groupName,
      client:
        allocation.client_name ||
        allocation.clientName ||
        allocation.lead?.client_company ||
        allocation.lead?.clientCompany ||
        clientName,
    };
  });
};

const itineraryDates = (card) => {
  let itinerary = card.route_itinerary || card.routeItinerary || [];
  if (typeof itinerary === "string") {
    try {
      itinerary = JSON.parse(itinerary);
    } catch {
      itinerary = [];
    }
  }
  const dates = Array.isArray(itinerary)
    ? itinerary
        .map((item) =>
          dateKey(
            typeof item === "string"
              ? item
              : item?.date || item?.dayDate || item?.dayTitle,
          ),
        )
        .filter(Boolean)
        .sort()
    : [];

  return {
    start: dates[0] || dateKey(card.safari_start_date || card.safariStartDate),
    end:
      dates[dates.length - 1] ||
      dateKey(card.safari_end_date || card.safariEndDate),
  };
};

function MovementPanel({ title, count, details, departure }) {
  const Icon = departure ? ArrowUpRight : ArrowDownLeft;
  const tone = departure
    ? "border-amber-200 bg-amber-50/50 text-amber-800"
    : "border-emerald-200 bg-emerald-50/50 text-emerald-800";

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-white p-2 shadow-sm">
            <Icon className="h-5 w-5" />
          </span>
          <h3 className="text-sm font-bold uppercase tracking-wide">{title}</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-sm font-bold shadow-sm">
          {count} {count === 1 ? "vehicle" : "vehicles"}
        </span>
      </div>

      {details.length === 0 ? (
        <p className="mt-5 rounded-xl border border-dashed border-current/20 bg-white/70 px-4 py-5 text-center text-sm opacity-75">
          No {title.toLowerCase()} on this day
        </p>
      ) : (
        <div className="mt-4 grid gap-3">
          {details.map((detail, index) => {
            const phone = String(detail.contact || "").trim();
            const dialNumber = phone.replace(/[^+\d]/g, "");
            return (
              <div key={`${detail.vehicle}-${index}`} className="rounded-xl border border-slate-200 bg-white p-4 text-slate-800 shadow-sm">
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-slate-100 p-2 text-slate-600">
                    <CarFront className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold leading-6">{detail.vehicle}</p>
                    <p className="mt-0.5 text-sm text-slate-600">
                      <span className="font-medium text-slate-700">{detail.group}</span>
                      <span className="mx-1.5 text-slate-300">•</span>
                      {detail.client}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-3 text-sm">
                  <span className="inline-flex items-center gap-2">
                    <UserRound className="h-4 w-4 text-slate-400" />
                    <span className="font-medium">{detail.driver}</span>
                  </span>
                  {phone ? (
                    <a href={`tel:${dialNumber || phone}`} className="inline-flex items-center gap-2 font-semibold text-teal-700 hover:text-teal-900 hover:underline">
                      <Phone className="h-4 w-4" />
                      {phone}
                    </a>
                  ) : (
                    <span className="inline-flex items-center gap-2 text-slate-400">
                      <Phone className="h-4 w-4" />
                      No phone on file
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DepartureArrivalReport() {
  const [jobCards, setJobCards] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [cardsResponse, allocationsResponse] = await Promise.all([
          apiFetch("/job-cards"),
          apiFetch("/safari-allocations"),
        ]);
        const cardsPayload = await cardsResponse.json().catch(() => ({}));
        const allocationsPayload = await allocationsResponse.json().catch(() => ({}));
        if (!cardsResponse.ok) throw new Error(cardsPayload?.message || "Unable to fetch job cards.");
        if (!allocationsResponse.ok) throw new Error(allocationsPayload?.message || "Unable to fetch safari allocations.");
        setJobCards(listFrom(cardsPayload, "jobCards"));
        setAllocations(listFrom(allocationsPayload, "safariAllocations"));
      } catch (error) {
        setErrorMessage(error.message || "Unable to load the report.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const rows = useMemo(() => {
    const events = new Map();
    jobCards.filter((card) => isSafari(card.type || card.job_type || card.jobType)).forEach((card) => {
      const startEnd = itineraryDates(card);
      const details = getAllocationDetails(card, allocations);
      const vehicleCount = details.length;
      ["start", "end"].forEach((eventType) => {
        const date = startEnd[eventType];
        if (!date) return;
        const isDeparture = eventType === "start";
        const event = events.get(date) || {
          date,
          departures: 0,
          arrivals: 0,
          departureDetails: [],
          arrivalDetails: [],
        };
        event[isDeparture ? "departures" : "arrivals"] += vehicleCount;
        event[isDeparture ? "departureDetails" : "arrivalDetails"].push(...details);
        events.set(date, event);
      });
    });

    const eventRows = Array.from(events.values()).sort((a, b) => a.date.localeCompare(b.date));
    if (eventRows.length === 0 && (!fromDate || !toDate)) return [];
    const start = parseDate(fromDate || eventRows[0]?.date);
    const end = parseDate(toDate || eventRows[eventRows.length - 1]?.date);
    if (!start || !end || start > end) return [];

    const result = [];
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endTime = new Date(end);
    endTime.setHours(0, 0, 0, 0);
    while (cursor <= endTime) {
      const date = dateKey(cursor);
      const event = events.get(date);
      result.push({
        date,
        departures: event?.departures || 0,
        arrivals: event?.arrivals || 0,
        departureDetails: event?.departureDetails || [],
        arrivalDetails: event?.arrivalDetails || [],
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  }, [jobCards, allocations, fromDate, toDate]);

  const totals = rows.reduce(
    (result, row) => ({ departures: result.departures + row.departures, arrivals: result.arrivals + row.arrivals }),
    { departures: 0, arrivals: 0 },
  );

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-amber-400/10 blur-2xl" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-200">
            <CalendarDays className="h-4 w-4" /> Safari operations
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Departure &amp; Arrival Report</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-200">Daily vehicle movements from the first and last days of each safari itinerary.</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <span className="rounded-xl bg-amber-400/20 p-2 text-amber-200"><ArrowUpRight className="h-5 w-5" /></span>
              <div><p className="text-xs font-medium uppercase tracking-wide text-slate-300">Departing vehicles</p><p className="text-2xl font-bold">{totals.departures}</p></div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
              <span className="rounded-xl bg-emerald-400/20 p-2 text-emerald-200"><ArrowDownLeft className="h-5 w-5" /></span>
              <div><p className="text-xs font-medium uppercase tracking-wide text-slate-300">Arriving vehicles</p><p className="text-2xl font-bold">{totals.arrivals}</p></div>
            </div>
          </div>
        </div>
      </header>

      {errorMessage && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {errorMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label="Report date range">
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
            From date
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none [color-scheme:light] focus:border-teal-500" />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
            To date
            <input type="date" value={toDate} min={fromDate || undefined} onChange={(event) => setToDate(event.target.value)} className="mt-1.5 block w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none [color-scheme:light] focus:border-teal-500" />
          </label>
          <button type="button" onClick={() => { setFromDate(""); setToDate(""); }} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Show all dates</button>
        </div>
      </section>

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm"><Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin" />Loading movements…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm"><Users className="mx-auto mb-2 h-7 w-7 text-slate-400" />No dated safari itineraries found for this period.</div>
      ) : (
        <div className="space-y-5">
          {rows.map((row) => (
            <section key={row.date} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5" aria-label={`Movements for ${formatDate(row.date)}`}>
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-4 text-slate-900">
                <CalendarDays className="h-5 w-5 text-teal-700" />
                <h2 className="text-base font-bold">{formatDate(row.date)}</h2>
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                <MovementPanel title="Departures" count={row.departures} details={row.departureDetails} departure />
                <MovementPanel title="Arrivals" count={row.arrivals} details={row.arrivalDetails} />
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
