import { useState } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar isOpen={sidebarOpen} toggleSidebar={toggleSidebar} />

      <div className="lg:ml-72 min-h-screen">
        <Header toggleSidebar={toggleSidebar} />

        <main className="p-6 animate-fadeIn">{children}</main>
      </div>
    </div>
  );
}
