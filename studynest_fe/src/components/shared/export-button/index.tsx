"use client";

import { useState } from "react";
import { HiDownload } from "react-icons/hi";

export interface ExportButtonProps {
  onExport: () => Promise<void>;
  loading?: boolean;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  children?: React.ReactNode;
}

export default function ExportButton({
  onExport,
  loading = false,
  className = "",
  variant = "outline",
  size = "md",
  children,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await onExport();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case "primary":
        return "bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white shadow-lg shadow-teal-500/25";
      case "secondary":
        return "bg-white/50 border border-white/30 hover:bg-white/80 text-gray-700";
      case "outline":
      default:
        return "bg-white/50 border border-white/30 hover:bg-white/80 text-gray-700";
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "px-3 py-2 text-sm";
      case "lg":
        return "px-6 py-3 text-lg";
      case "md":
      default:
        return "px-4 py-2 text-base";
    }
  };

  const isLoading = loading || isExporting;

  return (
    <button
      onClick={handleExport}
      disabled={isLoading}
      className={`flex items-center space-x-2 rounded-xl transition-all duration-300 hover:scale-105 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group ${getVariantClasses()} ${getSizeClasses()} ${className}`}
    >
      {isLoading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
      ) : (
        <HiDownload className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
      )}
      <span className="font-medium">
        {children || (isLoading ? "Đang xuất..." : "Xuất Excel")}
      </span>
    </button>
  );
}
