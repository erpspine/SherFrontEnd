import { useState } from "react";
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
} from "lucide-react";
import { clearAuthSession, getAuthUser } from "../utils/auth";
import { apiFetch } from "../utils/api";

const menuGroups = [
  {
    label: "Overview",
    items: [{ path: "/", icon: LayoutDashboard, label: "Dashboard" }],
  },
  {
    label: "Fleet & Clients",
    items: [
      { path: "/vehicles", icon: Car, label: "Vehicles" },
      { path: "/clients", icon: Building2, label: "Clients" },
      { path: "/job-cards", icon: ClipboardList, label: "Job Cards" },
      { path: "/safari-allocations", icon: Car, label: "Safari Allocations" },
    ],
  },
  {
    label: "Operations",
    items: [
      { path: "/leads", icon: TrendingUp, label: "Leads" },
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
      { path: "/settings", icon: Settings, label: "Settings" },
    ],
  },
];

export default function Sidebar({ isOpen, toggleSidebar }) {
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
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed top-0 left-0 z-50 h-full w-72 
        bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
        border-r border-slate-800/50
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 flex flex-col
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-800/50 flex-shrink-0">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Car className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Sher ERP</h1>
              <p className="text-xs text-slate-500">Vehicle Leasing</p>
            </div>
          </Link>
          <button
            onClick={toggleSidebar}
            className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuGroups.map((group) => (
            <div key={group.label} className="mb-2">
              <p className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {group.label}
              </p>
              {group.items.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                      group relative overflow-hidden
                      ${
                        isActive
                          ? "bg-gradient-to-r from-amber-400/20 to-amber-600/20 text-white"
                          : "text-slate-400 hover:text-white hover:bg-slate-800/50"
                      }
                    `}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-amber-600 rounded-r" />
                    )}
                    <item.icon
                      className={`w-5 h-5 transition-colors ${isActive ? "text-amber-400" : "group-hover:text-amber-400"}`}
                    />
                    <span className="font-medium">{item.label}</span>
                    {isActive && (
                      <ChevronRight className="w-4 h-4 ml-auto text-amber-400" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-slate-800/50 flex-shrink-0">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-800/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold">
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {userName}
              </p>
              <p className="text-xs text-slate-500 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
