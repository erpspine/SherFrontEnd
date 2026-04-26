import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Fuel,
  Loader2,
  SendHorizonal,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import Swal from "sweetalert2";
import { apiFetch } from "../utils/api";

const normalizeLead = (lead) => ({
  id: lead.id,
  bookingRef: lead.booking_ref || lead.bookingRef || "",
  clientCompany: lead.client_company || lead.clientCompany || "",
  routeParks: lead.route_parks || lead.routeParks || "",
  startDate: lead.start_date || lead.startDate || "",
  endDate: lead.end_date || lead.endDate || "",
  bookingStatus: lead.booking_status || lead.bookingStatus || "",
  piSentAt: lead.pi_sent_at || lead.piSentAt || "",
});

const isPiSentLead = (lead) => {
  const status = String(lead?.bookingStatus || "")
    .trim()
    .toLowerCase();
  return status === "pi sent" || Boolean(String(lead?.piSentAt || "").trim());
};

const normalizeDistance = (item) => ({
  id: Number(item.id || 0),
  destinationFrom:
    item.destinationFrom ||
    item.from_destination ||
    item.fromDestination ||
    item.destination_from ||
    "",
  destinationTo:
    item.destinationTo ||
    item.to_destination ||
    item.toDestination ||
    item.destination_to ||
    "",
  distanceKm: Number(item.distance_km ?? item.distanceKm ?? item.distance ?? 0),
});

const extractLeads = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.leads)) return payload.leads;
  return [];
};

const extractDistances = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.destinationDistances))
    return payload.destinationDistances;
  if (Array.isArray(payload?.routeDistances)) return payload.routeDistances;
  return [];
};

const createEmptyDayRoute = () => ({
  distanceId: "",
  isCustom: false,
  customRoute: "",
  destinationFrom: "",
  destinationTo: "",
  distanceKm: "",
});

const DAY_THEMES = [
  "bg-gradient-to-r from-sky-100/80 to-sky-50/70",
  "bg-gradient-to-r from-emerald-100/80 to-emerald-50/70",
  "bg-gradient-to-r from-amber-100/80 to-amber-50/70",
  "bg-gradient-to-r from-rose-100/80 to-rose-50/70",
  "bg-gradient-to-r from-violet-100/80 to-violet-50/70",
  "bg-gradient-to-r from-cyan-100/80 to-cyan-50/70",
];

const isValidRouteEntry = (route) => {
  const km = Number(route?.distanceKm || 0);
  if (route?.isCustom) {
    return Boolean(String(route?.customRoute || "").trim()) && km > 0;
  }
  return Boolean(String(route?.distanceId || "").trim()) && km > 0;
};

const normalizeQuotation = (quotation) => ({
  id: Number(quotation.id || 0),
  leadId: Number(quotation.lead_id || quotation.leadId || 0),
  quoteDate:
    quotation.quote_date ||
    quotation.quoteDate ||
    quotation.date ||
    quotation.created_at ||
    quotation.createdAt ||
    "",
  daySections: Array.isArray(quotation.day_sections)
    ? quotation.day_sections
    : Array.isArray(quotation.daySections)
      ? quotation.daySections
      : [],
});

const extractQuotations = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.quotations)) return payload.quotations;
  return [];
};

const splitDestinationText = (value) =>
  String(value || "")
    .split(/\||;|,|\n/)
    .map((part) => part.trim())
    .filter(Boolean);

const parseDayDestinationsFromQuotation = (quotation) => {
  const sections = Array.isArray(quotation?.daySections)
    ? quotation.daySections
    : [];

  return sections.map((section) => {
    const fromDayDescription = splitDestinationText(
      section?.day_description || section?.dayDescription || "",
    );

    const items = Array.isArray(section?.items)
      ? section.items
      : Array.isArray(section?.line_items)
        ? section.line_items
        : [];

    const fromItems = items
      .flatMap((item) => splitDestinationText(item?.description || ""))
      .filter(Boolean);

    return [...new Set([...fromDayDescription, ...fromItems])];
  });
};

