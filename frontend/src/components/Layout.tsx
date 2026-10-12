import { useState } from "react";
import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import Sidebar from "./Sidebar";
import TopBanner from "./TopBanner";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
      <TopBanner onMenuClick={() => setSidebarOpen((v) => !v)} />
      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/30 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        <aside
          className={`fixed bottom-0 left-0 top-14 z-40 w-64 shrink-0 transform border-r border-slate-200 bg-white transition-transform duration-200 md:static md:translate-x-0 dark:border-slate-800 dark:bg-slate-900 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <Sidebar onNavigate={() => setSidebarOpen(false)} />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      <Footer />
    </div>
  );
}
