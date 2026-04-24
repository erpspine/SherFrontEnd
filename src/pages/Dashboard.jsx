import { useEffect, useMemo, useState } from "react";
import {
  Car,
  DollarSign,
  FileText,
  TrendingUp,
  ArrowUpRight,
  MoreVertical,
  ClipboardList,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  UserCheck,
  MapPin,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";
import { apiFetch } from "../utils/api";

const formatCurrency = (value) => `USD ${Number(value || 0).toLocaleString()}`;

const statusColor = (status) => {
  switch (status) {
    case "Approved":
      return "bg-green-100 text-green-700 border-green-200";
    case "Sent":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "Draft":
      return "bg-slate-100 text-slate-700 border-slate-200";
    case "Rejected":
      return "bg-red-100 text-red-700 border-red-200";
    case "Converted":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const allocationStatusColor = (status) => {
  switch ((status || "").toLowerCase()) {
    case "assigned":
      return "bg-sky-100 text-sky-700 border-sky-200";
    case "confirmed":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "completed":
      return "bg-indigo-100 text-indigo-700 border-indigo-200";
    case "cancelled":
    case "canceled":
      return "bg-rose-100 text-rose-700 border-rose-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
};

const bookingColorClasses = (bookingRef) => {
  const palette = [
    {
      badge: "bg-sky-100 text-sky-700 border border-sky-200",
      dayContainer: "border-sky-300 bg-sky-50",
      dayText: "text-sky-700",
    },
    {
      badge: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      dayContainer: "border-emerald-300 bg-emerald-50",
      dayText: "text-emerald-700",
    },
    {
      badge: "bg-violet-100 text-violet-700 border border-violet-200",
      dayContainer: "border-violet-300 bg-violet-50",
      dayText: "text-violet-700",
    },
    {
      badge: "bg-amber-100 text-amber-700 border border-amber-200",
      dayContainer: "border-amber-300 bg-amber-50",
      dayText: "text-amber-700",
    },
    {
      badge: "bg-rose-100 text-rose-700 border border-rose-200",
      dayContainer: "border-rose-300 bg-rose-50",
      dayText: "text-rose-700",
    },
    {
      badge: "bg-cyan-100 text-cyan-700 border border-cyan-200",
      dayContainer: "border-cyan-300 bg-cyan-50",
      dayText: "text-cyan-700",
    },
  ];

  const key = String(bookingRef || "-");
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }

  return palette[Math.abs(hash) % palette.length];
};

const getCalendarDayClasses = (dayAllocations = []) => {
  const bookingRefs = new Set(
    dayAllocations
      .map((allocation) => String(allocation?.bookingRef || "").trim())
      .filter(Boolean),
  );

  if (bookingRefs.size === 1) {
    const onlyRef = Array.from(bookingRefs)[0];
    const bookingClasses = bookingColorClasses(onlyRef);
    return {
      container: bookingClasses.dayContainer,
      text: bookingClasses.dayText,
    };
  }

  if (bookingRefs.size > 1) {
    return {
      container: "border-fuchsia-300 bg-fuchsia-50",
      text: "text-fuchsia-700",
    };
  }

  const statusSet = new Set(
    dayAllocations
      .map((allocation) => String(allocation?.status || "").toLowerCase())
      .filter(Boolean),
  );

  if (statusSet.size > 1) {
    return {
      container: "border-violet-300 bg-violet-50",
      text: "text-violet-700",
    };
  }

  if (statusSet.has("cancelled") || statusSet.has("canceled")) {
    return {
      container: "border-rose-300 bg-rose-50",
      text: "text-rose-700",
    };
  }

  if (statusSet.has("completed")) {
    return {
      container: "border-indigo-300 bg-indigo-50",
      text: "text-indigo-700",
    };
  }

  if (statusSet.has("confirmed")) {
    return {
      container: "border-emerald-300 bg-emerald-50",
      text: "text-emerald-700",
    };
  }

  return {
    container: "border-sky-300 bg-sky-50",
    text: "text-sky-700",
  };
};

const normalizeVehicle = (vehicle) => ({
  id: vehicle.id,
  status: vehicle.status || "Available",
  make: vehicle.make || "Unknown",
  vehicleNo: vehicle.vehicle_no || vehicle.vehicleNo || "",
  registrationNo:
    vehicle.registration_no ||
    vehicle.registrationNo ||
    vehicle.plate_no ||
    vehicle.plateNo ||
    "",
  plateNo: vehicle.plate_no || vehicle.plateNo || "",
  model: vehicle.model || "",
});

const normalizeLead = (lead) => ({
  id: lead.id,
  createdAt: lead.created_at || lead.createdAt || "",
  bookingRef: lead.booking_ref || lead.bookingRef || "-",
  startDate: lead.start_date || lead.startDate || "",
  endDate: lead.end_date || lead.endDate || "",
  routeParks: lead.route_parks || lead.routeParks || "-",
});

const normalizeQuotation = (quotation) => ({
  id: quotation.id,
  quoteNo: quotation.quote_no || quotation.quoteNo || `Q-${quotation.id}`,
  client: quotation.client || "",
  status: quotation.status || "Draft",
  total: Number(quotation.total || 0),
  date:
    quotation.quote_date ||
    quotation.quoteDate ||
    quotation.created_at ||
    quotation.createdAt ||
    "",
  serviceSummary:
    quotation.service_summary ||
    quotation.serviceSummary ||
    quotation.notes ||
    "Service",
});

const normalizePI = (pi) => ({
  id: pi.id,
  total: Number(pi.total || 0),
  date:
    pi.quoteDate ||
    pi.quote_date ||
    pi.createdAt ||
    pi.created_at ||
    pi.date ||
    "",
});

const normalizeAllocation = (allocation) => ({
  id: allocation.id,
  leadId: Number(allocation.lead_id || allocation.leadId || 0),
  vehicleId: Number(allocation.vehicle_id || allocation.vehicleId || 0),
  driverId: Number(allocation.driver_id || allocation.driverId || 0),
  proformaInvoiceId: Number(
    allocation.proforma_invoice_id || allocation.proformaInvoiceId || 0,
  ),
  status: allocation.status || "Assigned",
  notes: allocation.notes || "",
  createdAt: allocation.created_at || allocation.createdAt || "",
  updatedAt: allocation.updated_at || allocation.updatedAt || "",
  lead: allocation.lead ? normalizeLead(allocation.lead) : null,
  vehicle: allocation.vehicle ? normalizeVehicle(allocation.vehicle) : null,
  driver: allocation.driver
    ? {
        id: Number(allocation.driver.id || 0),
        name: allocation.driver.name || "",
      }
    : null,
});

const extractList = (payload, keys) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  return [];
};

const getCalendarDays = (year, month) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  const days = [];
  for (let i = 0; i < startingDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
};

const toLocalDateKey = (value) => {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getRecentMonths = (count = 6) => {
  const months = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    months.push({ key, name: d.toLocaleString("en-US", { month: "short" }) });
  }
  return months;
};

const emptyDashboard = {
  stats: {
    totalFleet: 0,
    activeLeases: 0,
    monthlyRevenue: 0,
    openQuotations: 0,
  },
  revenueData: [],
  fleetDistribution: [],
  leadActivity: [],
  recentQuotations: [],
  fleetAvailability: [],
};

const normalizeDashboardResponse = (data) => {
  const revenueMap = new Map();
  (Array.isArray(data.revenueData) ? data.revenueData : []).forEach((row) => {
    const name = row?.name || "-";
    const revenue = Number(row?.revenue || 0);
    revenueMap.set(name, (revenueMap.get(name) || 0) + revenue);
  });

  const revenueData = Array.from(revenueMap.entries()).map(
    ([name, revenue]) => ({
      name,
      revenue,
    }),
  );

  return {
    stats: {
      totalFleet: Number(data?.stats?.totalFleet || 0),
      activeLeases: Number(data?.stats?.activeLeases || 0),
      monthlyRevenue: Number(data?.stats?.monthlyRevenue || 0),
      openQuotations: Number(data?.stats?.openQuotations || 0),
    },
    revenueData,
    fleetDistribution: (Array.isArray(data.fleetDistribution)
      ? data.fleetDistribution
      : []
    ).map((item) => ({
      name: item?.name || "Unknown",
      value: Number(item?.value || 0),
      color: item?.color || "#c9a236",
    })),
    leadActivity: (Array.isArray(data.leadActivity)
      ? data.leadActivity
      : []
    ).map((item) => ({
      name: item?.name || "-",
      leads: Number(item?.leads || 0),
    })),
    recentQuotations: (Array.isArray(data.recentQuotations)
      ? data.recentQuotations
      : []
    ).map((item) => ({
      id: item?.id,
      quoteNo: item?.quoteNo || item?.quote_no || "-",
      client: item?.client || "",
      serviceSummary:
        item?.serviceSummary || item?.service_summary || "Service",
      amount:
        typeof item?.amount === "string"
          ? item.amount
          : formatCurrency(Number(item?.amount || 0)),
      status: item?.status || "Draft",
    })),
    fleetAvailability: (Array.isArray(data.fleetAvailability)
      ? data.fleetAvailability
      : []
    ).map((item) => ({
      label: item?.label || "Unknown",
      count: Number(item?.count || 0),
      color: item?.color || "from-slate-500 to-slate-600",
      bg: item?.bg || "bg-slate-100",
      text: item?.text || "text-slate-700",
    })),
  };
};

export default function Dashboard() {
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [allocations, setAllocations] = useState([]);
  const [leads, setLeads] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDateKey, setSelectedDateKey] = useState(
    toLocalDateKey(new Date()),
  );

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage("");

      let dashboardLoaded = false;

      try {
        // Fast path: load dashboard summary and allocations in parallel.
        const [dashboardRes, allocationsRes] = await Promise.all([
          apiFetch("/dashboard"),
          apiFetch("/safari-allocations"),
        ]);

        const [dashboardPayload, allocationsPayload] = await Promise.all([
          dashboardRes.json().catch(() => ({})),
          allocationsRes.json().catch(() => ({})),
        ]);

        if (allocationsRes.ok) {
          const allocationsList = extractList(allocationsPayload, [
            "safariAllocations",
            "safari_allocations",
            "allocations",
          ]).map(normalizeAllocation);
          setAllocations(allocationsList);

          // Use nested allocation relations immediately for calendar details.
          const nestedLeads = allocationsList
            .map((allocation) => allocation.lead)
            .filter(Boolean);
          const nestedVehicles = allocationsList
            .map((allocation) => allocation.vehicle)
            .filter(Boolean);
          const nestedUsers = allocationsList
            .map((allocation) => allocation.driver)
            .filter(Boolean);

          if (nestedLeads.length > 0) setLeads(nestedLeads);
          if (nestedVehicles.length > 0) setVehicles(nestedVehicles);
          if (nestedUsers.length > 0) setUsers(nestedUsers);
        }

        if (dashboardRes.ok) {
          const data =
            dashboardPayload?.data ||
            dashboardPayload?.dashboard ||
            dashboardPayload;
          if (data?.stats) {
            setDashboard(normalizeDashboardResponse(data));
            dashboardLoaded = true;
          }
        }
      } catch {
        // Fallback below handles current APIs.
      }

      try {
        if (dashboardLoaded) {
          setIsLoading(false);
          return;
        }

        const [vehiclesRes, leadsRes, quotationsRes, piRes, allocationsRes] =
          await Promise.all([
            apiFetch("/vehicles"),
            apiFetch("/leads"),
            apiFetch("/quotations"),
            apiFetch("/proforma-invoices"),
            apiFetch("/safari-allocations"),
          ]);

        const [
          vehiclesPayload,
          leadsPayload,
          quotationsPayload,
          piPayload,
          allocationsPayload,
        ] = await Promise.all([
          vehiclesRes.json().catch(() => ({})),
          leadsRes.json().catch(() => ({})),
          quotationsRes.json().catch(() => ({})),
          piRes.json().catch(() => ({})),
          allocationsRes.json().catch(() => ({})),
        ]);

        const vehiclesList = vehiclesRes.ok
          ? extractList(vehiclesPayload, ["vehicles"]).map(normalizeVehicle)
          : [];
        const leadsList = leadsRes.ok
          ? extractList(leadsPayload, ["leads"]).map(normalizeLead)
          : [];
        const quotations = quotationsRes.ok
          ? extractList(quotationsPayload, ["quotations"]).map(
              normalizeQuotation,
            )
          : [];
        const proformaInvoices = piRes.ok
          ? extractList(piPayload, [
              "proformaInvoices",
              "proforma_invoices",
              "invoices",
            ]).map(normalizePI)
          : [];
        const allocationsList = allocationsRes.ok
          ? extractList(allocationsPayload, [
              "safariAllocations",
              "safari_allocations",
              "allocations",
            ]).map(normalizeAllocation)
          : [];

        const usersList = allocationsList
          .map((allocation) => allocation.driver)
          .filter(Boolean)
          .map((driver) => ({ id: driver.id, name: driver.name || "" }));

        setAllocations(allocationsList);
        setLeads(leadsList);
        setVehicles(vehiclesList);
        setUsers(usersList);

        const totalFleet = vehiclesList.length;
        const activeLeases = vehiclesList.filter(
          (v) => v.status === "On Lease",
        ).length;
        const openQuotations = quotations.filter((q) =>
          ["Draft", "Sent", "Approved"].includes(q.status),
        ).length;

        const now = new Date();
        const monthBuckets = getRecentMonths(6).map((m) => ({
          name: m.name,
          key: m.key,
          revenue: 0,
        }));
        const monthMap = new Map(monthBuckets.map((m) => [m.key, m]));
        proformaInvoices.forEach((pi) => {
          const d = new Date(pi.date);
          if (Number.isNaN(d.getTime())) return;
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          const bucket = monthMap.get(key);
          if (bucket) bucket.revenue += pi.total;
        });
        const monthlyRevenue =
          monthBuckets.length > 0
            ? Number(monthBuckets[monthBuckets.length - 1].revenue || 0)
            : 0;

        const makeCounts = vehiclesList.reduce((acc, v) => {
          acc[v.make] = (acc[v.make] || 0) + 1;
          return acc;
        }, {});
        const palette = [
          "#c9a236",
          "#1d4e5f",
          "#e31b24",
          "#10b981",
          "#f59e0b",
          "#8b5cf6",
        ];
        const fleetDistribution = Object.entries(makeCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value], index) => ({
            name,
            value,
            color: palette[index % palette.length],
          }));

        const recent7 = Array.from({ length: 7 }, (_, idx) => {
          const d = new Date(now);
          d.setDate(now.getDate() - (6 - idx));
          return {
            key: d.toISOString().split("T")[0],
            name: d.toLocaleString("en-US", { weekday: "short" }),
            leads: 0,
          };
        });
        const dayMap = new Map(recent7.map((d) => [d.key, d]));
        leadsList.forEach((lead) => {
          const d = new Date(lead.createdAt);
          if (Number.isNaN(d.getTime())) return;
          const key = d.toISOString().split("T")[0];
          const bucket = dayMap.get(key);
          if (bucket) bucket.leads += 1;
        });

        const recentQuotations = [...quotations]
          .sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
          )
          .slice(0, 5)
          .map((q) => ({
            id: q.id,
            quoteNo: q.quoteNo,
            client: q.client,
            serviceSummary: q.serviceSummary,
            amount: formatCurrency(q.total),
            status: q.status,
          }));

        const availabilityStatuses = [
          "Available",
          "On Lease",
          "Maintenance",
          "Retired",
        ];
        const availabilityStyles = {
          Available: {
            color: "from-green-500 to-emerald-500",
            bg: "bg-green-500/10",
            text: "text-green-400",
          },
          "On Lease": {
            color: "from-amber-400 to-amber-600",
            bg: "bg-blue-500/10",
            text: "text-blue-400",
          },
          Maintenance: {
            color: "from-amber-500 to-yellow-500",
            bg: "bg-amber-500/10",
            text: "text-amber-400",
          },
          Retired: {
            color: "from-red-500 to-rose-500",
            bg: "bg-red-500/10",
            text: "text-red-400",
          },
        };
        const fleetAvailability = availabilityStatuses.map((label) => ({
          label,
          count: vehiclesList.filter((v) => v.status === label).length,
          ...availabilityStyles[label],
        }));

        if (!dashboardLoaded) {
          setDashboard({
            stats: {
              totalFleet,
              activeLeases,
              monthlyRevenue,
              openQuotations,
            },
            revenueData: monthBuckets,
            fleetDistribution,
            leadActivity: recent7,
            recentQuotations,
            fleetAvailability,
          });
        }
      } catch (error) {
        setErrorMessage(error.message || "Failed to load dashboard data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboard();
  }, []);

  const statsCards = useMemo(
    () => [
      {
        title: "Total Fleet",
        value: String(dashboard.stats.totalFleet),
        subtitle: "vehicles registered",
        icon: Car,
        color: "from-amber-400 to-amber-600",
        bgColor: "bg-amber-100",
        textColor: "text-amber-700",
      },
      {
        title: "Active Leases",
        value: String(dashboard.stats.activeLeases),
        subtitle: "currently on lease",
        icon: ClipboardList,
        color: "from-green-500 to-emerald-500",
        bgColor: "bg-emerald-100",
        textColor: "text-emerald-700",
      },
      {
        title: "Monthly Revenue",
        value: formatCurrency(dashboard.stats.monthlyRevenue),
        subtitle: "this month",
        icon: DollarSign,
        color: "from-cyan-500 to-teal-500",
        bgColor: "bg-cyan-100",
        textColor: "text-cyan-700",
      },
      {
        title: "Open Quotations",
        value: String(dashboard.stats.openQuotations),
        subtitle: "draft/sent/approved",
        icon: FileText,
        color: "from-amber-500 to-orange-500",
        bgColor: "bg-orange-100",
        textColor: "text-orange-700",
      },
    ],
    [dashboard.stats],
  );

  const leadsById = useMemo(
    () =>
      new Map(
        leads
          .filter((lead) => Number(lead.id) > 0)
          .map((lead) => [Number(lead.id), lead]),
      ),
    [leads],
  );

  const vehiclesById = useMemo(
    () =>
      new Map(
        vehicles
          .filter((vehicle) => Number(vehicle.id) > 0)
          .map((vehicle) => [Number(vehicle.id), vehicle]),
      ),
    [vehicles],
  );

  const usersById = useMemo(
    () =>
      new Map(
        users
          .filter((user) => Number(user.id) > 0)
          .map((user) => [Number(user.id), user]),
      ),
    [users],
  );

  const calendarAllocations = useMemo(() => {
    const map = new Map();
    allocations.forEach((allocation) => {
      const lead = allocation.lead || leadsById.get(Number(allocation.leadId));
      if (!lead) return;

      const start = new Date(lead.startDate);
      const end = new Date(lead.endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateKey = toLocalDateKey(d);
        if (!dateKey) continue;
        if (!map.has(dateKey)) map.set(dateKey, []);

        const vehicle =
          allocation.vehicle || vehiclesById.get(Number(allocation.vehicleId));
        const driver =
          allocation.driver || usersById.get(Number(allocation.driverId));

        map.get(dateKey).push({
          vehicleId: allocation.vehicleId,
          driverId: allocation.driverId,
          vehicleNo: vehicle?.vehicleNo || vehicle?.plateNo || "Unknown",
          registrationNo:
            vehicle?.registrationNo || vehicle?.plateNo || "Unknown",
          plateNo: vehicle?.plateNo || "-",
          vehicleMake: vehicle?.make || "",
          vehicleModel: vehicle?.model || "",
          driverName: driver?.name || "Unknown",
          status: allocation.status,
          bookingRef: lead.bookingRef || "-",
          routeParks: lead.routeParks || "-",
          startDate: lead.startDate || "",
          endDate: lead.endDate || "",
          notes: allocation.notes || "",
        });
      }
    });
    return map;
  }, [allocations, leadsById, vehiclesById, usersById]);

  const selectedDayAllocations = useMemo(
    () => calendarAllocations.get(selectedDateKey) || [],
    [calendarAllocations, selectedDateKey],
  );

  const upcomingAllocations = useMemo(() => {
    const now = new Date();

    return allocations
      .map((allocation) => {
        const lead =
          allocation.lead || leadsById.get(Number(allocation.leadId));
        if (!lead) return null;

        const vehicle =
          allocation.vehicle || vehiclesById.get(Number(allocation.vehicleId));
        const driver =
          allocation.driver || usersById.get(Number(allocation.driverId));

        const startDate = new Date(lead.startDate || "");
        const endDate = new Date(lead.endDate || "");

        return {
          allocation,
          lead,
          vehicle,
          driver,
          startDate,
          endDate,
        };
      })
      .filter(Boolean)
      .filter((item) => {
        if (Number.isNaN(item.endDate.getTime())) return true;
        return (
          item.endDate >=
          new Date(now.getFullYear(), now.getMonth(), now.getDate())
        );
      })
      .sort((a, b) => {
        const aTime = Number.isNaN(a.startDate.getTime())
          ? Number.POSITIVE_INFINITY
          : a.startDate.getTime();
        const bTime = Number.isNaN(b.startDate.getTime())
          ? Number.POSITIVE_INFINITY
          : b.startDate.getTime();
        return aTime - bTime;
      })
      .slice(0, 6);
  }, [allocations, leadsById, usersById, vehiclesById]);

  useEffect(() => {
    const monthPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-`;
    const selectedIsInMonth = selectedDateKey?.startsWith(monthPrefix);
    const selectedHasAllocations = calendarAllocations.has(selectedDateKey);

    if (selectedIsInMonth && selectedHasAllocations) return;

    const firstAllocatedDateInMonth = Array.from(calendarAllocations.keys())
      .filter((key) => key.startsWith(monthPrefix))
      .sort()[0];

    if (
      firstAllocatedDateInMonth &&
      firstAllocatedDateInMonth !== selectedDateKey
    ) {
      setSelectedDateKey(firstAllocatedDateInMonth);
    }
  }, [calendarAllocations, calendarMonth, calendarYear, selectedDateKey]);

  const calendarDays = useMemo(
    () => getCalendarDays(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  const totalRevenue = dashboard.revenueData.reduce(
    (sum, point) => sum + Number(point.revenue || 0),
    0,
  );

  const utilizationRate = dashboard.stats.totalFleet
    ? Math.round(
        (dashboard.stats.activeLeases / dashboard.stats.totalFleet) * 100,
      )
    : 0;

  return (
    <div className="space-y-6 md:space-y-7">
      <section className="relative overflow-hidden rounded-3xl border border-amber-300/40 bg-[linear-gradient(135deg,rgba(255,248,231,0.95),rgba(233,247,244,0.96))] px-5 py-6 sm:px-7 sm:py-7 shadow-[0_18px_60px_rgba(129,91,0,0.12)]">
        <div className="absolute -top-28 -right-16 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute -bottom-24 left-0 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="inline-flex items-center rounded-full border border-amber-300/50 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">
              Operations Snapshot
            </p>
            <h1 className="mt-3 text-2xl font-bold text-slate-800 sm:text-3xl">
              Sher ERP Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Live visibility across fleet operations, safari allocations,
              revenue flow, and quotation momentum.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Fleet Utilization
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-800">
                {utilizationRate}%
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                6-Month Revenue
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-800">
                {formatCurrency(totalRevenue)}
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/75 px-4 py-3 col-span-2 sm:col-span-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-500">
                Open Quotations
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-800">
                {dashboard.stats.openQuotations}
              </p>
            </div>
          </div>
        </div>
      </section>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.07)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_35px_rgba(15,23,42,0.12)]"
          >
            <div className="absolute -right-12 -top-12 h-24 w-24 rounded-full bg-slate-100/90" />
            <div className="flex items-start justify-between">
              <div className={`relative p-3 rounded-xl ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <ArrowUpRight className="w-3 h-3" />
                Live
              </div>
            </div>
            <div className="mt-4">
              <h3 className="text-3xl font-bold text-slate-800">
                {stat.value}
              </h3>
              <p className="mt-1 text-sm text-slate-600">{stat.title}</p>
              <p className="mt-1 text-xs text-slate-500">{stat.subtitle}</p>
            </div>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className={`h-full bg-gradient-to-r ${stat.color} rounded-full transition-all duration-1000 group-hover:w-full`}
                style={{ width: "75%" }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                PI Revenue
              </h3>
              <p className="text-sm text-slate-500">Last 6 months in USD</p>
            </div>
            <button className="rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50">
              <MoreVertical className="w-5 h-5 text-slate-500" />
            </button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={dashboard.revenueData}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#c9a236" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                tickFormatter={(value) => `${Math.round(value / 1000)}K`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  color: "#0f172a",
                }}
                formatter={(value) => [formatCurrency(value), "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#0f766e"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-slate-800">Fleet Mix</h3>
            <p className="text-sm text-slate-500">Distribution by make</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={dashboard.fleetDistribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {dashboard.fleetDistribution.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  color: "#0f172a",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {dashboard.fleetDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-slate-600">{item.name}</span>
                <span className="ml-auto text-sm font-medium text-slate-800">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Lead Activity
              </h3>
              <p className="text-sm text-slate-500">
                Leads created in last 7 days
              </p>
            </div>
            <div className="flex items-center gap-2 text-emerald-700 text-sm">
              <TrendingUp className="w-4 h-4" />
              <span>Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={dashboard.leadActivity}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  color: "#0f172a",
                }}
                formatter={(value) => [value, "Leads"]}
              />
              <Bar dataKey="leads" fill="#1d4e5f" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Recent Quotations
              </h3>
              <p className="text-sm text-slate-500">Latest quote activity</p>
            </div>
            <Link
              to="/quotations"
              className="text-amber-700 text-sm font-medium transition-colors hover:text-amber-800"
            >
              View All
            </Link>
          </div>
          <div className="space-y-3">
            {dashboard.recentQuotations.map((quotation) => (
              <div
                key={quotation.id}
                className="flex items-center gap-3 rounded-xl border border-transparent p-3 transition-colors hover:border-slate-200 hover:bg-slate-50"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {quotation.quoteNo}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {quotation.client} · {quotation.serviceSummary}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-slate-800">
                    {quotation.amount}
                  </p>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-md border ${statusColor(quotation.status)}`}
                  >
                    {quotation.status}
                  </span>
                </div>
              </div>
            ))}
            {!dashboard.recentQuotations.length && (
              <div className="py-6 text-center text-sm text-slate-500">
                No recent quotations.
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              Fleet Availability
            </h3>
            <p className="text-sm text-slate-500">
              Current status of all vehicles
            </p>
          </div>
          <Link
            to="/vehicles"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            Manage Fleet
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {dashboard.fleetAvailability.map((item) => (
            <div
              key={item.label}
              className={`p-4 rounded-xl ${item.bg} border border-slate-200/70`}
            >
              <p className={`text-3xl font-bold ${item.text}`}>{item.count}</p>
              <p className="mt-1 text-sm text-slate-600">{item.label}</p>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                  style={{
                    width: `${dashboard.stats.totalFleet ? (item.count / dashboard.stats.totalFleet) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_14px_30px_rgba(15,23,42,0.07)]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-lg font-semibold text-slate-800">
                Vehicle Allocations Calendar
              </h3>
              <p className="text-sm text-slate-500">
                Safari vehicle and driver assignments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (calendarMonth === 0) {
                  setCalendarYear(calendarYear - 1);
                  setCalendarMonth(11);
                } else {
                  setCalendarMonth(calendarMonth - 1);
                }
              }}
              className="rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50"
            >
              <ChevronLeft className="w-4 h-4 text-slate-500" />
            </button>
            <span className="min-w-[150px] text-center text-sm font-medium text-slate-700">
              {new Date(calendarYear, calendarMonth).toLocaleString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </span>
            <button
              onClick={() => {
                if (calendarMonth === 11) {
                  setCalendarYear(calendarYear + 1);
                  setCalendarMonth(0);
                } else {
                  setCalendarMonth(calendarMonth + 1);
                }
              }}
              className="rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50"
            >
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-4">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-2 text-center text-xs font-semibold text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
          <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5">
            Assigned
          </span>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5">
            Confirmed
          </span>
          <span className="rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5">
            Completed
          </span>
          <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5">
            Cancelled
          </span>
          <span className="rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5">
            Mixed
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, idx) => {
            if (day === null) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="aspect-square rounded-lg bg-slate-100"
                />
              );
            }

            const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayAllocations = calendarAllocations.get(dateKey) || [];
            const isToday = toLocalDateKey(new Date()) === dateKey;
            const dayColorClasses = getCalendarDayClasses(dayAllocations);

            return (
              <div
                key={day}
                onClick={() => setSelectedDateKey(dateKey)}
                className={`aspect-square rounded-lg border p-1 transition-colors ${
                  selectedDateKey === dateKey
                    ? "border-cyan-300 bg-cyan-50"
                    : dayAllocations.length > 0
                      ? dayColorClasses.container
                      : isToday
                        ? "border-amber-400 bg-amber-50"
                        : "border-slate-200 bg-white"
                } ${dayAllocations.length > 0 ? "cursor-pointer" : "cursor-default"}`}
              >
                <div className="flex flex-col h-full">
                  <div
                    className={`text-xs font-semibold ${
                      selectedDateKey === dateKey
                        ? "text-cyan-700"
                        : dayAllocations.length > 0
                          ? dayColorClasses.text
                          : isToday
                            ? "text-amber-700"
                            : "text-slate-700"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="flex-1 min-w-0 overflow-hidden">
                    {dayAllocations.length > 0 && (
                      <div className="mt-0.5 space-y-0.5">
                        {dayAllocations.slice(0, 2).map((alloc, idx) => (
                          <div
                            key={idx}
                            className={`rounded px-1 py-0.5 text-[10px] ${bookingColorClasses(alloc.bookingRef).badge}`}
                          >
                            <p className="truncate">{alloc.bookingRef}</p>
                            <p className="truncate">
                              Reg: {alloc.registrationNo || alloc.plateNo}
                            </p>
                            <p className="truncate">
                              Driver: {alloc.driverName}
                            </p>
                          </div>
                        ))}
                        {dayAllocations.length > 2 && (
                          <div className="px-1 text-[10px] text-slate-500">
                            +{dayAllocations.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
              Allocation Details ({selectedDateKey || "Select a date"})
            </h4>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
              {selectedDayAllocations.length} allocation(s)
            </span>
          </div>

          {selectedDayAllocations.length === 0 ? (
            <p className="text-sm text-slate-500">
              No allocations on this date. Select a highlighted date to view
              Safari, Vehicle, and Driver details.
            </p>
          ) : (
            <div className="space-y-3">
              {selectedDayAllocations.map((alloc, index) => (
                <div
                  key={`${selectedDateKey}-${alloc.vehicleId}-${alloc.driverId}-${index}`}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="bg-[linear-gradient(140deg,rgba(251,191,36,0.08),rgba(56,189,248,0.08))] px-4 py-3 border-b border-slate-200/80">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-slate-800">
                        Safari: {alloc.bookingRef}
                      </div>
                      <span
                        className={`rounded-md border px-2 py-1 text-xs ${allocationStatusColor(alloc.status)}`}
                      >
                        {alloc.status}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3 text-xs">
                    <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3 text-slate-600">
                      <div className="mb-2 flex items-center gap-2 text-amber-700">
                        <MapPin className="h-3.5 w-3.5" />
                        <p className="font-semibold uppercase tracking-[0.08em] text-[10px]">
                          Safari Details
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-800 font-medium">
                          {alloc.routeParks}
                        </p>
                        <p>
                          {alloc.startDate || "-"} to {alloc.endDate || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-cyan-100 bg-cyan-50/60 p-3 text-slate-600">
                      <div className="mb-2 flex items-center gap-2 text-cyan-700">
                        <Car className="h-3.5 w-3.5" />
                        <p className="font-semibold uppercase tracking-[0.08em] text-[10px]">
                          Vehicle Details
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-800 font-medium">
                          {alloc.vehicleNo}
                        </p>
                        <p>
                          Registration No:{" "}
                          {alloc.registrationNo || alloc.plateNo}
                        </p>
                        <p>
                          {alloc.vehicleMake} {alloc.vehicleModel}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3 text-slate-600">
                      <div className="mb-2 flex items-center gap-2 text-emerald-700">
                        <UserCheck className="h-3.5 w-3.5" />
                        <p className="font-semibold uppercase tracking-[0.08em] text-[10px]">
                          Driver Details
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-800 font-medium">
                          {alloc.driverName}
                        </p>
                        <p>{alloc.notes || "No notes"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {allocations.length > 0 && (
          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-slate-700">
                Upcoming Allocations
              </h4>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                {upcomingAllocations.length} shown
              </span>
            </div>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {upcomingAllocations.map(
                ({ allocation, lead, vehicle, driver, startDate, endDate }) => {
                  const hasDateRange =
                    !Number.isNaN(startDate.getTime()) &&
                    !Number.isNaN(endDate.getTime());

                  return (
                    <div
                      key={allocation.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 text-sm shadow-[0_4px_14px_rgba(15,23,42,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className="rounded-lg bg-sky-100 p-2">
                            <Car className="h-4 w-4 shrink-0 text-sky-700" />
                          </div>
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-slate-800">
                              {vehicle?.vehicleNo ||
                                vehicle?.plateNo ||
                                "Unknown"}
                            </div>
                            <div className="truncate text-xs text-slate-500">
                              {lead.bookingRef || "-"} ·{" "}
                              {driver?.name || "Unknown"}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-md border px-2 py-1 text-xs ${allocationStatusColor(allocation.status)}`}
                        >
                          {allocation.status}
                        </span>
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate">
                          Route: {lead.routeParks || "-"}
                        </span>
                        <span className="shrink-0">
                          {hasDateRange
                            ? `${lead.startDate} to ${lead.endDate}`
                            : "Date not available"}
                        </span>
                      </div>
                    </div>
                  );
                },
              )}

              {upcomingAllocations.length === 0 && (
                <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-xs text-slate-500">
                  No upcoming allocations with current data.
                </div>
              )}
            </div>
          </div>
        )}

        {allocations.length === 0 && (
          <div className="mt-6 border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
            No vehicle allocations yet.
            <Link
              to="/safari-allocations"
              className="mt-2 block text-amber-700 transition-colors hover:text-amber-800"
            >
              Create allocation
            </Link>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="py-6 text-center text-slate-500">
          Loading dashboard...
        </div>
      )}
    </div>
  );
}
