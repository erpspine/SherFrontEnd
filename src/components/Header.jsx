import { useState } from "react";
import { Bell, Search, Menu, Moon, Sun } from "lucide-react";
import { getAuthUser } from "../utils/auth";

export default function Header({ toggleSidebar }) {
  const [darkMode, setDarkMode] = useState(true);
  const authUser = getAuthUser();
  const userName = authUser?.name || "Super Admin";
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="h-20 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-6 sticky top-0 z-30">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="lg:hidden p-2 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <Menu className="w-6 h-6 text-slate-400" />
        </button>

        {/* Search Bar */}
        <div className="hidden md:flex items-center gap-3 bg-slate-800/50 rounded-xl px-4 py-2.5 w-80 border border-slate-700/50 focus-within:border-amber-500/50 transition-colors">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Search vehicles, clients, quotes..."
            className="bg-transparent border-none outline-none text-sm text-slate-300 placeholder-slate-500 w-full"
          />
          <kbd className="hidden lg:inline-flex px-2 py-1 text-xs text-slate-500 bg-slate-700/50 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Theme Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        >
          {darkMode ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <button className="relative p-2.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-700">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-white">{userName}</p>
            <p className="text-xs text-slate-500">Sher Leasing</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white font-semibold shadow-lg shadow-amber-500/25 cursor-pointer hover:scale-105 transition-transform">
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
