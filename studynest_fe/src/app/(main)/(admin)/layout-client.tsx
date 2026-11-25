"use client";

import Header from "@/components/admin/header";
import Sidebar from "@/components/admin/siderbar";
import { useEffect, useState } from "react";

const STORAGE_KEY = "maymay_admin_sidebar_collapsed";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setIsCollapsed(true);
    } catch {
      // Ignore storage access errors
    }
  }, []);

  const toggleSidebar = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // Ignore
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

      {/* Header */}
      <Header isCollapsed={isCollapsed} />

      {/* Main Content */}
      <main
        className={`pt-[72px] transition-all duration-300 ${
          isCollapsed ? "lg:ml-20" : "lg:ml-72"
        }`}
      >
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