const buildSafariDays = (startDate, endDate) => {
  if (!startDate || !endDate) return [];

  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const diff = Math.floor(
    (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diff < 0) return [];

  const totalDays = Math.min(diff + 1, 90);

  return Array.from({ length: totalDays }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);

    return {
      day: index + 1,
      date: date.toISOString().slice(0, 10),
      routes: [createEmptyDayRoute()],
    };
  });
};

export default function FuelRequisitionCreate() {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [distanceOptions, setDistanceOptions] = useState([]);
  const [transportDays, setTransportDays] = useState([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(true);
  const [isLoadingDistances, setIsLoadingDistances] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [form, setForm] = useState({
    leadId: "",
    baseRatePerKm: "",
    reason: "",
  });

  const eligibleLeads = useMemo(
    () => leads.filter((lead) => isPiSentLead(lead)),
    [leads],
  );

  const selectedLead = useMemo(
    () =>
      eligibleLeads.find((lead) => String(lead.id) === String(form.leadId)) ||
      null,
    [eligibleLeads, form.leadId],
  );

  const totalPlannedDistanceKm = useMemo(
    () =>
      transportDays.reduce(
        (sum, day) =>
          sum +
          day.routes.reduce(
            (daySum, route) => daySum + Number(route.distanceKm || 0),
            0,
          ),
        0,
      ),
    [transportDays],
  );

  const totalFuelLitres = useMemo(() => {
    const baseRate = Number(form.baseRatePerKm || 0);
    if (!Number.isFinite(baseRate) || baseRate <= 0) return 0;
    return baseRate * totalPlannedDistanceKm;
  }, [form.baseRatePerKm, totalPlannedDistanceKm]);

  const quoteDayDestinations = useMemo(() => {
    if (!selectedLead) return [];

    const leadQuotations = quotations.filter(
      (quotation) => Number(quotation.leadId) === Number(selectedLead.id),
    );

    if (!leadQuotations.length) return [];

    const latest = [...leadQuotations].sort((a, b) => {
      const aTime = Date.parse(a.quoteDate || "") || 0;
      const bTime = Date.parse(b.quoteDate || "") || 0;
      if (aTime !== bTime) return bTime - aTime;
      return Number(b.id || 0) - Number(a.id || 0);
    })[0];

    return parseDayDestinationsFromQuotation(latest);
  }, [quotations, selectedLead]);

  useEffect(() => {
    const loadLeads = async () => {
      setIsLoadingLeads(true);
      setErrorMessage("");

      try {
        const response = await apiFetch("/leads");
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message || "Unable to load leads.");
        }

        setLeads(extractLeads(payload).map(normalizeLead));
      } catch (error) {
        setErrorMessage(error.message || "Failed to load leads.");
      } finally {
        setIsLoadingLeads(false);
      }
    };

    const loadDistances = async () => {
      setIsLoadingDistances(true);

      try {
        const response = await apiFetch("/destination-distances");
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            payload?.message || "Unable to load destination distances.",
          );
        }

        setDistanceOptions(extractDistances(payload).map(normalizeDistance));
      } catch {
        setDistanceOptions([]);
      } finally {
        setIsLoadingDistances(false);
      }
    };

    const loadQuotations = async () => {
      try {
        const response = await apiFetch("/quotations");
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) return;
        setQuotations(extractQuotations(payload).map(normalizeQuotation));
      } catch {
        setQuotations([]);
      }
    };

    loadLeads();
    loadDistances();
    loadQuotations();
  }, []);

  useEffect(() => {
    if (!form.leadId) return;

    const stillEligible = eligibleLeads.some(
      (lead) => String(lead.id) === String(form.leadId),
    );

    if (!stillEligible) {
      setField("leadId", "");
    }
  }, [eligibleLeads, form.leadId]);

  useEffect(() => {
    if (!selectedLead) {
      setTransportDays([]);
      return;
    }

    setTransportDays((prev) => {
      const generated = buildSafariDays(
        selectedLead.startDate,
        selectedLead.endDate,
      );

      return generated.map((day, index) => {
        const existing = prev[index];
        if (!existing) return day;

        return {
          ...day,
          routes:
            Array.isArray(existing.routes) && existing.routes.length > 0
              ? existing.routes.map((route) => ({
                  distanceId: route.distanceId || "",
                  isCustom: Boolean(route.isCustom),
                  customRoute: route.customRoute || "",
                  destinationFrom: route.destinationFrom || "",
                  destinationTo: route.destinationTo || "",
                  distanceKm:
                    route.distanceKm === "" || route.distanceKm === null
                      ? ""
                      : Number(route.distanceKm || 0),
                }))
              : [createEmptyDayRoute()],
        };
      });
    });
  }, [selectedLead?.id, selectedLead?.startDate, selectedLead?.endDate]);

  const setField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleLeadChange = (leadIdValue) => {
    setField("leadId", leadIdValue);
  };

  const handleDayRouteChange = (dayIndex, routeIndex, distanceIdValue) => {
    const selectedDistance = distanceOptions.find(
      (option) => String(option.id) === String(distanceIdValue),
    );

    setTransportDays((current) =>
      current.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;

        return {
          ...day,
          routes: day.routes.map((route, currentRouteIndex) => {
            if (currentRouteIndex !== routeIndex) return route;

            if (distanceIdValue === "__custom__") {
              return {
                ...route,
                distanceId: "__custom__",
                isCustom: true,
                customRoute: route.customRoute || "",
                destinationFrom: route.customRoute || "",
                destinationTo: "",
                distanceKm: route.distanceKm || "",
              };
            }

            if (!selectedDistance) {
              return createEmptyDayRoute();
            }

            return {
              distanceId: String(selectedDistance.id),
              isCustom: false,
              customRoute: "",
              destinationFrom: selectedDistance.destinationFrom,
              destinationTo: selectedDistance.destinationTo,
              distanceKm: Number(selectedDistance.distanceKm || 0),
            };
          }),
        };
      }),
    );
  };

  const handleCustomRouteChange = (dayIndex, routeIndex, field, value) => {
    setTransportDays((current) =>
      current.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;

        return {
          ...day,
          routes: day.routes.map((route, currentRouteIndex) => {
            if (currentRouteIndex !== routeIndex) return route;

            if (field === "customRoute") {
              return {
                ...route,
                customRoute: value,
                destinationFrom: value,
                destinationTo: "",
              };
            }

            if (field === "distanceKm") {
              return {
                ...route,
                distanceKm: value,
              };
            }

            return route;
          }),
        };
      }),
    );
  };

  const handleAddRouteForDay = (dayIndex) => {
    setTransportDays((current) =>
      current.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;

        return {
          ...day,
          routes: [...day.routes, createEmptyDayRoute()],
        };
      }),
    );
  };

  const handleRemoveRouteForDay = (dayIndex, routeIndex) => {
    setTransportDays((current) =>
      current.map((day, currentDayIndex) => {
        if (currentDayIndex !== dayIndex) return day;

        if (day.routes.length <= 1) {
          return {
            ...day,
            routes: [createEmptyDayRoute()],
          };
        }

        return {
          ...day,
          routes: day.routes.filter((_, idx) => idx !== routeIndex),
        };
      }),
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    const baseRatePerKm = Number(form.baseRatePerKm);

    if (!form.leadId) {
      setErrorMessage("Please select a lead.");
      return;
    }

    if (!Number.isFinite(baseRatePerKm) || baseRatePerKm <= 0) {
      setErrorMessage("Please enter base fuel rate per KM greater than 0.");
      return;
    }

    if (!form.reason.trim()) {
      setErrorMessage("Please provide a reason for this requisition.");
      return;
    }

    if (transportDays.length > 0) {
      const hasMissingRoute = transportDays.some(
        (day) =>
          !Array.isArray(day.routes) ||
          day.routes.length === 0 ||
          day.routes.some((route) => !isValidRouteEntry(route)),
      );
      if (hasMissingRoute) {
        setErrorMessage(
          "Please complete all day routes. Custom routes require route name and distance KM.",
        );
        return;
      }
    }

    setIsSaving(true);
    try {
      const response = await apiFetch("/fuel-requisitions", {
        method: "POST",
        body: {
          leadId: Number(form.leadId),
          litres: Number(totalFuelLitres.toFixed(2)),
          baseRatePerKm,
          reason: form.reason.trim(),
          transportItinerary: transportDays.map((day) => ({
            day: day.day,
            date: day.date,
            destinations: day.routes.map((route) => ({
              destinationFrom:
                route.isCustom && route.customRoute
                  ? route.customRoute
                  : route.destinationFrom,
              destinationTo: route.isCustom ? "" : route.destinationTo,
              distanceKm: Number(route.distanceKm || 0),
            })),
            distanceKm: day.routes.reduce(
              (sum, route) => sum + Number(route.distanceKm || 0),
              0,
            ),
          })),
          totalDistanceKm: totalPlannedDistanceKm,
          totalFuelLitres: Number(totalFuelLitres.toFixed(2)),
        },
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          payload?.message || "Unable to create fuel requisition.",
        );
      }

      await Swal.fire({
        title: "Submitted",
        text: "Fuel requisition created and notification email sent.",
        icon: "success",
        timer: 1700,
        showConfirmButton: false,
        background: "#0f172a",
        color: "#e2e8f0",
      });

      navigate("/fuel-requisitions", { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "Failed to submit fuel requisition.");
      await Swal.fire({
        title: "Submission Failed",
        text: error.message || "Failed to submit fuel requisition.",
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            New Fuel Requisition
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Select a lead, set base fuel rate per KM, and submit the reason.
          </p>
        </div>

        <Link
          to="/fuel-requisitions"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to List
        </Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-sher-teal/10 to-sher-gold/10 px-6 py-4">
          <div className="rounded-xl border border-sher-teal/20 bg-white p-2 text-sher-teal">
            <Fuel className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Fuel Request Details
            </h2>
            <p className="text-sm text-slate-600">
              This request will trigger notification emails to opted-in users.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {errorMessage && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <label className="block lg:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Lead
              </span>
              <select
                value={form.leadId}
                onChange={(event) => handleLeadChange(event.target.value)}
                disabled={isLoadingLeads || isSaving}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                <option value="">Select lead</option>
                {eligibleLeads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.bookingRef || `Lead #${lead.id}`} -{" "}
                    {lead.clientCompany || "No company"}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Base Fuel Rate (per KM)
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.baseRatePerKm}
                onChange={(event) =>
                  setField("baseRatePerKm", event.target.value)
                }
                disabled={isSaving}
                placeholder="e.g. 0.18"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-semibold text-slate-700">
                Total Fuel (Litres)
              </span>
              <input
                readOnly
                value={Number(totalFuelLitres || 0).toFixed(2)}
                className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm font-semibold text-slate-900 outline-none"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Auto: Base Rate x Total Distance KM
              </span>
            </label>
          </div>

          {selectedLead && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <div className="font-semibold text-slate-800">
                Selected Lead Snapshot
              </div>
              <div className="mt-1">
                Booking Ref: {selectedLead.bookingRef || "-"}
              </div>
              <div>Route/Parks: {selectedLead.routeParks || "-"}</div>
              <div>
                Dates: {selectedLead.startDate || "-"} to{" "}
                {selectedLead.endDate || "-"}
              </div>
              <div>Safari Days: {transportDays.length}</div>
              <div>
                Quote Day Destinations Available: {quoteDayDestinations.length}
              </div>
            </div>
          )}

          {selectedLead && (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-4">
              <div className="text-sm font-semibold text-slate-800">
                Transport Itinerary (Day-by-Day)
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Days are auto-generated from lead start and end dates. Select a
                route for each day and the KM is filled automatically.
              </p>

              {!selectedLead.startDate || !selectedLead.endDate ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  Lead dates are required to generate itinerary days.
                </div>
              ) : transportDays.length === 0 ? (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  No safari days found from selected lead dates.
                </div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Day</th>
                        <th className="w-56 px-3 py-2">Date</th>
                        <th className="px-3 py-2">Routes</th>
                        <th className="px-3 py-2">Day Distance (KM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transportDays.map((day, index) => (
                        <tr
                          key={`${day.day}-${day.date}`}
                          className={DAY_THEMES[index % DAY_THEMES.length]}
                        >
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            Day {day.day}
                          </td>
                          <td className="w-56 px-3 py-2 align-top text-slate-600">
                            <div>{day.date}</div>
                            {Array.isArray(quoteDayDestinations[index]) &&
                              quoteDayDestinations[index].length > 0 && (
                                <div className="mt-1 max-w-[220px] whitespace-normal break-words text-[11px] font-medium leading-4 text-slate-700">
                                  {quoteDayDestinations[index].join(" | ")}
                                </div>
                              )}
                          </td>
                          <td className="px-3 py-2">
                            <div className="space-y-2">
                              {day.routes.map((route, routeIndex) => (
                                <div
                                  key={`${day.day}-${routeIndex}`}
                                  className="rounded-lg border border-slate-200 bg-white/80 p-2"
                                >
                                  <div className="flex items-center gap-2">
                                    <select
                                      value={
                                        route.isCustom
                                          ? "__custom__"
                                          : route.distanceId
                                      }
                                      onChange={(event) =>
                                        handleDayRouteChange(
                                          index,
                                          routeIndex,
                                          event.target.value,
                                        )
                                      }
                                      disabled={isLoadingDistances || isSaving}
                                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                                    >
                                      <option value="">
                                        {isLoadingDistances
                                          ? "Loading routes..."
                                          : "Select route"}
                                      </option>
                                      {distanceOptions.map((option) => (
                                        <option
                                          key={option.id}
                                          value={option.id}
                                        >
                                          {option.destinationFrom} to{" "}
                                          {option.destinationTo}
                                        </option>
                                      ))}
                                      <option value="__custom__">
                                        Other (type route)
                                      </option>
                                    </select>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleRemoveRouteForDay(
                                          index,
                                          routeIndex,
                                        )
                                      }
                                      disabled={isSaving}
                                      className="inline-flex items-center justify-center rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                                      title="Remove destination"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </button>
                                  </div>

                                  {route.isCustom && (
                                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                      <input
                                        value={route.customRoute || ""}
                                        onChange={(event) =>
                                          handleCustomRouteChange(
                                            index,
                                            routeIndex,
                                            "customRoute",
                                            event.target.value,
                                          )
                                        }
                                        disabled={isSaving}
                                        placeholder="Type custom route"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
                                      />
                                      <input
                                        type="number"
                                        min="0.1"
                                        step="0.1"
                                        value={route.distanceKm}
                                        onChange={(event) =>
                                          handleCustomRouteChange(
                                            index,
                                            routeIndex,
                                            "distanceKm",
                                            event.target.value,
                                          )
                                        }
                                        disabled={isSaving}
                                        placeholder="Distance KM"
                                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
                                      />
                                    </div>
                                  )}

                                  <div className="mt-2 text-xs font-semibold text-slate-700">
                                    Distance:{" "}
                                    {Number(
                                      route.distanceKm || 0,
                                    ).toLocaleString()}{" "}
                                    km
                                  </div>
                                </div>
                              ))}

                              <button
                                type="button"
                                onClick={() => handleAddRouteForDay(index)}
                                disabled={isSaving}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Add destination
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-800">
                            {day.routes
                              .reduce(
                                (sum, route) =>
                                  sum + Number(route.distanceKm || 0),
                                0,
                              )
                              .toLocaleString()}{" "}
                            km
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="mt-3 flex justify-end">
                    <div className="rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-semibold text-cyan-800">
                      Total Distance: {totalPlannedDistanceKm.toLocaleString()}{" "}
                      km
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-slate-700">
              Reason
            </span>
            <textarea
              rows={5}
              value={form.reason}
              onChange={(event) => setField("reason", event.target.value)}
              disabled={isSaving}
              placeholder="Explain why this fuel is needed."
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sher-gold focus:ring-4 focus:ring-sher-gold/20"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={isSaving || isLoadingLeads}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sher-gold to-sher-gold-dark px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SendHorizonal className="h-4 w-4" />
              )}
              {isSaving ? "Submitting..." : "Submit Requisition"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/fuel-requisitions")}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
