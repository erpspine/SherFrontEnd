import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Search, Menu } from "lucide-react";
import { getAuthUser, hasPermission } from "../utils/auth";
import { menuGroups } from "./Sidebar";

export default function Header({ toggleSidebar, isSidebarCollapsed }) {
  const [searchQuery, setSearchQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const authUser = getAuthUser();
  const userName = authUser?.name || "Super Admin";
  const userInitials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const searchablePages = useMemo(
    () =>
      menuGroups
        .flatMap((group) => group.items)
        .filter((item) => hasPermission(item.permission))
        .map((item) => ({
          path: item.path,
          label: item.label,
          labelLower: item.label.toLowerCase(),
          pathLower: item.path.toLowerCase(),
        })),
    [],
  );

  useEffect(() => {
    const handleKeydown = (event) => {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";

      if (!isShortcut) {
        return;
      }

      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    };

    window.addEventListener("keydown", handleKeydown);

    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, []);

  const runPageSearch = (backwards = false) => {
    const query = searchQuery.trim();

    if (!query) {
      return;
    }

    const queryLower = query.toLowerCase();
    const bestMatch = searchablePages
      .map((page) => {
        let score = 0;

        if (page.labelLower === queryLower) score = 100;
        else if (page.labelLower.startsWith(queryLower)) score = 80;
        else if (page.labelLower.includes(queryLower)) score = 60;
        else if (
          page.pathLower === queryLower ||
          page.pathLower === `/${queryLower}`
        )
          score = 55;
        else if (page.pathLower.includes(queryLower)) score = 40;

        return { ...page, score };
      })
      .filter((page) => page.score > 0)
      .sort((left, right) => right.score - left.score)[0];

    if (bestMatch) {
      navigate(bestMatch.path);
      return;
    }

    if (typeof window.find !== "function") {
      return;
    }

    window.find(query, false, backwards, true, false, false, false);
  };

  return (
    <header className="h-20 bg-white/90 backdrop-blur-xl border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* Left Side */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          title={isSidebarCollapsed ? "Expand menu" : "Collapse menu"}
        >
          <Menu className="w-6 h-6 text-slate-600" />
        </button>

        {/* Search Bar */}
        <div className="hidden md:flex items-center gap-3 bg-white rounded-xl px-4 py-2.5 w-80 border border-slate-200 focus-within:border-sher-gold/70 transition-colors shadow-sm">
          <Search className="w-5 h-5 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search page (vehicles, leads, quotations...)"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") {
                return;
              }

              event.preventDefault();
              runPageSearch(event.shiftKey);
            }}
            className="bg-transparent border-none outline-none text-sm text-slate-700 placeholder-slate-400 w-full"
          />
          <kbd className="hidden lg:inline-flex px-2 py-1 text-xs text-slate-500 bg-slate-100 rounded">
            Ctrl/Cmd+K
          </kbd>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2.5 text-slate-500 hover:text-sher-teal hover:bg-slate-100 rounded-xl transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-sher-red rounded-full" />
        </button>

        {/* Profile */}
        <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-slate-900">{userName}</p>
            <p className="text-xs text-slate-500">Sher Leasing</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sher-gold to-sher-gold-dark flex items-center justify-center text-white font-semibold shadow-lg shadow-sher-gold/20 cursor-pointer hover:scale-105 transition-transform">
            {userInitials}
          </div>
        </div>
      </div>
    </header>
  );
}
