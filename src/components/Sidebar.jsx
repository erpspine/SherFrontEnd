import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  LayoutDashboard,
  Car,
  Users,
  FileText,
  Receipt,
  ClipboardList,
  CreditCard,
  Settings,
  LogOut,
  X,
  ChevronRight,
  Building2,
  TrendingUp,
  Trees,
  ShieldCheck,
  ListChecks,
  Wrench,
  Calendar,
  Route,
  ChevronLeft,
  Package,
  ChevronDown,
  ClipboardCheck,
  Landmark,
  Wallet,
} from "lucide-react";
import {
  clearAuthSession,
  getAuthRoles,
  getAuthUser,
  hasPermission,
} from "../utils/auth";
import { apiFetch } from "../utils/api";

export const menuGroups = [
  {
    label: "Overview",
    items: [
      {
        path: "/",
        icon: LayoutDashboard,
        label: "Dashboard",
        permission: "dashboard.view",
      },
    ],
  },
  {
    label: "Fleet",
    items: [
      {
        path: "/vehicles",
        icon: Car,
        label: "Vehicles",
        permission: "vehicles.view",
        children: [
          {
            path: "/vehicles",
            label: "Internal Vehicles",
            icon: Car,
            permission: "vehicles.view",
          },
          {
            path: "/subcontracted-vehicles",
            label: "Subcontracted Vehicles",
            icon: Car,
            permission: "vehicles.view",
          },
        ],
      },
      {
        path: "/vehicle-availability",
        icon: Calendar,
        label: "Vehicle Availability",
        permission: "vehicles.view",
      },
      {
        path: "/job-cards",
        icon: ClipboardList,
        label: "Job Cards",
        permission: "job-cards.view",
        children: [
          {
            path: "/job-cards",
            label: "All Job Cards",
            icon: ClipboardList,
            permission: "job-cards.view",
          },
          {
            path: "/allowance-approvals",
            label: "Allowance Review",
            icon: ClipboardCheck,
            permission: "job-cards.view",
          },
          {
            path: "/bank-payment-queue",
            label: "Bank Payment Queue",
            icon: Landmark,
            permission: "job-cards.view",
          },
          {
            path: "/per-diems",
            label: "Per Diem Vouchers",
            icon: Wallet,
            permission: "job-cards.view",
          },
        ],
      },
      {
        path: "/departure-arrival-report",
        icon: Calendar,
        label: "Departure & Arrival Report",
        permission: "job-cards.view",
      },
      {
        path: "/safari-allocations",
        icon: Car,
        label: "Safari Allocations",
        permission: "safari-allocations.view",
      },
      {
        path: "/checklist",
        icon: ListChecks,
        label: "Checklist",
        permission: null,
      },
      {
        path: "/inspections",
        icon: ClipboardList,
        label: "Inspections",
        permission: null,
      },
      {
        path: "/performance-dashboard",
        icon: TrendingUp,
        label: "Performance Dashboard",
        permission: "vehicles.view",
      },
      {
        path: "/performance-incident-management",
        icon: ShieldCheck,
        label: "Performance & Incident Mgmt",
        permission: "vehicles.view",
      },
      {
        path: "/fuel-report",
        icon: Route,
        label: "Fuel Consumption Report",
        permission: "odometer-logs.view",
      },
      {
        path: "/fuel-management",
        icon: Route,
        label: "Fuel Management",
        permission: "odometer-logs.view",
      },
      {
        path: "/odometer-reports",
        icon: Route,
        label: "Odometer Reports",
        permission: "odometer-logs.view",
      },
      {
        path: "/vehicle-services",
        icon: Wrench,
        label: "Vehicle Service",
        permission: "vehicles.view",
      },
    ],
  },
  {
    label: "Lease",
    items: [
      {
        path: "/long-term-leasing",
        icon: FileText,
        label: "Lease Contracts",
        permission: "vehicles.view",
      },
      {
        path: "/lease-allocations",
        icon: ClipboardList,
        label: "Lease Allocations",
        permission: "vehicles.view",
      },
      {
        path: "/lease-calendar",
        icon: Calendar,
        label: "Lease Calendar",
        permission: "vehicles.view",
      },
      {
        path: "/lease-proforma-invoices",
        icon: FileText,
        label: "Lease Proformas",
        permission: "proforma-invoices.view",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        path: "/leads",
        icon: TrendingUp,
        label: "Leads",
        permission: "leads.view",
      },
      {
        path: "/clients",
        icon: Building2,
        label: "Clients",
        permission: "clients.view",
      },
      {
        path: "/inventory-store",
        icon: Package,
        label: "Store Inventory",
        permission: "inventory.view",
      },
      {
        path: "/parks",
        icon: Trees,
        label: "Parks & Rates",
        permission: "parks.view",
      },
      {
        path: "/quotations",
        icon: FileText,
        label: "Quotations",
        permission: "quotations.view",
      },
      {
        path: "/proforma-invoices",
        icon: Receipt,
        label: "Proforma Invoices",
        permission: "proforma-invoices.view",
      },
      {
        path: "/invoices",
        icon: FileText,
        label: "Invoices",
        permission: "invoices.view",
      },
      {
        path: "/payments",
        icon: CreditCard,
        label: "Payments",
        permission: "invoice-payments.view",
      },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/users", icon: Users, label: "Users", permission: "users.view" },
      {
        path: "/roles-permissions",
        icon: ShieldCheck,
        label: "Roles & Permissions",
        permission: "users.view",
      },
      {
        path: "/settings",
        icon: Settings,
        label: "Settings",
        permission: "settings.view",
      },
      { path: "/audit-log", icon: ClipboardList, label: "Audit Log", permission: "users.view" },
    ],
  },
];

