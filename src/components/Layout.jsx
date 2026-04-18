import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-transparent">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="lg:ml-72 min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(201,162,54,0.12),transparent_45%),linear-gradient(180deg,rgba(255,251,239,0.72),rgba(248,241,225,0.82))]">
        <Header toggleSidebar={toggleSidebar} />

        <main className="p-6 animate-fadeIn content-light">{children}</main>
      </div>
    </div>
  );
}
