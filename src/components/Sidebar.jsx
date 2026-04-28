import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Fuel,
  Wrench,
  Route,
  Calendar,
  ChevronLeft,
} from "lucide-react";
import { clearAuthSession, getAuthUser } from "../utils/auth";
import { apiFetch } from "../utils/api";

const menuGroups = [
  {
    label: "Overview",
    items: [{ path: "/", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Fleet",
    items: [
      { path: "/vehicles", icon: Car, label: "Vehicles" },
      {
        path: "/vehicle-availability",
        icon: Calendar,
        label: "Vehicle Availability",
      },
      { path: "/job-cards", icon: ClipboardList, label: "Job Cards" },
      { path: "/safari-allocations", icon: Car, label: "Safari Allocations" },
      { path: "/checklist", icon: ListChecks, label: "Checklist" },
      { path: "/fuel-requisitions", icon: Fuel, label: "Fuel Requisitions" },
      { path: "/vehicle-services", icon: Wrench, label: "Vehicle Service" },
      {
        path: "/route-distances",
        icon: Route,
        label: "Route Distances",
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/leads", icon: TrendingUp, label: "Leads" },
      { path: "/clients", icon: Building2, label: "Clients" },
      { path: "/parks", icon: Trees, label: "Parks & Rates" },
      { path: "/quotations", icon: FileText, label: "Quotations" },
      { path: "/proforma-invoices", icon: Receipt, label: "Proforma Invoices" },
      { path: "/invoices", icon: FileText, label: "Invoices" },
      { path: "/payments", icon: CreditCard, label: "Payments" },
    ],
  },
  {
    label: "System",
    items: [
      { path: "/users", icon: Users, label: "Users" },
      {
        path: "/roles-permissions",
        icon: ShieldCheck,
        label: "Roles & Permissions",
      },
      { path: "/settings", icon: Settings, label: "Settings" },
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
  const userName = authUser?.name || "Super Admin";
  const userEmail = authUser?.email || "sher@leasing.co.tz";
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/25 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
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
        {/* Logo */}
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

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuGroups.map((group) => (
            <div key={group.label} className="mb-2">
              {!isCollapsed && (
                <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                      if (
                        typeof window !== "undefined" &&
                        window.innerWidth < 1024
                      ) {
                        closeMobileSidebar();
                      }
                    }}
                    title={item.label}
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
                    {!isCollapsed && isActive && (
                      <ChevronRight className="w-4 h-4 ml-auto text-sher-gold-dark" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile */}
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