export default function Sidebar({
  isOpen,
  isCollapsed,
  toggleSidebar,
  closeMobileSidebar,
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const roles = getAuthRoles();
  const isOperator = roles.some(
    (role) => String(role).toLowerCase() === "operator",
  );
  const userName = authUser?.name || "Super Admin";
  const userEmail = authUser?.email || "sher@leasing.co.tz";
  const operatorHiddenLabels = new Set([
    "Fuel Requisitions",
    "Proforma Invoices",
    "Quotations",
    "Long Term Leasing",
    "Settings",
    "Roles & Permissions",
  ]);
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [openMenus, setOpenMenus] = useState(() =>
    menuGroups.flatMap((group) => group.items).filter((item) => item.children && item.children.some((child) => location.pathname === child.path)).map((item) => item.path),
  );

  const handleLogout = async () => {
    try {
      await apiFetch("/logout", { method: "POST" });
    } catch {
      // Always continue logout locally even if API call fails.
    } finally {
      clearAuthSession();
      navigate("/login", { replace: true });
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/25 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`
        fixed top-0 left-0 z-50 h-full
        bg-gradient-to-b from-white via-slate-50 to-slate-100
        border-r border-slate-200
        transform transition-all duration-300 ease-in-out
        lg:translate-x-0 flex flex-col
        ${isCollapsed ? "lg:w-20" : "lg:w-72"}
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        w-72
      `}
      >
        <div
          className={`h-20 flex items-center border-b border-slate-200 flex-shrink-0 ${
            isCollapsed ? "justify-center px-3" : "justify-between px-6"
          }`}
        >
          <Link to="/" className="flex items-center gap-3" title="Dashboard">
            <div>
              <img
                src="/sher-logo.png"
                alt="Sher ERP"
                className="h-10 w-auto object-contain"
              />
              {!isCollapsed && (
                <p className="text-xs text-slate-500">Vehicle Leasing</p>
              )}
            </div>
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors hidden lg:inline-flex"
            title={isCollapsed ? "Expand menu" : "Collapse menu"}
          >
            <ChevronLeft
              className={`w-5 h-5 text-slate-500 transition-transform ${
                isCollapsed ? "rotate-180" : "rotate-0"
              }`}
            />
          </button>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuGroups.map((group) => {
            const visibleItems = group.items.filter((item) => {
              if (isOperator && operatorHiddenLabels.has(item.label)) {
                return false;
              }
              return hasPermission(item.permission);
            });
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.label} className="mb-2">
                {!isCollapsed && (
                  <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {group.label}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const isChildActive = (child) =>
                    location.pathname === child.path ||
                    (child.path === "/job-cards" &&
                      location.pathname.startsWith("/job-cards/"));
                  const isActive = location.pathname === item.path || item.children?.some(isChildActive);
                  const isOpenMenu = openMenus.includes(item.path);
                  const closeOnMobile = () => {
                    if (typeof window !== "undefined" && window.innerWidth < 1024) closeMobileSidebar();
                  };
                  const handleItemClick = (event) => {
                    if (item.children && !isCollapsed) {
                      event.preventDefault();
                      setOpenMenus((current) =>
                        current.includes(item.path)
                          ? current.filter((path) => path !== item.path)
                          : [...current, item.path],
                      );
                      return;
                    }
                    closeOnMobile();
                  };
                  return (
                    <div key={item.path}>
                      <Link
                        to={item.path}
                        onClick={handleItemClick}
                        title={item.label}
                        aria-expanded={item.children ? isOpenMenu : undefined}
                        className={`
                      flex items-center rounded-xl transition-all duration-200
                      group relative overflow-hidden
                      ${isCollapsed ? "justify-center px-3 py-3" : "gap-3 px-4 py-3"}
                      ${
                        isActive
                          ? "bg-gradient-to-r from-sher-gold/20 to-sher-gold-light/30 text-slate-900"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white"
                      }
                    `}
                      >
                        {isActive && (
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-sher-gold to-sher-gold-dark rounded-r" />
                        )}
                        <item.icon
                          className={`w-5 h-5 transition-colors ${isActive ? "text-sher-gold-dark" : "group-hover:text-sher-teal"}`}
                        />
                        {!isCollapsed && (
                          <span className="font-medium">{item.label}</span>
                        )}
                        {!isCollapsed && item.children && (
                          <ChevronDown
                            className={`ml-auto h-4 w-4 transition-transform ${isOpenMenu ? "rotate-180" : ""}`}
                          />
                        )}
                        {!isCollapsed && !item.children && isActive && (
                          <ChevronRight className="w-4 h-4 ml-auto text-sher-gold-dark" />
                        )}
                      </Link>
                      {!isCollapsed && item.children && isOpenMenu && (
                        <div className="ml-5 mr-2 mt-1 space-y-1 rounded-xl border border-slate-300 bg-slate-100 p-2 shadow-sm">
                          {item.children.filter((child) => hasPermission(child.permission)).map((child) => {
                            const childActive = isChildActive(child);
                            const ChildIcon = child.icon;
                            return <Link key={child.path} to={child.path} onClick={closeOnMobile} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${childActive ? "border-amber-700 bg-amber-600 font-bold text-white shadow-md" : "border-transparent font-semibold text-slate-900 hover:border-orange-600 hover:bg-orange-500 hover:text-white focus-visible:border-orange-600 focus-visible:bg-orange-500 focus-visible:text-white"}`}><ChildIcon className={`h-4 w-4 shrink-0 ${childActive ? "text-white" : "text-slate-700 group-hover:text-white group-focus-visible:text-white"}`} />{child.label}</Link>;
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 flex-shrink-0">
          <div
            className={`rounded-xl border shadow-sm ${
              isCollapsed ? "p-2" : "flex items-center gap-3 p-3"
            }`}
            style={{
              background: "linear-gradient(135deg, #ffffff, #f8fafc)",
              borderColor: "#cbd5e1",
              boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
            }}
            title={userName}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold mx-auto"
              style={{
                background: "linear-gradient(135deg, #1D4E5F, #0D2E38)",
              }}
            >
              {userInitials}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {userName}
                </p>
                <p className="text-xs text-slate-600 truncate">{userEmail}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className={`mt-3 w-full flex items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-700 font-medium hover:bg-red-100 hover:text-red-800 transition-colors ${
              isCollapsed ? "px-2 py-2.5" : "gap-2 px-3 py-2.5"
            }`}
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
            {!isCollapsed && "Logout"}
          </button>
        </div>
      </aside>
    </>
  );
}
