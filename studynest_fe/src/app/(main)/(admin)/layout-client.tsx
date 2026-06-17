"use client";

import Header from "@/components/admin/header";
import Sidebar from "@/components/admin/siderbar";
import { useState } from "react";

export function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} onToggle={toggleSidebar} />

      {/* Header */}
      <Header isCollapsed={isCollapsed} />

      {/* Main Content */}
      <main
        className={`pt-16 transition-all duration-300 ${
          isCollapsed ? "ml-16" : "ml-64"
        }`}
      >
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
