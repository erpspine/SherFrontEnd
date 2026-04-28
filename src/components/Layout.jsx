import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("sher-sidebar-collapsed") === "true";
  });

  useEffect(() => {
    window.localStorage.setItem(
      "sher-sidebar-collapsed",
      String(sidebarCollapsed),
    );
  }, [sidebarCollapsed]);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      setSidebarCollapsed((current) => !current);
      return;
    }

    setSidebarOpen((current) => !current);
  };

  const closeMobileSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        closeMobileSidebar={closeMobileSidebar}
      />

      <div
        className={`min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(201,162,54,0.12),transparent_45%),linear-gradient(180deg,rgba(255,251,239,0.72),rgba(248,241,225,0.82))] transition-[margin] duration-300 ease-in-out ${
          sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        <Header
          toggleSidebar={toggleSidebar}
          isSidebarCollapsed={sidebarCollapsed}
        />

        <main className="p-6 animate-fadeIn content-light">{children}</main>
      </div>
    </div>
  );
}
